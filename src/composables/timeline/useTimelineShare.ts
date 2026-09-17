import { type Ref } from 'vue';

import type { LocalPhoto } from '@/types/photo';

import LocationIcon from '@/assets/icons/Location.png';
import WrenchIcon from '@/assets/icons/Wrench.png';
import { formatDateTimeToMinutes } from '@/utils/date';
import { formatDate } from '@/utils/date';
import { getCompletedItems } from '@/utils/photoUtils';

const addMetadataToImage = async (
  photo: LocalPhoto,
  index: number,
  projectName: string
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(photo.file);

    // Pre-load icons
    const locationIcon = new Image();
    locationIcon.src = LocationIcon;
    const wrenchIcon = new Image();
    wrenchIcon.src = WrenchIcon;

    let imagesLoaded = 0;
    const checkAllLoaded = () => {
      imagesLoaded++;
      if (imagesLoaded === 3) {
        drawCanvas();
      }
    };

    const drawCanvas = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Calculate dimensions
      const originalWidth = img.width;
      const originalHeight = img.height;
      const infoPanelHeight = 150; // Height of white info panel
      const totalHeight = originalHeight + infoPanelHeight;

      canvas.width = originalWidth;
      canvas.height = totalHeight;

      // Draw original photo
      ctx.drawImage(img, 0, 0, originalWidth, originalHeight);

      // Draw white info panel below
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, originalHeight, originalWidth, infoPanelHeight);

      // Draw metadata text
      ctx.fillStyle = '#000000';

      const padding = 20;
      const fontSize = 24;
      const lineHeight = 32;
      const startY = originalHeight + 30;

      // Helper to wrap text for note
      const wrapText = (text: string, maxWidth: number): string[] => {
        const words = text.split('');
        const lines: string[] = [];
        let currentLine = '';

        ctx.font = `${fontSize}px sans-serif`;

        for (const char of words) {
          const testLine = currentLine + char;
          const metrics = ctx.measureText(testLine);

          if (metrics.width > maxWidth && currentLine !== '') {
            lines.push(currentLine);
            currentLine = char;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) {
          lines.push(currentLine);
        }
        return lines;
      };

      // Prepare left content (date, space, constructions)
      const dateTimeStr = formatDateTimeToMinutes(photo.takenAt);
      const constructionStr = photo.constructions.length > 0 ? photo.constructions.join(' / ') : '';

      // Prepare right content (note)
      const noteStr = photo.note && photo.note.trim() ? `${photo.note}` : '';

      // Calculate positions (simulate flex justify-between)
      const leftX = padding;
      const gapBetweenSections = 40; // Increased gap between left and right sections

      // Draw left content
      ctx.textAlign = 'left';
      let currentY = startY;

      // Project name
      if (projectName) {
        ctx.font = `600 ${fontSize}px sans-serif`;
        ctx.fillStyle = '#000000';
        ctx.fillText(`${projectName}`, leftX, currentY);
        currentY += lineHeight;
      }

      // Date and time
      ctx.font = `500 ${fontSize}px sans-serif`;
      ctx.fillText(dateTimeStr, leftX, currentY);
      currentY += lineHeight;

      // Space
      ctx.font = `${fontSize}px sans-serif`;
      if (photo.space) {
        // Draw location icon
        const iconSize = 24;
        const iconY = currentY - iconSize + 8;
        ctx.drawImage(locationIcon, leftX, iconY, iconSize, iconSize);
        // Draw space text after icon
        ctx.fillText(photo.space, leftX + iconSize + 8, currentY);
        currentY += lineHeight;
      }

      // Constructions
      if (constructionStr) {
        // Draw wrench icon
        const iconSize = 24;
        const iconY = currentY - iconSize + 8;
        ctx.drawImage(wrenchIcon, leftX, iconY, iconSize, iconSize);
        // Draw construction text after icon
        ctx.fillText(constructionStr, leftX + iconSize + 8, currentY);
      }

      // Draw right content (note)
      if (noteStr) {
        ctx.textAlign = 'left';
        ctx.font = `${fontSize}px sans-serif`;

        // Calculate max width for note (right side with some margin from left content)
        const maxNoteWidth = (originalWidth / 3) * 2 - padding - gapBetweenSections; // Allocate 2/3 of the width for the note with extra gap
        const noteLines = wrapText(noteStr, maxNoteWidth);

        // Calculate left x-position for note (within the right container)
        const noteLeftX = originalWidth - padding - maxNoteWidth;

        // Draw each line of the note
        noteLines.forEach((line, index) => {
          ctx.fillText(line, noteLeftX, startY + index * lineHeight);
        });
      }

      // Draw "Generated by SiteNear" at the bottom
      ctx.textAlign = 'center';
      ctx.font = `400 16px sans-serif`;
      ctx.fillStyle = '#999999';
      ctx.fillText(
        'Generated by SiteNear',
        originalWidth / 2,
        originalHeight + infoPanelHeight - 20
      );

      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) {
            reject(new Error('Failed to convert canvas to blob'));
            return;
          }
          const extension = photo.file.type.split('/')[1] || 'jpg';
          const file = new File([blob], `photo_${index}.${extension}`, { type: photo.file.type });
          resolve(file);
        },
        photo.file.type,
        0.95
      );
    };

    img.onload = () => checkAllLoaded();
    locationIcon.onload = () => checkAllLoaded();
    wrenchIcon.onload = () => checkAllLoaded();

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    locationIcon.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load location icon'));
    };

    wrenchIcon.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load wrench icon'));
    };

    img.src = url;
  });
};

export const useTimelineShare = (selectedPhotosList: Ref<LocalPhoto[]>) => {
  const canShare = typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare;

  const getShareText = () => {
    if (selectedPhotosList.value.length === 0) return null;

    const photos = selectedPhotosList.value;

    // Sort by date to get range
    const sortedPhotos = [...photos].sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());
    const startDate = sortedPhotos[0].takenAt;
    const endDate = sortedPhotos[sortedPhotos.length - 1].takenAt;

    const dateRange =
      formatDate(startDate) === formatDate(endDate)
        ? formatDate(startDate)
        : `${formatDate(startDate)} ~ ${formatDate(endDate)}`;

    // Extract unique spaces
    const uniqueSpaces = Array.from(new Set(photos.map((p) => p.space).filter(Boolean)));
    const spacesStr = uniqueSpaces.length > 0 ? uniqueSpaces.join(' / ') : '';

    // Title for the share
    const title = spacesStr ? `${spacesStr} 照片` : '照片';

    // Text content: time range and constructions
    let text = `時間範圍:\n${dateRange}\n`;

    // Use getCompletedItems to group by space + construction
    const completedItems = getCompletedItems(photos);
    if (completedItems.length > 0) {
      text += '\n施作項目:\n';
      completedItems.forEach((item) => {
        text += `- ${item.space}${item.construction}\n`;
      });
    }
    return { title, text: text.trim() };
  };

  const getShareData = async (textData: { title: string; text: string }, projectName: string) => {
    const photos = selectedPhotosList.value;

    // Add metadata to images using canvas
    const files = await Promise.all(
      photos.map((p, index) => addMetadataToImage(p, index, projectName))
    );

    return {
      ...textData,
      files,
    };
  };

  const copyToClipboard = async (text: string): Promise<boolean> => {
    // Try modern clipboard API first
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        return false;
      }
    }

    // Fallback to document.execCommand
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      return successful;
    } catch (error) {
      return false;
    }
  };

  const share = async (
    projectName: string
  ): Promise<{
    success: boolean;
    copiedText: string | null;
    copySuccess: boolean;
  }> => {
    // 1. Get text and copy to clipboard immediately while we still have user gesture
    const textData = getShareText();
    if (!textData) return { success: false, copiedText: null, copySuccess: false };

    let copySuccess = false;
    if (textData.text) {
      copySuccess = await copyToClipboard(textData.text);
    }

    // 2. Process images with metadata first
    const data = await getShareData(textData, projectName);
    if (!data) return { success: false, copiedText: textData.text, copySuccess };

    // 3. Try to share with processed images
    if (canShare && navigator.canShare({ files: data.files })) {
      try {
        await navigator.share(data);
        return { success: true, copiedText: textData.text, copySuccess };
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Sharing failed:', error);
          fallbackDownload();
        }
        return { success: false, copiedText: textData.text, copySuccess };
      }
    } else {
      // Browser doesn't support sharing, download processed images
      fallbackDownload();
      return { success: true, copiedText: textData.text, copySuccess };
    }
  };

  const fallbackDownload = () => {
    selectedPhotosList.value.forEach((p, index) => {
      const url = URL.createObjectURL(p.file);
      const a = document.createElement('a');
      a.href = url;
      const extension = p.file.type.split('/')[1] || 'jpg';
      a.download = `photo_${index}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  return {
    share,
    getShareText,
    copyToClipboard,
    getShareData,
    canShare,
  };
};

export { addMetadataToImage };
