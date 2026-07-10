// Generates resources/icon.ico (multi-size) and a clean in-app logo PNG
// from resources/icon-source.png. Trims the black background to the squircle,
// makes the outer corners transparent, then emits .ico + logo.png.
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { promises as fs } from "node:fs";

const root = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(root, "../resources/icon-source.png");
const icoOut = path.resolve(root, "../resources/icon.ico");
const logoOut = path.resolve(root, "../src/renderer/assets/logo.png");

const SIZES = [16, 24, 32, 48, 64, 128, 256];

async function squareBase() {
  // Trim surrounding black, then fit into a transparent square canvas.
  const trimmed = await sharp(source).trim({ threshold: 20 }).toBuffer();
  const meta = await sharp(trimmed).metadata();
  const side = Math.max(meta.width ?? 512, meta.height ?? 512);
  return sharp({
    create: {
      width: side,
      height: side,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: trimmed, gravity: "center" }])
    .png()
    .toBuffer();
}

async function run() {
  const base = await squareBase();

  const pngBuffers = await Promise.all(
    SIZES.map((s) =>
      sharp(base).resize(s, s, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
    ),
  );

  const ico = await pngToIco(pngBuffers);
  await fs.writeFile(icoOut, ico);

  await sharp(base).resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(logoOut);

  console.log("icon.ico and logo.png generated");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
