/**
 * 獲取圖標 URL
 * @param name - 圖標名稱
 * @returns 完整的圖標 URL
 */
export const getIconUrl = (name: string): string => {
  return new URL(`../assets/icons/${name}.svg`, import.meta.url).href;
};

// 直接使用相對路徑 是不可靠的，Vite 或 webpack 等構建工具打包專案時，資源文件會被處理和重新定位，相對路徑可能會在打包後失效
// 使用 new URL() 配合 import.meta.url 是 Vite 推薦的方式
// 自動處理資源的 hash 和快取問題
