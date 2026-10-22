// Конверсии Google Ads: клики по WhatsApp, Telegram и телефону (метки из кабинета Google Ads, аккаунт AW-665734221).
// Событие уходит через gtag; если тег заблокирован (блокировщик, чужой домен) — ничего не происходит, ссылки работают как обычно.
import { CONVERSIONS } from './data.js';

export function initTracking() {
  let last = { key: '', t: 0 };
  const kind = (href) => {
    if (href.startsWith('tel:')) return 'phone';
    if (/^https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//i.test(href)) return 'whatsapp';
    if (/^https?:\/\/(t\.me|telegram\.me)\//i.test(href)) return 'telegram';
    return '';
  };
  const handler = (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const k = kind(a.getAttribute('href') || '');
    if (!k) return;
    const now = Date.now();
    if (last.key === k && now - last.t < 800) return; // двойной клик / click+auxclick — один раз
    last = { key: k, t: now };
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', 'conversion', {
      send_to: `${CONVERSIONS.account}/${CONVERSIONS[k]}`,
      value: 1.0,
      currency: 'USD',
      transport_type: 'beacon', // дойдёт, даже если страница тут же откроет мессенджер
    });
  };
  document.addEventListener('click', handler);
  document.addEventListener('auxclick', handler);
}
