<template>
  <nav class="flex flex-col gap-5">
    <div v-for="node in menuList" :key="`menu-group-${node.group}`" class="flex flex-col gap-1">
      <div v-show="showGroupTitle" :class="groupTitleClassComputed">
        {{ node.group }}
      </div>
      <div v-for="item in node.items" :key="`menu-item-${item.label}`" class="flex flex-col gap-1">
        <router-link
          :to="item.route"
          :class="[
            linkClassComputed,
            isItemActive(item) ? 'router-link-active router-link-exact-active' : '',
          ]"
          class="relative"
          @click="$emit('item-click')"
          @mouseenter="handleNavHover(item.label)"
          @mouseleave="hoveredNavItem = null"
        >
          <div class="flex items-center gap-2">
            <span
              class="icon-hover icon-mask"
              :style="{
                WebkitMaskImage: `url(${getIconUrl(item.icon)})`,
                maskImage: `url(${getIconUrl(item.icon)})`,
                backgroundColor: isDarkMode
                  ? 'var(--color-dark-primary-text)'
                  : 'var(--color-primary-text)',
              }"
              :aria-label="`${item.name}-Icon`"
              role="img"
            />
          </div>
          <span v-show="labelVisible" class="text-color-difference ml-3 text-sm font-medium">{{
            item.label
          }}</span>
          <Tooltip
            v-if="!labelVisible"
            :text="item.label"
            :visible="hoveredNavItem === item.label"
            position="right"
          />
        </router-link>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, inject, ref, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import Tooltip from '@/components/ui/Tooltip.vue';
import { MENU } from '@/constants/menu';
import { type Menu, type MenuItem, NavVariant } from '@/types/layout';
import { getIconUrl } from '@/utils/assetUrl';

const props = defineProps<{
  isSidebarCollapsed?: boolean;
  variant?: NavVariant;
  linkClass?: string;
  labelClass?: string;
  groupTitleClass?: string;
}>();
defineEmits<{ (e: 'item-click'): void }>();
const { t } = useI18n();
const isDarkMode = inject('isDarkMode') as Ref<boolean>;
const route = useRoute();

const menuList = computed<Menu[]>(() =>
  MENU.map((node) => ({
    ...node,
    group: t(node.group),
    items: node.items.map((item) => ({
      ...item,
      label: t(`nav.menu.${item.name}`),
    })),
  }))
);

const hoveredNavItem = ref<string | null>(null);

const isCollapsed = computed(() => !props.isSidebarCollapsed);
const variant = computed(() => props.variant ?? NavVariant.SIDEBAR);

const showGroupTitle = computed(() =>
  variant.value === NavVariant.MOBILE ? true : isCollapsed.value
);

const linkClassComputed = computed(
  () =>
    props.linkClass ??
    (variant.value === NavVariant.SIDEBAR
      ? `sidebar-nav-link ${props.isSidebarCollapsed ? 'justify-center' : ''}`
      : 'dark:hover:bg-black-700 flex items-center rounded-lg px-3 py-2 transition-colors duration-200 hover:bg-black-100')
);

const groupTitleClassComputed = computed(
  () => props.groupTitleClass ?? 'px-3 text-xs text200-color-difference'
);

const labelVisible = computed(() =>
  variant.value === NavVariant.MOBILE ? true : isCollapsed.value
);

const handleNavHover = (label: string) => {
  if (labelVisible.value) {
    hoveredNavItem.value = null;
    return;
  }
  hoveredNavItem.value = label;
};

// Configurable active detection using item.route and optional item.activePrefixes
const isItemActive = (item: MenuItem) => {
  const path = route.path;
  const base = item.route;
  // Match base route or any sub-paths
  if (path === base || path.startsWith(base + '/')) return true;

  // Match any configured activePrefixes
  if (item.activePrefixes && item.activePrefixes.length) {
    for (const prefix of item.activePrefixes) {
      if (path === prefix || path.startsWith(prefix + '/')) return true;
    }
  }
  return false;
};
</script>

<style></style>
