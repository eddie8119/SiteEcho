import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

import TabProject from '../TabProject.vue';

const mockRoute = {
  path: '/app/planning/projects',
  name: 'planning-projects',
  params: {} as Record<string, string>,
};

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

const RouterLinkStub = defineComponent({
  name: 'RouterLinkStub',
  props: {
    to: {
      type: [String, Object],
      required: true,
    },
  },
  setup(props, { slots }) {
    return () =>
      h(
        'a',
        {
          'data-to': typeof props.to === 'string' ? props.to : JSON.stringify(props.to),
        },
        slots.default ? slots.default() : []
      );
  },
});

const setRoute = (routeOverrides: Partial<typeof mockRoute>) => {
  Object.assign(mockRoute, { params: {}, ...routeOverrides });
};

const createWrapper = (tabsList = [{ name: 'projects' }, { name: 'floor-plan' }]) =>
  mount(TabProject, {
    props: {
      subject: 'planning',
      tabsList,
    },
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
      },
    },
  });

describe('TabProject.vue', () => {
  beforeEach(() => {
    setRoute({
      path: '/app/planning/projects',
      name: 'planning-projects',
      params: {},
    });
  });

  it('renders tabs with translated labels and active state', () => {
    const wrapper = createWrapper();
    const links = wrapper.findAll('a');

    expect(links).toHaveLength(2);
    expect(links[0].text()).toBe('tab.projects');
    expect(links[0].classes()).toContain('font-medium');
    expect(links[1].classes()).toContain('text-black-400');
  });

  it('includes project id in route params when present', () => {
    setRoute({
      path: '/app/planning/projects/123',
      name: 'planning-project',
      params: { id: '123' },
    });

    const wrapper = createWrapper([{ name: 'project' }]);
    const link = wrapper.find('a');

    const dataTo = link.attributes('data-to');
    expect(dataTo).toBeDefined();
    expect(JSON.parse(dataTo as string)).toEqual({
      name: 'planning-project',
      params: { id: '123' },
    });
  });

  it('omits params when no project id is available', () => {
    const wrapper = createWrapper([{ name: 'projects' }]);
    const link = wrapper.find('a');

    const dataTo = link.attributes('data-to');
    expect(dataTo).toBeDefined();
    expect(JSON.parse(dataTo as string)).toEqual({
      name: 'planning-projects',
    });
  });
});
