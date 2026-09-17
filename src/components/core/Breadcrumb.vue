<template>
  <ElBreadcrumb v-if="shouldShowBreadcrumb" separator="›">
    <ElBreadcrumbItem v-for="(segment, index) in breadcrumbSegments" :key="index" :to="segment.to">
      {{ segment.label }}
    </ElBreadcrumbItem>
  </ElBreadcrumb>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

const { t } = useI18n();
const route = useRoute();

const shouldShowBreadcrumb = computed(() => {
  const path = route.path;
  // Hide breadcrumb for /app/todo/projects route
  return path !== '/app/todo/projects';
});

const breadcrumbSegments = computed(() => {
  const segments = route.path.split('/').filter((segment) => segment);
  const breadcrumbs: Array<{ label: string; to?: string }> = [];

  // Handle todo routes
  if (segments[0] === 'app' && segments[1] === 'todo') {
    // Main todo page
    breadcrumbs.push({
      label: t('title.todo'),
      to: '/app/todo',
    });

    // Projects page
    if (segments[2] === 'projects') {
      breadcrumbs.push({
        label: t('tab.projects'),
        to: '/app/todo/projects',
      });
    }

    // Floor plan detail page
    if (segments[2] === 'plan' && segments[3]) {
      breadcrumbs.push({
        label: t('tab.floor-plan'),
        to: `/app/todo/plan/${segments[3]}`,
      });
    }

    // Project detail page
    if (segments[2] === 'project' && segments[3]) {
      breadcrumbs.push({
        label: t('tab.project'),
        to: `/app/todo/project/${segments[3]}`,
      });
    }
  }

  return breadcrumbs;
});
</script>

<style scoped>
:deep(.el-breadcrumb__item) {
  .el-breadcrumb__inner {
    color: var(--color-primary-text-200);
  }

  .el-breadcrumb__inner.is-link {
    color: var(--color-primary-text-200);

    &:hover {
      color: var(--color-primary-chart);
    }
  }

  &:last-child .el-breadcrumb__inner {
    color: var(--color-primary-text);
    font-weight: 500;

    &:hover {
      color: var(--color-primary-text);
    }
  }
}

/* Dark mode support */
html.dark :deep(.el-breadcrumb__item) {
  .el-breadcrumb__inner {
    color: var(--color-dark-primary-text-200);
  }

  .el-breadcrumb__inner.is-link {
    color: var(--color-dark-primary-text-200);

    &:hover {
      color: var(--color-brand-secondary);
    }
  }

  &:last-child .el-breadcrumb__inner {
    color: var(--color-dark-primary-text);

    &:hover {
      color: var(--color-dark-primary-text);
    }
  }
}
</style>
