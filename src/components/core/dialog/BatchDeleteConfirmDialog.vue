<template>
  <BasicEditDialog
    v-model="dialogVisible"
    :title="$t('dialog.batch_delete_confirm.title')"
    @submit="onSubmit"
    @cancel="onCancel"
  >
    <div class="space-y-4 text-left">
      <!-- Count display (hide for single photo) -->
      <div v-if="!isSinglePhoto" class="flex items-center gap-3">
        <p class="text-base text-gray-700">
          {{ $t('dialog.batch_delete_confirm.select_delete') }}
          <span class="font-semibold text-secondary-red"
            >{{ totalCount }} {{ $t('dialog.batch_delete_confirm.photos') }}</span
          >
        </p>
      </div>

      <!-- Evidence breakdown (hide for single photo) -->
      <template v-if="!isSinglePhoto && evidenceCount > 0">
        <div class="rounded-lg bg-gray-50 px-4 py-3 text-sm">
          <p class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
            {{ $t('dialog.batch_delete_confirm.including') }}
          </p>
          <div class="space-y-1.5">
            <div class="flex justify-between text-gray-600">
              <span>{{ $t('dialog.batch_delete_confirm.regular_photo') }}</span>
              <span class="font-medium text-gray-800">{{ regularCount }} </span>
            </div>
            <div class="flex justify-between text-amber-600">
              <span>{{ $t('dialog.batch_delete_confirm.evidence_photo') }}</span>
              <span class="font-medium text-amber-600">{{ evidenceCount }} </span>
            </div>
          </div>
        </div>

        <div class="space-y-3 text-sm">
          <div class="flex items-center gap-2 text-gray-500">
            <span class="font-medium text-gray-700">{{
              $t('dialog.batch_delete_confirm.regular_photo')
            }}</span>
            <span>{{ $t('dialog.batch_delete_confirm.direct_delete') }}</span>
          </div>

          <div>
            <p class="mb-2 font-medium text-amber-600">
              {{ $t('dialog.batch_delete_confirm.evidence_handling') }}
            </p>
            <div class="space-y-2 pl-1">
              <label
                v-for="option in evidenceOptions"
                :key="option.value"
                class="flex cursor-pointer items-start gap-3"
              >
                <div class="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                  <input
                    v-model="evidenceAction"
                    type="radio"
                    :value="option.value"
                    :class="[
                      'peer h-4 w-4 appearance-none rounded-full border-2 focus:outline-none',
                      option.color === 'orange'
                        ? 'checked:border-orange-500 checked:bg-orange-500'
                        : 'checked:border-red-500 checked:bg-red-500',
                    ]"
                  />
                  <svg
                    v-if="evidenceAction === option.value"
                    class="pointer-events-none absolute h-2.5 w-2.5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <circle cx="10" cy="10" r="5" />
                  </svg>
                </div>
                <div class="flex-1">
                  <span class="text-gray-700">{{ option.label }}</span>
                  <span
                    v-if="option.isDefault && evidenceAction === option.value"
                    class="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500"
                  >
                    {{ $t('dialog.batch_delete_confirm.default') }}
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </template>

      <!-- Single photo evidence handling (only show for single photo with evidence) -->
      <template v-if="isSinglePhoto && evidenceCount > 0">
        <div class="space-y-3 text-sm">
          <div>
            <p class="mb-2 font-medium text-amber-600">
              {{ $t('dialog.batch_delete_confirm.evidence_handling') }}
            </p>
            <div class="space-y-2 pl-1">
              <label
                v-for="option in evidenceOptions"
                :key="option.value"
                class="flex cursor-pointer items-start gap-3"
              >
                <div class="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                  <input
                    v-model="evidenceAction"
                    type="radio"
                    :value="option.value"
                    :class="[
                      'peer h-4 w-4 appearance-none rounded-full border-2 focus:outline-none',
                      option.color === 'orange'
                        ? 'checked:border-orange-500 checked:bg-orange-500'
                        : 'checked:border-red-500 checked:bg-red-500',
                    ]"
                  />
                  <svg
                    v-if="evidenceAction === option.value"
                    class="pointer-events-none absolute h-2.5 w-2.5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <circle cx="10" cy="10" r="5" />
                  </svg>
                </div>
                <div class="flex-1">
                  <span class="text-gray-700">{{ option.label }}</span>
                  <span
                    v-if="option.isDefault && evidenceAction === option.value"
                    class="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500"
                  >
                    {{ $t('dialog.batch_delete_confirm.default') }}
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </template>

      <!-- Simple message when no evidence photos -->
      <template v-if="!isSinglePhoto && evidenceCount === 0">
        <p class="text-base text-gray-500">
          {{ $t('dialog.batch_delete_confirm.all_photos_deleted') }}
        </p>
      </template>
    </div>
  </BasicEditDialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { LocalPhoto, PhotoRecord } from '@/types/photo';

import BasicEditDialog from '@/components/core/dialog/BasicEditDialog.vue';
import { EvidenceAction } from '@/composables/useTimelineMultiSelect';

const props = defineProps<{
  modelValue: boolean;
  photos: (LocalPhoto | PhotoRecord)[];
  isSinglePhoto?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  confirm: [payload: { evidenceAction: EvidenceAction }];
}>();

const { t } = useI18n();

const evidenceAction = ref<EvidenceAction>(EvidenceAction.Trash);

const evidenceOptions = computed(() => [
  {
    value: EvidenceAction.Trash,
    label: t('dialog.batch_delete_confirm.move_to_trash'),
    color: 'orange' as const,
    isDefault: true,
  },
  {
    value: EvidenceAction.Permanent,
    label: t('dialog.batch_delete_confirm.permanent_delete'),
    color: 'red' as const,
    isDefault: false,
  },
]);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const regularCount = computed(() => props.photos.filter((p) => !p.isEvidence).length);
const evidenceCount = computed(() => props.photos.filter((p) => p.isEvidence).length);
const totalCount = computed(() => props.photos.length);

const onSubmit = () => {
  emit('confirm', { evidenceAction: evidenceAction.value });
  dialogVisible.value = false;
};

const onCancel = () => {
  dialogVisible.value = false;
};
</script>
