<template>
  <div v-for="nav in props.navItems" :key="nav.id" class="flex items-center">
    <!-- 下拉選項 -->
    <ElDropdown
      v-if="nav.dropdownItems"
      :trigger="'click'"
      @command="(command) => nav.action(command)"
    >
      <button class="flex items-center">
        <span
          class="icon-hover icon-mask"
          :style="{
            WebkitMaskImage: `url(${getIconUrl(nav.icon)})`,
            maskImage: `url(${getIconUrl(nav.icon)})`,
            backgroundColor: isDarkMode
              ? 'var(--color-dark-primary-text)'
              : 'var(--color-primary-text)',
          }"
          :aria-label="`${nav.name}-Icon`"
          role="img"
        />
      </button>
      <template #dropdown>
        <ElDropdownMenu>
          <ElDropdownItem v-for="item in nav.dropdownItems" :key="item.value" :command="item.value">
            {{ item.label }}
          </ElDropdownItem>
        </ElDropdownMenu>
      </template>
    </ElDropdown>
    <!-- 沒有下拉選項 -->
    <button v-else type="button" class="flex items-center" @click="nav.action && nav.action('')">
      <span
        class="icon-hover icon-mask"
        :style="{
          WebkitMaskImage: `url(${getIconUrl(nav.icon)})`,
          maskImage: `url(${getIconUrl(nav.icon)})`,
          backgroundColor: isDarkMode
            ? 'var(--color-dark-primary-text)'
            : 'var(--color-primary-text)',
        }"
        :aria-label="`${nav.name}-Icon`"
        role="img"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ElDropdown, ElDropdownItem, ElDropdownMenu } from 'element-plus';
import { inject, ref, type Ref } from 'vue';

import type { NavItem } from '@/types/layout';

import { getIconUrl } from '@/utils/assetUrl';

const props = defineProps<{
  navItems: NavItem[];
}>();

const isDarkMode = inject<Ref<boolean> | null>('isDarkMode', ref(false));
</script>

<style lang="scss" scoped></style>
