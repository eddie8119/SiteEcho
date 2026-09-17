import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

import CreateProjectTypeDialog from '../CreateProjectTypeDialog.vue';

const { BasicEditDialogStub } = vi.hoisted(() => {
  const { defineComponent, h } = require('vue');

  const BasicEditDialogStub = defineComponent({
    name: 'BasicEditDialogStub',
    props: {
      modelValue: { type: Boolean, required: true },
      title: { type: String, required: false },
    },
    emits: ['update:modelValue', 'submit', 'cancel'],
    setup(
      props: { modelValue: boolean; title?: string },
      {
        slots,
        emit,
      }: { slots: { default?: () => unknown[] }; emit: (event: string, ...args: unknown[]) => void }
    ) {
      return () =>
        h(
          'div',
          {
            class: 'basic-edit-dialog-stub',
            'data-model-value': props.modelValue ? 'true' : 'false',
            'data-title': props.title ?? '',
          },
          [
            h('button', { class: 'submit-btn', onClick: () => emit('submit') }, 'submit'),
            h('button', { class: 'cancel-btn', onClick: () => emit('cancel') }, 'cancel'),
            ...(slots.default ? slots.default() : []),
          ]
        );
    },
  });

  return { BasicEditDialogStub };
});

vi.mock('@/components/core/dialog/BasicEditDialog.vue', () => ({
  default: BasicEditDialogStub,
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/constants/selection', () => {
  const projectTypes = [{ value: 'residential' }, { value: 'commercial' }];
  return {
    PROJECT_TYPES: projectTypes,
    PROJECT_TYPE_VALUES: projectTypes.map((t) => t.value),
  };
});

const ElFormItemStub = defineComponent({
  name: 'ElFormItemStub',
  setup(_props: unknown, { slots }) {
    return () => h('div', { class: 'el-form-item-stub' }, slots.default ? slots.default() : []);
  },
});

const ElSelectStub = defineComponent({
  name: 'ElSelectStub',
  props: {
    modelValue: { type: [String, Array, Object], default: null },
  },
  emits: ['update:modelValue'],
  setup(
    props: { modelValue: unknown },
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      slots,
    }: { slots: { default?: () => any[] } }
  ) {
    // 測試時可透過 wrapper.findComponent(ElSelectStub).vm.$emit('update:modelValue', value)
    return () =>
      h(
        'div',
        { class: 'el-select-stub', 'data-value': String(props.modelValue) },
        // cast children to any to satisfy vue-tsc in this test stub
        (slots.default ? slots.default() : []) as any
      );
  },
});

const ElOptionStub = defineComponent({
  name: 'ElOptionStub',
  setup(_props, { slots }) {
    return () => h('div', { class: 'el-option-stub' }, slots.default ? slots.default() : []);
  },
});

describe('CreateProjectTypeDialog.vue', () => {
  const createWrapper = (modelValue = true) =>
    mount(CreateProjectTypeDialog, {
      props: { modelValue },
      global: {
        stubs: {
          ElFormItem: ElFormItemStub,
          ElSelect: ElSelectStub,
          ElOption: ElOptionStub,
        },
      },
    });

  it('passes dialog title and v-model to BasicEditDialog', () => {
    const wrapper = createWrapper(true);
    const dialog = wrapper.findComponent(BasicEditDialogStub);

    expect(dialog.exists()).toBe(true);
    expect(dialog.attributes('data-title')).toBe('title.create_project');
    expect(dialog.attributes('data-model-value')).toBe('true');
  });

  it('defaults project type to residential and emits update on submit', async () => {
    const wrapper = createWrapper(true);

    // 直接觸發提交事件
    await wrapper.findComponent(BasicEditDialogStub).vm.$emit('submit');

    // 應先發出 update:projectType
    expect(wrapper.emitted('update:projectType')?.[0]).toEqual(['residential']);
    // 並關閉對話框
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
  });

  it('emits selected project type when changed then submitted', async () => {
    const wrapper = createWrapper(true);

    // 模擬選單變更為 commercial
    const select = wrapper.findComponent(ElSelectStub);
    await select.vm.$emit('update:modelValue', 'commercial');

    // 觸發提交
    await wrapper.findComponent(BasicEditDialogStub).vm.$emit('submit');

    expect(wrapper.emitted('update:projectType')?.[0]).toEqual(['commercial']);
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
  });

  it('closes dialog when cancel is triggered', async () => {
    const wrapper = createWrapper(true);

    await wrapper.findComponent(BasicEditDialogStub).vm.$emit('cancel');

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
  });
});
