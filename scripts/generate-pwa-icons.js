import fs from 'fs';
import path from 'path';

import sharp from 'sharp';

const sourceImage = 'public/SiteNear_logo.png';
const outputDir = 'public';
const sizes = [64, 192, 512];

async function generateIcons() {
  try {
    // Check if source image exists
    if (!fs.existsSync(sourceImage)) {
      console.error(`Source image ${sourceImage} not found`);
      process.exit(1);
    }

    // Generate icons for each size
    for (const size of sizes) {
      const outputPath = path.join(outputDir, `pwa-${size}x${size}.png`);

      await sharp(sourceImage)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 140, b: 0, alpha: 1 }, // #ff8c00
        })
        .toFile(outputPath);
    }

    // Generate maskable icon (512x512 with padding)
    const maskablePath = path.join(outputDir, 'maskable-icon-512x512.png');
    await sharp(sourceImage)
      .resize(410, 410, {
        // 512 - 10% padding
        fit: 'contain',
        background: { r: 255, g: 140, b: 0, alpha: 1 },
      })
      .extend({
        top: 51,
        bottom: 51,
        left: 51,
        right: 51,
        background: { r: 255, g: 140, b: 0, alpha: 1 },
      })
      .toFile(maskablePath);

    // Generate apple touch icon (180x180)
    const applePath = path.join(outputDir, 'apple-touch-icon-180x180.png');
    await sharp(sourceImage)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 255, g: 140, b: 0, alpha: 1 },
      })
      .toFile(applePath);

    // Generate favicon (32x32 PNG)
    const faviconPath = path.join(outputDir, 'favicon.png');
    await sharp(sourceImage)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 140, b: 0, alpha: 1 },
      })
      .toFile(faviconPath);
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
