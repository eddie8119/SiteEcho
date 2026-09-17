export interface Column {
  field: string;
  align?: 'left' | 'center' | 'right';
  minWidth?: number;
  maxWidth?: number;
}

export interface TableAction<T> {
  label: string;
  onClick: (row: T) => void;
}

export type UpdateTimeType = Date | number | string | null;
