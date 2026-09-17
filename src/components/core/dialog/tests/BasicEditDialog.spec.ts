import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

import BasicEditDialog from '../BasicEditDialog.vue';

const mockIsMobile = { value: false };

vi.mock('@/composables/ui/useResponsiveWidth', () => ({
  useResponsiveWidth: () => ({
    isMobile: mockIsMobile,
  }),
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

const ElDialogStub = defineComponent({
  name: 'ElDialog',
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    width: {
      type: String,
      required: false,
    },
    title: {
      type: String,
      required: false,
    },
  },
  emits: ['update:modelValue', 'close'],
  setup(props, { slots }) {
    return () =>
      h(
        'div',
        {
          class: 'el-dialog',
          'data-visible': props.modelValue ? 'true' : 'false',
          'data-width': props.width,
          'data-title': props.title,
        },
        slots.default ? slots.default() : []
      );
  },
});

const ElFormStub = defineComponent({
  name: 'ElForm',
  setup(_props, { slots }) {
    return () =>
      h(
        'form',
        {
          class: 'el-form',
          onSubmit: (event: Event) => event.preventDefault(),
        },
        slots.default ? slots.default() : []
      );
  },
});

const ElAlertStub = defineComponent({
  name: 'ElAlert',
  props: {
    title: {
      type: String,
      required: false,
    },
  },
  setup(props) {
    return () =>
      h(
        'div',
        {
          class: 'el-alert',
          'data-title': props.title ?? '',
        },
        props.title ?? ''
      );
  },
});

const TextButtonStub = defineComponent({
  name: 'TextButton',
  props: {
    variant: {
      type: String,
      required: false,
    },
    loading: {
      type: Boolean,
      required: false,
      default: false,
    },
    disabled: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  emits: ['click'],
  setup(props, { slots, emit }) {
    return () =>
      h(
        'button',
        {
          class: ['text-button', props.variant].filter(Boolean),
          'data-variant': props.variant,
          'data-loading': props.loading ? 'true' : 'false',
          disabled: props.disabled,
          onClick: (event: Event) => emit('click', event),
        },
        slots.default ? slots.default() : []
      );
  },
});

const mountDialog = (props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) =>
  mount(BasicEditDialog, {
    props: {
      modelValue: true,
      title: 'Edit dialog',
      ...props,
    },
    slots: {
      default: () => h('div', { class: 'form-slot' }, 'Form content'),
      ...slots,
    },
    global: {
      stubs: {
        ElDialog: ElDialogStub,
        ElForm: ElFormStub,
        ElAlert: ElAlertStub,
        TextButton: TextButtonStub,
      },
    },
  });

describe('BasicEditDialog.vue', () => {
  beforeEach(() => {
    mockIsMobile.value = false;
  });

  it('emits submit and cancel events when default footer buttons are clicked', async () => {
    const wrapper = mountDialog();

    const cancelButton = wrapper.find('button[data-variant="outline"]');
    expect(cancelButton.exists()).toBe(true);
    await cancelButton.trigger('click');

    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);

    const submitButton = wrapper.find('button[data-variant="secondary"]');
    expect(submitButton.exists()).toBe(true);
    await submitButton.trigger('click');

    expect(wrapper.emitted('submit')).toHaveLength(1);
  });

  it('passes the correct width to ElDialog on desktop', () => {
    const wrapper = mountDialog();
    const dialog = wrapper.find('.el-dialog');

    expect(dialog.attributes('data-width')).toBe('500px');
  });

  it('uses mobile width when responsive composable reports mobile viewport', () => {
    mockIsMobile.value = true;

    const wrapper = mountDialog();
    const dialog = wrapper.find('.el-dialog');

    expect(dialog.attributes('data-width')).toBe('80vw');
  });

  it('shows an error alert when errorMessage is provided', () => {
    const wrapper = mountDialog({ errorMessage: 'Something went wrong' });

    const alert = wrapper.find('.el-alert');
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toBe('Something went wrong');
  });

  it('renders custom footer content when footer slot is provided', async () => {
    const wrapper = mountDialog(
      { showFooterButton: true },
      {
        'footer-left': () => h('span', { class: 'footer-left-content' }, 'Left'),
        footer: ({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: () => void }) =>
          h('div', { class: 'custom-footer' }, [
            h(
              'button',
              {
                class: 'custom-cancel',
                onClick: onCancel,
              },
              'Cancel'
            ),
            h(
              'button',
              {
                class: 'custom-submit',
                onClick: onSubmit,
              },
              'Submit'
            ),
          ]),
      }
    );

    expect(wrapper.findAll('.text-button')).toHaveLength(0);
    expect(wrapper.find('.footer-left-content').exists()).toBe(true);

    await wrapper.find('button.custom-submit').trigger('click');
    expect(wrapper.emitted('submit')).toHaveLength(1);

    await wrapper.find('button.custom-cancel').trigger('click');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });

  it('hides the footer slot when showFooterButton is false', () => {
    const wrapper = mountDialog(
      { showFooterButton: false },
      {
        footer: () => h('div', { class: 'custom-footer' }, 'Footer'),
      }
    );

    expect(wrapper.find('.custom-footer').exists()).toBe(false);
    expect(wrapper.findAll('.text-button')).toHaveLength(0);
  });
});
