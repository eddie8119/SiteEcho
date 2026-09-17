import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

if (!fs.existsSync(distDir)) {
  console.error('Dist directory does not exist. Run vite build first.');
  process.exit(1);
}

const templatePath = path.join(distDir, 'index.html');
if (!fs.existsSync(templatePath)) {
  console.error('index.html not found in dist.');
  process.exit(1);
}

const template = fs.readFileSync(templatePath, 'utf-8');

const pages = [
  {
    path: 'index.html',
    lang: 'zh-TW',
    title: 'SiteNear｜工地現場管理與履歷相簿工具',
    description:
      'SiteNear 是專為工地現場管理打造的室內裝修履歷相簿，拍照、標記、追蹤問題、記錄修復並快速產出施工報告，讓設計師、監工與工班協作更順暢。',
    keywords: '工地現場管理, 施工紀錄, 工地相簿, 裝修履歷, 工程報告, 問題追蹤',
    ogLocale: 'zh_TW',
    ogTitle: 'SiteNear｜工地現場管理與履歷相簿工具',
    ogDescription:
      'SiteNear 幫你做好工地現場管理：依空間與工項整理施工照片、追蹤問題與修復，快速產出施工報告。',
    ogImageAlt: 'SiteNear 工地現場管理相簿介面，展示施工照片、問題追蹤與修復紀錄',
    canonical: 'https://site-shot-app.vercel.app/',
    appDescription:
      'SiteNear 是給室內設計師、統包與監工使用的工地現場管理與工地相簿，可依空間與工項整理施工照片、追蹤待處理問題、關聯修復前後紀錄，並快速產出施工報告。',
    appName: 'SiteNear',
    appAltName: 'SiteNear 工地相簿',
  },
  {
    path: 'en/index.html',
    lang: 'en',
    title: 'SiteNear | Construction Site Management & Jobsite Photo Log',
    description:
      'SiteNear simplifies jobsite management for interior construction. Organize site photos by space and trade, track issues through closeout, and generate reports fast.',
    keywords:
      'construction site management, jobsite photo log, punch list, construction documentation, site reports, interior contractor software',
    ogLocale: 'en_US',
    ogTitle: 'SiteNear | Construction Site Management & Jobsite Photo Log',
    ogDescription:
      'SiteNear helps contractors and designers manage jobsite photos, coordinate tasks, and track issue resolution seamlessly.',
    ogImageAlt:
      'SiteNear jobsite photo management interface showing construction logs, issue tracking, and reports',
    canonical: 'https://site-shot-app.vercel.app/en',
    appDescription:
      'SiteNear is a jobsite management and photo documentation tool for interior designers, contractors, and site supervisors. Track punch lists, resolve issues, and export PDF reports.',
    appName: 'SiteNear',
    appAltName: 'SiteNear Jobsite Log',
  },
  {
    path: 'privacy/index.html',
    lang: 'zh-TW',
    title: 'SiteNear｜隱私權政策 Privacy Policy',
    description: 'SiteNear 隱私權政策：說明我們如何收集、使用與保護您的工地現場照片與專案資料。',
    keywords: 'SiteNear 隱私權, 隱私政策, 資料保護',
    ogLocale: 'zh_TW',
    ogTitle: 'SiteNear｜隱私權政策 Privacy Policy',
    ogDescription: '了解 SiteNear 如何保護您的帳號安全與工地資料隱私。',
    ogImageAlt: 'SiteNear Privacy Policy',
    canonical: 'https://site-shot-app.vercel.app/privacy',
    appDescription: 'SiteNear 隱私權政策說明。',
    appName: 'SiteNear',
    appAltName: 'SiteNear',
  },
  {
    path: 'terms/index.html',
    lang: 'zh-TW',
    title: 'SiteNear｜使用條款 Terms of Service',
    description: 'SiteNear 服務條款與使用者協議。',
    keywords: 'SiteNear 服務條款, 使用條款, 使用者協議',
    ogLocale: 'zh_TW',
    ogTitle: 'SiteNear｜使用條款 Terms of Service',
    ogDescription: 'SiteNear 服務條款與使用者協議。',
    ogImageAlt: 'SiteNear Terms of Service',
    canonical: 'https://site-shot-app.vercel.app/terms',
    appDescription: 'SiteNear 服務條款與使用者協議。',
    appName: 'SiteNear',
    appAltName: 'SiteNear',
  },
];

function generateHtml(page) {
  let html = template;

  html = html.replace(/<html lang="[^"]*"/, `<html lang="${page.lang}"`);
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>\n      ${page.title}\n    </title>`);

  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
    `<meta name="description" content="${page.description}" />`
  );

  if (html.includes('name="keywords"')) {
    html = html.replace(
      /<meta\s+name="keywords"\s+content="[^"]*"\s*\/>/,
      `<meta name="keywords" content="${page.keywords}" />`
    );
  } else {
    html = html.replace(
      /<meta name="robots" content="index, follow" \/>/,
      `<meta name="robots" content="index, follow" />\n    <meta name="keywords" content="${page.keywords}" />`
    );
  }

  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${page.canonical}" />`
  );

  html = html.replace(
    /<meta\s+property="og:locale"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:locale" content="${page.ogLocale}" />`
  );
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:title" content="${page.ogTitle}" />`
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${page.ogDescription}" />`
  );
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:url" content="${page.canonical}" />`
  );
  html = html.replace(
    /<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:image:alt" content="${page.ogImageAlt}" />`
  );

  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:title" content="${page.ogTitle}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:description" content="${page.ogDescription}" />`
  );

  // Update JSON-LD structured data
  const jsonLdRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/;
  const match = html.match(jsonLdRegex);
  if (match) {
    try {
      const data = JSON.parse(match[1]);
      data.name = page.appName;
      data.alternateName = page.appAltName;
      data.description = page.appDescription;
      data.url = page.canonical;
      html = html.replace(
        jsonLdRegex,
        `<script type="application/ld+json">\n    ${JSON.stringify(data, null, 2).replace(/\n/g, '\n    ')}\n    </script>`
      );
    } catch (e) {
      console.warn('Failed to update JSON-LD:', e);
    }
  }

  return html;
}

pages.forEach((page) => {
  const filePath = path.join(distDir, page.path);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const output = generateHtml(page);
  fs.writeFileSync(filePath, output, 'utf-8');
  console.log(`Generated prerender page: ${page.path}`);
});

console.log('Pre-rendered all SEO pages successfully.');
