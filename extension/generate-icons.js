/**
 * generate-icons.js
 * Run with: node generate-icons.js
 * Generates PNG icons for the PassVault extension using Canvas API (Node.js).
 * Requires: npm install canvas (run once in extension dir)
 *
 * Or use the inline base64 fallback below (no dependencies).
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 128];

for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background - dark rounded
  const radius = size * 0.2;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fillStyle = '#10b981';
  ctx.fill();

  // Lock icon (simplified)
  ctx.fillStyle = '#fff';
  const lw = size * 0.45;
  const lh = size * 0.35;
  const lx = (size - lw) / 2;
  const ly = size * 0.5;
  const lr = size * 0.08;

  // Shackle
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = size * 0.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(size / 2, size * 0.42, lw * 0.3, Math.PI, 0, false);
  ctx.stroke();

  // Body
  const br = size * 0.06;
  ctx.beginPath();
  ctx.moveTo(lx + br, ly);
  ctx.lineTo(lx + lw - br, ly);
  ctx.quadraticCurveTo(lx + lw, ly, lx + lw, ly + br);
  ctx.lineTo(lx + lw, ly + lh - br);
  ctx.quadraticCurveTo(lx + lw, ly + lh, lx + lw - br, ly + lh);
  ctx.lineTo(lx + br, ly + lh);
  ctx.quadraticCurveTo(lx, ly + lh, lx, ly + lh - br);
  ctx.lineTo(lx, ly + br);
  ctx.quadraticCurveTo(lx, ly, lx + br, ly);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();

  // Keyhole dot
  ctx.beginPath();
  ctx.arc(size / 2, ly + lh * 0.42, size * 0.07, 0, Math.PI * 2);
  ctx.fillStyle = '#10b981';
  ctx.fill();

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, 'icons', `icon${size}.png`), buffer);
  console.log(`Generated icon${size}.png`);
}

console.log('All icons generated!');
