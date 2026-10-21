// Видеоотзывы: 3D Coverflow. Центральное видео — беззвучный превью-цикл, по нажатию — крупно со звуком.
import { VIDEO_REVIEWS } from './data.js';
import { reducedMotion, saveData } from './media-hub.js';
import { isModalOpen } from './modal.js';
import { openVideo } from './video-modal.js';

export function initFlow() {
  const root = document.getElementById('flow');
  const stage = document.getElementById('flowStage');
  const prevBtn = document.getElementById('flowPrev');
  const nextBtn = document.getElementById('flowNext');
  const count = document.getElementById('flowCount');
  if (!root) return;

  const ids = Array.from({ length: VIDEO_REVIEWS }, (_, i) => String(i + 1).padStart(2, '0'));
  stage.innerHTML = ids
    .map(
      (id, i) => `
    <button class="fl-item" type="button" data-i="${i}" aria-label="Видеоотзыв ${i + 1}">
      <img src="./media/reviews/video/v${id}.webp" width="480" height="848" alt="" loading="lazy" decoding="async" draggable="false">
      <video muted loop playsinline preload="none" disablepictureinpicture data-src="./media/reviews/video/v${id}.mp4"></video>
      <span class="fl-shade" aria-hidden="true"></span>
      <span class="fl-play" aria-hidden="true"><svg class="ico"><use href="#i-play"/></svg></span>
      <span class="fl-label">Видеоотзыв ${i + 1}</span>
    </button>`,
    )
    .join('');
  const items = [...stage.children];

  let active = Math.min(2, ids.length - 1);
  let inView = false;

  function render() {
    items.forEach((el, i) => {
      const o = i - active;
      const a = Math.min(Math.abs(o), 3);
      el.style.setProperty('--o', String(Math.max(-3, Math.min(3, o))));
      el.style.setProperty('--a', String(a));
      el.style.setProperty('--s', String(Math.sign(o)));
      el.dataset.far = Math.abs(o) > 3 ? '1' : '0';
      el.classList.toggle('center', o === 0);
      el.tabIndex = Math.abs(o) > 3 ? -1 : 0;
      el.querySelector('.fl-play').style.display = o === 0 ? '' : 'none';
      el.setAttribute('aria-current', o === 0 ? 'true' : 'false');
    });
    prevBtn.disabled = active === 0;
    nextBtn.disabled = active === items.length - 1;
    prevBtn.style.opacity = prevBtn.disabled ? '0.35' : '';
    nextBtn.style.opacity = nextBtn.disabled ? '0.35' : '';
    count.textContent = `${active + 1} / ${items.length}`;
    updatePreview();
  }

  function updatePreview() {
    items.forEach((el, i) => {
      const v = el.querySelector('video');
      if (i === active && inView && !isModalOpen() && !document.hidden && !reducedMotion.matches && !saveData()) {
        if (!v.getAttribute('src')) v.src = v.dataset.src;
        v.addEventListener('playing', () => el.classList.add('live'), { once: true });
        const p = v.play();
        if (p && p.catch) p.catch(() => {});
      } else {
        v.pause();
        if (i !== active) el.classList.remove('live');
      }
    });
  }

  const go = (n) => {
    const t = Math.max(0, Math.min(items.length - 1, n));
    if (t !== active) {
      active = t;
      render();
    }
  };

  prevBtn.addEventListener('click', () => go(active - 1));
  nextBtn.addEventListener('click', () => go(active + 1));
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(active - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(active + 1); }
    else if (e.key === 'Home') { e.preventDefault(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); go(items.length - 1); }
  });

  // свайп / перетаскивание
  let sx = 0;
  let dx = 0;
  let down = false;
  let dragged = false;
  root.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.flow-nav')) return;
    down = true; dragged = false; sx = e.clientX; dx = 0;
  });
  root.addEventListener('pointermove', (e) => {
    if (!down) return;
    dx = e.clientX - sx;
    if (Math.abs(dx) > 10 && !dragged) {
      dragged = true;
      root.classList.add('dragging');
    }
  });
  const end = () => {
    if (!down) return;
    down = false;
    root.classList.remove('dragging');
    if (Math.abs(dx) > 45) go(active + (dx < 0 ? 1 : -1));
  };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);
  root.addEventListener('pointerleave', end);
  root.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 20) {
      e.preventDefault();
      go(active + (e.deltaX > 0 ? 1 : -1));
    }
  }, { passive: false });

  stage.addEventListener('click', (e) => {
    const el = e.target.closest('.fl-item');
    if (!el || dragged) {
      dragged = false;
      return;
    }
    const i = Number(el.dataset.i);
    if (i !== active) {
      go(i);
      return;
    }
    openVideo({ src: `./media/reviews/video/v${ids[i]}.mp4`, poster: `./media/reviews/video/v${ids[i]}.webp`, title: `Видеоотзыв ${i + 1}`, eyebrow: 'Реальный клиент' });
  });

  new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
    updatePreview();
  }, { threshold: 0.35 }).observe(root);
  document.addEventListener('modal:open', updatePreview);
  document.addEventListener('modal:close', updatePreview);
  document.addEventListener('visibilitychange', updatePreview);

  render();
}
