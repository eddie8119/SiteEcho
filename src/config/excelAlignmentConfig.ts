import type { Alignment } from 'exceljs';

export const CENTER_ALIGNMENT: Partial<Alignment> = {
  horizontal: 'center',
  vertical: 'middle',
};

export const LEFT_ALIGNMENT: Partial<Alignment> = {
  horizontal: 'left',
  vertical: 'middle',
  wrapText: true,
};
