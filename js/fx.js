// Атмосфера: пепел, свет за курсором, параллакс, зеркало, режим усиленного хоррора и редкий скример.
import { reducedMotion } from './media-hub.js';
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
  const halo = document.getElementById('mirrorHalo');
  if (!mirror) return;
  const touchOnly = window.matchMedia('(hover: none)');
  let t = 0;
  const set = (on) => {
    if (on) mirror.classList.remove('blink'); // наведение/касание важнее самостоятельного мигания
    mirror.classList.toggle('active', on);
    mirror.setAttribute('aria-pressed', String(on));
    if (halo) halo.classList.toggle('on', on);
  };
  const flash = (ms) => {
    set(true);
    clearTimeout(t);
    t = setTimeout(() => set(false), ms);
  };
  mirror.addEventListener('pointerenter', () => mirror.classList.remove('blink'));
  mirror.addEventListener('click', () => {
    if (halo) halo.classList.add('used'); // подсказка-мерцание на сенсорных экранах больше не нужна
    // касание: первое показывает отражение и держит его, повторное убирает; мышь: короткая вспышка (основное — наведение)
    if (touchOnly.matches) { if (mirror.classList.contains('active')) { clearTimeout(t); set(false); } else flash(7000); }
    else flash(1800);
  });

  // Отражение само «мигает» время от времени — без наведения и касания
  let bt = 0;
  const blink = () => {
    const fig = document.getElementById('heroFigure');
    const r = fig && fig.getBoundingClientRect();
    if (r && r.bottom > 80 && r.top < window.innerHeight * 0.85 && !document.hidden && !isModalOpen() && !mirror.classList.contains('active')) {
      mirror.classList.add('blink');
      if (halo) halo.classList.add('on');
      setTimeout(() => { mirror.classList.remove('blink'); if (halo && !mirror.classList.contains('active')) halo.classList.remove('on'); }, 2400);
    }
    bt = setTimeout(blink, 5500 + Math.random() * 4500);
  };
  if (!reducedMotion.matches) bt = setTimeout(blink, 2600);
}
