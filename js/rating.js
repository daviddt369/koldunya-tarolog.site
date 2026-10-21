// Отзывы: оценка звёздами и «нравится» под каждым отзывом. Состояние хранится только в браузере посетителя.
// Стартовые значения (средняя оценка и число оценок) — в REVIEWS_SEED (js/data.js).
import { REVIEWS_SEED } from './data.js';

const KEY = 'isabellaReviewState';

function load() {
  try {
    return { stars: 0, likes: {}, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { stars: 0, likes: {} };
  }
}
const state = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } };

/** HTML строки «Понравился отзыв? ♥ N». key — например photo-3 или video-2. */
export function likeRowHTML(key, label, hidden = false) {
  return `<div class="rv-like" data-key="${key}"><span class="like-lbl">Понравился отзыв?</span><button class="like-btn" type="button" aria-pressed="false" aria-label="${label}"${hidden ? ' tabindex="-1"' : ''}><svg class="ico" aria-hidden="true"><use href="#i-heart"/></svg></button><span class="like-n" aria-live="polite">0</span></div>`;
}

/** Обновляет все строки «нравится» из состояния. */
export function syncLikes() {
  document.querySelectorAll('.rv-like[data-key]').forEach((row) => {
    const k = row.dataset.key;
    const liked = !!state.likes[k];
    row.querySelector('.like-n').textContent = String((REVIEWS_SEED.likes[k] || 0) + (liked ? 1 : 0));
    const b = row.querySelector('.like-btn');
    b.classList.toggle('is-liked', liked);
    b.setAttribute('aria-pressed', String(liked));
  });
}

export function initRating() {
  // ---- звёзды: показывают среднюю оценку, после клика — оценку посетителя ----
  const stars = [...document.querySelectorAll('#ratingStars .mstar')];
  const count = document.getElementById('ratingCount');
  const avgEl = document.getElementById('ratingAvg');
  const gradStops = [...document.querySelectorAll('#starPart stop')];
  const fmt = (n) => n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const total = () => REVIEWS_SEED.rating + (state.stars > 0 ? 1 : 0);
  const average = () => (state.stars > 0 ? (REVIEWS_SEED.average * REVIEWS_SEED.rating + state.stars) / total() : REVIEWS_SEED.average);
  const paint = (n) => stars.forEach((s, i) => { s.classList.toggle('lit', i < n); s.classList.remove('part'); });
  const paintAverage = () => {
    const avg = average();
    const full = Math.floor(avg);
    const frac = avg - full;
    stars.forEach((s, i) => { s.classList.toggle('lit', i < full); s.classList.toggle('part', i === full && frac > 0.02); });
    gradStops.forEach((st) => st.setAttribute('offset', String(frac)));
  };
  const rest = () => (state.stars > 0 ? paint(state.stars) : paintAverage());
  const renderCount = () => {
    count.textContent = `Оценок: ${total().toLocaleString('ru-RU')}`;
    avgEl.textContent = fmt(average());
  };
  if (stars.length) {
    stars.forEach((s, i) => {
      s.addEventListener('mouseenter', () => paint(i + 1));
      s.addEventListener('focus', () => paint(i + 1));
      s.addEventListener('click', () => {
        state.stars = i + 1;
        save();
        paint(state.stars);
        renderCount();
        s.classList.remove('pop');
        void s.offsetWidth;
        s.classList.add('pop');
        stars.forEach((x, j) => x.setAttribute('aria-checked', String(j + 1 === state.stars)));
      });
    });
    document.getElementById('ratingStars').addEventListener('mouseleave', rest);
    document.getElementById('ratingStars').addEventListener('focusout', rest);
    stars.forEach((x, j) => x.setAttribute('aria-checked', String(j + 1 === state.stars)));
    renderCount();
    rest();
  }

  // ---- «нравится» (делегирование: работает и для клонов карусели, и для окна видеоотзыва) ----
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.like-btn');
    if (!btn) return;
    const row = btn.closest('.rv-like');
    const k = row && row.dataset.key;
    if (!k) return;
    if (state.likes[k]) delete state.likes[k]; else state.likes[k] = 1;
    save();
    syncLikes();
    btn.classList.remove('pop');
    void btn.offsetWidth;
    btn.classList.add('pop');
  });
  syncLikes();
}
