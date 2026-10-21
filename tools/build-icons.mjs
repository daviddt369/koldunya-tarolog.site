// Иконки сайта из favicon.svg: PNG (мессенджеры не понимают SVG) и favicon.ico.  node tools/build-icons.mjs
import fs from 'node:fs';
import sharp from 'sharp';

const svg = fs.readFileSync('favicon.svg');
const png = (size) => sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();

fs.writeFileSync('favicon-32.png', await png(32));
fs.writeFileSync('icon-192.png', await png(192));
fs.writeFileSync('icon-512.png', await png(512));
fs.writeFileSync('apple-touch-icon.png', await png(180));

// favicon.ico с вложенными PNG 16/32/48
const sizes = [16, 32, 48];
const imgs = await Promise.all(sizes.map(png));
const head = Buffer.alloc(6);
head.writeUInt16LE(0, 0);
head.writeUInt16LE(1, 2);
head.writeUInt16LE(sizes.length, 4);
let offset = 6 + sizes.length * 16;
const dir = Buffer.concat(imgs.map((b, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(sizes[i], 0);
  e.writeUInt8(sizes[i], 1);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(b.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += b.length;
  return e;
}));
fs.writeFileSync('favicon.ico', Buffer.concat([head, dir, ...imgs]));
console.log('иконки готовы');
