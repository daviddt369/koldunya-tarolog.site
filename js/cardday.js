// Карта дня: затемнение → видео-вступление → появление карты → переворот → название и значение.
import { TAROT, waLink } from './data.js';
import { hub } from './media-hub.js';
import { openModal } from './modal.js';

const G = '#c9a15a';
const GH = '#e8cd8f';
const R = '#8e1224';

const ray = (n, r1, r2, cx = 100, cy = 160) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return `M${(cx + Math.cos(a) * r1).toFixed(1)} ${(cy + Math.sin(a) * r1).toFixed(1)}L${(cx + Math.cos(a) * r2).toFixed(1)} ${(cy + Math.sin(a) * r2).toFixed(1)}`;
  }).join('');
const starPts = (n, ro, ri, cx = 100, cy = 160) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? ri : ro;
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');

// эмблемы в центре карты (центр 100,160)
const EMBLEM = {
  sun: () => `<circle cx="100" cy="160" r="22" fill="${GH}"/><path d="${ray(16, 30, 52)}" stroke="${G}" stroke-width="3" stroke-linecap="round"/><circle cx="100" cy="160" r="60" fill="none" stroke="${G}" stroke-width="1"/>`,
  moon: () => `<path d="M118 108A52 52 0 1 0 118 212A40 40 0 1 1 118 108z" fill="${GH}"/><polygon points="${starPts(4, 9, 3, 140, 130)}" fill="${G}"/><polygon points="${starPts(4, 6, 2, 150, 188)}" fill="${G}"/>`,
  star: () => `<polygon points="${starPts(8, 52, 16)}" fill="${GH}" stroke="${G}" stroke-width="1.5"/><circle cx="100" cy="160" r="62" fill="none" stroke="${G}" stroke-width="1" stroke-dasharray="2 5"/>`,
  wand: () => `<path d="M100 110V232" stroke="${GH}" stroke-width="5" stroke-linecap="round"/><polygon points="${starPts(5, 22, 9, 100, 96)}" fill="${GH}"/><path d="M82 150h36M86 190h28" stroke="${G}" stroke-width="3" stroke-linecap="round"/><circle cx="100" cy="170" r="30" fill="none" stroke="${G}" stroke-width="1" stroke-dasharray="2 5"/>`,
  rose: () => `<g fill="none" stroke="${G}" stroke-width="2">${[0, 60, 120].map((a) => `<ellipse cx="100" cy="160" rx="16" ry="48" transform="rotate(${a} 100 160)"/>`).join('')}<circle cx="100" cy="160" r="9" fill="${R}"/></g>`,
  crown: () => `<path d="M58 196L58 124L82 156L100 112L118 156L142 124L142 196z" fill="${R}" stroke="${GH}" stroke-width="3" stroke-linejoin="round"/><path d="M58 208h84" stroke="${GH}" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="176" r="7" fill="${GH}"/>`,
  key: () => `<circle cx="100" cy="116" r="22" fill="none" stroke="${GH}" stroke-width="6"/><path d="M100 138V226M100 190h20M100 210h14" stroke="${GH}" stroke-width="6" stroke-linecap="round"/><circle cx="100" cy="116" r="7" fill="${R}"/>`,
  heart: () => `<path d="M100 220C34 176 46 108 100 140C154 108 166 176 100 220z" fill="${R}" stroke="${GH}" stroke-width="3"/><path d="M70 100l8 12 14-4M130 100l-8 12-14-4" stroke="${G}" stroke-width="2" fill="none"/>`,
  wheel: () => `<circle cx="100" cy="160" r="50" fill="none" stroke="${GH}" stroke-width="5"/><circle cx="100" cy="160" r="12" fill="${R}" stroke="${GH}" stroke-width="3"/><path d="${ray(8, 12, 50)}" stroke="${G}" stroke-width="3"/><path d="${ray(8, 50, 62)}" stroke="${G}" stroke-width="3" stroke-linecap="round"/>`,
  serpent: () => `<path d="M126 112C80 108 72 148 104 160S134 214 84 214" fill="none" stroke="${GH}" stroke-width="9" stroke-linecap="round"/><circle cx="132" cy="112" r="6" fill="${R}"/><path d="M138 112l12-4M138 114l12 4" stroke="${R}" stroke-width="2"/>`,
  lantern: () => `<path d="M82 120h36l8 20v62H74v-62z" fill="none" stroke="${GH}" stroke-width="4" stroke-linejoin="round"/><path d="M90 120a10 10 0 0120 0M72 212h56" stroke="${GH}" stroke-width="4" stroke-linecap="round"/><path d="M100 148c14 12 12 30 0 38-12-8-14-26 0-38z" fill="${R}" stroke="${GH}" stroke-width="2"/>`,
  scales: () => `<path d="M100 100v120M62 128h76M82 220h36" stroke="${GH}" stroke-width="4" stroke-linecap="round"/><path d="M62 128l-18 44h36zM138 128l-18 44h36z" fill="none" stroke="${G}" stroke-width="3" stroke-linejoin="round"/><path d="M44 172a18 10 0 0036 0M120 172a18 10 0 0036 0" fill="${R}" stroke="${G}" stroke-width="3"/>`,
  eye: () => `<path d="M40 160C66 118 134 118 160 160C134 202 66 202 40 160z" fill="none" stroke="${GH}" stroke-width="4"/><circle cx="100" cy="160" r="22" fill="${R}" stroke="${GH}" stroke-width="3"/><circle cx="100" cy="160" r="9" fill="#000"/><path d="${ray(12, 62, 76)}" stroke="${G}" stroke-width="2" stroke-linecap="round"/>`,
  skull: () => `<path d="M62 160a38 40 0 0176 0c0 14-6 22-12 28v18H74v-18c-6-6-12-14-12-28z" fill="none" stroke="${GH}" stroke-width="4" stroke-linejoin="round"/><circle cx="85" cy="160" r="9" fill="${R}"/><circle cx="115" cy="160" r="9" fill="${R}"/><path d="M100 172l-5 12h10zM86 206v-14M100 206v-14M114 206v-14" stroke="${GH}" stroke-width="3" stroke-linecap="round"/>`,
  cup: () => `<path d="M64 118h72c0 40-14 62-36 66-22-4-36-26-36-66z" fill="${R}" stroke="${GH}" stroke-width="4" stroke-linejoin="round"/><path d="M100 184v32M76 220h48" stroke="${GH}" stroke-width="5" stroke-linecap="round"/><path d="M70 134h60" stroke="${GH}" stroke-width="2"/>`,
  horns: () => `<circle cx="100" cy="170" r="32" fill="none" stroke="${GH}" stroke-width="4"/><path d="M76 146C56 136 56 106 70 94M124 146C144 136 144 106 130 94" fill="none" stroke="${GH}" stroke-width="5" stroke-linecap="round"/><polygon points="${starPts(5, 20, 8, 100, 170)}" fill="${R}" stroke="${G}"/>`,
  tower: () => `<path d="M76 222V124h-6v-18h14v10h10v-10h12v10h10v-10h14v18h-6v98z" fill="none" stroke="${GH}" stroke-width="4" stroke-linejoin="round"/><path d="M100 138l-14 28h20l-16 34" fill="none" stroke="${R}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><rect x="94" y="196" width="12" height="26" fill="none" stroke="${G}" stroke-width="2"/>`,
  trumpet: () => `<path d="M58 170l56-28v56z" fill="${GH}" stroke="${G}" stroke-width="3" stroke-linejoin="round"/><path d="M114 142v56" stroke="${G}" stroke-width="3"/><path d="M128 126l16-12M132 170h22M128 214l16 12" stroke="${G}" stroke-width="3" stroke-linecap="round"/>`,
  wreath: () => `<g fill="${G}">${Array.from({ length: 20 }, (_, i) => { const a = (i / 20) * Math.PI * 2; return `<ellipse cx="${(100 + Math.cos(a) * 48).toFixed(1)}" cy="${(160 + Math.sin(a) * 64).toFixed(1)}" rx="9" ry="4.5" transform="rotate(${((a * 180) / Math.PI + 90).toFixed(0)} ${(100 + Math.cos(a) * 48).toFixed(1)} ${(160 + Math.sin(a) * 64).toFixed(1)})"/>`; }).join('')}</g><polygon points="100,128 118,160 100,192 82,160" fill="${R}" stroke="${GH}" stroke-width="3"/>`,
};

function faceSVG(card) {
  const long = card.name.length > 11;
  return `<svg viewBox="0 0 200 320" role="img" aria-label="${card.name}">
    <defs><radialGradient id="cf" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#2a0c12"/><stop offset="1" stop-color="#0a0405"/></radialGradient></defs>
    <rect x="3" y="3" width="194" height="314" rx="14" fill="url(#cf)" stroke="${G}" stroke-width="2"/>
    <rect x="12" y="12" width="176" height="296" rx="9" fill="none" stroke="#8a6a35" stroke-width="1"/>
    <text x="100" y="52" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-weight="700" font-size="26" fill="${GH}" letter-spacing="3">${card.n}</text>
    <path d="M40 66h120" stroke="${G}" stroke-width="1"/><path d="M40 254h120" stroke="${G}" stroke-width="1"/>
    <g>${EMBLEM[card.glyph]()}</g>
    <text x="100" y="283" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-weight="700" font-size="${long ? 15 : 19}" fill="${GH}" letter-spacing="${long ? 1.2 : 2.4}">${card.name.toUpperCase()}</text>
    <g fill="${G}"><circle cx="24" cy="24" r="2.4"/><circle cx="176" cy="24" r="2.4"/><circle cx="24" cy="296" r="2.4"/><circle cx="176" cy="296" r="2.4"/></g>
  </svg>`;
}

// Стабильная карта дня: зависит только от локальной даты
export function cardOfDay(date = new Date()) {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return TAROT[(h >>> 0) % TAROT.length];
}

export function initCardDay() {
  const modal = document.getElementById('cardModal');
  const stage = modal.querySelector('.cm-stage');
  const video = document.getElementById('cmVideo');
  const skip = document.getElementById('cmSkip');
  const tarot = document.getElementById('tarot');
  const front = document.getElementById('tarotFront');
  const meaning = document.getElementById('cmMeaning');
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clear = () => { timers.splice(0).forEach(clearTimeout); };

  hub.register('card-video', () => video.pause());

  function reveal() {
    if (stage.dataset.stage === 'card') return;
    video.pause();
    stage.dataset.stage = 'card';
    later(() => tarot.classList.add('flipped'), 1100);
    later(() => meaning.classList.add('shown'), 2300);
    skip.blur();
  }

  function onClose() {
    clear();
    video.pause();
    video.removeAttribute('src');
    video.load();
  }

  function open() {
    const card = cardOfDay();
    front.innerHTML = faceSVG(card);
    document.getElementById('cmName').textContent = card.name;
    document.getElementById('cmText').textContent = card.text;
    document.getElementById('cmDate').textContent = `Карта дня · ${new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    document.getElementById('cmCta').href = waLink(`Здравствуйте, Изабелла! Моя карта дня — «${card.name}». Хочу узнать, что она значит для меня.`);
    clear();
    tarot.classList.remove('flipped');
    meaning.classList.remove('shown');
    stage.dataset.stage = 'intro';
    video.muted = false;
    video.src = './media/special/card-day.mp4';
    openModal(modal, { onClose });
    hub.claim('card-video');
    const p = video.play();
    if (p && p.catch) p.catch(() => {
      video.muted = true; // автозапуск со звуком не разрешён — пробуем без звука
      const q = video.play();
      if (q && q.catch) q.catch(() => {});
    });
  }

  video.addEventListener('ended', reveal);
  skip.addEventListener('click', reveal);
  video.addEventListener('click', () => (video.paused ? video.play() : video.pause()));
  document.querySelectorAll('[data-open-card]').forEach((b) => b.addEventListener('click', open));
}
