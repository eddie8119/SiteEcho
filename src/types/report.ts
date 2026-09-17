import type { LocalPhoto } from './photo';

export enum Purpose {
  Internal = 'internal',
  Billing = 'billing',
  FollowUp = 'follow_up',
}

export interface PhotoWithConstructions {
  photo: LocalPhoto;
  constructions: string[];
}

export interface GroupedPhotos {
  [space: string]: {
    [photoId: string]: PhotoWithConstructions;
  };
}
