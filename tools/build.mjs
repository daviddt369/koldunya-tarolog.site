// Production-сборка: минификация JS/CSS, копия медиа в dist/.  node tools/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';

const OUT = 'dist';
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

await esbuild.build({ entryPoints: ['js/main.js'], bundle: true, minify: true, format: 'esm', target: 'es2020', outfile: `${OUT}/app.js`, legalComments: 'none' });
const css = await esbuild.transform(fs.readFileSync('styles.css', 'utf8'), { loader: 'css', minify: true });
fs.writeFileSync(`${OUT}/styles.css`, css.code);

const html = fs.readFileSync('index.html', 'utf8').replace('./js/main.js', './app.js');
fs.writeFileSync(`${OUT}/index.html`, html);

const copy = (from, to) => {
  const st = fs.statSync(from);
  if (st.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const f of fs.readdirSync(from)) {
      if (f === '_tmp' || /^manifest.*\.json$/.test(f)) continue;
      copy(path.join(from, f), path.join(to, f));
    }
  } else fs.copyFileSync(from, to);
};
copy('media', `${OUT}/media`);
fs.mkdirSync(`${OUT}/fonts`, { recursive: true });
for (const f of fs.readdirSync('fonts')) if (f.endsWith('.woff2')) copy(`fonts/${f}`, `${OUT}/fonts/${f}`);
for (const f of ['favicon.svg', 'favicon.ico', 'favicon-32.png', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'robots.txt', 'sitemap.xml', 'CNAME', '.nojekyll']) if (fs.existsSync(f)) copy(f, `${OUT}/${f}`);

const size = (p) => (fs.statSync(p).size / 1024).toFixed(1) + ' KB';
console.log(`dist/app.js ${size(`${OUT}/app.js`)}, dist/styles.css ${size(`${OUT}/styles.css`)}, index.html ${size(`${OUT}/index.html`)}`);
