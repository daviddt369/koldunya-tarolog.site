// Интерфейс: шапка, меню, проявление блоков.

export function initUI() {
  const header = document.getElementById('siteHeader');
  const burger = document.getElementById('burger');
  const nav = document.getElementById('mainNav');

  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const setMenu = (open) => {
    nav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  // Проявление: сначала Hero с каскадом, дальше — по прокрутке
  const heroItems = document.querySelectorAll('.hero [data-reveal]');
  heroItems.forEach((el, i) => { el.style.setProperty('--d', `${120 + i * 110}ms`); });
  requestAnimationFrame(() => {
    heroItems.forEach((el) => el.classList.add('revealed'));
    document.getElementById('heroFigure').classList.add('is-in');
  });

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('revealed');
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  document.querySelectorAll('[data-reveal]:not(.hero [data-reveal])').forEach((el) => io.observe(el));

  // «проявление» старинных фото
  const photoIo = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); photoIo.unobserve(e.target); }
    }
  }, { threshold: 0.35 });
  document.querySelectorAll('.old-frame').forEach((el) => photoIo.observe(el));
}
