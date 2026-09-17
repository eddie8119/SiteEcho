<template>
  <div class="group flex cursor-pointer gap-3" @click="emit('click')">
    <div class="relative aspect-square w-24 shrink-0 overflow-hidden rounded-lg">
      <img :src="thumbnailUrl" class="h-full w-full object-cover" />
      <!-- Hint Badge (Top Right) -->
      <div
        v-if="!isEditing && (!reportNote || !note)"
        class="bg-black/60 absolute right-1 top-1 rounded-full px-2 py-0.5 text-[9px] font-medium text-white"
      >
        {{
          reportNote
            ? $t('report.photoGridItem.editNote')
            : $t('report.generationSheet.clickPhotoToAddNote')
        }}
      </div>
      <!-- Edit Overlay on Hover -->
      <div
        class="bg-black/30 absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
      >
        <span class="rounded-full bg-white/90 px-2 py-1 text-[10px] font-medium text-gray-700">
          {{ $t('report.photoGridItem.addDescription') }}
        </span>
      </div>
    </div>
    <!-- Note Preview -->
    <div class="flex-1 py-1">
      <div v-if="reportNote || note" class="space-y-0.5">
        <div class="text-[10px] text-gray-400">
          {{
            reportNote
              ? $t('report.photoGridItem.customized')
              : note
                ? $t('report.photoGridItem.fromNote')
                : ''
          }}
        </div>
        <div class="line-clamp-3 text-sm text-gray-600">
          {{ reportNote || note }}
        </div>
      </div>
      <div v-else class="text-sm text-gray-400">{{ $t('report.photoGridItem.noNote') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  thumbnailUrl: string;
  reportNote?: string;
  note?: string;
  isEditing?: boolean;
}>();

const emit = defineEmits<{
  click: [];
}>();
</script>
