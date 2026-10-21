// Голос Изабеллы в секции «Обо мне»: аудиодорожка извлечена из видео, само видео не показывается.
import { hub } from './media-hub.js';
import { isModalOpen } from './modal.js';

export function initVoice() {
  const root = document.getElementById('voice');
  const audio = document.getElementById('voiceAudio');
  const btn = document.getElementById('voiceBtn');
  const muteBtn = document.getElementById('voiceMute');
  const progress = document.getElementById('voiceProgress');
  const hint = document.getElementById('voiceHint');
  const photo = document.getElementById('aboutPhoto');
  if (!root || !audio) return;

  let fadeId = 0;
  let autoTried = false;

  const setPlaying = (on) => {
    root.classList.toggle('playing', on);
    btn.setAttribute('aria-label', on ? 'Пауза' : 'Слушать: обо мне');
  };

  function fade(to, ms, done) {
    cancelAnimationFrame(fadeId);
    const from = audio.volume;
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      audio.volume = Math.min(1, Math.max(0, from + (to - from) * k));
      if (k < 1) fadeId = requestAnimationFrame(step);
      else if (done) done();
    };
    fadeId = requestAnimationFrame(step);
  }

  function showAttention(on) {
    root.classList.toggle('attention', on);
    hint.hidden = !on;
  }

  async function play() {
    hub.claim('voice');
    audio.preload = 'auto';
    audio.volume = 0;
    try {
      await audio.play();
      showAttention(false);
      fade(1, 900);
      return true;
    } catch {
      audio.volume = 1;
      showAttention(true);
      return false;
    }
  }

  function pause(soft = true) {
    if (audio.paused) return;
    if (soft) fade(0, 500, () => audio.pause());
    else audio.pause();
  }

  hub.register('voice', () => pause(false));

  audio.addEventListener('play', () => setPlaying(true));
  audio.addEventListener('pause', () => setPlaying(false));
  audio.addEventListener('ended', () => {
    setPlaying(false);
    progress.style.transform = 'scaleX(0)';
  });
  audio.addEventListener('timeupdate', () => {
    if (audio.duration) progress.style.transform = `scaleX(${audio.currentTime / audio.duration})`;
  });

  btn.addEventListener('click', () => {
    if (!audio.paused) {
      pause();
      return;
    }
    if (audio.ended) audio.currentTime = 0;
    play();
  });
  muteBtn.addEventListener('click', () => {
    audio.muted = !audio.muted;
    muteBtn.setAttribute('aria-pressed', String(audio.muted));
    muteBtn.setAttribute('aria-label', audio.muted ? 'Включить звук' : 'Выключить звук');
  });

  // Появление секции: один автоматический запуск; если браузер не разрешает звук — понятная кнопка.
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting && e.intersectionRatio >= 0.5) {
          photo.classList.add('is-in');
          if (!autoTried && !isModalOpen()) {
            autoTried = true;
            const allowed = navigator.userActivation ? navigator.userActivation.hasBeenActive : true;
            if (allowed) play();
            else showAttention(true);
          }
        } else if (!e.isIntersecting && !audio.paused) {
          pause(); // ушли из секции — голос затихает, повторного автозапуска нет
        }
      }
    },
    { threshold: [0, 0.5] },
  );
  io.observe(root);
}
