#!/usr/bin/env node
/**
 * Generate hero image ladder (AVIF + WebP) and texture assets for Launch Atelier.
 * Run: npm run hero:images
 */
import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const MASTER = path.join(ROOT, "public/hero/master/marketing-ide-hero-master.png");
const HERO_OUT = path.join(ROOT, "public/hero");
const TEXTURES_OUT = path.join(ROOT, "public/textures");

const WIDTHS = [4096, 2560, 1920, 1600, 1280, 828, 640];

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function generateHeroLadder() {
  const masterMeta = await sharp(MASTER).metadata();
  console.log(`Master: ${masterMeta.width}×${masterMeta.height}`);

  const avifSrcSet = [];
  const webpSrcSet = [];

  for (const width of WIDTHS) {
    const base = `marketing-ide-hero-${width}`;
    const avifPath = path.join(HERO_OUT, `${base}.avif`);
    const webpPath = path.join(HERO_OUT, `${base}.webp`);

    const pipeline = sharp(MASTER).resize(width, null, {
      fit: "inside",
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3,
    });

    await pipeline.clone().avif({ quality: 80, effort: 6 }).toFile(avifPath);
    await pipeline.clone().webp({ quality: 85, effort: 6 }).toFile(webpPath);

    const avifStat = await stat(avifPath);
    const webpStat = await stat(webpPath);
    console.log(`  ${width}w → avif ${(avifStat.size / 1024).toFixed(0)}KB, webp ${(webpStat.size / 1024).toFixed(0)}KB`);

    avifSrcSet.push({ width, path: `/hero/${base}.avif` });
    webpSrcSet.push({ width, path: `/hero/${base}.webp` });
  }

  // Bottom crop for footer CTA (lower 40% of image)
  const cropHeight = Math.round((masterMeta.height ?? 1024) * 0.42);
  const cropTop = (masterMeta.height ?? 1024) - cropHeight;
  const cropPath = path.join(HERO_OUT, "marketing-ide-hero-bottom-crop.avif");
  await sharp(MASTER)
    .extract({ left: 0, top: cropTop, width: masterMeta.width ?? 1536, height: cropHeight })
    .resize(2560, null, { fit: "inside", kernel: sharp.kernel.lanczos3 })
    .avif({ quality: 78 })
    .toFile(cropPath);
  console.log(`  bottom-crop → ${cropPath}`);

  return { avifSrcSet, webpSrcSet, maxWidth: WIDTHS[0] };
}

async function generateGrainTexture() {
  const size = 512;
  const noise = Buffer.alloc(size * size * 3);
  for (let i = 0; i < noise.length; i++) {
    noise[i] = Math.floor(Math.random() * 256);
  }
  const grainPath = path.join(TEXTURES_OUT, "fine-grain.webp");
  await sharp(noise, { raw: { width: size, height: size, channels: 3 } })
    .webp({ quality: 60 })
    .toFile(grainPath);
  console.log(`Grain texture → ${grainPath}`);
}

async function main() {
  await ensureDir(HERO_OUT);
  await ensureDir(TEXTURES_OUT);
  const { maxWidth } = await generateHeroLadder();
  await generateGrainTexture();
  console.log("\n✓ Hero ladder complete. Max width:", maxWidth);
  console.log("QA: naturalWidth >= displayedWidth × devicePixelRatio on 2× displays");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
