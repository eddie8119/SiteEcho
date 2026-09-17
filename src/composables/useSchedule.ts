import { computed, ref, type Ref } from 'vue';

import type { TaskResponse } from '@/types/response';
import type { ConstructionSelection } from '@/types/selection';

export function useSchedule({
  fetchedAllTasks,
  constructionList,
}: {
  fetchedAllTasks: Ref<TaskResponse[] | undefined>;
  constructionList: Ref<ConstructionSelection[] | undefined>;
}) {
  // Selected date for calendar
  const selectedDate = ref<Date>(new Date());

  // Selected filters state
  const selectedConstructionIds = ref<string[]>([]);
  const selectedProjectIds = ref<string[]>([]);

  const toggleFromList = (list: string[], id: string): string[] => {
    const exists = list.includes(id);
    return exists ? list.filter((x) => x !== id) : [...list, id];
  };

  const toggleConstruction = (id: string) => {
    selectedConstructionIds.value = toggleFromList(selectedConstructionIds.value, id);
  };

  const toggleProject = (id: string) => {
    selectedProjectIds.value = toggleFromList(selectedProjectIds.value, id);
  };

  // Filtered tasks according to selections (only tasks with dates)
  const filteredTasks = computed(() => {
    // Get all tasks with reminder or end date
    const all = (fetchedAllTasks.value ?? []).filter(
      (t) => t.reminderDateTime !== null || t.endDateTime !== null
    );

    // Exclude selected projects
    const byProject = selectedProjectIds.value.length
      ? all.filter((t) => !selectedProjectIds.value.includes(t.projectId))
      : all;

    // If no construction filters selected, return as-is
    if (!selectedConstructionIds.value.length) return byProject;

    // Exclude tasks whose constructionType is in selectedConstructionIds
    return byProject.filter((t) => !selectedConstructionIds.value.includes(t.constructionType));
  });

  // Unscheduled tasks (tasks without reminderDateTime and endDateTime)
  const unscheduledTasks = computed(() => {
    // Get all tasks without reminder or end date
    const all = (fetchedAllTasks.value ?? []).filter(
      (t) => t.reminderDateTime === null && t.endDateTime === null
    );

    // Exclude selected projects
    const byProject = selectedProjectIds.value.length
      ? all.filter((t) => !selectedProjectIds.value.includes(t.projectId))
      : all;

    // If no construction filters selected, return as-is
    if (!selectedConstructionIds.value.length) return byProject;

    // Exclude tasks whose constructionType is in selectedConstructionIds
    return byProject.filter((t) => !selectedConstructionIds.value.includes(t.constructionType));
  });

  const filteredConstructionList = computed(() => {
    const all = constructionList.value ?? [];
    return all.filter((c) => !selectedConstructionIds.value.includes(c.id));
  });

  // Get unique dates that have tasks
  const taskDates = computed(() => {
    const dates = filteredTasks.value
      .map((task) => task.reminderDateTime ?? task.endDateTime)
      .filter((date): date is string => typeof date === 'string' && date.trim() !== '')
      .map((date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
      });

    // Deduplicate by timestamp
    const uniqueTimestamps = new Set(dates.map((d) => d.getTime()));
    return Array.from(uniqueTimestamps).map((timestamp) => new Date(timestamp));
  });

  return {
    selectedDate,
    selectedConstructionIds,
    selectedProjectIds,
    toggleConstruction,
    toggleProject,
    filteredTasks,
    unscheduledTasks,
    filteredConstructionList,
    taskDates,
  };
}
