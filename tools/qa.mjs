// Автотесты в реальном Chrome: node tools/qa.mjs [url]
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const URL_ = process.argv[2] || 'http://localhost:8090/';
const DISCLAIMER = '* Результаты индивидуальны и могут отличаться в каждом конкретном случае.';
let pass = 0;
let fail = 0;
const ok = (c, msg) => { if (c) pass += 1; else fail += 1; console.log((c ? '  ✓ ' : '  ✗ ') + msg); };
const norm = (s) => s.replace(/️/g, '').replace(/\s+/g, ' ').trim();

async function open(browser, { w = 1280, h = 800, mobile = false, reduce = false, noActivation = false, cardAuto = false, blockSound = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) page.errors.push(m.text()); });
  page.on('pageerror', (e) => page.errors.push('pageerror ' + e.message));
  page.on('response', (r) => { if (r.status() >= 400) page.errors.push(r.status() + ' ' + r.url()); });
  if (noActivation) await page.addInitScript(() => Object.defineProperty(navigator, 'userActivation', { get: () => ({ hasBeenActive: false, isActive: false }) }));
  // автооткрытие карты дня мешает остальным сценариям — по умолчанию считаем, что оно уже было
  if (blockSound) await page.addInitScript(() => { const orig = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { if (!this.muted && this.id === 'cmVideo') return Promise.reject(new DOMException('blocked', 'NotAllowedError')); return orig.call(this); }; });
  if (!cardAuto) await page.addInitScript(() => { try { sessionStorage.setItem('cardDayAutoShown', '1'); } catch { /* ignore */ } });
  await page.goto(URL_, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  return page;
}
const playingSound = (page) => page.evaluate(() => [...document.querySelectorAll('audio,video')].filter((m) => !m.paused && !m.muted).length);
const flowAngle = (p) => p.evaluate(() => document.getElementById('flow').flow.angle);
const carPos = (p) => p.evaluate(() => document.getElementById('carousel').carousel.pos);

const browser = await chromium.launch({
  channel: 'chrome',
  ignoreDefaultArgs: ['--autoplay-policy=no-user-gesture-required'],
  args: ['--autoplay-policy=document-user-activation-required'],
});

console.log('\n[1] Обязательный текст и контакты');
{
  const p = await open(browser);
  const src = fs.readFileSync('Изабелла/обязательо расписать в сайте.txt', 'utf8').split(/\r?\n/);
  const end = src.findIndex((l) => l.includes('Строгая конфиденциальность'));
  const want = norm(src.slice(0, end + 1).map((l) => l.replace(/^\*\s*/, '')).join(' '));
  const got = norm(await p.locator('.manifest-text').innerText());
  ok(got === want, 'блок обязательного текста совпадает с исходным документом дословно, в том же порядке');
  if (got !== want) { console.log('WANT', want); console.log('GOT ', got); }
  ok(await p.locator('.manifest-text').isVisible(), 'текст виден в теле страницы');
  const body = await p.locator('body').innerText();
  for (const t of ['Изабелла', 'более 15 лет', 'Шымкент', '+7 705 523 5378']) ok(body.includes(t), `на странице есть «${t}»`);
  ok((await p.locator('a[href="tel:+77055235378"]').count()) >= 2, 'tel-ссылка кликабельна');
  ok((await p.locator('a[href^="https://wa.me/77055235378"]').count()) >= 3, 'WhatsApp-ссылки ведут на 77055235378');
  ok((await p.locator('a[href="https://t.me/+77055235378"]').count()) >= 1, 'Telegram-ссылка по номеру есть');
  const digits = ((await p.content()).match(/\+?7[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g) || []).map((x) => x.replace(/\D/g, ''));
  ok(digits.length > 0 && digits.every((x) => x === '77055235378' || x === '77755196342'), 'других телефонных номеров нет (кроме ссылки автора сайта в подвале и в защите)');
  ok((await p.locator('.site-footer .credit a[href^="https://wa.me/77755196342"]').count()) === 1 && (await p.locator('.site-footer .credit').innerText()).includes('Создание и разработка сайтов'), 'в подвале есть «Создание и разработка сайтов — Ai.Vazovski» со ссылкой');
  ok(await p.evaluate(() => !!document.querySelector('script[src*="site-copytrap"]') && document.documentElement.innerHTML.includes('koldunya-tarolog.site')), 'защита от копирования подключена для домена koldunya-tarolog.site');
  ok(!body.includes('Скопировать') && (await p.locator('#copyTg, #toast').count()) === 0, 'кнопки «Скопировать номер для Telegram» и служебных подсказок нет');
  const hero = await p.evaluate(() => ({ btns: [...document.querySelectorAll('.hero-cta .btn')].map((b) => b.textContent.trim()), link: !!document.querySelector('.hero a[href="#greeting"], .hero [data-open-card]'), cardTxt: /в течение суток|Задайте вопрос/.test(document.getElementById('card-day').innerText) }));
  ok(JSON.stringify(hero.btns) === JSON.stringify(['Подробнее об услугах', 'Получить консультацию']) && !hero.link, 'в Hero две кнопки: «Подробнее об услугах» и «Получить консультацию»; ни карты дня, ни ссылки на приветствие');
  ok(!hero.cardTxt, 'в секции «Карта дня» нет технических пояснений');
  ok((await p.locator('#horrorToggle, #scare, .horror-toggle').count()) === 0, 'кнопки-свечи и скримера на сайте нет');
  ok((await p.locator('#voiceTitle').textContent()).trim() === 'Обо мне', 'в «Обо мне» плеер подписан «Обо мне»');
  const WORDS = ['экстрасенс', 'маг', 'чернокнижник', 'гадалка', 'таролог', 'ворожея', 'ясновидящая', 'ведунья', 'любовная ведьмочка'];
  const blocks = await p.evaluate(() => ({
    hero: document.querySelector('.hero-roles').innerText,
    greeting: document.querySelector('.greeting-roles').innerText,
    kicker: document.querySelector('.manifest-kicker').innerText,
    about: document.querySelector('#about .facts').innerText,
    contacts: document.querySelector('.contact-facts').innerText,
    footer: document.querySelector('.site-footer').innerText,
  }));
  const found = (txt) => WORDS.filter((w) => new RegExp(`(^|[^а-яё])${w}($|[^а-яё])`, 'i').test(txt));
  const all = Object.values(blocks).join(' ');
  ok(WORDS.every((w) => found(all).includes(w)), 'на сайте есть все девять названий: экстрасенс, маг, чернокнижник, гадалка, таролог, ворожея, ясновидящая, ведунья, любовная ведьмочка');
  ok(Object.values(blocks).every((b) => found(b).length <= 3) && found(blocks.hero).length === 3 && found(blocks.greeting).length === 3 && found(blocks.kicker).length === 3, 'названия разнесены по сайту: в каждом месте не больше трёх (Hero, после приветствия, «направления», «Обо мне», контакты, подвал)');
  ok((await p.locator('.hero-roles2').count()) === 0, 'в Hero нет второй строки с перечислением');
  const meta = await p.evaluate(() => document.title + document.querySelector('meta[name=description]').content);
  ok(/гадалка/i.test(meta) && /таролог/i.test(meta) && /ворожея/i.test(meta), 'в title и description есть гадалка, таролог, ворожея');
  ok(p.errors.length === 0, 'нет ошибок и 404 в консоли ' + p.errors.join(' | '));
  await p.context().close();
}

console.log('\n[1d] Превью ссылок (WhatsApp / Telegram)');
{
  const p = await open(browser);
  const m = await p.evaluate(() => {
    const g = (s) => (document.querySelector(s) || {}).content || '';
    const html = document.documentElement.innerHTML;
    return {
      title: document.title,
      desc: g('meta[name=description]'),
      ogt: g('meta[property="og:title"]'),
      ogd: g('meta[property="og:description"]'),
      ogi: g('meta[property="og:image"]'),
      tw: g('meta[name="twitter:card"]'),
      ico: [...document.querySelectorAll('link[rel~=icon], link[rel=apple-touch-icon]')].map((l) => l.getAttribute('href')),
      ogPos: html.indexOf('og:image'),
      trapPos: html.indexOf('site-copytrap'),
    };
  });
  ok(m.title.length > 20 && m.title.length <= 70 && /Изабелла/.test(m.title), `title: «${m.title}» (${m.title.length} симв.)`);
  ok(m.desc.length >= 100 && m.desc.length <= 170, `description ${m.desc.length} симв.`);
  ok(m.ogt && m.ogd && m.ogi.startsWith('https://koldunya-tarolog.site/') && m.tw === 'summary_large_image', 'заданы og:title, og:description, абсолютный og:image и twitter:card');
  ok(m.ogPos > 0 && m.ogPos < m.trapPos, 'теги превью стоят выше скриптов защиты (их читают парсеры мессенджеров)');
  const img = await p.request.get(m.ogi.replace('https://koldunya-tarolog.site', new URL(URL_).origin));
  const buf = await img.body();
  const dim = await p.evaluate(async (b64) => { const i = new Image(); i.src = 'data:image/jpeg;base64,' + b64; await i.decode(); return [i.naturalWidth, i.naturalHeight]; }, buf.toString('base64'));
  ok(img.ok() && dim[0] === 1200 && dim[1] === 630 && buf.length < 300000, `картинка превью с фото Изабеллы: ${dim.join('×')}, ${(buf.length / 1024).toFixed(0)} КБ`);
  let allIcons = true;
  for (const href of m.ico) { const r = await p.request.get(new URL(href, URL_).href); if (!r.ok()) allIcons = false; }
  ok(allIcons && m.ico.some((h) => h.endsWith('.ico')) && m.ico.some((h) => h.includes('apple-touch')), `иконки доступны: ${m.ico.join(', ')}`);
  await p.context().close();
}

console.log('\n[1c] Защита от копирования');
{
  const p = await open(browser);
  ok(await p.evaluate(() => document.body.innerText.length > 1000 && !document.documentElement.classList.contains('copytrap-locked')), 'на своём и локальном адресе сайт открывается нормально');
  await p.context().close();
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 700 } });
  const q = await ctx.newPage();
  await q.goto(URL_.replace('localhost', '127.0.0.2'), { waitUntil: 'domcontentloaded' });
  await q.waitForTimeout(800);
  const txt = await q.evaluate(() => document.body.innerText);
  ok(txt.includes('Нелегальная копия сайта') && txt.includes('Ai.Vazovski') && !txt.includes('Подробнее об услугах'), 'на чужом домене копия блокируется, показан автор и ссылка');
  await ctx.close();
}

console.log('\n[1b] Дисклеймеры');
{
  const p = await open(browser);
  const texts = await p.locator('.disclaimer').evaluateAll((els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  ok(texts.length === 3 && texts.every((t) => t === DISCLAIMER), 'три одинаковых дисклеймера дословно: под обрядами, под видеоотзывами, под фотоотзывами');
  const place = await p.evaluate(() => ['#rituals', '#video-reviews', '#reviews'].map((s) => {
    const sec = document.querySelector(s); const d = sec.querySelector('.disclaimer');
    const last = [...sec.querySelectorAll('.orb-grid, .flow-count, .carousel')].pop();
    return d.getBoundingClientRect().top >= last.getBoundingClientRect().bottom - 2 && d.closest('details') === null && getComputedStyle(d).display !== 'none';
  }));
  ok(place.every(Boolean), 'каждый дисклеймер стоит непосредственно под своим блоком и виден в HTML');
  await p.locator('#reviews .disclaimer').scrollIntoViewIfNeeded();
  await p.waitForTimeout(1200);
  ok(await p.locator('#reviews .disclaimer').isVisible() && Number(await p.evaluate(() => getComputedStyle(document.querySelector('#reviews .disclaimer')).opacity)) > 0.9, 'дисклеймер читается (виден, непрозрачен)');
  await p.context().close();
}

console.log('\n[2] Обряды: круглые видео, звук, закрытие');
{
  const p = await open(browser);
  await p.locator('#rituals').scrollIntoViewIfNeeded();
  await p.waitForTimeout(2500);
  const orbs = await p.locator('.orb').count();
  ok(orbs === 10, `10 видеокружков (найдено ${orbs})`);
  const live = await p.evaluate(() => [...document.querySelectorAll('.orb video')].filter((v) => !v.paused).length);
  ok(live > 0 && live <= 8, `в области видимости играют беззвучные видео (${live}, максимум 8)`);
  ok(await p.evaluate(() => [...document.querySelectorAll('.orb video')].every((v) => v.muted)), 'видеокружки без звука');
  ok((await p.locator('.orb-title').count()) === 10 && (await p.locator('.orb-dir').count()) === 10, 'под каждым кружком название и описание услуги');
  await p.locator('.orb').nth(0).click();
  await p.waitForTimeout(1200);
  ok((await p.locator('#videoModal.open').count()) === 1, 'клик открывает модальное окно');
  const st = await p.evaluate(() => { const v = document.getElementById('vmVideo'); return { paused: v.paused, muted: v.muted, src: v.currentSrc }; });
  ok(!st.paused && !st.muted && st.src.includes('/privorot.mp4'), 'играет полное видео обряда со звуком');
  ok(await p.evaluate(() => [...document.querySelectorAll('.orb video')].every((v) => v.paused)), 'фоновые видеокружки приостановлены, пока открыт плеер');
  ok((await p.locator('#vmCta').isVisible()) && (await p.locator('#vmCta').getAttribute('href')).startsWith('https://wa.me/77055235378'), 'есть кнопка обращения к Изабелле');
  ok(await p.evaluate(() => document.documentElement.classList.contains('scroll-lock')), 'прокрутка страницы заблокирована');
  await p.click('#videoModal .modal-close');
  await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.getElementById('vmVideo').paused && !document.getElementById('vmVideo').getAttribute('src')), 'после закрытия крестиком видео остановлено');
  ok(await p.evaluate(() => !document.documentElement.classList.contains('scroll-lock')), 'прокрутка восстановлена');
  await p.locator('.orb-more').nth(3).click();
  await p.waitForTimeout(800);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.getElementById('videoModal').hidden && document.getElementById('vmVideo').paused), 'Escape закрывает окно и останавливает видео');
  ok(p.errors.length === 0, 'консоль чистая ' + p.errors.join(' | '));
  await p.context().close();
}

console.log('\n[2b] Видеоприветствие — самостоятельный блок');
{
  const p = await open(browser);
  const info = await p.evaluate(() => {
    const s = document.getElementById('greeting'); const hero = document.getElementById('top'); const man = document.getElementById('uslugi');
    return { inDetails: !!s.closest('details'), hidden: getComputedStyle(s).display === 'none' || s.hidden, after: hero.compareDocumentPosition(s) & 4, before: s.compareDocumentPosition(man) & 4, title: s.querySelector('h2').textContent.trim(), poster: document.querySelector('#gvPlay img').getAttribute('src'), summary: document.querySelectorAll('summary, details').length };
  });
  ok(!info.inDetails && !info.hidden && info.summary === 0, 'блок не спрятан (нет accordion/details)');
  ok(info.after && info.before, 'расположен сразу после Hero и до основного текста');
  ok(info.title === 'Видеоприветствие Изабеллы' && info.poster.includes('greeting-poster'), 'заголовок и постер — фотография Изабеллы');
  await p.locator('#greeting').scrollIntoViewIfNeeded();
  await p.waitForTimeout(1200);
  ok(await p.locator('#gvPlay').isVisible(), 'постер с кнопкой Play виден сразу');
  const ar = await p.evaluate(() => { const r = document.querySelector('.gv-screen').getBoundingClientRect(); return r.width / r.height; });
  ok(Math.abs(ar - 480 / 848) < 0.01, `вертикальный контейнер сохраняет пропорции видео (${ar.toFixed(3)})`);
  await p.click('#gvPlay');
  await p.waitForTimeout(1500);
  const st = await p.evaluate(() => { const v = document.getElementById('gvVideo'); return { paused: v.paused, muted: v.muted, ctrl: v.controls, src: v.currentSrc, t: v.currentTime }; });
  ok(!st.paused && !st.muted && st.ctrl && st.src.includes('/greeting.mp4') && st.t > 0.5, 'приветствие играет прямо в блоке со звуком, есть пауза/перемотка/громкость');
  ok(!(await p.locator('#gvPlay').isVisible()), 'во время просмотра постер убран');
  await p.evaluate(() => { const v = document.getElementById('gvVideo'); v.currentTime = v.duration - 0.4; });
  await p.waitForTimeout(1800);
  ok(await p.locator('#gvPlay').isVisible() && await p.evaluate(() => document.getElementById('gvVideo').paused), 'после завершения возвращается постер с повторным запуском');
  await p.click('#gvPlay');
  await p.waitForTimeout(700);
  await p.locator('#voice').scrollIntoViewIfNeeded();
  await p.waitForTimeout(500);
  await p.waitForTimeout(600);
  if (await p.evaluate(() => document.getElementById('voiceAudio').paused)) await p.click('#voiceBtn');
  await p.waitForTimeout(800);
  ok(await p.evaluate(() => document.getElementById('gvVideo').paused) && (await playingSound(p)) === 1, 'голос «Обо мне» и приветствие не звучат одновременно');
  ok(p.errors.length === 0, 'консоль чистая ' + p.errors.join(' | '));
  await p.context().close();
}

console.log('\n[3] Видеоотзывы: вращающаяся 360° 3D-карусель');
{
  const p = await open(browser);
  await p.locator('#flow').scrollIntoViewIfNeeded();
  await p.waitForTimeout(1500);
  ok((await p.locator('.fl-item').count()) === 7, 'все 7 видеоотзывов на окружности');
  const geo = await p.evaluate(() => {
    const items = [...document.querySelectorAll('.fl-item')];
    return { bf: items.every((e) => getComputedStyle(e).backfaceVisibility === 'hidden'), ts: getComputedStyle(document.getElementById('flowStage')).transformStyle, persp: getComputedStyle(document.getElementById('flow')).perspective, r: document.getElementById('flow').flow.radius };
  });
  ok(geo.ts === 'preserve-3d' && geo.persp !== 'none' && geo.r > 200, `CSS 3D: perspective, preserve-3d, радиус по числу карточек (${geo.r}px)`);
  ok(geo.bf, 'обратная сторона скрыта (backface-visibility), зеркальных видео нет');
  const a1 = await flowAngle(p);
  await p.waitForTimeout(2500);
  const a2 = await flowAngle(p);
  ok(Math.abs(a2 - a1) > 5, `галерея вращается сама (${(a2 - a1).toFixed(1)}° за 2.5 с)`);
  const v = await p.evaluate(() => document.getElementById('flow').flow.velocity);
  ok(Math.abs(Math.abs(v) - 360 / 55) < 0.8, `скорость ≈ один оборот за 55 с (${v.toFixed(2)}°/с)`);
  const box = await p.locator('#flow').boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + 30);
  await p.waitForTimeout(2200);
  const h1 = await flowAngle(p);
  await p.waitForTimeout(1200);
  const h2 = await flowAngle(p);
  ok(Math.abs(h2 - h1) < 0.2, 'при наведении вращение плавно останавливается');
  await p.mouse.move(box.x + box.width / 2, box.y + 30);
  await p.mouse.down();
  await p.mouse.move(box.x + box.width / 2 + 250, box.y + 30, { steps: 10 });
  await p.mouse.up();
  const d2 = await flowAngle(p);
  ok(Math.abs(d2 - h2) > 40, `мышью можно вращать вручную (${(d2 - h2).toFixed(0)}°)`);
  await p.mouse.move(5, 5);
  await p.waitForTimeout(4200);
  const r1 = await flowAngle(p);
  await p.waitForTimeout(1500);
  ok(Math.abs((await flowAngle(p)) - r1) > 4, 'при уходе указателя вращение возобновляется');
  await p.locator('#flow').focus();
  await p.keyboard.press('ArrowLeft');
  await p.waitForTimeout(1200);
  const k1 = await flowAngle(p);
  await p.waitForTimeout(1500);
  ok(Math.abs((await flowAngle(p)) - k1) < 0.3, 'при работе с клавиатуры автовращение приостанавливается');
  await p.evaluate(() => document.activeElement.blur());
  await p.waitForTimeout(3500);
  ok(Math.abs(await flowAngle(p) - k1) > 3, 'после ухода фокуса автовращение возобновляется');
  // нажатие на карточку, стоящую спереди
  const fb = await p.locator('#flow').boundingBox();
  await p.mouse.move(fb.x + fb.width / 2, fb.y + fb.height / 2);
  await p.waitForTimeout(2200);
  const hit = await p.evaluate(() => {
    const top = document.getElementById('flow').getBoundingClientRect().top + 270;
    for (let d = 0; d < 400; d += 10) for (const x of [innerWidth / 2 + d, innerWidth / 2 - d]) { const e = document.elementFromPoint(x, top); if (e && e.closest('.fl-item')) return [x, top]; }
    return null;
  });
  await p.mouse.click(hit[0], hit[1]);
  await p.waitForTimeout(1300);
  ok((await p.locator('#videoModal.open').count()) === 1, 'нажатие открывает видеоотзыв крупно');
  const st = await p.evaluate(() => { const v = document.getElementById('vmVideo'); return { paused: v.paused, muted: v.muted, ctrl: v.controls, src: v.currentSrc }; });
  ok(!st.paused && !st.muted && st.ctrl && st.src.includes('/reviews/video/'), 'видеоотзыв играет со звуком, есть пауза/перемотка/громкость');
  const m1 = await flowAngle(p);
  await p.waitForTimeout(1500);
  ok(Math.abs((await flowAngle(p)) - m1) < 0.3, 'пока открыт плеер, карусель стоит; угол сохраняется');
  ok(await p.evaluate(() => [...document.querySelectorAll('.fl-item video')].every((x) => x.paused)), 'превью в галерее приостановлены');
  await p.click('#videoModal .modal-close');
  await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.getElementById('vmVideo').paused), 'закрытие останавливает видео');
  const c1 = await flowAngle(p);
  ok(Math.abs(c1 - m1) < 3, `после закрытия угол сохранён (Δ ${(c1 - m1).toFixed(2)}°)`);
  await p.waitForTimeout(4500);
  ok(Math.abs((await flowAngle(p)) - c1) > 2, 'вращение возобновляется после закрытия');
  ok(p.errors.length === 0, 'консоль чистая ' + p.errors.join(' | '));
  await p.context().close();
}

console.log('\n[4] Фотоотзывы: единые карточки и бесконечная лента');
{
  const p = await open(browser);
  await p.locator('#carousel').scrollIntoViewIfNeeded();
  await p.waitForTimeout(1500);
  ok((await p.locator('.car-card').count()) === 36 && (await p.locator('.car-item:not([aria-hidden]) .car-card').count()) === 12, '12 фотоотзывов (3 набора для бесшовного круга)');
  const sizes = await p.evaluate(() => [...document.querySelectorAll('.car-card')].map((e) => { const r = e.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); }));
  ok(new Set(sizes).size === 1, `все карточки одного размера (${sizes[0]})`);
  await p.waitForTimeout(1500);
  const fit = await p.evaluate(() => [...document.querySelectorAll('.car-img img')].filter((i) => i.naturalWidth > 0).map((img) => {
    const c = img.parentElement.getBoundingClientRect(); const r = img.getBoundingClientRect();
    const s = Math.min(r.width / img.naturalWidth, r.height / img.naturalHeight); // масштаб при contain
    const w = img.naturalWidth * s; const h = img.naturalHeight * s;
    return { ratio: 0, inside: r.left >= c.left - 0.5 && r.right <= c.right + 0.5 && r.top >= c.top - 0.5 && r.bottom <= c.bottom + 0.5 && w <= c.width && h <= c.height, fit: getComputedStyle(img).objectFit };
  }));
  ok(fit.every((f) => f.ratio < 0.02 && f.inside && f.fit === 'contain'), 'изображения целиком (contain), без обрезки и искажений');
  const p1 = await carPos(p);
  await p.waitForTimeout(2500);
  ok((await carPos(p)) - p1 > 20, `лента движется сама (${((await carPos(p)) - p1).toFixed(0)} px за 2.5 с)`);
  const box = await p.locator('#carousel').boundingBox();
  await p.mouse.move(box.x + 300, box.y + 120);
  await p.waitForTimeout(2200);
  const h1 = await carPos(p);
  await p.waitForTimeout(1000);
  ok(Math.abs((await carPos(p)) - h1) < 1, 'наведение останавливает движение');
  await p.mouse.down();
  await p.mouse.move(box.x + 100, box.y + 120, { steps: 8 });
  await p.mouse.up();
  ok(Math.abs((await carPos(p)) - h1) > 100, 'ленту можно прокручивать мышью');
  await p.mouse.move(5, 5);
  // бесшовный переход последний → первый
  await p.waitForTimeout(3800);
  const W = await p.evaluate(() => document.getElementById('carousel').carousel.period);
  await p.evaluate((w) => document.getElementById('carousel').carousel.jump(w - 40), W);
  const nearest = () => p.evaluate(() => { let best = -1; let bd = 1e9; for (const c of document.querySelectorAll('.car-card')) { const r = c.getBoundingClientRect(); const d = Math.abs(r.x + r.width / 2 - innerWidth / 2); if (d < bd) { bd = d; best = Number(c.dataset.i); } } return best; });
  const before = await nearest();
  await p.waitForTimeout(2600);
  const after = await nearest();
  const pos = await carPos(p);
  ok(pos < W / 2 && before >= 0 && after >= 0 && (after - before + 12) % 12 <= 2, `переход через границу без скачка (позиция ${pos.toFixed(0)}, карточка ${before} → ${after})`);
  // lightbox
  await p.mouse.move(5, 5);
  await p.waitForTimeout(300);
  const spot = await p.evaluate(() => { for (const c of document.querySelectorAll('.car-card')) { const r = c.getBoundingClientRect(); if (r.left > 100 && r.right < innerWidth - 100) return [r.x + r.width / 2, r.y + 60]; } return null; });
  await p.mouse.click(spot[0], spot[1]);
  await p.waitForTimeout(700);
  ok((await p.locator('#photoModal.open').count()) === 1, 'нажатие открывает отзыв в lightbox');
  const nat = await p.evaluate(() => document.getElementById('pmImg').naturalWidth);
  ok(nat >= 900, `показан полный оригинал отзыва (${nat} px)`);
  const fullFit = await p.evaluate(() => { const i = document.getElementById('pmImg'); const r = i.getBoundingClientRect(); return Math.abs(r.width / r.height - i.naturalWidth / i.naturalHeight) < 0.02 && r.bottom <= innerHeight; });
  ok(fullFit, 'в lightbox виден весь скриншот целиком');
  await p.click('#pmZoom');
  ok((await p.locator('.photo-panel.zoomed').count()) === 1, 'увеличение работает');
  await p.click('#pmNext');
  ok(/^\d+ \/ 12$/.test(await p.locator('#pmCount').innerText()), 'листание внутри просмотра');
  const sp = await carPos(p);
  await p.click('#photoModal .modal-close');
  await p.waitForTimeout(500);
  ok(Math.abs((await carPos(p)) - sp) < 30, 'после закрытия лента на прежнем месте');
  await p.waitForTimeout(3000);
  ok((await carPos(p)) - sp > 30, 'автодвижение возобновляется после закрытия');
  ok(p.errors.length === 0, 'консоль чистая ' + p.errors.join(' | '));
  await p.context().close();
}

console.log('\n[4b] Отзывы: звёзды и «нравится»');
{
  const p = await open(browser);
  await p.locator('#reviews').scrollIntoViewIfNeeded();
  await p.waitForTimeout(1200);
  ok((await p.locator('#ratingStars .mstar').count()) === 5, 'есть пять звёзд для оценки отзывов');
  const c0 = await p.locator('#ratingCount').innerText();
  const avg0 = await p.locator('#ratingAvg').innerText();
  ok(avg0 === '4,75' && c0.replace(/\s/g, ' ') === 'Оценок: 6 585', `стартовые данные: средняя оценка ${avg0}, ${c0}`);
  ok((await p.locator('#ratingStars .mstar.lit').count()) === 4 && (await p.locator('#ratingStars .mstar.part').count()) === 1, 'звёзды показывают среднюю: 4 полные и пятая частично');
  await p.hover('#ratingStars .mstar >> nth=3');
  ok((await p.locator('#ratingStars .mstar.lit').count()) === 4, 'при наведении звёзды подсвечиваются');
  await p.click('#ratingStars .mstar >> nth=3');
  await p.mouse.move(5, 5);
  const c1 = await p.locator('#ratingCount').innerText();
  ok(c1.replace(/\s/g, ' ') === 'Оценок: 6 586' && (await p.locator('#ratingStars .mstar.lit').count()) === 4, `после клика счётчик растёт на 1 («${c0}» → «${c1}»), оценка посетителя остаётся`);
  await p.click('#ratingStars .mstar >> nth=4');
  ok((await p.locator('#ratingCount').innerText()) === c1, 'повторная оценка не накручивает счётчик');
  await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; document.getElementById('carousel').scrollIntoView({ block: 'center' }); });
  await p.waitForTimeout(600);
  ok((await p.locator('.car-item:not([aria-hidden]) .rv-like').count()) === 12, 'под каждым из 12 фотоотзывов есть «Понравился отзыв?»');
  const spot = await p.evaluate(() => { for (const b of document.querySelectorAll('.car-item .like-btn')) { const r = b.getBoundingClientRect(); if (r.left > 60 && r.right < innerWidth - 60 && r.top > 0 && r.bottom < innerHeight) return [r.x + r.width / 2, r.y + r.height / 2, b.closest('.rv-like').dataset.key]; } return null; });
  await p.mouse.move(spot[0], spot[1]);
  await p.waitForTimeout(2000);
  const spot2 = await p.evaluate((k) => { const b = [...document.querySelectorAll('.car-item .like-btn')].find((x) => x.closest('.rv-like').dataset.key === k && x.getBoundingClientRect().left > 0 && x.getBoundingClientRect().right < innerWidth); const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, spot[2]);
  await p.mouse.click(spot2[0], spot2[1]);
  await p.waitForTimeout(300);
  const n1 = await p.evaluate((k) => [...document.querySelectorAll(`.rv-like[data-key="${k}"] .like-n`)].map((e) => e.textContent), spot[2]);
  ok(n1.every((n) => n === '1') && (await p.locator('.like-btn.is-liked').count()) >= 1, 'лайк под отзывом увеличивает счётчик (во всех копиях ленты)');
  await p.mouse.click(spot2[0], spot2[1]);
  await p.waitForTimeout(300);
  const n2 = await p.evaluate((k) => [...document.querySelectorAll(`.rv-like[data-key="${k}"] .like-n`)].map((e) => e.textContent), spot[2]);
  ok(n2.every((n) => n === '0'), 'повторное нажатие снимает лайк');
  await p.mouse.click(spot2[0], spot2[1]);
  await p.reload({ waitUntil: 'networkidle' });
  ok((await p.locator('#ratingCount').innerText()) === (await p.locator('#ratingCount').innerText()) && (await p.locator('#ratingCount').innerText()).replace(/\s/g, ' ') === 'Оценок: 6 586' && (await p.locator('.like-btn.is-liked').count()) >= 1, 'оценка и лайки запоминаются в браузере');
  await p.locator('#flow').scrollIntoViewIfNeeded();
  await p.waitForTimeout(800);
  const fb = await p.locator('#flow').boundingBox();
  await p.mouse.move(fb.x + fb.width / 2, fb.y + fb.height / 2);
  await p.waitForTimeout(2000);
  const hit = await p.evaluate(() => { const top = document.getElementById('flow').getBoundingClientRect().top + 270; for (let d = 0; d < 400; d += 10) for (const x of [innerWidth / 2 + d, innerWidth / 2 - d]) { const e = document.elementFromPoint(x, top); if (e && e.closest('.fl-item')) return [x, top]; } return null; });
  await p.mouse.click(hit[0], hit[1]);
  await p.waitForTimeout(900);
  ok(await p.locator('#videoModal .rv-like').isVisible(), 'в окне видеоотзыва тоже есть «Понравился отзыв?»');
  await p.click('#videoModal .like-btn');
  ok((await p.locator('#videoModal .like-n').innerText()) === '1', 'лайк видеоотзыва работает');
  ok(p.errors.length === 0, 'консоль чистая ' + p.errors.join(' | '));
  await p.context().close();
}

console.log('\n[5] Карта дня: автоматический pop-up');
{
  const p = await open(browser, { cardAuto: true, noActivation: true, blockSound: true });
  await p.locator('#voice').scrollIntoViewIfNeeded();
  await p.waitForTimeout(600);
  ok((await p.locator('#cardModal.open').count()) === 0, 'до секции окно не открывается');
  const deckInfo = await p.evaluate(() => ({ n: document.querySelectorAll('.deck-card svg use[href="#card-back"]').length }));
  ok(deckInfo.n === 3, 'все три карты колоды оформлены одинаково (красивая рубашка)');
  await p.locator('#card-day').scrollIntoViewIfNeeded();
  await p.waitForTimeout(1700);
  ok((await p.locator('.deck.shuffling').count()) === 1 && (await p.locator('#cardModal.open').count()) === 0, 'при достижении секции карты тасуются, окно ещё не открыто');
  await p.waitForTimeout(2600);
  ok((await p.locator('.deck.shuffling').count()) === 0 && (await p.locator('#cardModal.open').count()) === 1, 'после ~3 секунд тасовки pop-up открылся автоматически');
  ok(await p.evaluate(() => { const v = document.getElementById('cmVideo'); return !v.paused && v.currentSrc.includes('card-day.mp4'); }), 'играет вступительное видео');
  ok(await p.locator('#cmSound').isVisible() && await p.evaluate(() => document.getElementById('cmVideo').muted), 'звук заблокирован браузером → видео без звука и кнопка «Включить звук»');
  await p.click('#cmSound');
  ok(await p.evaluate(() => !document.getElementById('cmVideo').muted) && await p.locator('#cmSound').isHidden(), 'звук включается кнопкой');
  ok((await p.locator('#cmSkip').innerText()).trim().toLowerCase() === 'открыть карту дня' && await p.locator('#cmSkip').isVisible(), 'кнопка называется «Открыть карту дня» и видна во время вступления');
  await p.click('#cmSkip');
  await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.getElementById('cmVideo').paused && document.querySelector('.cm-stage').dataset.stage === 'card'), 'видео остановлено, начинается раскрытие карты');
  await p.waitForTimeout(3700);
  ok((await p.locator('#tarot.flipped').count()) === 1 && (await p.locator('#cmMeaning.shown').count()) === 1, 'карта раскрылась сама, без дополнительного клика');
  const name1 = await p.locator('#cmName').innerText();
  ok(name1.length > 2 && (await p.locator('#cmText').innerText()).length > 20, `показаны название и значение: «${name1}»`);
  const sz = await p.locator('#cardModal .modal-close').boundingBox();
  ok(sz.width >= 44 && sz.height >= 44, `крестик крупный (${sz.width}×${sz.height})`);
  await p.mouse.click(40, 400);
  await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.getElementById('cardModal').hidden), 'закрытие по клику вне окна');
  ok(await p.evaluate(() => document.getElementById('cmVideo').paused && !document.getElementById('cmVideo').getAttribute('src')), 'видео остановлено при закрытии');
  await p.locator('#flow').scrollIntoViewIfNeeded();
  await p.waitForTimeout(500);
  await p.locator('#card-day').scrollIntoViewIfNeeded();
  await p.waitForTimeout(2200);
  ok((await p.locator('#cardModal.open').count()) === 0 && (await p.locator('.deck.shuffling').count()) === 0, 'при повторном проходе секции pop-up не открывается');
  await p.reload({ waitUntil: 'networkidle' });
  await p.locator('#card-day').scrollIntoViewIfNeeded();
  await p.waitForTimeout(2200);
  ok((await p.locator('#cardModal.open').count()) === 0, 'после обновления страницы в той же вкладке автооткрытия нет');
  await p.locator('#card-day .btn').click();
  await p.waitForTimeout(2300);
  ok((await p.locator('#cardModal.open').count()) === 1, 'вручную карту можно открыть стандартной кнопкой');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.getElementById('cardModal').hidden), 'Escape закрывает окно');
  await p.locator('#card-day .btn').click();
  await p.waitForTimeout(2300);
  await p.click('#cmSkip');
  ok((await p.locator('#cmName').innerText()) === name1, 'карта дня стабильна при повторном открытии');
  await p.keyboard.press('Escape');
  ok(p.errors.length === 0, 'консоль чистая ' + p.errors.join(' | '));
  await p.context().close();
}

console.log('\n[5b] Карта дня: досмотр видео до конца');
{
  const p = await open(browser);
  await p.locator('#card-day .btn').click();
  await p.waitForTimeout(2300);
  await p.evaluate(() => { document.getElementById('cmVideo').muted = true; const v = document.getElementById('cmVideo'); v.currentTime = v.duration - 0.5; });
  await p.waitForTimeout(4800);
  ok((await p.locator('#tarot.flipped').count()) === 1, 'после конца видео карта раскрывается автоматически');
  await p.context().close();
}

console.log('\n[6] Голос «Обо мне» и единый источник звука');
{
  const p = await open(browser, { noActivation: true });
  await p.locator('#voice').scrollIntoViewIfNeeded();
  await p.waitForTimeout(1500);
  const blocked = await p.evaluate(() => document.getElementById('voiceAudio').paused);
  ok(blocked && (await p.locator('#voice.attention').count()) === 1 && (await p.locator('#voiceHint').isVisible()), 'браузер не разрешил автозвук → понятная кнопка запуска голоса');
  await p.click('#voiceBtn');
  await p.waitForTimeout(1500);
  ok(await p.evaluate(() => { const a = document.getElementById('voiceAudio'); return !a.paused && a.currentTime > 0.5; }), 'голос играет по нажатию');
  ok(await p.evaluate(() => document.getElementById('voiceAudio').duration > 30), 'длительность голосовой дорожки ~36 с');
  await p.click('#voiceMute');
  ok(await p.evaluate(() => document.getElementById('voiceAudio').muted), 'выключение звука работает');
  await p.click('#voiceMute');
  await p.click('#voiceBtn');
  await p.waitForTimeout(900);
  ok(await p.evaluate(() => document.getElementById('voiceAudio').paused), 'пауза работает');
  await p.click('#voiceBtn');
  await p.waitForTimeout(600);
  await p.locator('#flow').scrollIntoViewIfNeeded();
  await p.waitForTimeout(900);
  ok(await p.evaluate(() => document.getElementById('voiceAudio').paused), 'при уходе из секции голос затихает');
  await p.locator('#voice').scrollIntoViewIfNeeded();
  await p.waitForTimeout(500);
  await p.click('#voiceBtn');
  await p.waitForTimeout(700);
  await p.locator('#rituals').scrollIntoViewIfNeeded();
  await p.waitForTimeout(300);
  await p.evaluate(() => document.getElementById('voiceAudio').play());
  await p.locator('.orb').first().click();
  await p.waitForTimeout(1200);
  ok(await p.evaluate(() => document.getElementById('voiceAudio').paused) && (await playingSound(p)) === 1, 'при открытии видео голос замолкает: звучит ровно один источник');
  await p.context().close();
}

console.log('\n[6b] Голос стартует сам, когда браузер разрешает звук');
{
  const p = await open(browser);
  await p.locator('#voice').scrollIntoViewIfNeeded();
  await p.waitForTimeout(2200);
  ok(await p.evaluate(() => { const a = document.getElementById('voiceAudio'); return !a.paused && a.currentTime > 0.5; }), 'голос зазвучал автоматически при появлении секции');
  await p.context().close();
}

console.log('\n[7] Зеркало');
{
  const p = await open(browser);
  await p.hover('#mirror');
  await p.waitForTimeout(1600);
  ok(Number(await p.evaluate(() => getComputedStyle(document.querySelector('.mirror-face')).opacity)) > 0.6, 'при наведении в зеркале проявляется отражение');
  ok(Number(await p.evaluate(() => getComputedStyle(document.getElementById('mirrorHalo')).opacity)) > 0.6, 'зеркало подсвечивается');
  const bg = await p.evaluate(() => getComputedStyle(document.querySelector('.mirror-face')).backgroundImage);
  ok(bg.includes('/media/hero/hero.webp'), 'отражение — та же настоящая фотография Изабеллы');
  await p.mouse.move(5, 300);
  await p.waitForTimeout(1600);
  ok(Number(await p.evaluate(() => getComputedStyle(document.querySelector('.mirror-face')).opacity)) < 0.1, 'при уходе указателя отражение плавно исчезает');
  await p.context().close();
  const t = await open(browser, { w: 390, h: 844, mobile: true });
  ok(Number(await t.evaluate(() => getComputedStyle(document.getElementById('mirrorHalo')).opacity)) > 0, 'на телефоне зеркало подсказывает касание мерцающей рамкой');
  await t.locator('#mirror').tap();
  await t.waitForTimeout(1600);
  ok((await t.getAttribute('#mirror', 'aria-pressed')) === 'true' && Number(await t.evaluate(() => getComputedStyle(document.querySelector('.mirror-face')).opacity)) > 0.6, 'касание показывает отражение');
  await t.locator('#mirror').tap();
  await t.waitForTimeout(1600);
  ok((await t.getAttribute('#mirror', 'aria-pressed')) === 'false' && Number(await t.evaluate(() => getComputedStyle(document.querySelector('.mirror-face')).opacity)) < 0.1, 'повторное касание убирает отражение');
  await t.context().close();
}

console.log('\n[7b] Отражение в зеркале: само мигает и стоит точно в зеркале');
{
  const p = await open(browser);
  let max = 0;
  for (let i = 0; i < 40; i += 1) { await p.waitForTimeout(400); max = Math.max(max, Number(await p.evaluate(() => getComputedStyle(document.querySelector('.mirror-face')).opacity))); }
  ok(max > 0.5, `без наведения отражение само проявляется (макс. прозрачность ${max.toFixed(2)})`);
  await p.context().close();
  for (const [w, h, mobile] of [[390, 844, true], [360, 640, true], [768, 1024, true], [1366, 768, false], [1440, 900, false]]) {
    const q = await open(browser, { w, h, mobile });
    const r = await q.evaluate(() => {
      const f = document.querySelector('.hero-frame').getBoundingClientRect();
      const i = document.querySelector('.hero-frame img');
      const m = document.getElementById('mirror').getBoundingClientRect();
      return { ratio: (f.width / f.height) / (i.naturalWidth / i.naturalHeight), cx: (m.x + m.width / 2 - f.x) / f.width, cy: (m.y + m.height / 2 - f.y) / f.height, visible: m.bottom <= innerHeight };
    });
    ok(Math.abs(r.ratio - 1) < 0.01 && Math.abs(r.cx - 0.746) < 0.01 && Math.abs(r.cy - 0.702) < 0.01, `${w}px: рамка с пропорциями фото, зеркало на месте (${(r.cx * 100).toFixed(1)}%, ${(r.cy * 100).toFixed(1)}%)`);
    if (mobile && w <= 390) ok(r.visible, `${w}px: зеркало целиком на первом экране`);
    await q.context().close();
  }
}

console.log('\n[7c] Видеообряды: дымная бордово-фиолетовая аура, дуги, перетекание энергии');
{
  const p = await open(browser);
  await p.locator('#rituals').scrollIntoViewIfNeeded();
  await p.waitForTimeout(2500);
  const info = await p.evaluate(() => {
    const g = document.getElementById('orbGrid');
    const ring = getComputedStyle(document.querySelector('.orb-ring'));
    const cv = g.orbFx.canvas;
    const x = cv.getContext('2d');
    // есть ли «дым» в зоне над кругом (между кругом и краем холста)
    const o = document.querySelector('.orb');
    const cx = (o.closest('.orb-card').offsetLeft + o.offsetLeft + o.offsetWidth / 2 + 150) * (cv.width / cv.clientWidth);
    const cy = (o.closest('.orb-card').offsetTop + o.offsetTop + o.offsetHeight / 2 + 150 - o.offsetHeight * 0.62) * (cv.height / cv.clientHeight);
    const d = x.getImageData(Math.max(0, cx - 30), Math.max(0, cy - 30), 60, 60).data;
    let lit = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 6) lit += 1;
    return { sparks: document.querySelectorAll('.orb-sparks').length, grad: ring.backgroundImage, edges: g.orbFx.edges, orbs: g.orbFx.orbs, lit, cvPos: getComputedStyle(cv).position, behind: Number(getComputedStyle(cv).zIndex) < Number(getComputedStyle(document.querySelector('.orb-card')).zIndex) };
  });
  ok(info.sparks === 0 && info.grad === 'none', 'градиентная обводка и светящиеся точки убраны');
  ok(info.orbs === 10 && info.edges >= 6, `между соседними кругами в ряду проложено ${info.edges} электрических дуг`);
  ok(info.lit > 150 && info.behind, `вокруг круга живая дымная аура (пикселей дыма: ${info.lit}), холст лежит позади видеокругов`);
  // наведение
  const before = await p.evaluate(() => document.getElementById('orbGrid').orbFx.spawned);
  await p.locator('.orb').nth(1).scrollIntoViewIfNeeded();
  await p.waitForTimeout(400);
  const bb = await p.locator('.orb').nth(1).boundingBox();
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await p.waitForTimeout(200);
  const hv = await p.evaluate(() => ({ rings: document.getElementById('orbGrid').orbFx.rings, runs: document.getElementById('orbGrid').orbFx.runs }));
  ok(hv.rings >= 1 && hv.runs >= 1, 'при наведении: импульс-кольцо и короткий электрический пробег по контуру');
  await p.waitForTimeout(1300);
  ok(await p.evaluate(() => document.getElementById('orbGrid').orbFx.runs) === 0, 'пробег заканчивается сам');
  // прокрутка
  await p.mouse.move(5, 5);
  const s0 = await p.evaluate(() => document.getElementById('orbGrid').orbFx.spawned);
  for (let i = 0; i < 4; i += 1) { await p.mouse.wheel(0, 140); await p.waitForTimeout(120); }
  await p.waitForTimeout(500);
  ok((await p.evaluate(() => document.getElementById('orbGrid').orbFx.spawned)) > s0, 'при прокрутке энергия перетекает по дугам от обряда к обряду');
  // кадры анимации идут плавно
  const fps = await p.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n += 1; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else res(n); }; requestAnimationFrame(f); }));
  ok(fps >= 25, `анимация не тормозит страницу (${fps} кадров/с в headless)`);
  await p.context().close();
  const r = await open(browser, { reduce: true });
  await r.locator('#rituals').scrollIntoViewIfNeeded();
  await r.mouse.wheel(0, 600);
  await r.waitForTimeout(800);
  ok((await r.evaluate(() => document.getElementById('orbGrid').orbFx.spawned)) === 0, 'при reduced-motion дуги и энергия не анимируются (остаётся статичная аура)');
  await r.context().close();
}

console.log('\n[8] Адаптивность: нет горизонтальной прокрутки');
for (const [w, h, mobile] of [[360, 740, true], [390, 844, true], [768, 1024, true], [1280, 800, false], [1440, 900, false]]) {
  const p = await open(browser, { w, h, mobile });
  const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  ok(o.sw <= o.cw, `${w}px: scrollWidth ${o.sw} ≤ ${o.cw}`);
  const small = await p.evaluate(() => [...document.querySelectorAll('a, button')].filter((e) => {
    const r = e.getBoundingClientRect();
    return r.width && r.height && e.offsetParent && (r.width < 24 || r.height < 24) && !e.closest('.skip, .scroll-hint, [aria-hidden="true"]');
  }).map((e) => `${e.className || e.id || e.tagName}:${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`));
  ok(small.length === 0, `${w}px: цели нажатия не меньше 24×24 px (WCAG 2.2 AA) ` + small.slice(0, 6).join(', '));
  await p.context().close();
}

console.log('\n[8b] Якорные ссылки не прячутся под шапкой');
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const p = await open(browser, { w, h, mobile: w < 800 });
  const res = [];
  for (const id of ['uslugi', 'about', 'rituals', 'video-reviews', 'reviews', 'card-day', 'contacts', 'greeting']) {
    await p.evaluate((i) => { document.documentElement.style.scrollBehavior = 'auto'; location.hash = ''; window.scrollTo(0, 0); }, id);
    await p.evaluate((i) => { location.hash = '#' + i; }, id);
    await p.waitForTimeout(500);
    const top = await p.evaluate((i) => { const s = document.getElementById(i); const t = s.querySelector('h2, .eyebrow') || s; return Math.round(t.getBoundingClientRect().top); }, id);
    res.push(`${id}:${top}`);
    if (top < 60) res.bad = (res.bad || []).concat(id);
  }
  ok(!res.bad, `${w}px: заголовки секций ниже шапки (68px) → ${res.join(' ')}`);
  await p.context().close();
}

console.log('\n[9] prefers-reduced-motion');
{
  const p = await open(browser, { reduce: true });
  await p.locator('#rituals').scrollIntoViewIfNeeded();
  await p.waitForTimeout(1500);
  ok(await p.evaluate(() => [...document.querySelectorAll('.orb video')].every((v) => v.paused && !v.getAttribute('src'))), 'видеокружки не грузят видео, остаются постеры');
  ok(await p.evaluate(() => getComputedStyle(document.getElementById('ash')).display === 'none'), 'пепел отключён');
  await p.locator('#flow').scrollIntoViewIfNeeded();
  const a = await flowAngle(p);
  await p.waitForTimeout(2000);
  ok(Math.abs((await flowAngle(p)) - a) < 0.01, '3D-карусель не вращается сама');
  await p.locator('#carousel').scrollIntoViewIfNeeded();
  const c = await carPos(p);
  await p.waitForTimeout(2000);
  ok(Math.abs((await carPos(p)) - c) < 0.5, 'лента фотоотзывов не движется сама');
  await p.locator('#flowNext').click();
  await p.waitForTimeout(1200);
  ok(Math.abs((await flowAngle(p)) - a) > 20, 'но вручную (кнопками) карусель по-прежнему управляется');
  await p.locator('.orb').first().click({ force: true });
  await p.waitForTimeout(800);
  ok((await p.locator('#videoModal.open').count()) === 1, 'обряд по нажатию всё равно открывается');
  await p.context().close();
}

console.log('\n[10] Телефон 390×844: окна помещаются на экран, крестики на виду');
{
  const p = await open(browser, { w: 390, h: 844, mobile: true });
  const inView = async (sel) => p.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; }, sel);
  await p.locator('#greeting').scrollIntoViewIfNeeded();
  await p.waitForTimeout(900);
  ok(await p.locator('#gvPlay').isVisible(), 'видеоприветствие и постер видны на телефоне');
  await p.locator('#rituals').scrollIntoViewIfNeeded();
  await p.locator('.orb').nth(2).tap();
  await p.waitForTimeout(900);
  ok((await p.locator('#videoModal.open').count()) === 1, 'ритуал открывается по касанию');
  ok(await inView('#videoModal .modal-close'), 'крестик закрытия на экране');
  ok(await inView('#vmVideo'), 'видео целиком помещается на экран');
  await p.tap('#videoModal .modal-close');
  await p.waitForTimeout(500);
  await p.locator('#flow').scrollIntoViewIfNeeded();
  await p.waitForTimeout(800);
  const a0 = await flowAngle(p);
  const box = await p.locator('#flow').boundingBox();
  await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await p.waitForTimeout(900);
  ok(await inView('#videoModal .modal-close') && await inView('#vmVideo'), 'видеоотзыв на телефоне: плеер и крестик на экране');
  await p.tap('#videoModal .modal-close');
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.getElementById('flow').flow.radius) > 150 && Math.abs(await flowAngle(p) - a0) < 60, 'карусель на телефоне работает');
  await p.locator('#card-day .btn').tap();
  await p.waitForTimeout(2400);
  ok(await inView('#cmVideo') && await inView('#cardModal .modal-close') && await inView('#cmSkip'), 'карта дня: видео, «Открыть карту дня» и крестик на экране');
  await p.tap('#cmSkip');
  await p.waitForTimeout(4200);
  ok(await inView('.tarot') && await inView('#cmCta'), 'после переворота карта и кнопка помещаются на экран');
  await p.tap('#cardModal .modal-close');
  await p.waitForTimeout(400);
  await p.locator('#carousel').scrollIntoViewIfNeeded();
  await p.waitForTimeout(600);
  await p.touchscreen.tap(box.x + 200, (await p.locator('#carousel').boundingBox()).y + 200);
  await p.waitForTimeout(700);
  ok(await inView('#photoModal .modal-close'), 'фотоотзыв крупно: крестик на экране');
  ok(p.errors.length === 0, 'консоль чистая ' + p.errors.join(' | '));
  await p.context().close();
}

await browser.close();
console.log(`\nИтого: ${pass} успешно, ${fail} с ошибками`);
process.exit(fail ? 1 : 0);
