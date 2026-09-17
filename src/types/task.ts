export enum TaskStatusEnum {
  TODO = 'todo',
  IN_PROGRESS = 'inProgress',
  DONE = 'done',
}

export type TaskStatus = 'todo' | 'inProgress' | 'done';

export enum TaskTimeAlertStatus {
  OVERDUE = 'overdue', //超過截止時間
  REMINDING = 'reminding', //超過提醒時間
  NONE = 'none',
}

export enum TaskTimeCondition {
  ALL = 'all',
  UNSCHEDULED = 'unscheduled',
  OVERDUE = 'overdue',
  TODAY = 'today',
  THIS_WEEK = 'this_week',
  THIS_MONTH = 'this_month',
}

export enum TaskPinCondition {
  ALL = 'all',
  WITH_PIN = 'with_pin',
  WITHOUT_PIN = 'without_pin',
}

export enum TaskScheduleDisplayMode {
  ReminderDateTime = 'reminderDateTime',
  EndDateTime = 'endDateTime',
  All = 'all',
}
