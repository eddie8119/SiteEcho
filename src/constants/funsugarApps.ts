import { useI18n } from 'vue-i18n';

import { BRAND_LINK } from './link';

export function getFunsugarApps() {
  const { t } = useI18n();

  const apps = [
    {
      name: 'SiteNear',
      image: '/funsugar/SiteNear_logo.png',
      link: BRAND_LINK.SiteNearProduction,
      description: t('funsugar.more_apps.site_shot.description'),
    },
    {
      name: 'SiteNear',
      image: '/funsugar/SiteNear_logo.png',
      link: BRAND_LINK.SiteNearProduction,
      description: t('funsugar.more_apps.site_near.description'),
    },
    {
      name: 'Kaiji',
      image: '/funsugar/Kaiji_logo.png',
      link: BRAND_LINK.kaijiPlayground,
      description: t('funsugar.more_apps.kaiji.description'),
    },
  ];

  return { apps };
}
