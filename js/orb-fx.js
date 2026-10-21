// Магическая аура вокруг круглых видеообрядов: дым, тонкие электрические дуги между соседними кругами,
// перетекание энергии от обряда к обряду при прокрутке, усиление дыма и «пробег» тока по контуру при наведении.
// Всё рисуется одним canvas за кругами; сами видео и разметка блока не затрагиваются.
import { reducedMotion } from './media-hub.js';
import { isModalOpen } from './modal.js';

const PAD = 150; // поле canvas вокруг сетки, px
const C = {
  burg: [124, 24, 52],
  deep: [70, 15, 40],
  violet: [94, 60, 138],
  wisp: [140, 106, 176],
  arc: [190, 160, 226],
  hot: [232, 218, 246],
};
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const rnd = (a, b) => a + Math.random() * (b - a);
const ease = (t) => 1 - (1 - t) ** 3;

/** «Облачко» дыма: несколько перекрывающихся мягких пятен — получается рваный, живой край. */
function makeCloud(c) {
  const s = document.createElement('canvas');
  s.width = 128;
  s.height = 128;
  const x = s.getContext('2d');
  for (let k = 0; k < 6; k += 1) {
    const px = 64 + rnd(-24, 24);
    const py = 64 + rnd(-24, 24);
    const r = rnd(22, 42);
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, rgba(c, rnd(0.32, 0.5)));
    g.addColorStop(0.55, rgba(c, 0.16));
    g.addColorStop(1, rgba(c, 0));
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
  }
  return s;
}
const makeSet = (c, n) => Array.from({ length: n }, () => makeCloud(c));

/** Ломаная «молния» между точками: смещение средней точки, 3 уровня. */
function bolt(ax, ay, bx, by, amp) {
  let pts = [[ax, ay], [bx, by]];
  let a = amp;
  for (let lvl = 0; lvl < 3; lvl += 1) {
    const next = [pts[0]];
    for (let i = 0; i < pts.length - 1; i += 1) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const off = rnd(-a, a);
      next.push([(x1 + x2) / 2 + (-dy / len) * off, (y1 + y2) / 2 + (dx / len) * off], pts[i + 1]);
    }
    pts = next;
    a *= 0.55;
  }
  return pts;
}

export function initOrbFx(grid) {
  const canvas = document.createElement('canvas');
  canvas.className = 'orb-fx';
  canvas.setAttribute('aria-hidden', 'true');
  grid.prepend(canvas);
  const ctx = canvas.getContext('2d');
  const sets = [makeSet(C.burg, 5), makeSet(C.deep, 3), makeSet(C.violet, 4), makeSet(C.wisp, 2)];
  const glowSprite = makeSet(C.violet, 1)[0];
  const small = window.innerWidth < 700;

  const orbs = [];
  let edges = [];
  const pulses = []; // энергия, бегущая по дуге
  const rings = []; // импульс от кружка при наведении
  const runs = []; // «пробег» тока по контуру
  const later = []; // отложенные действия
  let spawned = 0;
  let storm = 0; // «заряд» от прокрутки: чем быстрее листают, тем ярче молнии между кругами
  let dpr = 1;
  let W = 0;
  let H = 0;

  const pickColor = () => {
    const r = Math.random();
    return r < 0.52 ? 0 : r < 0.68 ? 1 : r < 0.92 ? 2 : 3; // бордовый, тёмный, фиолетовый, светлая прядь
  };
  const newPuff = (initial) => ({
    a: Math.random() * Math.PI * 2,
    life: initial ? Math.random() : 0,
    dur: rnd(5, 9),
    spin: rnd(-0.16, 0.16),
    col: 0,
    v: 0,
    size: rnd(0.34, 0.6),
    amp: rnd(0.55, 1),
    ph: Math.random() * 6.28,
    ...(() => { const col = pickColor(); return { col, v: Math.floor(Math.random() * sets[col].length) }; })(),
  });

  function measure() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    W = grid.offsetWidth + PAD * 2;
    H = grid.offsetHeight + PAD * 2;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const els = [...grid.querySelectorAll('.orb')];
    els.forEach((el, i) => {
      const li = el.closest('.orb-card');
      const o = orbs[i] || (orbs[i] = { intensity: 0, hover: false, charge: 0, puffs: Array.from({ length: small ? 26 : 40 }, () => newPuff(true)) });
      o.el = el;
      o.R = el.offsetWidth / 2;
      o.cx = li.offsetLeft + el.offsetLeft + o.R + PAD;
      o.cy = li.offsetTop + el.offsetTop + o.R + PAD;
    });
    // дуги — между соседями в одном ряду
    edges = [];
    for (let i = 0; i < orbs.length - 1; i += 1) {
      const a = orbs[i];
      const b = orbs[i + 1];
      if (Math.abs(a.cy - b.cy) < a.R * 0.5 && b.cx > a.cx) edges.push({ a: i, b: i + 1, path: null, regen: 0, flash: 0, phase: Math.random() * 6 });
    }
  }

  // ---------- рисование ----------
  function drawSmoke(o, dt, tm) {
    const boost = 0.62 + 0.8 * o.intensity + 0.8 * o.charge;
    for (const p of o.puffs) {
      p.life += (dt / p.dur) * (1 + 0.6 * o.intensity);
      p.a += p.spin * dt * (1 + 1.2 * o.intensity);
      if (p.life >= 1) Object.assign(p, newPuff(false));
      const t = p.life;
      // плотное неровное кольцо у самого края круга, пряди медленно уходят наружу
      const rr = o.R * (1.0 + 0.06 * ease(t) + 0.045 * Math.sin(tm * 0.7 + p.ph) + 0.05 * o.intensity);
      const d = o.R * (0.42 + p.size * 0.55 + 0.22 * t);
      const al = Math.min(0.85, p.amp * (small ? 0.85 : 0.68) * Math.sin(Math.PI * t) ** 0.8 * boost);
      ctx.globalAlpha = al;
      ctx.save();
      ctx.translate(o.cx + Math.cos(p.a) * rr, o.cy + Math.sin(p.a) * rr);
      ctx.rotate(p.a + p.ph);
      ctx.drawImage(sets[p.col][p.v], -d / 2, -d / 2, d, d);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    if (o.charge > 0.02) {
      const d = o.R * 3;
      ctx.globalAlpha = o.charge * 0.28;
      ctx.drawImage(glowSprite, o.cx - d / 2, o.cy - d / 2, d, d);
      ctx.globalAlpha = 1;
    }
  }

  function pathPoint(path, t) {
    const f = t * (path.length - 1);
    const i = Math.min(path.length - 2, Math.floor(f));
    const k = f - i;
    return [path[i][0] + (path[i + 1][0] - path[i][0]) * k, path[i][1] + (path[i + 1][1] - path[i][1]) * k];
  }

  function strokePath(pts, from, to, glow, core, ca, cb) {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    const n = pts.length - 1;
    const i0 = Math.max(0, Math.floor(from * n));
    const i1 = Math.min(n, Math.ceil(to * n));
    ctx.moveTo(pts[i0][0], pts[i0][1]);
    for (let i = i0 + 1; i <= i1; i += 1) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.strokeStyle = rgba(C.violet, ca * 0.45);
    ctx.lineWidth = glow;
    ctx.stroke();
    ctx.strokeStyle = rgba(cb, ca);
    ctx.lineWidth = core;
    ctx.stroke();
  }

  function drawEdges(t, dt) {
    for (const e of edges) {
      const a = orbs[e.a];
      const b = orbs[e.b];
      if (!a.vis && !b.vis) continue;
      if (!e.path || t >= e.regen) {
        e.path = bolt(a.cx + a.R * 0.9, a.cy, b.cx - b.R * 0.9, b.cy, Math.min(a.R * 0.35, 26));
        e.regen = t + rnd(0.09, 0.24) * (1 - 0.6 * storm);
        if (Math.random() < 0.004 + 0.06 * storm) e.flash = 1;
      }
      e.flash = Math.max(0, e.flash - dt * 5);
      const base = 0.035 + 0.025 * Math.sin(t * 1.7 + e.phase) + storm * 0.5 + (a.intensity + b.intensity) * 0.12 + (a.charge + b.charge) * 0.18 + e.flash * 0.6;
      strokePath(e.path, 0, 1, 3.4, 1.1, Math.min(0.9, base), C.arc);
      if (e.flash > 0.3) { // короткая боковая «веточка» при вспышке
        const mid = e.path[Math.floor(e.path.length / 2)];
        const br = bolt(mid[0], mid[1], mid[0] + rnd(-30, 30), mid[1] + rnd(-34, 34), 8);
        strokePath(br, 0, 1, 2, 0.8, e.flash * 0.6, C.arc);
      }
    }
  }

  function drawPulses(dt) {
    for (let i = pulses.length - 1; i >= 0; i -= 1) {
      const p = pulses[i];
      p.t += dt / p.dur;
      const e = edges[p.e];
      if (!e || !e.path) { pulses.splice(i, 1); continue; }
      const k = Math.min(1, p.t);
      const head = p.dir > 0 ? k : 1 - k;
      const tail = Math.max(0, Math.min(1, head - p.dir * 0.22));
      const lo = Math.min(head, tail);
      const hi = Math.max(head, tail);
      strokePath(e.path, lo, hi, 5, 1.7, 0.85, C.hot);
      const [hx, hy] = pathPoint(e.path, head);
      ctx.globalAlpha = 0.8 * (1 - k * 0.3);
      ctx.drawImage(glowSprite, hx - 22, hy - 22, 44, 44);
      ctx.globalAlpha = 1;
      if (p.t >= 1) {
        pulses.splice(i, 1);
        const target = p.dir > 0 ? e.b : e.a;
        orbs[target].charge = 1;
        if (p.hops > 0 && Math.random() < 0.75) {
          const ne = p.dir > 0 ? edges.findIndex((x) => x.a === target) : edges.findIndex((x) => x.b === target);
          if (ne >= 0) later.push({ at: performance.now() + 120, fn: () => spawn(ne, p.dir, p.hops - 1) });
          else jumpToNextRow(target, p.dir);
        } else if (p.hops > 0) jumpToNextRow(target, p.dir);
      }
    }
  }

  // конец ряда: энергия «перескакивает» на ближайший круг следующего ряда
  function jumpToNextRow(from, dir) {
    const o = orbs[from];
    const j = dir > 0 ? orbs.findIndex((x, i) => i > from && x.cy > o.cy + o.R) : -1;
    if (j < 0) return;
    later.push({ at: performance.now() + 420, fn: () => { orbs[j].charge = 1; const ne = edges.findIndex((x) => x.a === j); if (ne >= 0) spawn(ne, 1, 1); } });
  }

  function spawn(e, dir, hops) {
    if (!edges[e]) return;
    spawned += 1;
    edges[e].flash = Math.max(edges[e].flash, 0.55);
    pulses.push({ e, dir, t: 0, dur: rnd(0.8, 1.1), hops });
  }

  function drawRings(dt) {
    for (let i = rings.length - 1; i >= 0; i -= 1) {
      const r = rings[i];
      r.t += dt / 0.95;
      if (r.t >= 1) { rings.splice(i, 1); continue; }
      const o = orbs[r.o];
      ctx.beginPath();
      ctx.arc(o.cx, o.cy, o.R * (1.02 + 0.5 * ease(r.t)), 0, Math.PI * 2);
      ctx.strokeStyle = rgba(C.arc, (1 - r.t) * 0.32);
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  function drawRuns(dt) {
    for (let i = runs.length - 1; i >= 0; i -= 1) {
      const r = runs[i];
      r.t += dt / 1.0;
      if (r.t >= 1) { runs.splice(i, 1); continue; }
      const o = orbs[r.o];
      const head = r.a0 + r.dir * Math.PI * 2 * ease(r.t);
      const len = 1.15;
      const steps = 22;
      const pts = [];
      for (let s = 0; s <= steps; s += 1) {
        const ang = head - r.dir * len * (s / steps);
        const rad = o.R * 1.018 + rnd(-1.8, 1.8);
        pts.push([o.cx + Math.cos(ang) * rad, o.cy + Math.sin(ang) * rad]);
      }
      const fade = 1 - Math.max(0, r.t - 0.8) * 5;
      for (let s = 0; s < steps; s += 2) {
        const al = (1 - s / steps) * 0.9 * fade;
        ctx.beginPath();
        ctx.moveTo(pts[s][0], pts[s][1]);
        ctx.lineTo(pts[s + 1][0], pts[s + 1][1]);
        ctx.lineTo(pts[s + 2][0], pts[s + 2][1]);
        ctx.strokeStyle = rgba(C.violet, al * 0.5);
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.strokeStyle = rgba(C.hot, al);
        ctx.lineWidth = 1.3;
        ctx.stroke();
      }
    }
  }

  // ---------- цикл ----------
  let raf = 0;
  let last = 0;
  let inView = false;
  let ambientAt = 0;
  const wantRun = () => inView && !document.hidden && !isModalOpen() && !reducedMotion.matches;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000 || 0));
    last = now;
    if (!wantRun()) { halt(); return; }
    const gr = grid.getBoundingClientRect();
    for (const o of orbs) {
      const y = gr.top - PAD + o.cy;
      o.vis = y > -o.R * 2.5 && y < window.innerHeight + o.R * 2.5;
      o.intensity += ((o.hover ? 1 : 0) - o.intensity) * (1 - Math.exp(-dt / 0.35));
      o.charge = Math.max(0, o.charge - dt * 1.5);
    }
    storm = Math.max(0, storm - dt * 1.1);
    for (let i = later.length - 1; i >= 0; i -= 1) if (now >= later[i].at) later.splice(i, 1)[0].fn();
    if (now > ambientAt) { ambientAt = now + rnd(3500, 6500); flow(Math.random() < 0.5 ? 1 : -1, true); }
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'screen';
    for (const o of orbs) if (o.vis) drawSmoke(o, dt, now / 1000);
    ctx.globalCompositeOperation = 'source-over';
    drawEdges(now / 1000, dt);
    drawPulses(dt);
    drawRings(dt);
    drawRuns(dt);
  }
  function run() { if (!raf && wantRun()) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function halt() { cancelAnimationFrame(raf); raf = 0; }

  // ---------- энергия при прокрутке ----------
  let lastY = window.scrollY;
  let acc = 0;
  let lastFlow = 0;
  function flow(dir, quiet) {
    const now = performance.now();
    if (now - lastFlow < 350) return;
    const mid = window.innerHeight / 2;
    const gr = grid.getBoundingClientRect();
    let best = -1;
    let bd = 1e9;
    orbs.forEach((o, i) => {
      const d = Math.abs(gr.top - PAD + o.cy - mid);
      if (o.vis && d < bd) { bd = d; best = i; }
    });
    if (best < 0) return;
    lastFlow = now;
    const right = edges.findIndex((x) => x.a === best);
    const left = edges.findIndex((x) => x.b === best);
    const e = dir > 0 ? (right >= 0 ? right : left) : (left >= 0 ? left : right);
    const d = e === right ? 1 : -1;
    orbs[best].charge = Math.max(orbs[best].charge, quiet ? 0.4 : 0.9);
    if (e >= 0) spawn(e, d, quiet ? 1 : 3);
    else jumpToNextRow(best, 1);
  }
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    const d = y - lastY;
    lastY = y;
    acc += Math.abs(d);
    if (inView && !reducedMotion.matches) storm = Math.min(1, storm + Math.min(0.5, Math.abs(d) / 420));
    if (acc > 220 && inView && !reducedMotion.matches) { acc = 0; flow(d >= 0 ? 1 : -1, false); }
  }, { passive: true });

  // ---------- наведение / касание ----------
  const orbIndex = (el) => orbs.findIndex((o) => o.el === el);
  function zap(i) {
    if (i < 0 || reducedMotion.matches) return;
    rings.push({ o: i, t: 0 });
    runs.push({ o: i, t: 0, a0: rnd(0, Math.PI * 2), dir: Math.random() < 0.5 ? 1 : -1 });
    orbs[i].charge = Math.max(orbs[i].charge, 0.6);
    run();
  }
  grid.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest('.orb');
    if (!el || (e.relatedTarget && el.contains(e.relatedTarget))) return;
    const i = orbIndex(el);
    if (i >= 0) { orbs[i].hover = true; zap(i); }
  });
  grid.addEventListener('pointerout', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest('.orb');
    if (!el || (e.relatedTarget && el.contains(e.relatedTarget))) return;
    const i = orbIndex(el);
    if (i >= 0) orbs[i].hover = false;
  });
  grid.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    const el = e.target.closest('.orb');
    if (el) zap(orbIndex(el));
  });

  new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
    if (inView) { measure(); run(); } else halt();
  }, { rootMargin: '120px 0px' }).observe(grid);
  new ResizeObserver(() => { measure(); if (reducedMotion.matches) staticFrame(); }).observe(grid);
  document.addEventListener('modal:close', run);
  document.addEventListener('visibilitychange', run);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  function staticFrame() {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'screen';
    orbs.forEach((o) => { o.vis = true; drawSmoke(o, 0, 0); });
    ctx.globalCompositeOperation = 'source-over';
  }

  measure();
  if (reducedMotion.matches) staticFrame();
  grid.orbFx = { get spawned() { return spawned; }, get storm() { return storm; }, get edges() { return edges.length; }, get runs() { return runs.length; }, get rings() { return rings.length; }, get orbs() { return orbs.length; }, canvas };
}
