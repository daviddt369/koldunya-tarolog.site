// Фотоотзывы: обычная горизонтальная карусель + просмотр отзыва крупно.
import { PHOTO_REVIEWS } from './data.js';
import { openModal } from './modal.js';

export async function initCarousel() {
  const track = document.getElementById('carTrack');
  const scroller = document.getElementById('carousel');
  if (!track) return;

  let dims = [];
  try {
    dims = await (await fetch('./media/reviews/photo/index.json')).json();
  } catch { /* размеры необязательны */ }

  const ids = Array.from({ length: PHOTO_REVIEWS }, (_, i) => String(i + 1).padStart(2, '0'));
  track.innerHTML = ids
    .map((id, i) => {
      const d = dims.find((x) => x.id === id);
      const size = d ? ` width="${d.w}" height="${d.h}"` : '';
      return `<li class="car-item"><button class="car-card" type="button" data-i="${i}" aria-label="Открыть отзыв ${i + 1} крупно">
        <img src="./media/reviews/photo/r${id}-s.webp"${size} alt="Скриншот отзыва клиента ${i + 1}" loading="${i < 3 ? 'eager' : 'lazy'}" decoding="async" draggable="false"></button></li>`;
    })
    .join('');

  const step = () => {
    const first = track.querySelector('.car-item');
    return first ? first.getBoundingClientRect().width + 16 : 300;
  };
  document.getElementById('carPrev').addEventListener('click', () => scroller.scrollBy({ left: -step() * 2, behavior: 'smooth' }));
  document.getElementById('carNext').addEventListener('click', () => scroller.scrollBy({ left: step() * 2, behavior: 'smooth' }));
  scroller.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); scroller.scrollBy({ left: step(), behavior: 'smooth' }); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); scroller.scrollBy({ left: -step(), behavior: 'smooth' }); }
  });

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
    idx = (i + ids.length) % ids.length;
    img.src = `./media/reviews/photo/r${ids[idx]}.webp`;
    img.alt = `Скриншот отзыва клиента ${idx + 1}`;
    count.textContent = `${idx + 1} / ${ids.length}`;
    setZoom(false);
  };

  track.addEventListener('click', (e) => {
    const card = e.target.closest('.car-card');
    if (!card) return;
    show(Number(card.dataset.i));
    openModal(modal, { onClose: () => (img.removeAttribute('src')) });
  });
  document.getElementById('pmPrev').addEventListener('click', () => show(idx - 1));
  document.getElementById('pmNext').addEventListener('click', () => show(idx + 1));
  zoomBtn.addEventListener('click', () => setZoom(!panel.classList.contains('zoomed')));
  img.addEventListener('click', () => setZoom(!panel.classList.contains('zoomed')));
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });
}
