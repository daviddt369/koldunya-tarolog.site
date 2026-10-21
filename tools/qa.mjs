// Автотесты в реальном Chrome: node tools/qa.mjs [url]
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const URL_ = process.argv[2] || 'http://localhost:8090/';
let pass = 0;
let fail = 0;
const ok = (c, msg) => { if (c) pass += 1; else fail += 1; console.log((c ? '  ✓ ' : '  ✗ ') + msg); };
const norm = (s) => s.replace(/️/g, '').replace(/\s+/g, ' ').trim();

async function open(browser, { w = 1280, h = 800, mobile = false, reduce = false, noActivation = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  if (noActivation) await page.addInitScript(() => Object.defineProperty(navigator, 'userActivation', { get: () => ({ hasBeenActive: false, isActive: false }) }));
  page.errors = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) page.errors.push(m.text()); });
  page.on('pageerror', (e) => page.errors.push('pageerror ' + e.message));
  page.on('response', (r) => { if (r.status() >= 400) page.errors.push(r.status() + ' ' + r.url()); });
  await page.goto(URL_, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  return page;
}
const playingSound = (page) => page.evaluate(() => [...document.querySelectorAll('audio,video')].filter((m) => !m.paused && !m.muted).length);

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
  ok(digits.length > 0 && digits.every((x) => x === '77055235378'), 'других телефонных номеров нет');
  await p.click('#copyTg');
  await p.waitForTimeout(600);
  ok((await p.locator('#toast.show').count()) === 1, 'копирование номера показывает подсказку');
  ok(p.errors.length === 0, 'нет ошибок и 404 в консоли ' + p.errors.join(' | '));
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

console.log('\n[2b] Видеоприветствие');
{
  const p = await open(browser);
  await p.click('#greetingBtn');
  await p.waitForTimeout(1200);
  ok(await p.evaluate(() => { const v = document.getElementById('vmVideo'); return !v.paused && !v.muted && v.currentSrc.includes('greeting.mp4'); }), 'видеоприветствие играет со звуком');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.getElementById('vmVideo').paused), 'закрытие останавливает его');
  await p.context().close();
}

console.log('\n[3] Видеоотзывы: 3D-галерея');
{
  const p = await open(browser);
  await p.locator('#flow').scrollIntoViewIfNeeded();
  await p.waitForTimeout(1500);
  ok((await p.locator('.fl-item').count()) === 7, 'все 7 видеоотзывов в галерее');
  const t = await p.evaluate(() => getComputedStyle(document.querySelector('.fl-item:not(.center)')).transform);
  ok(t.startsWith('matrix3d'), 'боковые карточки повернуты в 3D (matrix3d)');
  const c0 = await p.locator('#flowCount').innerText();
  await p.click('#flowNext');
  await p.waitForTimeout(800);
  ok((await p.locator('#flowCount').innerText()) !== c0, 'стрелка листает галерею: ' + c0 + ' → ' + (await p.locator('#flowCount').innerText()));
  await p.locator('#flow').focus();
  await p.keyboard.press('ArrowLeft');
  await p.waitForTimeout(500);
  ok((await p.locator('#flowCount').innerText()) === c0, 'клавиши ←/→ работают');
  const box = await p.locator('#flow').boundingBox();
  await p.mouse.move(box.x + box.width / 2 + 300, box.y + 40);
  await p.mouse.down();
  await p.mouse.move(box.x + box.width / 2 + 100, box.y + 40, { steps: 8 });
  await p.mouse.up();
  await p.waitForTimeout(700);
  ok((await p.locator('#flowCount').innerText()) !== c0, 'перетаскивание/свайп листает галерею');
  await p.locator('.fl-item.center').click();
  await p.waitForTimeout(1200);
  ok((await p.locator('#videoModal.open').count()) === 1, 'клик по центральному видео открывает плеер');
  const st = await p.evaluate(() => { const v = document.getElementById('vmVideo'); return { paused: v.paused, muted: v.muted, ctrl: v.controls, src: v.currentSrc }; });
  ok(!st.paused && !st.muted && st.ctrl && st.src.includes('/reviews/video/'), 'видеоотзыв играет со звуком, есть пауза/перемотка/громкость (controls)');
  await p.click('#videoModal .modal-close');
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.getElementById('vmVideo').paused), 'закрытие останавливает видео');
  ok(p.errors.length === 0, 'консоль чистая ' + p.errors.join(' | '));
  await p.context().close();
}

console.log('\n[4] Фотоотзывы: карусель');
{
  const p = await open(browser);
  await p.locator('#carousel').scrollIntoViewIfNeeded();
  await p.waitForTimeout(800);
  ok((await p.locator('.car-card').count()) === 12, 'все 12 фотоотзывов в карусели');
  const x0 = await p.evaluate(() => document.getElementById('carousel').scrollLeft);
  await p.click('#carNext');
  await p.waitForTimeout(900);
  ok((await p.evaluate(() => document.getElementById('carousel').scrollLeft)) > x0, 'стрелка листает карусель');
  await p.locator('.car-card').nth(2).click();
  await p.waitForTimeout(500);
  ok((await p.locator('#photoModal.open').count()) === 1, 'клик открывает фото крупно');
  await p.waitForTimeout(500);
  const nat = await p.evaluate(() => document.getElementById('pmImg').naturalWidth);
  ok(nat >= 900, `загружен полноразмерный отзыв (${nat} px)`);
  await p.click('#pmZoom');
  ok((await p.locator('.photo-panel.zoomed').count()) === 1, 'увеличение работает');
  await p.click('#pmNext');
  ok((await p.locator('#pmCount').innerText()).startsWith('4'), 'листание внутри просмотра');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.getElementById('photoModal').hidden), 'закрытие по Escape');
  ok(p.errors.length === 0, 'консоль чистая ' + p.errors.join(' | '));
  await p.context().close();
}

console.log('\n[5] Карта дня');
{
  const p = await open(browser);
  await p.locator('#card-day .btn').click();
  await p.waitForTimeout(1200);
  ok((await p.locator('#cardModal.open').count()) === 1, 'поп-ап карты открывается');
  ok(await p.evaluate(() => { const v = document.getElementById('cmVideo'); return !v.paused && v.currentSrc.includes('card-day.mp4'); }), 'играет тематическое видео вступления');
  ok(await p.evaluate(() => document.querySelector('.cm-stage').dataset.stage === 'intro'), 'сначала вступление, карты ещё нет');
  await p.click('#cmSkip');
  await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.querySelector('.cm-stage').dataset.stage === 'card'), 'после вступления появляется карта');
  await p.waitForTimeout(3600);
  ok((await p.locator('#tarot.flipped').count()) === 1, 'карта переворачивается');
  const name1 = await p.locator('#cmName').innerText();
  ok(name1.length > 2 && (await p.locator('#cmText').innerText()).length > 20, `показаны название и значение: «${name1}»`);
  await p.click('#cardModal .modal-close');
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.getElementById('cmVideo').paused), 'закрытие останавливает видео');
  await p.reload({ waitUntil: 'networkidle' });
  await p.locator('#card-day .btn').click();
  await p.click('#cmSkip');
  ok((await p.locator('#cmName').innerText()) === name1, 'после обновления страницы карта дня та же');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.getElementById('cardModal').hidden), 'Escape закрывает поп-ап карты');
  ok(p.errors.length === 0, 'консоль чистая ' + p.errors.join(' | '));
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

console.log('\n[7] Режим усиленного хоррора и зеркало');
{
  const p = await open(browser);
  await p.click('#horrorToggle');
  ok((await p.evaluate(() => document.documentElement.classList.contains('horror'))) && (await p.getAttribute('#horrorToggle', 'aria-pressed')) === 'true', 'режим включается');
  await p.hover('#mirror');
  await p.waitForTimeout(1300);
  ok(Number(await p.evaluate(() => getComputedStyle(document.querySelector('.mirror-face')).opacity)) > 0.3, 'зеркало реагирует');
  await p.click('#horrorToggle');
  ok(!(await p.evaluate(() => document.documentElement.classList.contains('horror'))), 'режим выключается');
  await p.context().close();
}

console.log('\n[8] Адаптивность: нет горизонтальной прокрутки');
for (const [w, h, mobile] of [[360, 740, true], [390, 844, true], [768, 1024, true], [1280, 800, false], [1440, 900, false]]) {
  const p = await open(browser, { w, h, mobile });
  const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  ok(o.sw <= o.cw, `${w}px: scrollWidth ${o.sw} ≤ ${o.cw}`);
  const small = await p.evaluate(() => [...document.querySelectorAll('a, button')].filter((e) => {
    const r = e.getBoundingClientRect();
    return r.width && r.height && e.offsetParent && (r.width < 24 || r.height < 24) && !e.closest('.skip, .scroll-hint');
  }).map((e) => `${e.className || e.id || e.tagName}:${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`));
  ok(small.length === 0, `${w}px: цели нажатия не меньше 24×24 px (WCAG 2.2 AA) ` + small.slice(0, 6).join(', '));
  await p.context().close();
}

console.log('\n[9] prefers-reduced-motion');
{
  const p = await open(browser, { reduce: true });
  await p.locator('#rituals').scrollIntoViewIfNeeded();
  await p.waitForTimeout(1500);
  ok(await p.evaluate(() => [...document.querySelectorAll('.orb video')].every((v) => v.paused && !v.getAttribute('src'))), 'видеокружки не грузят видео, остаются постеры');
  ok(await p.evaluate(() => getComputedStyle(document.getElementById('ash')).display === 'none'), 'пепел отключён');
  await p.locator('.orb').first().click();
  await p.waitForTimeout(800);
  ok((await p.locator('#videoModal.open').count()) === 1, 'обряд по нажатию всё равно открывается');
  await p.context().close();
}

console.log('\n[10] Телефон 390×844: окна помещаются на экран, крестики на виду');
{
  const p = await open(browser, { w: 390, h: 844, mobile: true });
  const inView = async (sel) => p.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; }, sel);
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
  const c0 = await p.locator('#flowCount').innerText();
  const box = await p.locator('#flow').boundingBox();
  await p.touchscreen.tap(box.x + box.width - 20, box.y + 60);
  await p.waitForTimeout(300);
  await p.locator('.fl-item.center').tap();
  await p.waitForTimeout(900);
  ok(await inView('#videoModal .modal-close') && await inView('#vmVideo'), 'видеоотзыв на телефоне: плеер и крестик на экране');
  await p.tap('#videoModal .modal-close');
  await p.waitForTimeout(400);
  await p.locator('#card-day .btn').tap();
  await p.waitForTimeout(900);
  ok(await inView('#cmVideo') && await inView('#cardModal .modal-close') && await inView('#cmSkip'), 'карта дня: видео, «пропустить» и крестик на экране');
  await p.tap('#cmSkip');
  await p.waitForTimeout(4200);
  ok(await inView('.tarot') && await inView('#cmCta'), 'после переворота карта и кнопка помещаются на экран');
  await p.tap('#cardModal .modal-close');
  await p.waitForTimeout(400);
  await p.locator('#carousel').scrollIntoViewIfNeeded();
  await p.locator('.car-card').first().tap();
  await p.waitForTimeout(600);
  ok(await inView('#photoModal .modal-close'), 'фотоотзыв крупно: крестик на экране');
  ok(p.errors.length === 0, 'консоль чистая ' + p.errors.join(' | '));
  await p.context().close();
}

await browser.close();
console.log(`\nИтого: ${pass} успешно, ${fail} с ошибками`);
process.exit(fail ? 1 : 0);
