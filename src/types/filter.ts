export type PhotoFilterType = 'space' | 'construction' | 'status';

export interface PhotoFilter {
  type: PhotoFilterType;
  value: string;
}
