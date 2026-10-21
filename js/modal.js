// Единый менеджер модальных окон: крестик, Escape, фокус, блокировка прокрутки.
import { hub } from './media-hub.js';

let current = null;
let lastFocus = null;

const FOCUSABLE = 'a[href], button:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])';

function lockScroll(on) {
  document.documentElement.classList.toggle('scroll-lock', on);
}

export function isModalOpen() {
  return !!current;
}

export function openModal(el, { onClose } = {}) {
  if (current) closeModal();
  lastFocus = document.activeElement;
  el.hidden = false;
  void el.offsetWidth;
  el.classList.add('open');
  current = { el, onClose };
  lockScroll(true);
  hub.pauseAll();
  document.dispatchEvent(new CustomEvent('modal:open'));
  const btn = el.querySelector('.modal-close');
  if (btn) btn.focus({ preventScroll: true });
}

export function closeModal() {
  if (!current) return;
  const { el, onClose } = current;
  current = null;
  el.classList.remove('open');
  if (onClose) onClose();
  lockScroll(false);
  setTimeout(() => {
    if (!el.classList.contains('open')) el.hidden = true;
  }, 320);
  if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  document.dispatchEvent(new CustomEvent('modal:close'));
}

document.addEventListener('click', (e) => {
  if (!current) return;
  if (e.target.closest('[data-close]') && current.el.contains(e.target)) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (!current) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    closeModal();
    return;
  }
  if (e.key === 'Tab') {
    const items = [...current.el.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null || n === document.activeElement);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});
