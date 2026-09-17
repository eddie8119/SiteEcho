import type { Alignment } from 'exceljs';

export type CellValue = string | number | Date;

export interface ColumnSetupOptions {
  labelColumnWidth?: number;
  dateColumnWidth?: number;
}

export interface CreateRowOptions {
  labelAlignment?: Partial<Alignment>;
  valueAlignment?: Partial<Alignment>;
}

export interface MonthHeaderOptions {
  monthLabelFormatter?: (date: Date) => string;
  startColumn?: number;
}

export interface DateRowFormatOptions {
  firstDateColumn?: number;
  weekendColor?: string;
  dateFormat?: string;
}

export interface WeekendFormatOptions {
  firstDateColumn?: number;
  weekendColor?: string;
}

export interface GridBorderOptions {
  startRow?: number;
  endRow?: number;
  borderColor?: string;
}
