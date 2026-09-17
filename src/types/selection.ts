export type ProjectType = 'residential' | 'luxury' | 'commercial' | 'office';

export interface ConstructionSelection {
  name: string;
  id: string;
}

export interface SelectorOption<T = string> {
  value: T;
}
