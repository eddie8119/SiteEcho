<template>
  <!-- 背景遮罩 -->
  <div
    v-show="modelValue"
    class="bg-black/60 fixed inset-0 z-[60] backdrop-blur-sm transition-opacity duration-300"
    @click="emit('update:modelValue', false)"
  />

  <Teleport to="body">
    <Transition name="sheet-slide">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[70] flex items-end justify-center"
        @click.self="emit('update:modelValue', false)"
      >
        <!-- Sheet Content -->
        <div class="panel-color-difference relative z-10 w-full rounded-t-2xl p-3 shadow-lg">
          <!-- Stage 1: Ask if want to record -->
          <div v-if="stage === 'ask'" class="flex flex-col gap-4">
            <div class="flex items-center gap-2 text-green-600">
              <span class="text-lg">{{ t('share.shared_status') }}</span>
            </div>
            <p class="text-gray-600">{{ t('share.ask_stage.question') }}</p>

            <div class="flex gap-2">
              <GroupButton
                v-for="btn in roleButtons"
                :key="btn.label"
                :color-class="btn.class"
                @click="btn.action"
              >
                {{ btn.label }}
              </GroupButton>
            </div>
          </div>

          <!-- Stage 2: Selection Target -->
          <div v-else-if="stage === 'select'" class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">{{ t('share.select_stage.title') }}</h3>
              <button class="text-gray-400" @click="stage = 'ask'">
                {{ t('share.select_stage.back') }}
              </button>
            </div>

            <div v-if="recentTargets.length > 0" class="flex flex-col gap-2">
              <p class="text-xs font-medium uppercase text-gray-400">
                {{ t('share.select_stage.recent') }}
              </p>
              <button
                v-for="(target, index) in filteredRecentTargets"
                :key="index"
                class="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 active:bg-gray-100"
                @click="handleQuickSelect(target)"
              >
                <div class="flex items-center gap-2">
                  <span v-if="target.trade" class="text-sm text-gray-500">
                    {{ target.trade }}｜
                  </span>
                  <span class="font-medium">{{ target.displayName }}</span>
                </div>
                <span class="text-brand-primary">{{ t('share.select_stage.quick_select') }}</span>
              </button>
            </div>

            <button
              class="mt-2 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-4 text-gray-500 active:bg-gray-50"
              @click="stage = 'add'"
            >
              <span>+</span>
              <span>{{ addButtonText }}</span>
            </button>
          </div>

          <!-- Stage 3: Add New Target -->
          <div v-else-if="stage === 'add'" class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">{{ addButtonText }}</h3>
              <button class="text-gray-400" @click="handleAddBack">
                {{ t('share.add_stage.back') }}
              </button>
            </div>

            <div class="space-y-4">
              <div v-if="selectedRole === PhotoShareRole.WORKER">
                <label class="mb-1 block text-sm font-medium text-gray-500">{{
                  t('share.add_stage.trade_label')
                }}</label>
                <SelfGrowingDropdown
                  v-model="selectedTradeId"
                  :options="constructionsOptions"
                  type="construction"
                  :placeholder="t('share.add_stage.trade_placeholder')"
                  :show-add-input="false"
                  :show-manage-button="false"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-500">{{
                  t('share.add_stage.name_label')
                }}</label>
                <ElInput
                  v-model="newTarget.displayName"
                  :placeholder="
                    selectedRole === PhotoShareRole.WORKER
                      ? t('share.add_stage.name_placeholder_worker')
                      : t('share.add_stage.name_placeholder_owner')
                  "
                />
              </div>
            </div>

            <TextButton
              variant="primary"
              full-width
              class="mt-4"
              :disabled="!newTarget.displayName"
              @click="handleAddNew"
            >
              {{ t('share.add_stage.confirm_record') }}
            </TextButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ElInput } from 'element-plus';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import type { ConstructionOption } from '@/types/photo';

import GroupButton from '@/components/core/button/GroupButton.vue';
import TextButton from '@/components/core/button/TextButton.vue';
import SelfGrowingDropdown from '@/components/core/dropdown/SelfGrowingDropdown.vue';
import { useShareRecord } from '@/composables/timeline/useShareRecord';
import { DEFAULT_CONSTRUCTION_OPTIONS } from '@/constants/material';
import { PhotoShareRole, type ShareTarget } from '@/types/photo';

const props = defineProps<{
  modelValue: boolean;
  photoIds: string[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'record-complete': [target: ShareTarget];
}>();

const { t } = useI18n();
const { recentTargets, recordShare } = useShareRecord();

type Stage = 'ask' | 'select' | 'add';
const stage = ref<Stage>('ask');
const selectedRole = ref<PhotoShareRole>(PhotoShareRole.WORKER);

const constructionsOptions = ref<ConstructionOption[]>([]);
const selectedTradeId = ref<string | null>(null);

const newTarget = ref<Partial<ShareTarget>>({
  trade: '',
  displayName: '',
});

interface RoleButton {
  label: string;
  class: string;
  action: () => void;
}

const roleButtons: RoleButton[] = [
  {
    label: t('share.role_buttons.worker'),
    class: 'text-brand-primary',
    action: () => handleSelectRole(PhotoShareRole.WORKER),
  },
  {
    label: t('share.role_buttons.owner'),
    class: 'text-brand-primary',
    action: () => handleSelectRole(PhotoShareRole.OWNER),
  },
  // {
  //   label: '同事',
  //   class: 'text-purple-600',
  //   action: () => handleSelectRole(PhotoShareRole.COLLEAGUE),
  // },
  {
    label: t('share.role_buttons.no_record'),
    class: 'text-brand-primary',
    action: () => emit('update:modelValue', false),
  },
];

const filteredRecentTargets = computed(() => {
  return recentTargets.value.filter((t) => t.role === selectedRole.value);
});

const addButtonText = computed(() => {
  return selectedRole.value === PhotoShareRole.WORKER
    ? t('share.add_stage.add_worker_target')
    : t('share.add_stage.add_owner_target');
});

// Initialize options from localStorage
const initializeOptions = () => {
  const savedConstructions = localStorage.getItem('constructionsOptions');
  if (savedConstructions) {
    constructionsOptions.value = JSON.parse(savedConstructions);
  } else {
    constructionsOptions.value = DEFAULT_CONSTRUCTION_OPTIONS;
  }
};

onMounted(() => {
  initializeOptions();
});

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      stage.value = 'ask';
      selectedTradeId.value = null;
      newTarget.value = { trade: '', displayName: '' };
    }
  }
);

// Update newTarget.trade when selectedTradeId changes
watch(selectedTradeId, (id) => {
  if (id) {
    const selected = constructionsOptions.value.find((c) => c.id === id);
    newTarget.value.trade = selected?.name || '';
  } else {
    newTarget.value.trade = '';
  }
});

const handleSelectRole = (role: PhotoShareRole) => {
  selectedRole.value = role;
  if (filteredRecentTargets.value.length > 0) {
    stage.value = 'select';
  } else {
    stage.value = 'add';
  }
};

const handleQuickSelect = async (target: ShareTarget) => {
  await recordShare(props.photoIds, target);
  emit('record-complete', target);
  emit('update:modelValue', false);
};

const handleAddNew = async () => {
  if (!newTarget.value.displayName) return;

  const target: ShareTarget = {
    role: selectedRole.value,
    trade: newTarget.value.trade || undefined,
    displayName: newTarget.value.displayName,
  };

  await recordShare(props.photoIds, target);
  emit('record-complete', target);
  emit('update:modelValue', false);
};

const handleAddBack = () => {
  if (filteredRecentTargets.value.length > 0) {
    stage.value = 'select';
  } else {
    stage.value = 'ask';
  }
};
</script>

<style scoped>
.sheet-slide-enter-active,
.sheet-slide-leave-active {
  transition: opacity 0.3s ease;
}

.sheet-slide-enter-from,
.sheet-slide-leave-to {
  opacity: 0;
}

.sheet-slide-enter-active .relative,
.sheet-slide-leave-active .relative {
  transition: transform 0.3s ease;
}

.sheet-slide-enter-from .relative,
.sheet-slide-leave-to .relative {
  transform: translateY(100%);
}
</style>
