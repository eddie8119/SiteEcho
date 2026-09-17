import type { ConstructionSelection, SelectorOption } from '@/types/selection';

export const PROJECT_TYPES: SelectorOption[] = [
  { value: 'residential' },
  { value: 'luxury' },
  { value: 'commercial' },
  { value: 'office' },
  { value: 'retail' },
  { value: 'restaurant' },
  { value: 'hospitality' },
  { value: 'education' },
  { value: 'medical' },
  { value: 'public' },
  { value: 'exhibition' },
  { value: 'industrial' },
  { value: 'renovation' },
  { value: 'showroom' },
];

export type ProjectType = (typeof PROJECT_TYPES)[number]['value'];

// Runtime tuple of project type values, suitable for z.enum
export const PROJECT_TYPE_VALUES = PROJECT_TYPES.map((o) => o.value) as unknown as [
  ProjectType,
  ...ProjectType[],
];

export const CONSTRUCTION_CONTAINER: ConstructionSelection[] = [
  {
    name: '3D_Drawing',
    id: '0',
  },
  {
    name: 'protection_demolition',
    id: '1',
  },
  {
    name: 'electromechanical',
    id: '2',
  },
  {
    name: 'hydropower',
    id: '3',
  },
  {
    name: 'flooring',
    id: '4',
  },
  {
    name: 'masonry',
    id: '5',
  },
  {
    name: 'door_frame',
    id: '6',
  },
  {
    name: 'light_partition',
    id: '7',
  },
  {
    name: 'woodwork',
    id: '8',
  },
  {
    name: 'metal',
    id: '9',
  },
  {
    name: 'glass',
    id: '10',
  },
  {
    name: 'painting',
    id: '11',
  },
  {
    name: 'flooring_material',
    id: '12',
  },
  {
    name: 'waterproofing',
    id: '13',
  },
  {
    name: 'bathroom_fixtures',
    id: '14',
  },
  {
    name: 'kitchen_cabinet',
    id: '15',
  },
  {
    name: 'air_conditioning',
    id: '16',
  },
  {
    name: 'structural_reinforcement',
    id: '17',
  },
];

const STATUS_FILTER_OPTIONS_BASE = [
  { value: 'all' },
  { value: 'todo' },
  { value: 'inProgress' },
  { value: 'done' },
];

const [STATUS_FILTER_ALL, STATUS_FILTER_TODO, STATUS_FILTER_IN_PROGRESS] =
  STATUS_FILTER_OPTIONS_BASE;

export const STATUS_FILTER_OPTIONS: SelectorOption[] = STATUS_FILTER_OPTIONS_BASE;

export type TaskFilterStatus = (typeof STATUS_FILTER_OPTIONS_BASE)[number]['value'];

export const STATUS_FILTER_OPTIONS_WITHOUT_DONE = [
  STATUS_FILTER_ALL,
  STATUS_FILTER_TODO,
  STATUS_FILTER_IN_PROGRESS,
] as const;

export const TASK_DISPLAY_OPTIONS: SelectorOption[] = [{ value: 'all' }, { value: 'content' }];

export type TaskCardDisplayMode = (typeof TASK_DISPLAY_OPTIONS)[number]['value'];

export const TODO_FILTER: SelectorOption[] = [
  { value: 'all' },
  { value: 'done' },
  { value: 'todo' },
];

export const COLLABORATOR_ROLE_OPTIONS: SelectorOption[] = [
  { value: 'viewer' },
  { value: 'editor' },
  { value: 'manager' },
];
