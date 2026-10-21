// Атмосфера: пепел, свет за курсором, параллакс, зеркало, режим усиленного хоррора и редкий скример.
import { hub, reducedMotion } from './media-hub.js';
import { isModalOpen } from './modal.js';

const fine = window.matchMedia('(hover: hover) and (pointer: fine)');

/* ---------- пепел и искры ---------- */
export function initAsh() {
  const canvas = document.getElementById('ash');
  if (!canvas || reducedMotion.matches) return;
  const ctx = canvas.getContext('2d');
  let w = 0;
  let h = 0;
  let dpr = 1;
  let parts = [];
  let raf = 0;

  const make = (initial) => {
    const ember = Math.random() < 0.22;
    return {
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 10,
      r: ember ? 0.9 + Math.random() * 1.3 : 0.6 + Math.random() * 1.8,
      vy: -(ember ? 0.35 + Math.random() * 0.5 : 0.08 + Math.random() * 0.25),
      vx: (Math.random() - 0.5) * 0.25,
      ph: Math.random() * Math.PI * 2,
      ember,
      a: 0.25 + Math.random() * 0.5,
    };
  };
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = w < 700 ? 28 : 55;
    parts = Array.from({ length: n }, () => make(true));
  }
  function frame(t) {
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.y += p.vy;
      p.x += p.vx + Math.sin(t / 1800 + p.ph) * 0.18;
      if (p.y < -10 || p.x < -10 || p.x > w + 10) Object.assign(p, make(false));
      const flick = p.ember ? 0.6 + Math.sin(t / 130 + p.ph) * 0.4 : 1;
      ctx.beginPath();
      ctx.fillStyle = p.ember ? `rgba(255, 140, 70, ${p.a * flick})` : `rgba(210, 200, 190, ${p.a * 0.55})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  }
  const run = () => { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); };
  const halt = () => { cancelAnimationFrame(raf); raf = 0; };
  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => (document.hidden ? halt() : run()));
  run();
}

/* ---------- свет за курсором и параллакс ---------- */
export function initLightAndParallax() {
  const light = document.getElementById('cursorLight');
  const frameEl = document.querySelector('.hero-frame');
  const sigil = document.querySelector('.hero-sigil');
  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let px = 0;
  let py = 0;
  let queued = false;

  const apply = () => {
    queued = false;
    if (light) light.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    if (reducedMotion.matches) return;
    const sy = Math.min(window.scrollY, window.innerHeight);
    if (frameEl) frameEl.style.transform = `translate3d(${(-px * 12).toFixed(1)}px, ${(-py * 8 + sy * 0.05).toFixed(1)}px, 0)`;
    if (sigil) sigil.style.translate = `${(px * 20).toFixed(1)}px ${(py * 14 - sy * 0.04).toFixed(1)}px`;
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(apply); } };

  if (fine.matches) {
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      mx = e.clientX; my = e.clientY;
      px = (e.clientX / window.innerWidth - 0.5) * 2;
      py = (e.clientY / window.innerHeight - 0.5) * 2;
      if (light && !reducedMotion.matches) light.classList.add('on');
      queue();
    }, { passive: true });
    document.addEventListener('pointerleave', () => light && light.classList.remove('on'));
  }
  window.addEventListener('scroll', queue, { passive: true });
}

/* ---------- зеркало ---------- */
export function initMirror() {
  const mirror = document.getElementById('mirror');
  if (!mirror) return;
  let t = 0;
  const flash = (ms = 1500) => {
    mirror.classList.add('active');
    clearTimeout(t);
    t = setTimeout(() => mirror.classList.remove('active'), ms);
  };
  mirror.addEventListener('click', () => flash(1800));
  document.addEventListener('mirror:flash', () => flash(900));
}

/* ---------- усиленный хоррор + скример ---------- */
export function initHorror() {
  const toggle = document.getElementById('horrorToggle');
  const scare = document.getElementById('scare');
  const face = scare.querySelector('.scare-face');
  const MAX = 3;
  let timer = 0;
  let mirrorTimer = 0;
  let count = 0;
  let audioCtx = null;

  const store = {
    get() { try { return localStorage.getItem('horror') === '1'; } catch { return false; } },
    set(v) { try { localStorage.setItem('horror', v ? '1' : '0'); } catch { /* ignore */ } },
  };

  function sound() {
    if (!audioCtx || audioCtx.state !== 'running') return;
    const t = audioCtx.currentTime;
    const master = audioCtx.createGain();
    master.gain.setValueAtTime(0.0001, t);
    master.gain.exponentialRampToValueAtTime(0.22, t + 0.03);
    master.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    master.connect(audioCtx.destination);
    const osc = audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.6);
    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    osc.connect(lp).connect(master);
    osc.start(t);
    osc.stop(t + 0.7);
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.4, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const noise = audioCtx.createBufferSource();
    noise.buffer = buf;
    const hp = audioCtx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1800;
    noise.connect(hp).connect(master);
    noise.start(t);
  }

  function canScare() {
    return !reducedMotion.matches && !document.hidden && !isModalOpen() && !hub.isBusy();
  }
  function doScare() {
    scare.classList.toggle('red', Math.random() < 0.4);
    scare.hidden = false;
    face.style.animation = 'none';
    void face.offsetWidth;
    face.style.animation = '';
    face.style.backgroundPosition = Math.random() < 0.5 ? '17% 12%' : '17% 14%';
    sound();
    setTimeout(() => { scare.hidden = true; }, 640);
  }
  function schedule() {
    clearTimeout(timer);
    if (!document.documentElement.classList.contains('horror') || count >= MAX) return;
    timer = setTimeout(() => {
      if (canScare()) { doScare(); count += 1; }
      schedule();
    }, 40000 + Math.random() * 50000);
  }
  function scheduleMirror() {
    clearInterval(mirrorTimer);
    if (!document.documentElement.classList.contains('horror') || reducedMotion.matches) return;
    mirrorTimer = setInterval(() => {
      const r = document.getElementById('heroFigure')?.getBoundingClientRect();
      if (r && r.bottom > 0 && r.top < window.innerHeight && !isModalOpen()) document.dispatchEvent(new Event('mirror:flash'));
    }, 18000);
  }

  function set(on, byUser) {
    document.documentElement.classList.toggle('horror', on);
    toggle.setAttribute('aria-pressed', String(on));
    store.set(on);
    if (on) {
      if (byUser) {
        try {
          audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
          audioCtx.resume();
        } catch { audioCtx = null; }
        document.dispatchEvent(new Event('mirror:flash'));
        document.dispatchEvent(new CustomEvent('toast', { detail: 'Усиленный хоррор включён. Иногда из тьмы будет выглядывать она.' }));
      }
      schedule();
      scheduleMirror();
    } else {
      clearTimeout(timer);
      clearInterval(mirrorTimer);
      if (byUser) document.dispatchEvent(new CustomEvent('toast', { detail: 'Усиленный хоррор выключен.' }));
    }
  }
  toggle.addEventListener('click', () => set(toggle.getAttribute('aria-pressed') !== 'true', true));
  if (store.get()) set(true, false);
}
