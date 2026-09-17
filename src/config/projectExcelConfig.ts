import { Workbook } from 'exceljs';

import { CENTER_ALIGNMENT, LEFT_ALIGNMENT } from './excelAlignmentConfig';

import type { ProjectResponse, TaskResponse } from '@/types/response';

/**
 * 以多個專案建立一份 Workbook（每個專案一個 Worksheet）
 */
export const createWorkbookWithProjects = (
  projects: ProjectResponse[],
  t: (key: string) => string,
  tasks: TaskResponse[]
) => {
  const workbook = new Workbook();
  projects.forEach((p) => createProjectWorksheet(workbook, p, t, tasks));
  return workbook;
};

/**
 * 下載 Workbook 為 xlsx 檔
 */
export const downloadWorkbook = async (workbook: Workbook, filename: string) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * 為 Project 建立 Worksheet
 */
export const createProjectWorksheet = (
  workbook: Workbook,
  project: ProjectResponse,
  t: (key: string) => string,
  tasks: TaskResponse[]
) => {
  const headerColumnCount = 6;
  const worksheetName = project.name.slice(0, 31);
  const worksheet = workbook.addWorksheet(worksheetName);

  worksheet.columns = [
    { header: '', key: 'property', width: 20 },
    { header: '', key: 'value', width: 40 },
  ];

  worksheet.spliceRows(1, 1);

  /* 專案資訊區塊 (標題) */
  const titleRow = worksheet.addRow({
    property: t('excel.section.project_info'),
    value: '',
  });

  // 將整個色塊區域合併，讓文字在 A~F 中置中
  worksheet.mergeCells(titleRow.number, 1, titleRow.number, headerColumnCount);

  // 改為與 Tasks Header 一致的黃色底 + 黑色文字
  titleRow.font = { bold: true, size: 14, color: { argb: 'FF000000' } };
  // 只對實際使用的欄位上色與置中
  for (let col = 1; col <= headerColumnCount; col++) {
    const cell = titleRow.getCell(col);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAFE62' } };
    cell.alignment = CENTER_ALIGNMENT;
  }

  /* 專案基本資訊 */
  worksheet.addRow({
    property: t('excel.label.project_name'),
    value: project.name || '-',
  });

  worksheet.addRow({
    property: t('excel.label.project_type'),
    value: t(`option.projectType.${project.type}`) || '-',
  });

  worksheet.addRow({
    property: t('excel.label.created_at'),
    value: project.createdAt ? new Date(project.createdAt).toLocaleString() : '-',
  });

  worksheet.addRow({
    property: t('excel.label.updated_at'),
    value: project.updatedAt ? new Date(project.updatedAt).toLocaleString() : '-',
  });

  worksheet.addRow({});

  /* 施工區域區塊 (標題) */
  const constructionTitleRow = worksheet.addRow({
    property: t('excel.section.construction'),
    value: '',
  });

  // 將整個色塊區域合併，讓文字在 A~F 中置中
  worksheet.mergeCells(
    constructionTitleRow.number,
    1,
    constructionTitleRow.number,
    headerColumnCount
  );

  // 改為與 Tasks Header 一致的黃色底 + 黑色文字
  constructionTitleRow.font = { bold: true, size: 12, color: { argb: 'FF000000' } };
  // 同樣只對實際使用的欄位上色與置中
  for (let col = 1; col <= headerColumnCount; col++) {
    const cell = constructionTitleRow.getCell(col);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEAFE62' },
    };
    cell.alignment = CENTER_ALIGNMENT;
  }

  /* Tasks Header 列 - 新增材料相關欄位 */
  const taskHeader = [
    t('excel.columns.task_title'),
    t('excel.columns.status'),
    t('excel.columns.description'),
    t('excel.columns.material_name'),
    t('excel.columns.unit_price'),
    t('excel.columns.quantity'),
  ];

  const tasksHeaderRow = worksheet.addRow(taskHeader);

  tasksHeaderRow.font = { color: { argb: 'FF000000' }, size: 11 };
  // 只對 A~F 六欄上底色與置中，避免超出 F 欄
  for (let col = 1; col <= headerColumnCount; col++) {
    const cell = tasksHeaderRow.getCell(col);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFBEE63C' },
    };
    cell.alignment = CENTER_ALIGNMENT;
  }

  // 調整欄位寬度以適應新的 6 欄結構
  worksheet.getColumn(1).width = 25; // 任務標題
  worksheet.getColumn(2).width = 12; // 狀態
  worksheet.getColumn(3).width = 30; // 描述
  worksheet.getColumn(4).width = 20; // 材料名稱
  worksheet.getColumn(5).width = 12; // 單價
  worksheet.getColumn(6).width = 15; // 數量

  // 狀態轉換函數
  const getStatusText = (status: string) => {
    switch (status) {
      case 'todo':
        return t(`option.status.todo`);
      case 'inProgress':
        return t(`option.status.inProgress`);
      case 'completed':
        return t(`option.status.completed`);
      default:
        return status || '-';
    }
  };

  // 使用傳入的 tasks 參數
  const allTasks = tasks || [];

  /* 建立各施工區域與其任務 */
  if (project.constructionContainer?.length) {
    project.constructionContainer.forEach((container) => {
      const nameRow = worksheet.addRow([container.name]);
      worksheet.mergeCells(nameRow.number, 1, nameRow.number, headerColumnCount);

      nameRow.font = { bold: true };
      nameRow.alignment = CENTER_ALIGNMENT;
      // 只對 A~F 六欄上底色，避免超出 F 欄
      for (let col = 1; col <= headerColumnCount; col++) {
        const cell = nameRow.getCell(col);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' },
        };
      }

      const tasksForContainer = allTasks.filter(
        (task: TaskResponse) => String(task.constructionType ?? '') === String(container.id)
      );

      tasksForContainer.forEach((task: TaskResponse) => {
        const row = worksheet.addRow([
          task.title || '-',
          getStatusText(task.status),
          task.description || '-',
        ]);

        row.getCell(1).alignment = LEFT_ALIGNMENT;
        row.getCell(2).alignment = CENTER_ALIGNMENT;
        row.getCell(3).alignment = LEFT_ALIGNMENT;
      });
    });
  } else {
    const noneRow = worksheet.addRow([t('common.none')]);
    worksheet.mergeCells(noneRow.number, 1, noneRow.number, headerColumnCount);
    noneRow.alignment = CENTER_ALIGNMENT;
  }
};
