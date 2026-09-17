import type { Menu } from '@/types/layout';

import PhotoIcon from '@/assets/icons/Photo.png';
import Photos from '@/assets/icons/Photos.svg';
import PendingIcon from '@/assets/icons/Todo.svg';

export const APP_NAV_ITEMS = [
  {
    name: 'timeline',
    path: '/mobile/timeline',
    icon: Photos,
  },
  {
    name: 'camera',
    path: '/mobile/take-photo',
    icon: PhotoIcon,
  },
  {
    name: 'pending',
    path: '/mobile/pending',
    icon: PendingIcon,
  },
];

export const MENU: Menu[] = [
  {
    group: '',
    items: [
      {
        label: 'overview',
        name: 'overview',
        icon: 'Overview',
        route: '/desktop/overview',
      },
      {
        label: 'photos',
        name: 'photos',
        icon: 'Photos',
        route: '/desktop/photos',
      },
      {
        label: 'trash',
        name: 'trash',
        icon: 'Trash',
        route: '/desktop/trash',
      },
      {
        label: 'reports',
        name: 'reports',
        icon: 'Report',
        route: '/desktop/reports',
      },
    ],
  },
  // {
  //   group: 'nav.group.setting',
  //   items: [
  //     {
  //       label: 'Set Common',
  //       name: 'set_common',
  //       icon: 'Palette',
  //       route: '/desktop/setting/common',
  //     },
  //   ],
  // },
];
