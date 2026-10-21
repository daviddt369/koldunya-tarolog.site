// Видеоотзывы: круговая 360° 3D-карусель. Все карточки стоят по окружности и непрерывно вращаются.
// Нажатие на карточку — крупный просмотр со звуком; пауза сохраняет текущий угол.
import { VIDEO_REVIEWS } from './data.js';
import { reducedMotion, saveData } from './media-hub.js';
import { isModalOpen } from './modal.js';
import { openVideo } from './video-modal.js';

/** Настройки компонента. Скорость можно переопределить атрибутом data-seconds-per-turn у #flow. */
export const FLOW_CONFIG = {
  secondsPerTurn: 55, // один полный оборот
  clockwise: false, // false: карточки уходят влево
  gap: 130, // дополнительный зазор между карточками на окружности, px (на телефонах уменьшается)
  dragDegPerPx: 0.32, // чувствительность перетаскивания
  inertia: 0.9, // постоянная времени затухания инерции, с
  easeIn: 0.55, // плавность разгона / остановки автовращения, с
  resumeDelay: 400, // пауза перед возобновлением после отпускания, мс
};

export function initFlow() {
  const root = document.getElementById('flow');
  const stage = document.getElementById('flowStage');
  const prevBtn = document.getElementById('flowPrev');
  const nextBtn = document.getElementById('flowNext');
  const count = document.getElementById('flowCount');
  if (!root) return;

  const cfg = { ...FLOW_CONFIG };
  const attr = Number(root.dataset.secondsPerTurn);
  if (attr > 0) cfg.secondsPerTurn = attr;

  const ids = Array.from({ length: VIDEO_REVIEWS }, (_, i) => String(i + 1).padStart(2, '0'));
  const n = ids.length;
  const step = 360 / n;
  stage.innerHTML = ids
    .map(
      (id, i) => `
    <button class="fl-item" type="button" data-i="${i}" aria-label="Видеоотзыв ${i + 1}: смотреть со звуком">
      <img src="./media/reviews/video/v${id}.webp" width="480" height="848" alt="" loading="lazy" decoding="async" draggable="false">
      <video muted loop playsinline preload="none" disablepictureinpicture data-src="./media/reviews/video/v${id}.mp4"></video>
      <span class="fl-shade" aria-hidden="true"></span>
      <span class="fl-play" aria-hidden="true"><svg class="ico"><use href="#i-play"/></svg></span>
      <span class="fl-label">Видеоотзыв ${i + 1}</span>
    </button>`,
    )
    .join('');
  const items = [...stage.children];
  const shades = items.map((el) => el.querySelector('.fl-shade'));

  // ---- геометрия: радиус окружности по числу и ширине карточек ----
  let radius = 320;
  function layout() {
    const w = items[0].offsetWidth;
    const gap = window.innerWidth < 700 ? Math.round(cfg.gap * 0.45) : cfg.gap;
    radius = Math.round(w / 2 / Math.tan(Math.PI / n) + gap);
    items.forEach((el, i) => {
      el.style.transform = `translate(-50%, -50%) rotateY(${i * step}deg) translateZ(${radius}px)`;
    });
    render();
  }

  // ---- состояние вращения ----
  let angle = 0; // текущий угол кольца, градусы
  let vel = 0; // текущая скорость, град/с
  let dragging = false;
  let hover = false;
  let kbPause = false;
  let inView = false;
  let navAnim = null;
  let resumeAt = 0;
  let last = 0;
  let raf = 0;
  let front = -1;

  const autoSpeed = () => (360 / cfg.secondsPerTurn) * (cfg.clockwise ? 1 : -1);
  const wantAuto = () => !reducedMotion.matches && !hover && !dragging && !kbPause && !isModalOpen() && performance.now() >= resumeAt;
  const norm180 = (a) => ((((a + 180) % 360) + 360) % 360) - 180;

  function render() {
    stage.style.transform = `translateZ(${-radius}px) rotateY(${angle.toFixed(3)}deg)`;
    let best = 0;
    let bestAbs = 999;
    items.forEach((el, i) => {
      const phi = norm180(i * step + angle); // угол карточки относительно зрителя
      const a = Math.abs(phi);
      if (a < bestAbs) { bestAbs = a; best = i; }
      shades[i].style.opacity = (Math.min(1, a / 100) * 0.62).toFixed(3);
      el.style.opacity = a > 62 ? Math.max(0, (92 - a) / 30).toFixed(3) : '1';
      el.style.pointerEvents = a > 88 ? 'none' : '';
    });
    if (best !== front) {
      front = best;
      count.textContent = `${front + 1} / ${n}`;
      updatePreview();
    }
  }

  function frame(t) {
    raf = requestAnimationFrame(frame);
    const dt = Math.max(0, Math.min(0.05, (t - last) / 1000 || 0));
    last = t;
    if (navAnim) {
      const k = Math.min(1, (t - navAnim.t0) / navAnim.dur);
      const e = 1 - (1 - k) ** 3;
      angle = navAnim.from + (navAnim.to - navAnim.from) * e;
      vel = 0;
      if (k >= 1) navAnim = null;
    } else if (!dragging) {
      const target = wantAuto() ? autoSpeed() : 0;
      const tau = Math.abs(vel) > Math.abs(target) + 1 ? cfg.inertia : cfg.easeIn;
      vel += (target - vel) * (1 - Math.exp(-dt / tau));
      if (Math.abs(vel) < 0.01 && target === 0) vel = 0;
      angle += vel * dt;
    }
    render();
  }
  function run() { if (!raf && inView && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function halt() { cancelAnimationFrame(raf); raf = 0; }

  function turnTo(target) {
    navAnim = { from: angle, to: target, t0: performance.now(), dur: 750 };
    run();
  }
  function stepBy(dir) {
    const idx = Math.round(-angle / step) + dir; // dir=+1: следующий отзыв
    turnTo(-idx * step);
  }
  function focusOn(i) {
    // кратчайший поворот к карточке i
    const base = -i * step;
    const k = Math.round((angle - base) / 360);
    turnTo(base + k * 360);
  }

  prevBtn.addEventListener('click', () => stepBy(-1));
  nextBtn.addEventListener('click', () => stepBy(1));

  // ---- наведение мыши ----
  root.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hover = true; });
  root.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hover = false; end(e); } });

  // ---- перетаскивание мышью / свайп пальцем ----
  let sx = 0;
  let lx = 0;
  let lt = 0;
  let pv = 0;
  let moved = 0;
  let suppressClick = false;
  root.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.flow-nav') || (e.pointerType === 'mouse' && e.button !== 0)) return;
    dragging = true;
    navAnim = null;
    moved = 0; sx = lx = e.clientX; lt = performance.now(); pv = 0;
    run();
  });
  root.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lx;
    moved = Math.max(moved, Math.abs(e.clientX - sx));
    if (moved > 6 && !root.classList.contains('dragging')) {
      root.classList.add('dragging');
      try { root.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    const now = performance.now();
    const deg = dx * cfg.dragDegPerPx;
    angle += deg;
    const dtm = Math.max(1, now - lt);
    pv = pv * 0.6 + ((deg / dtm) * 1000) * 0.4;
    lx = e.clientX; lt = now;
  });
  function end() {
    if (!dragging) return;
    dragging = false;
    root.classList.remove('dragging');
    suppressClick = moved > 6;
    vel = Math.max(-240, Math.min(240, pv));
    resumeAt = performance.now() + cfg.resumeDelay;
    setTimeout(() => { suppressClick = false; }, 60);
  }
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);
  root.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 4) {
      e.preventDefault();
      angle -= e.deltaX * 0.12;
      resumeAt = performance.now() + 900;
    }
  }, { passive: false });

  // ---- клавиатура: автовращение приостанавливается, пока фокус внутри ----
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); kbPause = true; stepBy(1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); kbPause = true; stepBy(-1); }
  });
  root.addEventListener('focusin', (e) => {
    if (!e.target.matches(':focus-visible')) return;
    kbPause = true;
    const card = e.target.closest('.fl-item');
    if (card) focusOn(Number(card.dataset.i));
  });
  root.addEventListener('focusout', (e) => {
    if (!root.contains(e.relatedTarget)) { kbPause = false; resumeAt = performance.now() + cfg.resumeDelay; }
  });

  // ---- нажатие на карточку ----
  stage.addEventListener('click', (e) => {
    const el = e.target.closest('.fl-item');
    if (!el || suppressClick) return;
    const i = Number(el.dataset.i);
    openVideo({ src: `./media/reviews/video/v${ids[i]}.mp4`, poster: `./media/reviews/video/v${ids[i]}.webp`, title: `Видеоотзыв ${i + 1}`, eyebrow: 'Реальный клиент', likeKey: `video-${i + 1}` });
  });

  // ---- беззвучный предпросмотр у карточки, стоящей перед зрителем ----
  function updatePreview() {
    items.forEach((el, i) => {
      const v = el.querySelector('video');
      if (i === front && inView && !isModalOpen() && !document.hidden && !reducedMotion.matches && !saveData()) {
        if (!v.getAttribute('src')) v.src = v.dataset.src;
        v.addEventListener('playing', () => el.classList.add('live'), { once: true });
        const p = v.play();
        if (p && p.catch) p.catch(() => {});
      } else if (!v.paused) {
        v.pause();
        el.classList.remove('live');
      }
    });
  }

  new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
    if (inView) run(); else halt();
    updatePreview();
  }, { threshold: 0.15 }).observe(root);
  document.addEventListener('modal:open', updatePreview);
  document.addEventListener('modal:close', () => { resumeAt = performance.now() + cfg.resumeDelay; updatePreview(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) halt(); else run(); updatePreview(); });
  window.addEventListener('resize', layout);

  layout();
  // чтобы при первом показе передней была первая карточка
  angle = 0;
  render();
  /* для тестов и отладки */
  root.flow = { get angle() { return angle; }, get velocity() { return vel; }, get radius() { return radius; }, config: cfg };
}
