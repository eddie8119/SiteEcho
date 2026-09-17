import type { TaskResponse } from '@/types/response';

import { TaskScheduleDisplayMode } from '@/types/task';
import { formatDate as formatDateKey, getMonthYear, getWeekDay } from '@/utils/date';

export interface DayGroup {
  dateKey: string;
  date: Date;
  day: number;
  weekDay: string;
  monthYear: string;
  tasks: TaskResponse[];
}

export const groupTasksByDate = (
  tasks: TaskResponse[],
  t: (key: string) => string,
  displayMode: TaskScheduleDisplayMode = TaskScheduleDisplayMode.EndDateTime
): DayGroup[] => {
  if (tasks.length === 0) return [];

  // Helper function to get task dates based on display mode
  const getTaskDates = (task: TaskResponse): Date[] => {
    const dates: Date[] = [];

    if (displayMode === TaskScheduleDisplayMode.ReminderDateTime && task.reminderDateTime) {
      dates.push(new Date(task.reminderDateTime));
    } else if (displayMode === TaskScheduleDisplayMode.EndDateTime && task.endDateTime) {
      dates.push(new Date(task.endDateTime));
    } else if (displayMode === TaskScheduleDisplayMode.All) {
      if (task.reminderDateTime) dates.push(new Date(task.reminderDateTime));
      if (task.endDateTime) dates.push(new Date(task.endDateTime));
    }

    return dates;
  };

  // Get unique dates from tasks
  const uniqueDates = new Map<string, Date>();
  tasks.forEach((task) => {
    const taskDates = getTaskDates(task);
    taskDates.forEach((date) => {
      const dateKey = formatDateKey(date);
      if (!uniqueDates.has(dateKey)) {
        uniqueDates.set(dateKey, date);
      }
    });
  });

  // Sort dates
  const sortedDates = Array.from(uniqueDates.values()).sort((a, b) => a.getTime() - b.getTime());

  // Group tasks by date
  const groups: DayGroup[] = sortedDates.map((date) => {
    const dateKey = formatDateKey(date);
    const tasksForDay = tasks.filter((task) => {
      const taskDates = getTaskDates(task);
      return taskDates.some((taskDate) => formatDateKey(taskDate) === dateKey);
    });

    // Sort tasks by time
    tasksForDay.sort((a, b) => {
      const getDatesForSort = (task: TaskResponse): Date | null => {
        if (displayMode === TaskScheduleDisplayMode.ReminderDateTime)
          return task.reminderDateTime ? new Date(task.reminderDateTime) : null;
        if (displayMode === TaskScheduleDisplayMode.EndDateTime)
          return task.endDateTime ? new Date(task.endDateTime) : null;
        // For 'all' mode, prioritize reminderDateTime, then endDateTime
        return task.reminderDateTime
          ? new Date(task.reminderDateTime)
          : task.endDateTime
            ? new Date(task.endDateTime)
            : null;
      };

      const timeA = getDatesForSort(a);
      const timeB = getDatesForSort(b);
      if (!timeA || !timeB) return 0;
      return timeA.getTime() - timeB.getTime();
    });

    return {
      dateKey,
      date,
      day: date.getDate(),
      weekDay: getWeekDay(date, t),
      monthYear: getMonthYear(date, t),
      tasks: tasksForDay,
    };
  });

  return groups;
};
