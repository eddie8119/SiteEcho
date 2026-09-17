<template>
  <!-- <Loading v-if="isLoadingAllTasks || isLoadingProjects" />
  <div v-else class="flex h-full flex-col gap-4 lg:flex-row">
    <div class="flex w-full flex-shrink-0 flex-col gap-4 overflow-hidden lg:w-80">
      <div class="overflow-hidden">
        <ScheduleCalendar
          :selected-date="selectedDate"
          :tasks="fetchedAllTasks"
          :display-mode="displayMode"
          @update:selected-date="selectedDate = $event"
        />
      </div>

      <div class="flex-1 overflow-y-auto">
        <ScheduleFilterArea
          :construction-list="constructionList"
          :project-title-list="projectTitleList"
          :selected-construction-ids="selectedConstructionIds"
          :selected-project-ids="selectedProjectIds"
          @toggle-construction="toggleConstruction"
          @toggle-project="toggleProject"
          @select-all-filters="handleSelectAllFilters"
          @clear-filters="handleClearFilters"
        />
      </div>
    </div>

    <div class="panel-container relative h-full w-full flex-1 overflow-hidden">
      <ScheduleDailyView
        :tasks="filteredTasks"
        :selected-date="selectedDate"
        :display-mode="displayMode"
        @update:task="handleUpdateTask"
        @delete="handleDeleteTask"
        @update:display-mode="displayMode = $event"
      />
    </div>

    <div class="hidden w-[340px] flex-shrink-0 overflow-hidden lg:block">
      <UnscheduledTaskList
        :tasks="unscheduledTasks"
        @update:task="handleUpdateTask"
        @delete="handleDeleteTask"
      />
    </div>
  </div>

  <div v-if="showMobileUnscheduled" class="fixed inset-x-0 bottom-0 z-50 lg:hidden">
    <div class="flex h-[60vh] flex-col rounded-t-2xl bg-white shadow-2xl dark:bg-gray-900">
      <div
        class="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700"
      >
        <h3 class="text-lg font-semibold">{{ t('title.unscheduled_task') }}</h3>
        <button
          type="button"
          class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          @click="showMobileUnscheduled = false"
        >
          <ElIcon :size="24"><Close /></ElIcon>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-4 md:p-7">
        <UnscheduledTaskList
          :tasks="unscheduledTasks"
          @update:task="handleUpdateTask"
          @delete="handleDeleteTask"
        />
      </div>
    </div>

    <div class="bg-black/50 fixed inset-0 z-40" @click="showMobileUnscheduled = false" />
  </div>

  <button
    v-if="unscheduledTasks.length > 0"
    type="button"
    class="fixed bottom-[51vh] right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-white shadow-lg hover:shadow-xl lg:hidden"
    @click="showMobileUnscheduled = true"
  >
    <ElIcon :size="24" color="black"><DocumentCopy stroke-width="1" /></ElIcon>
    <span
      class="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-secondary-yellow text-xs font-bold text-gray-900"
    >
      {{ unscheduledTasks.length }}
    </span>
  </button> -->
  <p>s/p></p>
</template>

<script setup lang="ts">
// import { Close, DocumentCopy } from '@element-plus/icons-vue';
// import { ElIcon } from 'element-plus';
// import { ref } from 'vue';
// import { useI18n } from 'vue-i18n';

// import type { TaskResponse } from '@/types/response';

// import Loading from '@/components/core/loading/Loading.vue';
// import ScheduleCalendar from '@/components/schedule/ScheduleCalendar.vue';
// import ScheduleDailyView from '@/components/schedule/ScheduleDailyView.vue';
// import ScheduleFilterArea from '@/components/schedule/ScheduleFilterArea.vue';
// import UnscheduledTaskList from '@/components/schedule/UnscheduledTaskList.vue';
// import { useOverviewSources } from '@/composables/useOverviewSources';
// import { useSchedule } from '@/composables/useSchedule';
// import { provideProjectTitleList } from '@/context/useProjectTitleListContext';
// import { provideTaskCardFilter } from '@/context/useTaskCardFilterContext';
// import { TaskScheduleDisplayMode } from '@/types/task';

// const { t } = useI18n();

// // Fetch data
// const { fetchedAllTasks, isLoadingAllTasks, updateTask, deleteTask } = useTasks(undefined, {
//   invalidateAllTasks: true,
// });
// const { isLoadingProjects, constructionList, projectTitleList } = useOverviewSources();

// // Schedule logic
// const displayMode = ref<TaskScheduleDisplayMode>(TaskScheduleDisplayMode.All);

// const {
//   selectedDate,
//   selectedConstructionIds,
//   selectedProjectIds,
//   toggleConstruction,
//   toggleProject,
//   filteredTasks,
//   unscheduledTasks,
// } = useSchedule({
//   fetchedAllTasks,
//   constructionList,
// });

// // Provide contexts
// provideTaskCardFilter();
// provideProjectTitleList(projectTitleList);
// const { planningMaterials } = usePlanningMaterials();
// providePlanningMaterials(planningMaterials);
// const showMobileUnscheduled = ref(false);

// // Task handlers
// const handleUpdateTask = async (taskId: string, patch: Partial<TaskResponse>) => {
//   await updateTask(taskId, patch);
// };

// const handleDeleteTask = async (taskId: string) => {
//   await deleteTask(taskId);
// };

// const handleSelectAllFilters = () => {
//   selectedConstructionIds.value = (constructionList.value ?? []).map((c) => c.id);
//   selectedProjectIds.value = (projectTitleList.value ?? []).map((p) => p.id);
// };

// const handleClearFilters = () => {
//   selectedConstructionIds.value = [];
//   selectedProjectIds.value = [];
// };
</script>

<style scoped></style>
