/**
 * Minimal, zero-dependency QR Code generator (Model 2, Byte Encoding).
 * Produces an SVG string or matrix of modules (true/false) for rendering.
 */

// Galois Field GF(256) tables with primitive polynomial 0x11d
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 256) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(x, y) {
  if (x === 0 || y === 0) return 0;
  return GF_EXP[GF_LOG[x] + GF_LOG[y]];
}

function polyMul(p1, p2) {
  const result = new Uint8Array(p1.length + p2.length - 1);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      result[i + j] ^= gfMul(p1[i], p2[j]);
    }
  }
  return result;
}

function polyRest(dividend, divisor) {
  const result = new Uint8Array(dividend);
  for (let i = 0; i < dividend.length - divisor.length + 1; i++) {
    const coef = result[i];
    if (coef !== 0) {
      for (let j = 0; j < divisor.length; j++) {
        result[i + j] ^= gfMul(divisor[j], coef);
      }
    }
  }
  return result.slice(dividend.length - divisor.length + 1);
}

function getGenPoly(degree) {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    poly = polyMul(poly, new Uint8Array([1, GF_EXP[i]]));
  }
  return poly;
}

// Version table for QR code capacity (Versions 1 to 10, ECC Level M)
// [totalDataCodewords, ecCodewordsPerBlock, numBlocks]
const VERSION_SPECS = [
  null,
  { version: 1, totalData: 16, ecPerBlock: 10, blocks: 1, size: 21 },
  { version: 2, totalData: 28, ecPerBlock: 16, blocks: 1, size: 25 },
  { version: 3, totalData: 44, ecPerBlock: 26, blocks: 1, size: 29 },
  { version: 4, totalData: 64, ecPerBlock: 18, blocks: 2, size: 33 },
  { version: 5, totalData: 86, ecPerBlock: 24, blocks: 2, size: 37 },
  { version: 6, totalData: 108, ecPerBlock: 16, blocks: 4, size: 41 },
  { version: 7, totalData: 124, ecPerBlock: 18, blocks: 4, size: 45 },
  { version: 8, totalData: 154, ecPerBlock: 22, blocks: 4, size: 49 },
  { version: 9, totalData: 182, ecPerBlock: 22, blocks: 5, size: 53 },
  { version: 10, totalData: 216, ecPerBlock: 26, blocks: 5, size: 57 },
];

function selectVersion(dataLen) {
  for (let v = 1; v <= 10; v++) {
    const spec = VERSION_SPECS[v];
    // Byte mode overhead: 4-bit mode indicator + 8-bit char count indicator = 12 bits -> 2 bytes
    if (spec.totalData >= dataLen + 3) {
      return spec;
    }
  }
  return VERSION_SPECS[10];
}

export function generateQRCodeMatrix(text) {
  const enc = new TextEncoder();
  const rawBytes = enc.encode(text);
  const spec = selectVersion(rawBytes.length);
  const size = spec.size;

  // 1. Bitstream encoding: 0100 (Byte mode) + 8-bit count + bytes
  const bitBuf = [];
  function pushBits(val, len) {
    for (let i = len - 1; i >= 0; i--) {
      bitBuf.push((val >> i) & 1);
    }
  }

  pushBits(0b0100, 4); // Byte mode
  pushBits(rawBytes.length, 8); // Character count (versions 1-9 use 8 bits)
  for (const b of rawBytes) {
    pushBits(b, 8);
  }

  // Terminator (up to 4 zeroes)
  const maxDataBits = spec.totalData * 8;
  const termLen = Math.min(4, maxDataBits - bitBuf.length);
  pushBits(0, termLen);

  // Pad to byte boundary
  while (bitBuf.length % 8 !== 0) {
    bitBuf.push(0);
  }

  // Pad bytes 0xEC, 0x11
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bitBuf.length < maxDataBits) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  // Convert bitstream to data codewords
  const dataCodewords = new Uint8Array(spec.totalData);
  for (let i = 0; i < spec.totalData; i++) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bitBuf[i * 8 + b];
    }
    dataCodewords[i] = byteVal;
  }

  // 2. Error correction calculation (Reed-Solomon)
  const genPoly = getGenPoly(spec.ecPerBlock);
  const blockSize = Math.floor(spec.totalData / spec.blocks);
  const ecBlocks = [];
  const dataBlocks = [];

  for (let b = 0; b < spec.blocks; b++) {
    const start = b * blockSize;
    const end = (b === spec.blocks - 1) ? spec.totalData : start + blockSize;
    const blockData = dataCodewords.slice(start, end);
    dataBlocks.push(blockData);

    // Compute EC bytes
    const dividend = new Uint8Array(blockData.length + spec.ecPerBlock);
    dividend.set(blockData, 0);
    const ec = polyRest(dividend, genPoly);
    ecBlocks.push(ec);
  }

  // Interleave data and EC codewords
  const finalCodewords = [];
  const maxBlockLen = Math.max(...dataBlocks.map(b => b.length));
  for (let i = 0; i < maxBlockLen; i++) {
    for (let b = 0; b < spec.blocks; b++) {
      if (i < dataBlocks[b].length) finalCodewords.push(dataBlocks[b][i]);
    }
  }
  for (let i = 0; i < spec.ecPerBlock; i++) {
    for (let b = 0; b < spec.blocks; b++) {
      finalCodewords.push(ecBlocks[b][i]);
    }
  }

  // 3. Matrix allocation (modules and reserved function patterns)
  const matrix = Array.from({ length: size }, () => new Array(size).fill(null));
  const isReserved = Array.from({ length: size }, () => new Array(size).fill(false));

  function setModule(r, c, val, reserved = true) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
      if (reserved) isReserved[r][c] = true;
    }
  }

  // Finder patterns (top-left, top-right, bottom-left)
  function drawFinder(row, col) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const isBorder = (r === -1 || r === 7 || c === -1 || c === 7);
        const isOuter = (r === 0 || r === 6 || c === 0 || c === 6);
        const isInner = (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        const val = isBorder ? false : (isOuter || isInner);
        setModule(row + r, col + c, val, true);
      }
    }
  }

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const val = (i % 2 === 0);
    setModule(6, i, val, true);
    setModule(i, 6, val, true);
  }

  // Dark module
  setModule(4 * spec.version + 9, 8, true, true);

  // Format info reserve
  for (let i = 0; i < 9; i++) {
    setModule(8, i, false, true);
    setModule(i, 8, false, true);
    setModule(8, size - 1 - i, false, true);
    setModule(size - 1 - i, 8, false, true);
  }

  // 4. Place interleaved bits into data area
  const finalBits = [];
  for (const byte of finalCodewords) {
    for (let i = 7; i >= 0; i--) {
      finalBits.push((byte >> i) & 1);
    }
  }

  let bitPtr = 0;
  let dir = -1; // moving upwards initially
  let col = size - 1;

  while (col > 0) {
    if (col === 6) col--; // skip vertical timing column
    const rows = dir === -1
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const row of rows) {
      for (const c of [col, col - 1]) {
        if (!isReserved[row][c]) {
          const bit = bitPtr < finalBits.length ? finalBits[bitPtr++] : 0;
          // Apply standard Mask 0: (row + col) % 2 == 0
          const mask = ((row + c) % 2 === 0);
          matrix[row][c] = Boolean(bit ^ mask);
        }
      }
    }
    col -= 2;
    dir = -dir;
  }

  // Format Information: ECC Level M (00) + Mask 0 (000) -> 00000
  // BCH code for 00000 with mask 101010000010010 = 101010000010010 (0x5412)
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
  // Draw format bits around top-left finder
  for (let i = 0; i < 6; i++) setModule(8, i, Boolean(formatBits[i]), true);
  setModule(8, 7, Boolean(formatBits[6]), true);
  setModule(8, 8, Boolean(formatBits[7]), true);
  setModule(7, 8, Boolean(formatBits[8]), true);
  for (let i = 9; i < 15; i++) setModule(14 - i, 8, Boolean(formatBits[i]), true);

  // Draw format bits around top-right & bottom-left finders
  for (let i = 0; i < 8; i++) setModule(8, size - 1 - i, Boolean(formatBits[i]), true);
  for (let i = 0; i < 7; i++) setModule(size - 7 + i, 8, Boolean(formatBits[8 + i]), true);

  return matrix;
}

/**
 * Returns a high-DPI crisp SVG string representing the QR code.
 */
export function generateQRCodeSVG(text, { size = 180, color = "#000000", bg = "#ffffff", margin = 2 } = {}) {
  try {
    const matrix = generateQRCodeMatrix(text);
    const n = matrix.length;
    const totalSize = n + margin * 2;
    const paths = [];

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (matrix[r][c]) {
          paths.push(`M${c + margin},${r + margin}h1v1h-1z`);
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${size}" height="${size}" shape-rendering="crispEdges">
  <rect width="100%" height="100%" fill="${bg}"/>
  <path d="${paths.join('')}" fill="${color}"/>
</svg>`;
  } catch (err) {
    console.warn('QR Code generation fallback:', err);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
  <rect width="100" height="100" fill="${bg}"/>
  <text x="50" y="55" font-size="10" text-anchor="middle" fill="${color}">QR Code</text>
</svg>`;
  }
}
