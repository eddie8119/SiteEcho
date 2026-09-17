<template>
  <div class="pagination-wrapper mt-4">
    <ElPagination
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      layout="total, sizes, prev, pager, next"
      :total="props.total"
      :page-sizes="[10, 20, 50, 100]"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  currentPage: number;
  pageSize: number;
  total: number;
}>();

const emit = defineEmits<{
  (e: 'update:currentPage', value: number): void;
  (e: 'update:pageSize', value: number): void;
}>();

const currentPage = computed({
  get: () => props.currentPage,
  set: (value: number) => emit('update:currentPage', value),
});

const pageSize = computed({
  get: () => props.pageSize,
  set: (value: number) => emit('update:pageSize', value),
});
</script>

<style lang="scss" scoped>
.pagination-wrapper {
  @apply flex justify-center pt-4;

  :deep(.el-pagination) {
    // 總數和每頁條數選擇器
    .el-pagination__total,
    .el-pagination__sizes {
      @apply text-primary-text dark:text-primaryDark-text;
    }

    // 按鈕樣式（上一頁、下一頁、頁碼）
    .btn-prev,
    .btn-next,
    .el-pager li {
      @apply rounded-full border-none bg-transparent text-primary-text transition-colors dark:text-primaryDark-text;

      &:hover {
        @apply bg-black-100 dark:bg-black-900;
      }
    }
  }
}
</style>
