export interface BrightnessResult {
  isDark: boolean;
  avgBrightness: number;
  darkPixelPercentage: number;
}

/**
 * Utility to check if an image (Blob/File) is too dark.
 * Based on the logic in doc/draft.md
 */
export async function analyzeImageBrightness(imageFile: Blob | File): Promise<BrightnessResult> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(imageFile);
    img.src = url;

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve({ isDark: false, avgBrightness: 128, darkPixelPercentage: 0 });
        return;
      }

      // Optimization: Resize to 50x50 to reduce calculation
      canvas.width = 50;
      canvas.height = 50;

      ctx.drawImage(img, 0, 0, 50, 50);
      const imageData = ctx.getImageData(0, 0, 50, 50);
      const data = imageData.data;

      let darkPixelCount = 0;
      let totalBrightness = 0;
      const totalPixels = data.length / 4;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
        totalBrightness += brightness;

        if (brightness < 50) {
          darkPixelCount++;
        }
      }

      const avgBrightness = totalBrightness / totalPixels;
      const darkPixelPercentage = (darkPixelCount / totalPixels) * 100;

      // Logic from draft.md:
      // 1. Average brightness < 50
      // 2. More than 60% of pixels are dark (< 50)
      const isDark = avgBrightness < 50 || darkPixelPercentage > 60;

      resolve({
        isDark,
        avgBrightness,
        darkPixelPercentage,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ isDark: false, avgBrightness: 128, darkPixelPercentage: 0 });
    };
  });
}

/**
 * Legacy wrapper for compatibility
 */
export async function isImageDark(imageFile: Blob | File): Promise<boolean> {
  const result = await analyzeImageBrightness(imageFile);
  return result.isDark;
}
