declare module 'vue3-smooth-dnd' {
  import { DefineComponent } from 'vue';

  export const Container: DefineComponent<{
    orientation?: string;
    behaviour?: string;
    tag?: string;
    groupName?: string;
    lockAxis?: string;
    dragHandleSelector?: string;
    nonDragAreaSelector?: string;
    dragBeginDelay?: number;
    animationDuration?: number;
    autoScrollEnabled?: boolean;
    dragClass?: string;
    dropClass?: string;
    removeOnDropOut?: boolean;
    getChildPayload?: (index: number) => unknown;
    shouldAnimateDrop?: (sourceContainerOptions: unknown, payload: unknown) => boolean;
    shouldAcceptDrop?: (sourceContainerOptions: unknown, payload: unknown) => boolean;
    getGhostParent?: () => HTMLElement;
  }>;

  export const Draggable: DefineComponent<{
    tag?: string;
  }>;

  export interface DropResult {
    addedIndex: number | null;
    removedIndex: number | null;
    payload?: unknown;
    element?: HTMLElement;
  }
}
