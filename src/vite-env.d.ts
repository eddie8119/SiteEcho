/// <reference types="vite/client" />

// 確保 Vite 專案的 TypeScript 環境正確，
// 特別是處理靜態資源和 Vite 特定的全域變數

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module './appleStoreKit.web' {
  import type { AppleStoreKitPlugin } from './appleStoreKit';
  export class AppleStoreKitWeb implements AppleStoreKitPlugin {}
}
