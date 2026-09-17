<template>
  <div class="panel-container relative p-4">
    <ShowUpdateTime
      v-if="props.lastUpdateTime"
      class="absolute right-4 top-4"
      :last-update-time="props.lastUpdateTime"
    />

    <!-- 搜索 -->
    <div v-if="props.showSearch" class="input_table mb-4 flex w-full items-center lg:w-1/4">
      <ElInput
        v-model="searchQuery"
        :placeholder="t('placeholder.search')"
        :prefix-icon="Search"
        clearable
      />
    </div>

    <!-- 表格 -->
    <ElTable
      v-loading="props.loading"
      :data="paginatedData"
      :height="tableHeight"
      class="custom-table"
      :border="false"
      header-row-class-name="table-header"
      highlight-current-row
      :header-cell-style="{
        color: 'var(--color-black-400) ',
        height: '40px',
        padding: '16px 0',
        whiteSpace: 'nowrap',
        fontWeight: 'bold',
      }"
    >
      <ElTableColumn v-if="props.showIdColumn" :width="idColumnLength" align="center">
        <template #default="{ $index }">
          <p class="table-text">{{ $index + 1 }}</p>
        </template>
      </ElTableColumn>

      <slot name="columns" :columns="otherColumns" :t="t" :props="props">
        <!-- Default column rendering -->
        <template v-for="column in otherColumns" :key="column.field">
          <ElTableColumn
            :prop="column.field"
            :label="t(`column.${column.field}`)"
            :min-width="column.minWidth || 80"
            :sortable="true"
            show-overflow-tooltip
            class="table-text"
          >
            <template #default="scope">
              <slot :name="column.field" :row="scope.row">
                <!-- Default cell rendering -->
                <template v-if="column.field === 'title'">
                  <ProjectLink :project-id="scope.row.id" class="font-semibold">
                    {{ scope.row[column.field] }}
                  </ProjectLink>
                </template>
                <template v-else-if="column.field === 'created_at'">
                  {{ formatDate(new Date(scope.row.createdAt)) }}
                </template>
                <template v-else>
                  <span v-if="scope.row[column.field] === undefined" class="table-text"> N/A</span>
                  <p v-else class="table-text">{{ scope.row[column.field] }}</p>
                </template>
              </slot>
            </template>
          </ElTableColumn>
        </template>
      </slot>

      <!-- 操作列 -->
      <ElTableColumn
        v-if="props.showActions && isAdmin()"
        :label="t(`column.action`)"
        width="80"
        align="center"
        fixed="right"
      >
        <template #default="{ row }">
          <div class="flex justify-center">
            <slot name="actions" :row="row">
              <DropdownMenu :actions="props.actions" :row="row" />
            </slot>
          </div>
        </template>
      </ElTableColumn>

      <template #empty>
        <slot name="empty">
          <div class="flex flex-col items-center justify-center gap-2 py-10 text-sm text-gray-400">
            {{ t('message.no_data') }}
          </div>
        </slot>
      </template>
    </ElTable>

    <!-- 分頁器 -->
    <Pagination
      v-if="props.showPagination"
      :current-page="currentPage"
      :page-size="pageSize"
      :total="props.data?.length ?? 0"
      @update:current-page="currentPage = $event"
      @update:page-size="pageSize = $event"
    />
  </div>
</template>

<script setup lang="ts" generic="T extends Record<string, any>">
import { Search } from '@element-plus/icons-vue';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import Pagination from '../Pagination.vue';

import DropdownMenu from './DropdownMenu.vue';

import type { Column, TableAction } from '@/types/common';
import type { UpdateTimeType } from '@/types/common';

import ProjectLink from '@/components/core/link/ProjectLink.vue';
import ShowUpdateTime from '@/components/core/ShowUpdateTime.vue';
import { isAdmin } from '@/utils/auth';
import { formatDate } from '@/utils/date';

const props = withDefaults(
  defineProps<{
    data: T[] | undefined;
    columns: Column[];
    actions?: TableAction<T>[];
    loading?: boolean;
    showIdColumn?: boolean;
    showActions?: boolean;
    showSearch?: boolean;
    showPagination?: boolean;
    lastUpdateTime?: UpdateTimeType;
    observationType?: string;
    tableHeight?: string;
  }>(),
  {
    data: () => [] as T[],
    columns: () => [],
    actions: () => [],
    loading: false,
    showIdColumn: true,
    showActions: true,
    showSearch: true,
    showPagination: true,
    lastUpdateTime: null,
    observationType: '',
    tableHeight: '350px',
  }
);

defineEmits(['update:currentPage', 'update:pageSize']);

const { t } = useI18n();

const searchQuery = ref<string>('');
const currentPage = ref<number>(1);
const pageSize = ref<number>(20);
const idColumnLength: string = '50';

const otherColumns = computed<Column[]>(() => props.columns.slice(1));

// 過濾和搜索邏輯
const filteredData = computed(() => {
  let result = props.data;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter((item) => {
      return props.columns.some((column) => {
        if (!column.field) return false;
        const value = item[column.field];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(query);
      });
    });
  }

  return result;
});

// 分頁
const paginatedData = computed(() => {
  if (!props.showPagination) return filteredData.value;

  const startIndex = (currentPage.value - 1) * pageSize.value;
  return filteredData.value.slice(startIndex, startIndex + pageSize.value);
});

// Expose some values for child components
defineExpose({
  currentPage,
  pageSize,
  filteredData,
  searchQuery,
});
</script>

<style lang="scss" scoped></style>
