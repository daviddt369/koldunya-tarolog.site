// Обряды: круглые видеосферы. Играют без звука, только в области видимости; по нажатию — крупное видео со звуком.
import { RITUALS, waLink } from './data.js';
import { reducedMotion, saveData } from './media-hub.js';
import { isModalOpen } from './modal.js';
import { openVideo } from './video-modal.js';
import { initOrbFx } from './orb-fx.js';

const MAX_LIVE = window.innerWidth < 700 ? 6 : 8;
const DESC = 'Каждая судьба индивидуальна. Каждый случай требует особого подхода.';
const CONF = '📩 Личные консультации. Строгая конфиденциальность.';

export function initOrbs() {
  const grid = document.getElementById('orbGrid');
  if (!grid) return;

  grid.innerHTML = RITUALS.map(
    (r) => `
    <li class="orb-card" data-slug="${r.slug}">
      <button class="orb" type="button" aria-label="Открыть обряд «${r.title}» со звуком">
        <span class="orb-ring" aria-hidden="true"></span>
        <span class="orb-inner">
          <img src="./media/rituals/${r.slug}-orb.webp" width="320" height="320" alt="" loading="lazy" decoding="async">
          <video muted loop playsinline preload="none" disablepictureinpicture data-src="./media/rituals/${r.slug}-orb.mp4"></video>
        </span>
        <span class="orb-play" aria-hidden="true"><svg class="ico" width="24" height="24"><use href="#i-play"/></svg></span>
      </button>
      <h3 class="orb-title">${r.title}</h3>
      <p class="orb-dir">${r.dir}</p>
      <button class="orb-more" type="button">Смотреть обряд</button>
    </li>`,
  ).join('');

  const open = (slug) => {
    const r = RITUALS.find((x) => x.slug === slug);
    openVideo({
      src: `./media/rituals/${r.slug}.mp4`,
      poster: `./media/rituals/${r.slug}.webp`,
      eyebrow: 'Обряд',
      title: r.title,
      dir: r.dir,
      text: `${DESC} ${CONF}`,
      cta: { href: waLink(`Здравствуйте, Изабелла! Хочу узнать про обряд «${r.title}».`) },
    });
  };
  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.orb-card');
    if (card && e.target.closest('.orb, .orb-more')) open(card.dataset.slug);
  });

  initOrbFx(grid);

  if (reducedMotion.matches || saveData()) return; // остаются постеры

  const live = [];
  const visible = new Set();

  const start = (v) => {
    if (document.hidden || isModalOpen()) return;
    if (!v.getAttribute('src')) v.src = v.dataset.src;
    v.addEventListener('playing', () => v.closest('.orb').classList.add('live'), { once: true });
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
    const i = live.indexOf(v);
    if (i >= 0) live.splice(i, 1);
    live.push(v);
    while (live.length > MAX_LIVE) live.shift().pause();
  };
  const stop = (v) => {
    v.pause();
    const i = live.indexOf(v);
    if (i >= 0) live.splice(i, 1);
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const v = e.target.querySelector('video');
        if (e.isIntersecting) {
          visible.add(v);
          start(v);
        } else {
          visible.delete(v);
          stop(v);
        }
      }
    },
    { rootMargin: '80px 0px', threshold: 0.2 },
  );
  grid.querySelectorAll('.orb').forEach((o) => io.observe(o));

  document.addEventListener('modal:open', () => live.slice().forEach(stop));
  document.addEventListener('modal:close', () => visible.forEach(start));
  document.addEventListener('visibilitychange', () => (document.hidden ? live.slice().forEach(stop) : visible.forEach(start)));
}
