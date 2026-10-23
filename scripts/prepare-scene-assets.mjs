// Converts the supplied production artwork into web-optimised files under public/.
// Usage: node scripts/prepare-scene-assets.mjs "<asset folder>" "<slot cabinet folder>"
// Artwork is resized and re-encoded only; colours are never altered.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const [assetDir, slotDir] = process.argv.slice(2);
if (!assetDir || !slotDir) {
  console.error('Usage: node scripts/prepare-scene-assets.mjs "<asset folder>" "<slot cabinet folder>"');
  process.exit(1);
}

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
await fs.mkdir(path.join(publicDir, 'scene'), { recursive: true });
await fs.mkdir(path.join(publicDir, 'brand'), { recursive: true });

const out = (...p) => path.join(publicDir, ...p);
const src = (...p) => path.join(assetDir, ...p);

await sharp(src('Official Logo', 'Official logo.jpg')).resize(640).webp({ quality: 88 }).toFile(out('brand', 'logo.webp'));
await sharp(src('Official Logo', 'Official logo.jpg')).resize(180).png().toFile(out('brand', 'icon.png'));
await sharp(src('The bloody raven and hostess', 'The Bloody Raven.png')).webp({ quality: 84 }).toFile(out('scene', 'saloon.webp'));
await sharp(src('The bloody raven and hostess', 'Hostess Gwen.png'))
  .resize(1200)
  .webp({ quality: 88, alphaQuality: 100 })
  .toFile(out('scene', 'hostess.webp'));
await sharp(src('train', 'Vance bureau train.png')).webp({ quality: 86, alphaQuality: 100 }).toFile(out('scene', 'train.webp'));

// The slot cabinets arrive as JPEGs on pure black. Remove only the black backdrop that is
// connected to the image border, ramping alpha through the glow so halos blend into the scene.
async function cutOutBlackBackdrop(input, output) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const LOW = 6;
  const HIGH = 30;
  const rgba = Buffer.alloc(width * height * 4);
  const background = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const brightness = (i) => Math.max(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);
  const visit = (i) => {
    if (!background[i] && brightness(i) < HIGH) {
      background[i] = 1;
      queue[tail++] = i;
    }
  };
  for (let x = 0; x < width; x++) {
    visit(x);
    visit((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    visit(y * width);
    visit(y * width + width - 1);
  }
  while (head < tail) {
    const i = queue[head++];
    const x = i % width;
    if (x > 0) visit(i - 1);
    if (x < width - 1) visit(i + 1);
    if (i >= width) visit(i - width);
    if (i < width * (height - 1)) visit(i + width);
  }
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    let alpha = 255;
    if (background[i]) {
      const t = Math.min(1, Math.max(0, (brightness(i) - LOW) / (HIGH - LOW)));
      alpha = Math.round(t * t * 255);
    }
    // Un-premultiply against black so semi-transparent glow keeps its original hue.
    const k = alpha > 0 && alpha < 255 ? 255 / alpha : 1;
    rgba[i * 4] = Math.min(255, Math.round(r * k));
    rgba[i * 4 + 1] = Math.min(255, Math.round(g * k));
    rgba[i * 4 + 2] = Math.min(255, Math.round(b * k));
    rgba[i * 4 + 3] = alpha;
  }
  await sharp(rgba, { raw: { width, height, channels: 4 } })
    .trim({ threshold: 0 })
    .resize({ width: 560 })
    .webp({ quality: 88, alphaQuality: 100 })
    .toFile(output);
}

await cutOutBlackBackdrop(path.join(slotDir, 'Solslinger slot.jpg'), out('scene', 'slot-solslinger.webp'));
await cutOutBlackBackdrop(path.join(slotDir, 'Ghost of the dead ringers slot.jpg'), out('scene', 'slot-dead-ringers.webp'));

for (const file of ['brand/logo.webp', 'scene/saloon.webp', 'scene/hostess.webp', 'scene/train.webp', 'scene/slot-solslinger.webp', 'scene/slot-dead-ringers.webp']) {
  const meta = await sharp(out(file)).metadata();
  const { size } = await fs.stat(out(file));
  console.log(`${file.padEnd(28)} ${meta.width}x${meta.height}  ${(size / 1024).toFixed(0)} KB`);
}
