<template>
  <button
    class="rounded-xl capitalize"
    :class="buttonClasses"
    :disabled="props.loading || props.disabled"
  >
    <div v-if="props.loading" class="flex items-center">
      <svg class="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
    <span v-if="props.icon" class="mr-2">
      <slot name="icon">{{ props.icon }}</slot>
    </span>
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'quick';
type ButtonSize = 'sm' | 'md' | 'lg';

interface Props {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: string;
}

const props = defineProps<Props>();

const buttonClasses = computed(() => {
  const baseStyles = 'inline-flex items-center justify-center transition-all duration-200 border';

  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-brand-primary text-primaryDark-text hover:bg-brand-secondary border-transparent ',
    secondary: 'bg-secondary-purple-a border-transparent text-gray-800 hover:bg-gray-300',
    outline:
      'bg-transparent text-secondary-red hover:bg-secondary-red hover:text-white border-transparent',
    ghost: 'bg-transparent text-brand-primary hover:bg-brand-primary/10',
    quick:
      'bg-brand-tertiary text-black-900 hover:bg-black-100 border-transparent hover:border-primary-border',
  };

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-3 py-2 text-base',
    lg: 'px-5 py-3 text-lg',
  };

  return [
    baseStyles,
    variantStyles[props.variant || 'primary'],
    sizeStyles[props.size || 'md'],
    props.fullWidth ? 'w-full' : '',
    props.loading ? 'opacity-50 cursor-not-allowed' : '',
  ].join(' ');
});
</script>

<style lang="scss" scoped>
button:disabled {
  cursor: not-allowed !important;
  opacity: 0.5;
  background-color: #e5e7eb !important; /* gray-200 */
  color: #a1a1aa !important; /* gray-400 */
  pointer-events: auto; /* 確保游標可變化 */
}

button {
  outline: none;

  // 強制顯示邊框
  &.border {
    border-style: solid !important;
    border-width: 1px !important;
  }
}
</style>
