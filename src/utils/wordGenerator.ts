import type { GroupedPhotos } from '@/types/report';

import i18n from '@/i18n';
import { logError } from '@/utils/logger';

interface WordReportData {
  projectTitle: string;
  purpose: string | null;
  groups: GroupedPhotos;
  groupNotes: Record<string, string>;
  photoNotes: Record<string, string>;
  billing: Record<string, number> | null;
  photoUrls: Record<string, string>;
}

/**
 * Generates a Word document from report data.
 * @param data The report data including project info, groups, notes, and billing.
 * @param fileName The name of the resulting Word file.
 */
export async function generateWordFromData(data: WordReportData, fileName: string): Promise<void> {
  try {
    const { projectTitle, purpose, groups, groupNotes, photoNotes, billing, photoUrls } = data;

    // Create HTML content for Word document
    let html = `
      <!DOCTYPE html>
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
      <head>
        <meta charset="utf-8">
        <title>${projectTitle}</title>
        <style>
          body {
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            font-size: 12pt;
            line-height: 1.6;
            margin: 40px;
          }
          h1 {
            font-size: 18pt;
            font-weight: bold;
            color: #333;
            margin-bottom: 20px;
          }
          h2 {
            font-size: 14pt;
            font-weight: bold;
            color: #666;
            margin-top: 20px;
            margin-bottom: 10px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
          }
          h3 {
            font-size: 12pt;
            font-weight: bold;
            color: #888;
            margin-top: 15px;
            margin-bottom: 8px;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 10px 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          .photo {
            max-width: 400px;
            margin: 10px 0;
          }
          .section {
            margin-bottom: 30px;
          }
          .meta-info {
            margin-bottom: 20px;
            color: #666;
          }
          .billing-table {
            width: 50%;
          }
        </style>
      </head>
      <body>
        <h1>${projectTitle}</h1>
        <div class="meta-info">
          <p><strong>${i18n.global.t('report.wordExport.date')}：</strong>${new Date().toLocaleDateString(i18n.global.locale.value)}</p>
          <p><strong>${i18n.global.t('report.wordExport.reportType')}：</strong>${purpose === 'billing' ? i18n.global.t('report.wordExport.billingReport') : i18n.global.t('report.wordExport.engineeringReport')}</p>
        </div>
    `;

    // Process each space/group
    for (const [space, photos] of Object.entries(groups)) {
      const spaceName = space || i18n.global.t('report.wordExport.uncategorized');
      html += `
        <div class="section">
          <h2>${spaceName}</h2>
      `;

      // Add group note if exists
      if (groupNotes[space]) {
        html += `
          <h3>${i18n.global.t('report.wordExport.overallDescription')}</h3>
          <p>${groupNotes[space]}</p>
        `;
      }

      // Add photos and collect constructions
      const allConstructions: string[] = [];
      for (const [photoId, item] of Object.entries(photos)) {
        const photo = item.photo;
        const photoUrl = photoUrls[photoId];

        // Collect constructions for billing
        item.constructions.forEach((c) => {
          if (!allConstructions.includes(c)) {
            allConstructions.push(c);
          }
        });

        const resolvedAt =
          photo.status === 'resolved' && photo.resolvedAt
            ? `<p><strong>${i18n.global.t('report.wordExport.completionTime')}：</strong>${new Date(photo.resolvedAt).toLocaleDateString(i18n.global.locale.value)}</p>`
            : '';

        html += `
          <div class="photo">
            <img src="${photoUrl}" style="max-width: 400px; height: auto;" />
            <p><strong>${i18n.global.t('report.wordExport.constructionItems')}：</strong>${item.constructions.join('、')}</p>
            <p><strong>${i18n.global.t('report.wordExport.photoTime')}：</strong>${new Date(photo.takenAt).toLocaleString(i18n.global.locale.value)}</p>
            ${resolvedAt}
        `;

        // Add photo note if exists
        if (photoNotes[photoId]) {
          html += `<p><strong>${i18n.global.t('report.wordExport.description')}：</strong>${photoNotes[photoId]}</p>`;
        }

        // Add original note if exists
        if (photo.note) {
          html += `<p><strong>${i18n.global.t('report.wordExport.note')}：</strong>${photo.note}</p>`;
        }

        html += `</div>`;
      }

      // Add billing table if this is a billing report
      if (purpose === 'billing' && billing && allConstructions.length > 0) {
        html += `
          <h3>${i18n.global.t('report.wordExport.billingDetails')}</h3>
          <table class="billing-table">
            <thead>
              <tr>
                <th>${i18n.global.t('report.wordExport.item')}</th>
                <th>${i18n.global.t('report.wordExport.amount')}</th>
              </tr>
            </thead>
            <tbody>
        `;

        for (const construction of allConstructions) {
          const key = `${space}-${construction}`;
          const amount = billing[key];
          if (amount !== undefined) {
            html += `
              <tr>
                <td>${construction}</td>
                <td>NT$ ${amount.toLocaleString(i18n.global.locale.value)}</td>
              </tr>
            `;
          }
        }

        html += `
            </tbody>
          </table>
        `;
      }

      html += `</div>`;
    }

    // Add grand total if billing
    if (purpose === 'billing' && billing) {
      const total = Object.values(billing).reduce((sum, val) => sum + val, 0);
      html += `
        <div class="section">
          <h2>${i18n.global.t('report.wordExport.total')}</h2>
          <p><strong>${i18n.global.t('report.wordExport.totalAmount')}：NT$ ${total.toLocaleString(i18n.global.locale.value)}</strong></p>
        </div>
      `;
    }

    html += `
      </body>
      </html>
    `;

    // Create Blob and download
    const blob = new Blob(['\ufeff', html], {
      type: 'application/msword',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    logError('Word Generation failed:', error, 'WordGenerator');
    throw error;
  }
}
