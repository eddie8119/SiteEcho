export interface CalendarDate {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasTask: boolean;
  key: string;
}

/**
 * 判断两个日期是否为同一天
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * 检查日期是否有任务
 */
export const hasTaskOnDate = (date: Date, taskDates: Date[]): boolean => {
  return taskDates.some((taskDate) => isSameDay(taskDate, date));
};

/**
 * 生成日历日期数组
 */
export const generateCalendarDates = (
  currentDate: Date,
  selectedDate: Date,
  taskDates: Date[]
): CalendarDate[] => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of the month
  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay();

  // Last day of the month
  const lastDay = new Date(year, month + 1, 0);
  const lastDate = lastDay.getDate();

  // Previous month's last date
  const prevMonthLastDate = new Date(year, month, 0).getDate();

  const dates: CalendarDate[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Previous month dates
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDate - i;
    const date = new Date(year, month - 1, day);
    dates.push({
      date,
      day,
      isCurrentMonth: false,
      isToday: isSameDay(date, today),
      isSelected: isSameDay(date, selectedDate),
      hasTask: hasTaskOnDate(date, taskDates),
      key: `prev-${day}`,
    });
  }

  // Current month dates
  for (let day = 1; day <= lastDate; day++) {
    const date = new Date(year, month, day);
    dates.push({
      date,
      day,
      isCurrentMonth: true,
      isToday: isSameDay(date, today),
      isSelected: isSameDay(date, selectedDate),
      hasTask: hasTaskOnDate(date, taskDates),
      key: `current-${day}`,
    });
  }

  // Next month dates
  const remainingDays = 42 - dates.length; // 6 rows * 7 days
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(year, month + 1, day);
    dates.push({
      date,
      day,
      isCurrentMonth: false,
      isToday: isSameDay(date, today),
      isSelected: isSameDay(date, selectedDate),
      hasTask: hasTaskOnDate(date, taskDates),
      key: `next-${day}`,
    });
  }

  return dates;
};

/**
 * 获取月份名称
 */
export const getMonthName = (date: Date, t: (key: string) => string): string => {
  const monthNames = [
    t('date.january'),
    t('date.february'),
    t('date.march'),
    t('date.april'),
    t('date.may'),
    t('date.june'),
    t('date.july'),
    t('date.august'),
    t('date.september'),
    t('date.october'),
    t('date.november'),
    t('date.december'),
  ];
  return monthNames[date.getMonth()];
};

/**
 * 获取周日期名称数组
 */
export const getWeekDayNames = (t: (key: string) => string): string[] => [
  t('date.sunday_short'),
  t('date.monday_short'),
  t('date.tuesday_short'),
  t('date.wednesday_short'),
  t('date.thursday_short'),
  t('date.friday_short'),
  t('date.saturday_short'),
];

/**
 * 上一个月
 */
export const getPreviousMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
};

/**
 * 下一个月
 */
export const getNextMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
};
