import { inject, type InjectionKey, provide, type Ref } from 'vue';

export type ConstructionIdRef = Ref<string | undefined>;

const ConstructionIdKey: InjectionKey<ConstructionIdRef> = Symbol('ConstructionId');

export function provideConstructionId(constructionId: ConstructionIdRef) {
  provide(ConstructionIdKey, constructionId);
}

export function useConstructionIdContext(options?: {
  required?: boolean;
}): ConstructionIdRef | undefined {
  const context = inject(ConstructionIdKey, undefined);

  if (!context && options?.required) {
    throw new Error('useConstructionIdContext must be used within a ConstructionId provider');
  }

  return context;
}
