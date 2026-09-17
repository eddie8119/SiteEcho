import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, type PropType } from 'vue';

import RightPanel from '../RightPanel.vue';

import type { NavItem } from '@/types/layout';

vi.mock('../HeaderNavActions.vue', () => {
  const HeaderNavActionsStub = defineComponent({
    name: 'HeaderNavActionsStub',
    props: {
      navItems: {
        type: Array as PropType<NavItem[]>,
        required: true,
      },
    },
    setup(props) {
      return () =>
        h(
          'div',
          props.navItems.map((nav) => {
            const navChildren = [
              h(
                'button',
                {
                  class: 'nav-button',
                  'data-nav-name': nav.name,
                  onClick: () => nav.action && nav.action(''),
                },
                [
                  h('span', {
                    class: 'icon',
                    'aria-label': `${nav.name}-Icon`,
                  }),
                ]
              ),
            ];

            if (nav.dropdownItems) {
              navChildren.push(
                h(
                  'div',
                  { class: 'dropdown' },
                  nav.dropdownItems.map((item) =>
                    h(
                      'span',
                      {
                        class: 'dropdown-item',
                        key: item.value,
                      },
                      `dropdown.${item.label}`
                    )
                  )
                )
              );
            }

            return h('div', { class: 'nav-item', key: nav.id }, navChildren);
          })
        );
    },
  });

  return {
    default: HeaderNavActionsStub,
  };
});

// Mock dependencies
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    isAdmin: false,
  }),
}));

vi.mock('@/composables/useAuthentication', () => ({
  useAuthentication: () => ({
    authentications: [{ label: 'Logout', code: 'logout' }],
    handleAuthenticationChange: vi.fn(),
  }),
}));

vi.mock('@/composables/useLocale', () => ({
  useLocale: () => ({
    languages: [{ label: 'English', code: 'en' }],
    handleLanguageChange: vi.fn(),
  }),
}));

const mockAuthStore = {
  isAuthenticated: false,
};

const toggleThemeMock = vi.fn();

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => mockAuthStore,
}));

describe('RightPanel.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockAuthStore.isAuthenticated = false; // Reset before each test
    toggleThemeMock.mockClear();
  });

  const createWrapper = () => {
    return mount(RightPanel, {
      global: {
        provide: {
          toggleTheme: toggleThemeMock,
        },
        stubs: {
          ShowNowTime: true,
          MobileNav: true,
        },
      },
    });
  };

  it('renders two nav items when not authenticated', () => {
    const wrapper = createWrapper();
    const navButtons = wrapper.findAll('[data-nav-name]');
    expect(navButtons).toHaveLength(2);
    expect(navButtons[0].attributes('data-nav-name')).toBe('LightSet');
    expect(navButtons[1].attributes('data-nav-name')).toBe('Global');
  });

  it('renders authentication nav item when authenticated', () => {
    mockAuthStore.isAuthenticated = true;
    const wrapper = createWrapper();
    const navNames = wrapper
      .findAll('[data-nav-name]')
      .map((btn) => btn.attributes('data-nav-name'));
    expect(navNames).toContain('Authentication');
  });

  it('calls toggleTheme when LightSet nav is clicked', async () => {
    const wrapper = createWrapper();
    const lightSetButton = wrapper.find('[data-nav-name="LightSet"]');
    await lightSetButton.trigger('click');
    expect(toggleThemeMock).toHaveBeenCalledTimes(1);
  });

  it('passes language dropdown items to HeaderNavActions', () => {
    const wrapper = createWrapper();
    const navItems = wrapper
      .findComponent({ name: 'HeaderNavActionsStub' })
      .props('navItems') as NavItem[];
    const languageNav = navItems.find((nav) => nav.name === 'Global');
    expect(languageNav?.dropdownItems).toEqual([{ label: 'English', value: 'en' }]);
    const dropdownTexts = wrapper.findAll('.dropdown-item').map((item) => item.text());
    expect(dropdownTexts).toContain('dropdown.English');
  });
});
