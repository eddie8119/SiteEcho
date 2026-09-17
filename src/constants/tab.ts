import type { Tab } from '@/types/layout';

import { PendingType } from '@/types/photo';
import { TaskPinCondition, TaskTimeCondition } from '@/types/task';

export const UNCATEGORIZED_FILTER = 'uncategorized' as const;

// Base user tabs that all users can see
const BASE_USER_TAB_LIST: Tab[] = [
  // {
  //   name: 'profile',
  // },
  {
    name: 'change-password',
  },
];

// Billing-related tabs (only for project owners, not collaborators)
const BILLING_TAB_LIST: Tab[] = [
  // {
  //   name: 'pricing-menu',
  // },
  // {
  //   name: 'subscription',
  // },
];

// Full user tab list (for project owners)
export const USER_TAB_LIST: Tab[] = [...BASE_USER_TAB_LIST, ...BILLING_TAB_LIST];

// User tab list for collaborators (without billing tabs)
export const COLLABORATOR_TAB_LIST: Tab[] = BASE_USER_TAB_LIST;

export const TO_DO_TAB_LIST: Tab[] = [
  {
    name: 'projects',
  },
];

export const PLANNING_TAB_LIST: Tab[] = [
  // {
  //   name: 'upload',
  // },
  // {
  //   name: 'gantt-chart',
  // },
];

export const OVERVIEW_TASK_CONDITION_TAB_LIST: Tab[] = [
  {
    name: TaskTimeCondition.ALL,
  },
  {
    name: TaskTimeCondition.UNSCHEDULED,
  },
  {
    name: TaskTimeCondition.OVERDUE,
  },
  {
    name: TaskTimeCondition.TODAY,
  },
  {
    name: TaskTimeCondition.THIS_WEEK,
  },
  {
    name: TaskTimeCondition.THIS_MONTH,
  },
];

export const TASK_PIN_CONDITION_TAB_LIST: Tab[] = [
  {
    name: TaskPinCondition.WITHOUT_PIN,
  },
  {
    name: TaskPinCondition.WITH_PIN,
  },
  {
    name: TaskPinCondition.ALL,
  },
];

export const SETTING_COMMON_TAB_LIST: Tab[] = [
  {
    name: 'all',
  },
];

export const PHOTO_PENDING_TAB_LIST: Array<{ value: string; label: string }> = [
  {
    value: UNCATEGORIZED_FILTER,
    label: '未分類',
  },
  {
    value: PendingType.ISSUE,
    label: '有問題',
  },
  {
    value: PendingType.FIX,
    label: '待修改',
  },
  {
    value: PendingType.CHECK,
    label: '待確認',
  },
];
