import fs from 'fs';
import path from 'path';

import sharp from 'sharp';

const sourceImage = 'public/SiteNear_logo.png';
const androidResDir = 'android/app/src/main/res';

// Android adaptive icon safe zone: 66x66dp center of 108x108dp canvas
// This is approximately 61% of the canvas size
const safeZoneRatio = 1.0;

// Density multipliers for Android mipmap folders
const densities = [
  { name: 'mdpi', multiplier: 1 },
  { name: 'hdpi', multiplier: 1.5 },
  { name: 'xhdpi', multiplier: 2 },
  { name: 'xxhdpi', multiplier: 3 },
  { name: 'xxxhdpi', multiplier: 4 },
];

async function generateAndroidIcons() {
  try {
    // Check if source image exists
    if (!fs.existsSync(sourceImage)) {
      console.error(`Source image ${sourceImage} not found`);
      process.exit(1);
    }

    // Base size for mdpi (108dp at mdpi = 108px)
    const baseSize = 108;
    const safeZoneSize = Math.round(baseSize * safeZoneRatio); // 66px

    // Generate foreground icons for each density
    for (const density of densities) {
      const canvasSize = Math.round(baseSize * density.multiplier);
      const iconSize = Math.round(safeZoneSize * density.multiplier);
      const padding = Math.round((canvasSize - iconSize) / 2);

      const outputDir = path.join(androidResDir, `mipmap-${density.name}`);
      
      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputPath = path.join(outputDir, 'ic_launcher_foreground.png');

      await sharp(sourceImage)
        .resize(iconSize, iconSize, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
        })
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent padding
        })
        .toFile(outputPath);

      console.log(`Generated ${outputPath}`);
    }

    // Also generate regular launcher icons (non-adaptive fallback)
    for (const density of densities) {
      const canvasSize = Math.round(baseSize * density.multiplier);
      const iconSize = Math.round(canvasSize * 1.0);
      const padding = Math.round((canvasSize - iconSize) / 2);

      const outputDir = path.join(androidResDir, `mipmap-${density.name}`);
      const outputPath = path.join(outputDir, 'ic_launcher.png');

      await sharp(sourceImage)
        .resize(iconSize, iconSize, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }, // White background
        })
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .toFile(outputPath);

      console.log(`Generated ${outputPath}`);
    }

    // Generate round launcher icons
    for (const density of densities) {
      const canvasSize = Math.round(baseSize * density.multiplier);
      const iconSize = Math.round(canvasSize * 1.0);
      const padding = Math.round((canvasSize - iconSize) / 2);

      const outputDir = path.join(androidResDir, `mipmap-${density.name}`);
      const outputPath = path.join(outputDir, 'ic_launcher_round.png');

      await sharp(sourceImage)
        .resize(iconSize, iconSize, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .toFile(outputPath);

      console.log(`Generated ${outputPath}`);
    }

    console.log('Android icons generated successfully!');
  } catch (error) {
    console.error('Error generating Android icons:', error);
    process.exit(1);
  }
}

generateAndroidIcons();
