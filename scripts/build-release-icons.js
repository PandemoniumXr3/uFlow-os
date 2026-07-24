/**
 * One-off release-candidate icon/splash generator.
 *
 * The committed assets/images/icon.png and assets/images/splash-icon.png were broken exports —
 * icon.png still had design-tool guide circles/crosshairs baked in, and splash-icon.png was an
 * empty bullseye placeholder with no brand mark at all. Neither is usable for a real build.
 *
 * assets/images/android-icon-foreground.png is a clean, correctly-exported version of uFlow's
 * actual brand mark (the blue chevron), so this script reuses that pixel data — nothing is
 * redesigned — and composites it onto:
 *   - a solid light-blue background with no alpha channel, for icon.png (Apple rejects icons
 *     with transparency)
 *   - a transparent canvas, for splash-icon.png (rendered over app.json's splash backgroundColor)
 *
 * Run with: node scripts/build-release-icons.js
 */
const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'images');
const SOURCE = path.join(ASSETS_DIR, 'android-icon-foreground.png');
const OUT_SIZE = 1024;
const SCALE = 2; // source is 512x512

const BRAND_BG = { r: 0xe6, g: 0xf4, b: 0xfe }; // matches android adaptiveIcon.backgroundColor

function loadSource() {
  const png = PNG.sync.read(fs.readFileSync(SOURCE));
  if (png.width !== 512 || png.height !== 512) {
    throw new Error(`expected 512x512 source, got ${png.width}x${png.height}`);
  }
  return png;
}

function upscale2x(src) {
  const dst = new PNG({ width: OUT_SIZE, height: OUT_SIZE });
  for (let y = 0; y < OUT_SIZE; y++) {
    const sy = Math.floor(y / SCALE);
    for (let x = 0; x < OUT_SIZE; x++) {
      const sx = Math.floor(x / SCALE);
      const sIdx = (src.width * sy + sx) * 4;
      const dIdx = (OUT_SIZE * y + x) * 4;
      dst.data[dIdx] = src.data[sIdx];
      dst.data[dIdx + 1] = src.data[sIdx + 1];
      dst.data[dIdx + 2] = src.data[sIdx + 2];
      dst.data[dIdx + 3] = src.data[sIdx + 3];
    }
  }
  return dst;
}

function compositeOnSolidBackground(fg, bg) {
  // Straight alpha-over compositing, then drop the alpha channel entirely (colorType RGB, no
  // transparency at all) — required for an iOS App Store icon.
  const out = new PNG({ width: OUT_SIZE, height: OUT_SIZE, colorType: 2 });
  for (let i = 0; i < OUT_SIZE * OUT_SIZE; i++) {
    const idx = i * 4;
    const a = fg.data[idx + 3] / 255;
    out.data[idx] = Math.round(fg.data[idx] * a + bg.r * (1 - a));
    out.data[idx + 1] = Math.round(fg.data[idx + 1] * a + bg.g * (1 - a));
    out.data[idx + 2] = Math.round(fg.data[idx + 2] * a + bg.b * (1 - a));
    out.data[idx + 3] = 255;
  }
  return out;
}

function main() {
  const source = loadSource();
  const upscaled = upscale2x(source);

  const icon = compositeOnSolidBackground(upscaled, BRAND_BG);
  const iconPath = path.join(ASSETS_DIR, 'icon.png');
  fs.writeFileSync(iconPath, PNG.sync.write(icon, { colorType: 2 }));
  console.log('wrote', iconPath, `${OUT_SIZE}x${OUT_SIZE}, RGB, no alpha`);

  // Splash keeps the transparent chevron as-is — it renders over app.json's splash
  // backgroundColor (#10141B), same compositing expo-splash-screen does at runtime.
  const splashPath = path.join(ASSETS_DIR, 'splash-icon.png');
  fs.writeFileSync(splashPath, PNG.sync.write(upscaled, { colorType: 6 }));
  console.log('wrote', splashPath, `${OUT_SIZE}x${OUT_SIZE}, RGBA, transparent background`);
}

main();
