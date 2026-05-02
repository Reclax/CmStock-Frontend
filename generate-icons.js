import fs from "node:fs";
import path from "node:path";
import { createCanvas, loadImage } from "canvas";

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, "public");
const iconsDir = path.join(publicDir, "icons");
const sourceIconPath = path.join(publicDir, "image.png");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const renderSquareIcon = (image, size, outputPath) => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(image, 0, 0, size, size);

  fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));
};

const generate = async () => {
  if (!fs.existsSync(sourceIconPath)) {
    throw new Error("No se encontro image.png en /public");
  }

  ensureDir(iconsDir);
  const image = await loadImage(sourceIconPath);

  sizes.forEach((size) => {
    const outputPath = path.join(iconsDir, `icon-${size}.png`);
    renderSquareIcon(image, size, outputPath);
  });

  renderSquareIcon(image, 192, path.join(iconsDir, "icon-192-maskable.png"));
  renderSquareIcon(image, 512, path.join(iconsDir, "icon-512-maskable.png"));

  console.log("Iconos PWA generados en public/icons");
};

generate().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
