import type { RouteLocationNormalized, RouteRecordNormalized } from 'vue-router';

import i18n from '@/i18n';

const DEFAULT_TITLE_KEY = 'meta.defaults.title';
const DEFAULT_DESCRIPTION_KEY = 'meta.defaults.description';
const DEFAULT_OG_TITLE_KEY = 'meta.defaults.ogTitle';
const DEFAULT_OG_DESCRIPTION_KEY = 'meta.defaults.ogDescription';
const DEFAULT_OG_IMAGE_ALT_KEY = 'meta.defaults.ogImageAlt';
const DEFAULT_TWITTER_TITLE_KEY = 'meta.defaults.twitterTitle';
const DEFAULT_TWITTER_DESCRIPTION_KEY = 'meta.defaults.twitterDescription';

const getFallbackTitle = () => {
  const title = i18n.global.t('meta.defaults.title');
  return title === 'meta.defaults.title' ? 'SiteNear｜工地履歷相簿工具' : title;
};

const getFallbackDescription = () => {
  const desc = i18n.global.t('meta.defaults.description');
  return desc === 'meta.defaults.description'
    ? 'SiteNear 是專為室內設計、監工與施工團隊打造的工地履歷工具。拍照、標記、追蹤、修復與報告，讓每張工地照片不只找得到，還記得發生過什麼。'
    : desc;
};

const getFallbackOgTitle = () => {
  const title = i18n.global.t('meta.defaults.ogTitle');
  return title === 'meta.defaults.ogTitle' ? 'SiteNear｜讓工地照片記得工作' : title;
};

const getFallbackOgDescription = () => {
  const desc = i18n.global.t('meta.defaults.ogDescription');
  return desc === 'meta.defaults.ogDescription'
    ? '工地照片不再找半天。依空間與工項整理施工照片、追蹤問題與修復，快速產出施工報告。'
    : desc;
};

const getFallbackOgImageAlt = () => {
  const alt = i18n.global.t('meta.defaults.ogImageAlt');
  return alt === 'meta.defaults.ogImageAlt'
    ? 'SiteNear 工地相簿介面，展示施工照片、問題追蹤與修復紀錄'
    : alt;
};

const getFallbackTwitterTitle = () => {
  const title = i18n.global.t('meta.defaults.twitterTitle');
  return title === 'meta.defaults.twitterTitle' ? 'SiteNear｜讓工地照片記得工作' : title;
};

const getFallbackTwitterDescription = () => {
  const desc = i18n.global.t('meta.defaults.twitterDescription');
  return desc === 'meta.defaults.twitterDescription'
    ? '工地照片不再找半天。整理施工照片、追蹤問題與修復，快速產出施工報告。'
    : desc;
};

type SeoMetaKeys = {
  titleKey?: string;
  descriptionKey?: string;
  noindex?: boolean;
};

const getSeoMeta = (route?: RouteRecordNormalized) => route?.meta?.seo as SeoMetaKeys | undefined;

const resolveMetaText = (key: string | undefined, fallback: string) => {
  if (!key) return fallback;
  const translated = i18n.global.t(key);
  return translated === key ? fallback : (translated as string);
};

const ensureMetaTag = (name: string, content: string) => {
  if (typeof document === 'undefined') return;
  const selector = `meta[name="${name}"]`;
  let tag = document.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

const ensurePropertyMetaTag = (property: string, content: string) => {
  if (typeof document === 'undefined') return;
  const selector = `meta[property="${property}"]`;
  let tag = document.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('property', property);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

export const syncDocumentMeta = (to: RouteLocationNormalized) => {
  if (typeof document === 'undefined') return;
  const reversedMatches = [...to.matched].reverse();

  const defaultTitle = resolveMetaText(DEFAULT_TITLE_KEY, getFallbackTitle());
  const defaultDescription = resolveMetaText(DEFAULT_DESCRIPTION_KEY, getFallbackDescription());
  const defaultOgTitle = resolveMetaText(DEFAULT_OG_TITLE_KEY, getFallbackOgTitle());
  const defaultOgDescription = resolveMetaText(
    DEFAULT_OG_DESCRIPTION_KEY,
    getFallbackOgDescription()
  );
  const defaultOgImageAlt = resolveMetaText(DEFAULT_OG_IMAGE_ALT_KEY, getFallbackOgImageAlt());
  const defaultTwitterTitle = resolveMetaText(DEFAULT_TWITTER_TITLE_KEY, getFallbackTwitterTitle());
  const defaultTwitterDescription = resolveMetaText(
    DEFAULT_TWITTER_DESCRIPTION_KEY,
    getFallbackTwitterDescription()
  );

  const titleRoute = reversedMatches.find((route) => !!getSeoMeta(route)?.titleKey);
  const descriptionRoute = reversedMatches.find((route) => !!getSeoMeta(route)?.descriptionKey);
  const noindexRoute = reversedMatches.find((route) => !!getSeoMeta(route)?.noindex);

  const title = resolveMetaText(getSeoMeta(titleRoute)?.titleKey, defaultTitle);
  document.title = title;

  const description = resolveMetaText(
    getSeoMeta(descriptionRoute)?.descriptionKey,
    defaultDescription
  );
  ensureMetaTag('description', description);

  // Handle noindex
  const shouldNoindex = getSeoMeta(noindexRoute)?.noindex === true;
  if (shouldNoindex) {
    ensureMetaTag('robots', 'noindex, nofollow');
  } else {
    // Default to index, follow for public pages
    ensureMetaTag('robots', 'index, follow');
  }

  // Update Open Graph metadata
  const ogLocale = i18n.global.locale.value === 'en' ? 'en_US' : 'zh_TW';
  ensurePropertyMetaTag('og:locale', ogLocale);
  ensurePropertyMetaTag('og:title', defaultOgTitle);
  ensurePropertyMetaTag('og:description', defaultOgDescription);
  ensurePropertyMetaTag('og:image:alt', defaultOgImageAlt);

  // Update Twitter metadata
  ensureMetaTag('twitter:title', defaultTwitterTitle);
  ensureMetaTag('twitter:description', defaultTwitterDescription);

  // Update html lang attribute
  document.documentElement.lang = i18n.global.locale.value;
};
