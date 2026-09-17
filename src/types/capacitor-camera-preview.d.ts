export interface CameraPreviewOptions {
  parent?: string;
  position?: 'front' | 'rear';
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  toBack?: boolean;
  paddingBottom?: number;
  rotateWhenOrientationChanged?: boolean;
  storeToFile?: boolean;
  disableExifHeaderStripping?: boolean;
  enableHighResolution?: boolean;
  disableAudio?: boolean;
  lockAndroidOrientation?: boolean;
  enableOpacity?: boolean;
  enableZoom?: boolean;
  tapFocus?: boolean;
}

export interface CameraPreviewPlugin {
  start(options: CameraPreviewOptions): Promise<void>;
  stop(): Promise<void>;
  capture(options: {
    quality?: number;
    width?: number;
    height?: number;
  }): Promise<{ value: string }>;
  getExposureCompensation(): Promise<{ value: number }>;
  setExposureCompensation(options: { value: number }): Promise<void>;
  getExposureCompensationRange(): Promise<{ min: number; max: number }>;
}
