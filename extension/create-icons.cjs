/**
 * create-icons.js — Zero-dependency PNG icon generator for PassVault extension.
 * Uses only Node.js built-ins. Writes minimal valid 1x1 PNG files scaled up
 * via a pure-JS PNG encoder.
 *
 * Run: node create-icons.js  (from extension/ directory)
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/** Minimal PNG encoder — writes an RGBA PNG from a pixel array */
function encodePNG(width, height, pixels) {
  // pixels: Uint8Array of length width*height*4 (RGBA)

  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  function uint32BE(n) {
    const b = Buffer.alloc(4);
    b.writeUInt32BE(n, 0);
    return b;
  }

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const len = uint32BE(data.length);
    const body = Buffer.concat([typeBytes, data]);
    // CRC32
    let crc = 0xffffffff;
    for (const b of body) {
      crc ^= b;
      for (let i = 0; i < 8; i++) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    const crcBuf = uint32BE(crc);
    return Buffer.concat([len, body, crcBuf]);
  }

  const ihdrData = Buffer.concat([
    uint32BE(width), uint32BE(height),
    Buffer.from([8, 2, 0, 0, 0]) // bit depth 8, RGB (we'll handle alpha via RGBA=8,6)
  ]);
  // Actually use colour type 6 (RGBA)
  ihdrData[9] = 6; // colour type RGBA

  // Raw image data with filter bytes
  const rawRows = [];
  for (let y = 0; y < height; y++) {
    rawRows.push(0); // filter type None
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      rawRows.push(pixels[i], pixels[i+1], pixels[i+2], pixels[i+3]);
    }
  }

  const rawBuf = Buffer.from(rawRows);
  const compressed = zlib.deflateSync(rawBuf, { level: 9 });

  const idat = chunk('IDAT', compressed);
  const ihdr = chunk('IHDR', ihdrData);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

/** Draw a PassVault icon at the given size */
function drawIcon(size) {
  const pixels = new Uint8Array(size * size * 4);

  // Helper: set pixel
  function setPixel(x, y, r, g, b, a) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    // Alpha blend over existing
    const srcA = a / 255;
    const dstA = pixels[i+3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA < 0.001) return;
    pixels[i]   = Math.round((r * srcA + pixels[i]   * dstA * (1 - srcA)) / outA);
    pixels[i+1] = Math.round((g * srcA + pixels[i+1] * dstA * (1 - srcA)) / outA);
    pixels[i+2] = Math.round((b * srcA + pixels[i+2] * dstA * (1 - srcA)) / outA);
    pixels[i+3] = Math.round(outA * 255);
  }

  // Fill circle background (emerald)
  const cx = size / 2, cy = size / 2, cr = size / 2 - 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5, dy = y - cy + 0.5;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist <= cr) {
        // Anti-alias edge
        const alpha = Math.min(1, cr - dist + 0.5);
        setPixel(x, y, 16, 185, 129, Math.round(alpha * 255));
      }
    }
  }

  // Draw lock body (white rectangle)
  const bw = Math.round(size * 0.44), bh = Math.round(size * 0.32);
  const bx = Math.round((size - bw) / 2), by = Math.round(size * 0.5);
  for (let y = by; y < by + bh; y++) {
    for (let x = bx; x < bx + bw; x++) {
      setPixel(x, y, 255, 255, 255, 240);
    }
  }

  // Draw shackle (arc) — simple semicircle
  const ar = Math.round(bw * 0.3);
  const ax = Math.round(size / 2), ay = Math.round(by);
  const lw = Math.max(1, Math.round(size * 0.09));
  for (let angle = 180; angle <= 360; angle += 1) {
    const rad = angle * Math.PI / 180;
    for (let t = -lw/2; t <= lw/2; t += 0.5) {
      const r = ar + t;
      const sx = Math.round(ax + r * Math.cos(rad));
      const sy = Math.round(ay + r * Math.sin(rad));
      setPixel(sx, sy, 255, 255, 255, 230);
    }
  }

  // Keyhole dot (emerald)
  const kx = Math.round(size / 2), ky = Math.round(by + bh * 0.4);
  const kr = Math.max(1, Math.round(size * 0.07));
  for (let y = ky - kr; y <= ky + kr; y++) {
    for (let x = kx - kr; x <= kx + kr; x++) {
      if ((x-kx)*(x-kx) + (y-ky)*(y-ky) <= kr*kr) {
        setPixel(x, y, 16, 185, 129, 230);
      }
    }
  }

  return pixels;
}

const sizes = [16, 32, 48, 128];
const outDir = path.join(__dirname, 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const size of sizes) {
  const pixels = drawIcon(size);
  const png = encodePNG(size, size, pixels);
  const outPath = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`✓ icons/icon${size}.png  (${png.length} bytes)`);
}

console.log('\n✅ All icons generated!');
