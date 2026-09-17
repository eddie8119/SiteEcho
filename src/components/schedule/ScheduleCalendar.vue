<template>
  <div class="basic-container card-color-difference flex h-full flex-col p-1 md:p-3">
    <!-- Header -->
    <header class="mb-2 flex items-center justify-between">
      <h3 class="text-black text-base">{{ currentMonth }} {{ currentYear }}</h3>
      <nav class="flex gap-2" aria-label="Month navigation">
        <button
          type="button"
          class="rounded p-1 text-gray-500 transition-colors hover:bg-gray-200"
          title="Previous month"
          @click="previousMonth"
        >
          <ElIcon class="text-base"><ArrowLeft /></ElIcon>
        </button>
        <button
          type="button"
          class="rounded p-1 text-gray-500 transition-colors hover:bg-gray-200"
          title="Next month"
          @click="nextMonth"
        >
          <ElIcon class="text-base"><ArrowRight /></ElIcon>
        </button>
      </nav>
    </header>

    <!-- Desktop Calendar Grid (lg and above) -->
    <div
      class="--desktop hidden grid-cols-7 gap-2.5 lg:grid"
      role="grid"
      :aria-label="`${currentMonth} ${currentYear}`"
    >
      <!-- Weekday headers -->
      <div
        v-for="(day, idx) in weekDays"
        :key="`header-${day}`"
        class="py-2 text-center text-xs font-semibold"
        :class="idx === 0 || idx === 6 ? 'text-secondary-red' : 'text-gray-600'"
        role="columnheader"
      >
        {{ day }}
      </div>

      <!-- Calendar dates -->
      <button
        v-for="date in calendarDates"
        :key="date.key"
        type="button"
        class="relative flex aspect-square items-center justify-center rounded-lg border-none transition-all duration-200"
        :class="getDateButtonClasses(date)"
        :aria-selected="date.isSelected"
        :aria-current="date.isToday ? 'date' : undefined"
        :aria-label="getDateAria(date)"
        @click="selectDate(date)"
      >
        <span>{{ date.day }}</span>
        <span
          v-if="date.hasTask"
          class="absolute bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
          :class="date.isSelected ? 'bg-white' : 'bg-brand-tertiary'"
        />
      </button>
    </div>

    <!-- Mobile Horizontal Scroll Calendar (lg below) -->
    <div
      class="--mobile flex flex-col gap-3 lg:hidden"
      role="group"
      :aria-label="`${currentMonth} ${currentYear}`"
    >
      <!-- Horizontal scrollable dates -->
      <div ref="mobileScroll" class="overflow-x-auto scroll-smooth">
        <div class="flex gap-2">
          <button
            v-for="date in calendarDates"
            :key="`mobile-${date.key}`"
            type="button"
            class="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border-none transition-all duration-200"
            :class="getDateButtonClasses(date)"
            :data-key="`mobile-${date.key}`"
            :aria-selected="date.isSelected"
            :aria-current="date.isToday ? 'date' : undefined"
            :aria-label="getDateAria(date)"
            @click="selectDate(date)"
          >
            <div class="flex flex-col items-center">
              <span
                class="text-xs"
                :class="[
                  date.date.getDay() === 0 || date.date.getDay() === 6 ? 'text-secondary-red' : '',
                ]"
              >
                {{ weekDays[date.date.getDay()] }}
              </span>
              <span class="text-sm font-medium">{{ date.day }}</span>
            </div>
            <span
              v-if="date.hasTask"
              class="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
              :class="date.isSelected ? 'bg-white' : 'bg-brand-tertiary'"
            />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
import { ElIcon } from 'element-plus';
import { computed, nextTick, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { TaskResponse } from '@/types/response';
import type { CalendarDate } from '@/utils/calendarUtils';

import { TaskScheduleDisplayMode } from '@/types/task';
import { getDateAria as buildDateAria } from '@/utils/aria';
import {
  generateCalendarDates,
  getMonthName,
  getNextMonth,
  getPreviousMonth,
  getWeekDayNames,
} from '@/utils/calendarUtils';

const props = defineProps<{
  selectedDate: Date;
  tasks: TaskResponse[] | undefined;
  displayMode: TaskScheduleDisplayMode;
}>();

const emit = defineEmits<{
  (e: 'update:selectedDate', date: Date): void;
}>();

const { t } = useI18n();

const currentDate = ref(new Date(props.selectedDate));

const currentYear = computed(() => currentDate.value.getFullYear());
const currentMonth = computed(() => getMonthName(currentDate.value, t));
const weekDays = computed(() => getWeekDayNames(t));
const taskDates = computed(() => {
  if (!props.tasks) return [];
  const dates: Date[] = [];
  props.tasks.forEach((task: TaskResponse) => {
    if (
      props.displayMode === TaskScheduleDisplayMode.ReminderDateTime ||
      props.displayMode === TaskScheduleDisplayMode.All
    ) {
      if (task.reminderDateTime) {
        dates.push(new Date(task.reminderDateTime));
      }
    }
    if (
      props.displayMode === TaskScheduleDisplayMode.EndDateTime ||
      props.displayMode === TaskScheduleDisplayMode.All
    ) {
      if (task.endDateTime) {
        dates.push(new Date(task.endDateTime));
      }
    }
  });
  return dates;
});

const calendarDates = computed(() =>
  generateCalendarDates(currentDate.value, props.selectedDate, taskDates.value)
);

const getDateButtonClasses = (date: CalendarDate): string[] => {
  const classes: string[] = [];

  if (!date.isCurrentMonth) {
    classes.push('cursor-default text-gray-400');
  } else {
    classes.push('cursor-pointer text-gray-900 hover:bg-gray-100');
  }

  if (date.isSelected) {
    classes.push(
      'bg-brand-tertiary text-white font-bold shadow-lg shadow-yellow-500/35 hover:bg-brand-tertiary'
    );
  }

  return classes;
};

const selectDate = (dateObj: CalendarDate) => {
  emit('update:selectedDate', dateObj.date);
};

const getDateAria = (dateObj: CalendarDate): string =>
  buildDateAria(dateObj, currentMonth.value, currentYear.value);

const previousMonth = () => {
  currentDate.value = getPreviousMonth(currentDate.value);
};

const nextMonth = () => {
  currentDate.value = getNextMonth(currentDate.value);
};

// Mobile: center selected/today on initial render
const mobileScroll = ref<HTMLDivElement | null>(null);

onMounted(async () => {
  await nextTick();
  const container = mobileScroll.value;
  if (!container) return;
  const selected: CalendarDate | undefined =
    calendarDates.value.find((d: CalendarDate) => d.isSelected) ||
    calendarDates.value.find((d: CalendarDate) => d.isToday);
  if (!selected) return;
  const key = `mobile-${selected.key}`;
  const el = container.querySelector(`[data-key="${key}"]`) as HTMLElement | null;
  if (!el) return;
  const target = el.offsetLeft - (container.clientWidth / 2 - el.clientWidth / 2);
  container.scrollLeft = Math.max(0, target);
});
</script>

<style scoped></style>
