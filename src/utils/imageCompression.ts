/**
 * Get EXIF orientation from an image blob
 * @param blob The image blob
 * @returns The orientation value (1-8), or 1 if no orientation data found
 */
// Temporarily disabled to fix crop issue
// async function getExifOrientation(blob: Blob): Promise<number> {
//   return new Promise((resolve) => {
//     const reader = new FileReader();
//     reader.onload = (e) => {
//       const view = new DataView(e.target?.result as ArrayBuffer);
//       if (view.getUint16(0, false) !== 0xffd8) {
//         resolve(1);
//         return;
//       }

//       const length = view.byteLength;
//       let offset = 2;
//       while (offset < length) {
//         const marker = view.getUint16(offset, false);
//         offset += 2;
//         if (marker === 0xffe1) {
//           if (view.getUint32(offset + 2, false) !== 0x45786966) {
//             resolve(1);
//             return;
//           }
//           const little = view.getUint16(offset + 10, false) === 0x4949;
//           offset += 12;
//           const tags = view.getUint16(offset, little);
//           offset += 2;
//           for (let i = 0; i < tags; i++) {
//             if (view.getUint16(offset + i * 12, little) === 0x0112) {
//               const orientation = view.getUint16(offset + i * 12 + 8, little);
//               resolve(orientation);
//               return;
//             }
//           }
//         } else if ((marker & 0xff00) !== 0xff00) {
//           break;
//         }
//       }
//       resolve(1);
//     };
//     reader.onerror = () => resolve(1);
//     reader.readAsArrayBuffer(blob);
//   });
// }

/**
 * Compress and resize an image blob with EXIF orientation support
 * @param blob The image blob to compress
 * @param maxDimension The maximum width or height of the image
 * @param quality The quality of the output JPEG (0 to 1)
 * @param skipExif Whether to skip EXIF orientation handling (for canvas-generated images)
 * @returns A promise that resolves to the compressed image blob
 */
export async function compressImage(
  blob: Blob,
  maxDimension: number,
  quality: number = 0.8,
  _skipExif: boolean = false
): Promise<Blob> {
  // Note: EXIF orientation handling temporarily disabled to fix crop issue

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const width = img.naturalWidth;
      const height = img.naturalHeight;

      // Calculate new dimensions
      let targetWidth = width;
      let targetHeight = height;

      if (targetWidth > targetHeight) {
        if (targetWidth > maxDimension) {
          targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
          targetWidth = maxDimension;
        }
      } else {
        if (targetHeight > maxDimension) {
          targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
          targetHeight = maxDimension;
        }
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Draw image directly to target dimensions
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      canvas.toBlob(
        (resultBlob) => {
          if (resultBlob) {
            resolve(resultBlob);
          } else {
            reject(new Error('Canvas toBlob failed'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };

    img.src = url;
  });
}
