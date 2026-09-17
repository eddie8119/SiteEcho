import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';

import CollapsibleSection from '../CollapsibleSection.vue';

const stubbedCollapseButton = {
  template: '<button data-test="collapse-button" @click="$emit(\'click\')"><slot /></button>',
};

describe('CollapsibleSection', () => {
  const mountOptions = (props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) =>
    mount(CollapsibleSection, {
      props,
      slots: { default: '<div data-test="slot">content</div>', ...slots },
      global: {
        stubs: {
          CollapseButton: stubbedCollapseButton,
        },
      },
    });

  it('renders slot content when not collapsed by default', () => {
    const wrapper = mountOptions();
    expect(wrapper.find('[data-test="slot"]').exists()).toBe(true);
  });

  it('hides content when defaultCollapsed is true', () => {
    const wrapper = mountOptions({ defaultCollapsed: true });
    expect(wrapper.find('[data-test="slot"]').isVisible()).toBe(false);
  });

  it('shows toggle when showToggle is true and emits on click', async () => {
    const wrapper = mountOptions({
      defaultCollapsed: true,
      showToggle: true,
      expandText: 'Expand',
      collapseText: 'Collapse',
    });

    const btn = wrapper.find('[data-test="collapse-button"]');
    expect(btn.exists()).toBe(true);

    await btn.trigger('click');
    await nextTick();
    const emits1 = wrapper.emitted('change');
    expect(emits1 && emits1.length >= 1).toBe(true);
  });

  it('emits change event when toggled', async () => {
    const wrapper = mountOptions({ defaultCollapsed: true, showToggle: true });
    const btn = wrapper.find('[data-test="collapse-button"]');

    await btn.trigger('click');
    await nextTick();
    await btn.trigger('click');
    await nextTick();

    const emits = wrapper.emitted('change');
    expect(emits).toBeTruthy();
    // Should have emitted at least once with boolean payload
    expect((emits?.length ?? 0) >= 1).toBe(true);
    expect(typeof emits?.[0]?.[0]).toBe('boolean');
  });

  it('renders itemsCount when provided', () => {
    const wrapper = mountOptions({ showToggle: true, itemsCount: 12 });
    expect(wrapper.text()).toContain('(12)');
  });

  it('shows expand/collapse text per prop state (without click)', async () => {
    const wrapper = mountOptions({
      defaultCollapsed: true,
      showToggle: true,
      expandText: '展開',
      collapseText: '摺疊',
    });
    const btn = wrapper.find('[data-test="collapse-button"]');
    expect(btn.text()).toContain('展開');

    await wrapper.setProps({ defaultCollapsed: false });
    await nextTick();
    expect(btn.text()).toContain('摺疊');
  });
});
