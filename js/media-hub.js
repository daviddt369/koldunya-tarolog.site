// Централизованное управление звуком: одновременно звучит только один источник.
const sources = new Map();

export const hub = {
  /** Источник регистрируется со своей функцией остановки. */
  register(id, pause) {
    sources.set(id, pause);
  },
  /** Источник `id` начинает звучать — остальные замолкают. */
  claim(id) {
    for (const [key, pause] of sources) if (key !== id) pause();
  },
  pauseAll() {
    for (const pause of sources.values()) pause();
  },
  /** Звучит ли сейчас что-либо со звуком (беззвучные превью не в счёт). */
  isBusy() {
    return [...document.querySelectorAll('audio, video')].some((m) => !m.paused && !m.muted && m.volume > 0);
  },
};

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
export const saveData = () => !!(navigator.connection && navigator.connection.saveData);

// Вкладка в фоне — всё со звуком на паузу
document.addEventListener('visibilitychange', () => {
  if (document.hidden) hub.pauseAll();
});
