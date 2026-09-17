import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { h } from 'vue';

import PillTab from '../PillTab.vue';

const BASE_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'files', label: 'Files' },
];

const createWrapper = (props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) =>
  mount(PillTab, {
    props: {
      modelValue: 'overview',
      tabs: BASE_TABS,
      ...props,
    },
    slots,
  });

describe('PillTab.vue', () => {
  it('renders tabs and marks the active one', () => {
    const wrapper = createWrapper();
    const buttons = wrapper.findAll('button');

    expect(buttons).toHaveLength(BASE_TABS.length);
    expect(buttons[0].classes()).toContain('is-active');
    expect(buttons[1].classes()).not.toContain('is-active');
    expect(buttons[0].attributes('aria-selected')).toBe('true');
    expect(buttons[1].attributes('aria-selected')).toBe('false');
  });

  it('emits update:modelValue when a new tab is clicked', async () => {
    const wrapper = createWrapper();
    const buttons = wrapper.findAll('button');

    await buttons[1].trigger('click');

    expect(wrapper.emitted('update:modelValue')).toEqual([['tasks']]);
  });

  it('shows label when showLabel is true', () => {
    const wrapper = createWrapper({
      showLabel: true,
      label: 'Tab Label',
    });

    const label = wrapper.find('label');
    expect(label.exists()).toBe(true);
    expect(label.text()).toBe('Tab Label');
  });

  it('renders custom slot content for each tab', () => {
    const wrapper = createWrapper(
      {},
      {
        item: ({ tab, index }: { tab: (typeof BASE_TABS)[number]; index: number }) =>
          h(
            'span',
            {
              class: 'custom-slot',
            },
            `${index}-${tab.label}`
          ),
      }
    );

    const customItems = wrapper.findAll('.custom-slot');
    expect(customItems).toHaveLength(BASE_TABS.length);
    expect(customItems[0].text()).toBe('0-Overview');
  });
});
