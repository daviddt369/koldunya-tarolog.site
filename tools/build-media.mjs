// Оптимизация материалов заказчика: Изабелла/ (оригиналы, не меняются) -> media/ (веб-копии)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import sharp from 'sharp';

const SRC = path.resolve('Изабелла');
const OUT = path.resolve('media');
const only = process.argv[2]; // необязательный фильтр: hero | about | photos | videos | rituals | audio | special
const mk = (d) => fs.mkdirSync(d, { recursive: true });
const ff = (args) => execFileSync(ffmpegPath, ['-y', '-v', 'error', '-nostdin', ...args], { stdio: 'inherit' });
const want = (k) => !only || only === k;

const x264 = (crf = 27) => ['-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-profile:v', 'main', '-movflags', '+faststart'];
const aac = ['-c:a', 'aac', '-b:a', '96k', '-ac', '1'];

const manifest = [];
const note = (file, type, purpose, section, out) => manifest.push({ file, type, purpose, section, out });

async function poster(video, dest, { time = 1, width = 480 } = {}) {
  const tmp = path.join(OUT, '_tmp');
  mk(tmp);
  const png = path.join(tmp, 'p.png');
  ff(['-ss', String(time), '-i', video, '-frames:v', '1', png]);
  await sharp(png).resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toFile(dest);
}

mk(OUT);

// ---------- Фото: Hero / Обо мне / шар ----------
if (want('hero')) {
  mk(path.join(OUT, 'hero'));
  const src = path.join(SRC, 'герой главное фото.jpeg');
  // На исходнике — рекламный постер с надписями. Берём только фигуру (без заголовка, списка слева и нижних подписей).
  const crop = { left: 350, top: 300, width: 730, height: 905 };
  const base = sharp(src).extract(crop);
  await base.clone().webp({ quality: 86 }).toFile(path.join(OUT, 'hero/hero.webp'));
  await base.clone().resize({ width: 560 }).webp({ quality: 82 }).toFile(path.join(OUT, 'hero/hero-m.webp'));
  note('герой главное фото.jpeg', 'фото', 'главный экран (кадр без постерных надписей)', 'Hero', 'media/hero/hero.webp, hero-m.webp');

  // превью для соцсетей 1200x630: фото справа, имя и контакты слева
  const text = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="690" height="630">
    <defs><linearGradient id="f" x1="0" x2="1"><stop offset="0.55" stop-color="#0a0506" stop-opacity="0"/><stop offset="1" stop-color="#0a0506"/></linearGradient></defs>
    <g font-family="Georgia, 'Times New Roman', serif" fill="#e8cd8f">
      <text x="64" y="250" font-size="86" font-weight="700" letter-spacing="3" fill="#ece0c6">ИЗАБЕЛЛА</text>
      <text x="66" y="312" font-size="23" letter-spacing="3" font-weight="700">ЭКСТРАСЕНС | МАГ | ЧЕРНОКНИЖНИК</text>
      <text x="66" y="392" font-size="30" font-style="italic" fill="#ece0c6">Опыт работы более 15 лет</text>
      <text x="66" y="440" font-size="26" fill="#ab9f90">Личный приём · Шымкент</text>
      <text x="66" y="540" font-size="40" font-weight="700" letter-spacing="2">+7 705 523 5378</text>
    </g></svg>`);
  await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#0a0506' } })
    .composite([
      { input: await sharp(src).extract(crop).resize({ height: 630 }).toBuffer(), left: 692, top: 0 },
      { input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><linearGradient id="g" x1="0.5" x2="0.8"><stop offset="0" stop-color="#0a0506" stop-opacity="0"/><stop offset="1" stop-color="#0a0506" stop-opacity="0.9"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)" opacity="0"/></svg>'), left: 0, top: 0 },
      { input: text, left: 0, top: 0 },
    ])
    .jpeg({ quality: 84 })
    .toFile(path.join(OUT, 'og-image.jpg'));
}
if (want('about')) {
  mk(path.join(OUT, 'about'));
  const a = sharp(path.join(SRC, 'фото обо мне.jpeg'));
  await a.clone().webp({ quality: 84 }).toFile(path.join(OUT, 'about/about.webp'));
  await a.clone().resize({ width: 640 }).webp({ quality: 80 }).toFile(path.join(OUT, 'about/about-m.webp'));
  note('фото обо мне.jpeg', 'фото', 'портрет секции «Обо мне»', 'Обо мне', 'media/about/about.webp');
  await sharp(path.join(SRC, 'фото с шаром.png')).webp({ quality: 84 }).toFile(path.join(OUT, 'about/ball.webp'));
  note('фото с шаром.png', 'фото', 'кадр с хрустальным шаром (назначение не подписано)', 'Контакты / личный приём', 'media/about/ball.webp');
}

// ---------- Фотоотзывы ----------
if (want('photos')) {
  mk(path.join(OUT, 'reviews/photo'));
  const dir = path.join(SRC, 'отзывы фото');
  const files = fs.readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  const list = [];
  let i = 0;
  for (const f of files) {
    i++;
    const id = String(i).padStart(2, '0');
    const img = sharp(path.join(dir, f));
    const m = await img.metadata();
    await img.clone().webp({ quality: 86 }).toFile(path.join(OUT, `reviews/photo/r${id}.webp`));
    await img.clone().resize({ width: 560 }).webp({ quality: 78 }).toFile(path.join(OUT, `reviews/photo/r${id}-s.webp`));
    list.push({ id, w: m.width, h: m.height });
    note(`отзывы фото/${f}`, 'фото', 'скриншот отзыва клиента', 'Фотоотзывы (карусель)', `media/reviews/photo/r${id}.webp`);
  }
  fs.writeFileSync(path.join(OUT, 'reviews/photo/index.json'), JSON.stringify(list));
}

// ---------- Видеоотзывы ----------
if (want('videos')) {
  mk(path.join(OUT, 'reviews/video'));
  const dir = path.join(SRC, 'отзывы видео');
  const files = fs.readdirSync(dir).filter((f) => /\.mp4$/i.test(f)).sort();
  let i = 0;
  const list = [];
  for (const f of files) {
    i++;
    const id = String(i).padStart(2, '0');
    const src = path.join(dir, f);
    ff(['-i', src, '-vf', "scale='min(480,iw)':-2", ...x264(28), ...aac, path.join(OUT, `reviews/video/v${id}.mp4`)]);
    await poster(src, path.join(OUT, `reviews/video/v${id}.webp`), { time: 1.5, width: 480 });
    const meta = await sharp(path.join(OUT, `reviews/video/v${id}.webp`)).metadata();
    list.push({ id, w: meta.width, h: meta.height });
    note(`отзывы видео/${f}`, 'видео', 'видеоотзыв клиента', 'Видеоотзывы (3D-галерея)', `media/reviews/video/v${id}.mp4`);
    console.log('review video', id);
  }
  fs.writeFileSync(path.join(OUT, 'reviews/video/index.json'), JSON.stringify(list));
}

// ---------- Обряды ----------
const RITUALS = [
  ['приврорт.mp4', 'privorot'],
  ['обряд красный приворот.mp4', 'krasny-privorot'],
  ['кладбищенский приворот.mp4', 'kladbishchensky-privorot'],
  ['отворот соперницы.mp4', 'otvorot-sopernitsy'],
  ['чернок венчание.mp4', 'chernoe-venchanie'],
  ['обряд нити судьбы.mp4', 'niti-sudby'],
  ['обрд расклад таро.mp4', 'rasklad-taro'],
  ['обряд кладбище.mp4', 'kladbishche'],
  ['обряд заклинание.mp4', 'zaklinanie'],
  ['обряд отливание воском.mp4', 'otlivanie-voskom'],
];
if (want('rituals')) {
  mk(path.join(OUT, 'rituals'));
  for (const [f, slug] of RITUALS) {
    const src = path.join(SRC, 'обряды видео', f);
    // полное видео со звуком
    ff(['-i', src, '-vf', "scale='min(480,iw)':-2", ...x264(28), ...aac, path.join(OUT, `rituals/${slug}.mp4`)]);
    // «орб»: квадратный беззвучный цикл до 7 с, лёгкий
    ff(['-ss', '0.3', '-t', '7', '-i', src, '-an', '-vf', 'crop=iw:iw:0:(ih-iw)/2,scale=320:320', ...x264(31), path.join(OUT, `rituals/${slug}-orb.mp4`)]);
    await poster(src, path.join(OUT, `rituals/${slug}.webp`), { time: 1.2, width: 480 });
    await sharp(path.join(OUT, `rituals/${slug}.webp`)).resize(320, 320, { position: 'centre' }).webp({ quality: 74 }).toFile(path.join(OUT, `rituals/${slug}-orb.webp`));
    note(`обряды видео/${f}`, 'видео', 'видеообряд', 'Обряды (круглые видеосферы)', `media/rituals/${slug}.mp4 (+ -orb.mp4)`);
    console.log('ritual', slug);
  }
}

// ---------- Голос «Обо мне», приветствие, карта дня ----------
if (want('audio')) {
  mk(path.join(OUT, 'audio'));
  const src = path.join(SRC, 'озвучка обо мне.mp4');
  // только аудиодорожка; видео пользователю не показывается
  ff(['-i', src, '-vn', '-ac', '1', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', path.join(OUT, 'audio/about-voice.m4a')]);
  ff(['-i', src, '-vn', '-ac', '1', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:a', 'libmp3lame', '-b:a', '96k', path.join(OUT, 'audio/about-voice.mp3')]);
  note('озвучка обо мне.mp4', 'видео->аудио', 'голос Изабеллы (аудиодорожка извлечена FFmpeg)', 'Обо мне', 'media/audio/about-voice.m4a, .mp3');
}
if (want('special')) {
  mk(path.join(OUT, 'special'));
  const popup = path.join(SRC, 'всплывающее popup.mp4');
  ff(['-i', popup, '-vf', "scale='min(480,iw)':-2", ...x264(28), ...aac, path.join(OUT, 'special/card-day.mp4')]);
  await poster(popup, path.join(OUT, 'special/card-day.webp'), { time: 1, width: 480 });
  note('всплывающее popup.mp4', 'видео', 'вступление к «Карте дня»', 'Карта дня (поп-ап)', 'media/special/card-day.mp4');
  const greet = path.join(SRC, 'приветсвие.mp4');
  ff(['-i', greet, '-vf', "scale='min(480,iw)':-2", ...x264(28), ...aac, path.join(OUT, 'special/greeting.mp4')]);
  note('приветсвие.mp4', 'видео', 'видеоприветствие (назначение не подписано)', 'Видеоприветствие (блок после Hero)', 'media/special/greeting.mp4');
}
if (want('poster')) {
  // Постер видеоприветствия — настоящая фотография Изабеллы (фото обо мне), вертикальный кадр 480:848 без искажений
  mk(path.join(OUT, 'special'));
  const w = Math.round((1440 * 480) / 848);
  await sharp(path.join(SRC, 'фото обо мне.jpeg')).extract({ left: 150, top: 0, width: w, height: 1440 }).resize({ width: 720 }).webp({ quality: 84 }).toFile(path.join(OUT, 'special/greeting-poster.webp'));
  note('фото обо мне.jpeg', 'фото', 'постер видеоприветствия (вертикальный кадр)', 'Видеоприветствие (блок после Hero)', 'media/special/greeting-poster.webp');
}

fs.rmSync(path.join(OUT, '_tmp'), { recursive: true, force: true });
fs.writeFileSync(path.join(OUT, `manifest${only ? '-' + only : ''}.json`), JSON.stringify(manifest, null, 1));
console.log('готово:', manifest.length, 'файлов учтено');
