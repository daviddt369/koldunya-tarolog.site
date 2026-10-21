// Крупное видео в модальном окне (обряд / видеоотзыв / приветствие) — со звуком.
import { hub } from './media-hub.js';
import { openModal } from './modal.js';
import { likeRowHTML, syncLikes } from './rating.js';

const modal = document.getElementById('videoModal');
const panel = document.getElementById('vmPanel');
const video = document.getElementById('vmVideo');
const info = document.getElementById('vmInfo');
const els = {
  eyebrow: document.getElementById('vmEyebrow'),
  title: document.getElementById('vmTitle'),
  dir: document.getElementById('vmDir'),
  text: document.getElementById('vmText'),
  cta: document.getElementById('vmCta'),
};

function stop() {
  video.pause();
  video.removeAttribute('src');
  video.removeAttribute('poster');
  video.load();
}

hub.register('modal-video', () => video.pause());

/**
 * @param {{src:string, poster?:string, title:string, eyebrow?:string, dir?:string, text?:string, cta?:{href:string,label?:string}|null}} o
 */
export function openVideo(o) {
  const solo = !o.dir && !o.text && !o.cta;
  panel.classList.toggle('solo', solo);
  els.eyebrow.textContent = o.eyebrow || '';
  els.title.textContent = o.title;
  els.dir.textContent = o.dir || '';
  els.dir.hidden = !o.dir;
  els.text.textContent = o.text || '';
  els.text.hidden = !o.text;
  els.cta.hidden = !o.cta;
  if (o.cta) els.cta.href = o.cta.href;
  info.hidden = solo;
  // название остаётся доступным для скринридера и в «solo»-режиме
  modal.setAttribute('aria-label', o.title);

  const likeBox = document.getElementById('vmLikeBox');
  likeBox.hidden = !o.likeKey;
  likeBox.innerHTML = o.likeKey ? likeRowHTML(o.likeKey, 'Нравится отзыв') : '';
  if (o.likeKey) syncLikes();

  video.muted = false;
  video.volume = 1;
  if (o.poster) video.poster = o.poster;
  video.src = o.src;
  openModal(modal, { onClose: stop });
  hub.claim('modal-video');
  const p = video.play();
  if (p && p.catch) p.catch(() => {}); // если автозапуск заблокирован — доступны родные кнопки плеера
}
