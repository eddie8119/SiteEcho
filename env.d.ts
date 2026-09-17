// 全局的 Vue 類型聲明
declare module 'vue' {
  interface ComponentCustomProperties {
    // 如果需要，在這裡添加全局屬性
  }
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    // 如果需要，在這裡添加全局屬性
  }
}
