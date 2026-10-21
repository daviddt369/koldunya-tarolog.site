// Фотоотзывы: бесконечная автокарусель с едиными карточками (изображения не обрезаются) + просмотр отзыва крупно.
import { PHOTO_REVIEWS } from './data.js';
import { reducedMotion } from './media-hub.js';
import { isModalOpen, openModal } from './modal.js';
import { likeRowHTML, syncLikes } from './rating.js';

/** Настройки компонента. */
export const CAROUSEL_CONFIG = {
  pxPerSecond: 42, // скорость автодвижения
  easeIn: 0.6, // плавность разгона / остановки, с
  inertia: 0.9, // затухание инерции после броска, с
  resumeDelay: 1600, // пауза перед возобновлением после ручной прокрутки, мс
};

export function initCarousel() {
  const track = document.getElementById('carTrack');
  const viewport = document.getElementById('carousel');
  if (!track) return;
  const cfg = { ...CAROUSEL_CONFIG };

  const n = PHOTO_REVIEWS;
  const ids = Array.from({ length: n }, (_, i) => String(i + 1).padStart(2, '0'));
  const card = (id, i, clone) => `<li class="car-item"${clone ? ' aria-hidden="true"' : ''}><button class="car-card" type="button" data-i="${i}"${clone ? ' tabindex="-1"' : ''} aria-label="Открыть отзыв ${i + 1} крупно">
      <span class="car-img"><img src="./media/reviews/photo/r${id}-s.webp" alt="${clone ? '' : `Скриншот отзыва клиента ${i + 1}`}" loading="${i < 4 ? 'eager' : 'lazy'}" decoding="async" draggable="false"></span>
      <span class="car-cap">Читать целиком</span></button>${likeRowHTML(`photo-${i + 1}`, `Нравится отзыв ${i + 1}`, clone)}</li>`;
  // три одинаковых набора: [-W, 0, +W] — бесшовный круг
  track.innerHTML = [0, 1, 2].map((s) => ids.map((id, i) => card(id, i, s !== 1)).join('')).join('');
  syncLikes();

  // ---- геометрия ----
  let W = 0; // ширина одного набора
  let lead = 0; // отступ слева до первой карточки основного набора
  function measure() {
    const kids = track.children;
    W = kids[n].offsetLeft - kids[0].offsetLeft;
    lead = Math.max(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter')) || 16, (viewport.clientWidth - 1200) / 2);
    apply();
  }

  // ---- состояние ----
  let pos = 0; // 0..W
  let vel = 0; // px/с
  let dragging = false;
  let hover = false;
  let kbPause = false;
  let inView = false;
  let nav = null;
  let resumeAt = 0;
  let last = 0;
  let raf = 0;

  const wantAuto = () => !reducedMotion.matches && !hover && !dragging && !kbPause && !isModalOpen() && performance.now() >= resumeAt;
  function apply() {
    if (W) pos = ((pos % W) + W) % W;
    track.style.transform = `translate3d(${(lead - W - pos).toFixed(2)}px, 0, 0)`;
  }
  function frame(t) {
    raf = requestAnimationFrame(frame);
    const dt = Math.max(0, Math.min(0.05, (t - last) / 1000 || 0));
    last = t;
    if (nav) {
      const k = Math.min(1, (t - nav.t0) / nav.dur);
      pos = nav.from + (nav.to - nav.from) * (1 - (1 - k) ** 3);
      vel = 0;
      if (k >= 1) nav = null;
    } else if (!dragging) {
      const target = wantAuto() ? cfg.pxPerSecond : 0;
      const tau = Math.abs(vel) > Math.abs(target) + 20 ? cfg.inertia : cfg.easeIn;
      vel += (target - vel) * (1 - Math.exp(-dt / tau));
      if (Math.abs(vel) < 0.2 && target === 0) vel = 0;
      pos += vel * dt;
    }
    apply();
  }
  const run = () => { if (!raf && inView && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  const halt = () => { cancelAnimationFrame(raf); raf = 0; };
  const slideBy = (px) => { nav = { from: pos, to: pos + px, t0: performance.now(), dur: 650 }; resumeAt = performance.now() + cfg.resumeDelay; run(); };
  const cardStep = () => track.children[1].offsetLeft - track.children[0].offsetLeft;

  document.getElementById('carPrev').addEventListener('click', () => slideBy(-cardStep() * 2));
  document.getElementById('carNext').addEventListener('click', () => slideBy(cardStep() * 2));

  // ---- наведение, перетаскивание, свайп, колесо ----
  viewport.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hover = true; });
  viewport.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hover = false; end(); } });
  let sx = 0;
  let lx = 0;
  let lt = 0;
  let pv = 0;
  let moved = 0;
  let suppress = false;
  viewport.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true; nav = null; moved = 0; sx = lx = e.clientX; lt = performance.now(); pv = 0;
    run();
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lx;
    moved = Math.max(moved, Math.abs(e.clientX - sx));
    if (moved > 6 && !viewport.classList.contains('dragging')) {
      viewport.classList.add('dragging');
      try { viewport.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    const now = performance.now();
    pos -= dx;
    pv = pv * 0.6 + ((-dx / Math.max(1, now - lt)) * 1000) * 0.4;
    lx = e.clientX; lt = now;
    apply();
  });
  function end() {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove('dragging');
    suppress = moved > 6;
    vel = Math.max(-1800, Math.min(1800, pv));
    resumeAt = performance.now() + cfg.resumeDelay;
    setTimeout(() => { suppress = false; }, 60);
  }
  viewport.addEventListener('pointerup', end);
  viewport.addEventListener('pointercancel', end);
  viewport.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 3) {
      e.preventDefault();
      pos += e.deltaX;
      resumeAt = performance.now() + cfg.resumeDelay;
      apply();
    }
  }, { passive: false });

  // ---- клавиатура: движение стоит, пока фокус внутри ----
  viewport.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); kbPause = true; slideBy(cardStep()); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); kbPause = true; slideBy(-cardStep()); }
  });
  viewport.addEventListener('focusin', (e) => { if (e.target.matches(':focus-visible')) kbPause = true; });
  viewport.addEventListener('focusout', (e) => {
    if (!viewport.contains(e.relatedTarget)) { kbPause = false; resumeAt = performance.now() + cfg.resumeDelay; }
  });

  new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
    if (inView) run(); else halt();
  }, { threshold: 0.05 }).observe(viewport);
  document.addEventListener('visibilitychange', () => { if (document.hidden) halt(); else run(); });
  document.addEventListener('modal:close', () => { resumeAt = performance.now() + cfg.resumeDelay; });
  window.addEventListener('resize', measure);
  // картинки не влияют на геометрию (карточки фиксированного размера) — достаточно одного замера
  measure();
  viewport.carousel = { get pos() { return pos; }, get velocity() { return vel; }, get period() { return W; }, jump(px) { pos = px; apply(); }, config: cfg };

  // ---- просмотр крупно ----
  const modal = document.getElementById('photoModal');
  const panel = modal.querySelector('.photo-panel');
  const img = document.getElementById('pmImg');
  const scroll = document.getElementById('pmScroll');
  const count = document.getElementById('pmCount');
  const zoomBtn = document.getElementById('pmZoom');
  let idx = 0;

  const setZoom = (on) => {
    panel.classList.toggle('zoomed', on);
    zoomBtn.textContent = on ? 'Уменьшить' : 'Увеличить';
    scroll.scrollTo(0, 0);
  };
  const show = (i) => {
    idx = (i + n) % n;
    img.src = `./media/reviews/photo/r${ids[idx]}.webp`;
    img.alt = `Скриншот отзыва клиента ${idx + 1}`;
    count.textContent = `${idx + 1} / ${n}`;
    setZoom(false);
  };

  track.addEventListener('click', (e) => {
    const c = e.target.closest('.car-card');
    if (!c || suppress) return;
    show(Number(c.dataset.i));
    openModal(modal, { onClose: () => img.removeAttribute('src') });
  });
  document.getElementById('pmPrev').addEventListener('click', () => show(idx - 1));
  document.getElementById('pmNext').addEventListener('click', () => show(idx + 1));
  zoomBtn.addEventListener('click', () => setZoom(!panel.classList.contains('zoomed')));
  img.addEventListener('click', () => setZoom(!panel.classList.contains('zoomed')));
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });

  // свайп внутри просмотра (когда изображение не увеличено)
  let tx = 0;
  scroll.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  scroll.addEventListener('touchend', (e) => {
    if (panel.classList.contains('zoomed')) return;
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 60) show(idx + (dx < 0 ? 1 : -1));
  }, { passive: true });
}
