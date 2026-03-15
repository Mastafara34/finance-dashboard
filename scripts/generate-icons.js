// scripts/generate-icons.js
// Jalankan sekali: node scripts/generate-icons.js
// Akan generate icon-192.png dan icon-512.png di public/icons/
// Butuh: npm install canvas (atau pakai cara manual di bawah)

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx    = canvas.getContext('2d');
  const pad    = size * 0.1;
  const r      = size * 0.22;

  // Background
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, size, size);

  // Rounded rect background biru
  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.roundRect(pad, pad, size - pad * 2, size - pad * 2, r);
  ctx.fill();

  // Emoji 💰 — gambar teks
  ctx.font = `${size * 0.5}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💰', size / 2, size / 2);

  return canvas.toBuffer('image/png');
}

const dir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

try {
  fs.writeFileSync(path.join(dir, 'icon-192.png'), generateIcon(192));
  fs.writeFileSync(path.join(dir, 'icon-512.png'), generateIcon(512));
  console.log('✅ Icons generated: public/icons/icon-192.png & icon-512.png');
} catch (e) {
  console.log('⚠️  canvas package not found. Gunakan cara manual:');
  console.log('   1. Buat gambar 192x192 PNG dengan logo FinTrack');
  console.log('   2. Simpan ke public/icons/icon-192.png');
  console.log('   3. Buat gambar 512x512 PNG');
  console.log('   4. Simpan ke public/icons/icon-512.png');
  console.log('');
  console.log('   Atau gunakan: https://favicon.io/favicon-generator/');
  console.log('   Setting: Text=💰, Background=#2563eb, Font size=70');
}
