<template>
  <div class="mt-4 shrink-0 space-y-3">
    <!-- Grand total bar and copy button (billing only) -->
    <div
      v-if="purpose === 'billing' && grandTotal > 0"
      class="mb-1 flex items-center justify-between"
    >
      <TextButton variant="ghost" size="md" @click="emit('copy-billing')">
        {{
          copySuccess
            ? $t('report.generationSheet.copySuccess')
            : $t('report.generationSheet.copyBilling')
        }}
      </TextButton>
      <div class="flex items-center gap-2 px-4">
        <span class="text-sm font-medium text-gray-600">{{
          $t('report.generationSheet.totalAmount')
        }}</span>
        <span class="text-lg font-bold text-orange-600">${{ formatAmount(grandTotal) }}</span>
      </div>
    </div>

    <!-- Copy billing content (billing only, when grandTotal is 0) -->
    <div v-if="purpose === 'billing' && grandTotal === 0" class="flex justify-end">
      <TextButton variant="ghost" size="md" @click="emit('copy-billing')">
        {{
          copySuccess
            ? $t('report.generationSheet.copySuccess')
            : $t('report.generationSheet.copyBilling')
        }}
      </TextButton>
    </div>

    <!-- Download -->
    <TextButton
      variant="primary"
      size="lg"
      full-width
      :disabled="!purpose || (purpose === 'billing' && !isBillingComplete)"
      @click="emit('download')"
    >
      <img
        src="@/assets/icons/Download.png"
        alt="Download"
        class="mr-1 h-5 w-5 brightness-0 invert"
      />
      {{
        exportFormat === 'pdf'
          ? $t('report.generationSheet.downloadPdf')
          : $t('report.generationSheet.downloadWord')
      }}
    </TextButton>
  </div>
</template>

<script setup lang="ts">
import TextButton from '@/components/core/button/TextButton.vue';
import { Purpose } from '@/types/report';

defineProps<{
  purpose: Purpose | null;
  exportFormat: 'pdf' | 'word';
  grandTotal: number;
  isBillingComplete: boolean;
  copySuccess: boolean;
}>();

const emit = defineEmits<{
  'copy-billing': [];
  download: [];
}>();

const formatAmount = (amount: number): string => amount.toLocaleString('zh-TW');
</script>
