import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(process.cwd());
const svgPath = path.join(root, "public", "icons", "icon.svg");
const outDir = path.join(root, "public", "icons");

const sizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

const maskableSizes = [
  { name: "icon-192-maskable.png", size: 192 },
  { name: "icon-512-maskable.png", size: 512 },
];

const svg = await fs.readFile(svgPath);
await fs.mkdir(outDir, { recursive: true });

for (const s of sizes) {
  const outPath = path.join(outDir, s.name);
  await sharp(svg, { density: 600 }).resize(s.size, s.size).png().toFile(outPath);
}

for (const s of maskableSizes) {
  const outPath = path.join(outDir, s.name);
  const inner = Math.round(s.size * 0.78);
  const pad = Math.round((s.size - inner) / 2);

  await sharp(svg, { density: 600 })
    .resize(inner, inner)
    .extend({
      top: pad,
      bottom: s.size - inner - pad,
      left: pad,
      right: s.size - inner - pad,
      background: { r: 248, g: 250, b: 252, alpha: 1 },
    })
    .png()
    .toFile(outPath);
}
