// Видеоприветствие: самостоятельный блок после Hero. Постер → Play → видео со звуком прямо в блоке.
import { hub } from './media-hub.js';

const SRC = './media/special/greeting.mp4';
const POSTER = './media/special/greeting-poster.webp';

export function initGreeting() {
  const root = document.getElementById('gv');
  const video = document.getElementById('gvVideo');
  const btn = document.getElementById('gvPlay');
  if (!root || !video || !btn) return;

  hub.register('greeting', () => video.pause());

  btn.addEventListener('click', () => {
    hub.claim('greeting');
    if (!video.getAttribute('src')) {
      video.poster = POSTER;
      video.src = SRC;
    }
    video.muted = false;
    video.volume = 1;
    root.classList.remove('ended');
    root.classList.add('playing');
    const p = video.play();
    if (p && p.catch) p.catch(() => {}); // родные кнопки плеера остаются доступны
    video.focus({ preventScroll: true });
  });

  video.addEventListener('ended', () => {
    root.classList.remove('playing');
    root.classList.add('ended');
    btn.setAttribute('aria-label', 'Смотреть видеоприветствие снова');
    video.currentTime = 0;
  });

  // Ушли от блока — видео ставится на паузу (не звучит «в пустоту»)
  new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting && !video.paused) video.pause();
  }, { threshold: 0 }).observe(root);
}
