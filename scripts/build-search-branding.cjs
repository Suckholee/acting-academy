const fs = require('node:fs');
const path = require('node:path');

const BRAND = '김정태 배우아카데미';
const ORIGIN = 'https://www.kactstar.com';
const HOME_SHARE_TITLE = '당신의 다음 장면을 함께합니다 · 김정태 배우아카데미';
const HOME_SHARE_DESCRIPTION = '처음 시작하는 연기부터 카메라·무대 연기까지. 나만의 목소리와 표정을 찾아가는 시간, 김정태 배우아카데미에서 함께하세요.';
function homeSharing(html) {
  const image = ORIGIN + '/assets/academy-home-share-v1.png';
  const values = {'og:type':'website','og:site_name':BRAND,'og:locale':'ko_KR','og:title':HOME_SHARE_TITLE,'og:description':HOME_SHARE_DESCRIPTION,'og:url':ORIGIN+'/','og:image':image,'og:image:secure_url':image,'og:image:type':'image/png','og:image:width':'1734','og:image:height':'907','og:image:alt':'당신의 다음 장면을 함께합니다. 따뜻한 햇살 아래 대본을 함께 읽는 모습을 담은 김정태 배우아카데미 홍보 포스터.'};
  html = html.replace(/<meta\b(?=[^>]*\bproperty=["']og:[^"']*["'])[^>]*>/gi,'')
    .replace(/<meta\b(?=[^>]*\bname=["']twitter:[^"']*["'])[^>]*>/gi,'');
  const tags=Object.entries(values).map(([key,value])=>`<meta property="${key}" content="${value}">`).join('')
    + `<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${HOME_SHARE_TITLE}"><meta name="twitter:description" content="${HOME_SHARE_DESCRIPTION}"><meta name="twitter:image" content="${image}">`;
  return html.replace('</head>',tags+'</head>');
}


function normalizeBrand(html) {
  return html.replace(/김정태\s*연기\s*아카데미/g, BRAND)
    .replace(/(class=["']brand-category["']>)(?:연기|배우)\s*아카데미/g, '$1배우아카데미');
}

function normalizeSearchBranding(html, home = false) {
  html = normalizeBrand(html);
  // Account pages and legacy redirects must keep their indexing policy.
  if (/<meta[^>]+(?:noindex|http-equiv=["']refresh)/i.test(html)) return html;
  html = html.replace(/<meta\b(?=[^>]*\bproperty=["']og:site_name["'])[^>]*>/gi, '');
  html = html.replace('</head>', `<meta property="og:site_name" content="${BRAND}"></head>`);
  if (home) {
    const title = `${BRAND} | 마곡 성인·시니어 연기학원`;
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
      .replace(/<meta\b(?=[^>]*\bproperty=["']og:title["'])[^>]*>/gi, `<meta property="og:title" content="${title}">`)
      .replace(/<script\b[^>]*\bid=["']academy-search-identity["'][^>]*>[\s\S]*?<\/script>/gi, '');
    const identity = {
      '@context': 'https://schema.org',
      '@graph': [
        {'@type': 'WebSite', '@id': `${ORIGIN}/#website`, url: `${ORIGIN}/`, name: BRAND,
          publisher: {'@id': `${ORIGIN}/#academy`}},
        {'@type': 'EducationalOrganization', '@id': `${ORIGIN}/#academy`, url: `${ORIGIN}/`, name: BRAND,
          description: '서울 강서구 마곡역 인근의 배우아카데미. 성인·시니어 카메라 연기와 무대 연기, 뮤지컬·연기·보컬 취미반을 안내합니다.',
          telephone: '+82-2-2666-4528',
          address: {'@type': 'PostalAddress', addressCountry: 'KR', addressRegion: '서울특별시',
            addressLocality: '강서구', streetAddress: '공항대로 186, 로뎀타워 3층'}}
      ]
    };
    html = html.replace('</head>', `<script id="academy-search-identity" type="application/ld+json">${JSON.stringify(identity)}</script></head>`);
    html = homeSharing(html);
  }
  return html;
}

function buildSearchBranding(directory) {
  let count = 0;
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name.endsWith('.html')) {
        const html = fs.readFileSync(file, 'utf8');
        const updated = normalizeSearchBranding(html, file === path.join(directory, 'index.html'));
        if (html !== updated) { fs.writeFileSync(file, updated); count++; }
      }
    }
  }
  walk(directory);
  return count;
}

if (require.main === module) {
  const directory = path.resolve(process.argv[2] || path.join(__dirname, '../dist-published'));
  console.log(`Updated search branding in ${buildSearchBranding(directory)} pages.`);
}
module.exports = {BRAND, normalizeBrand, normalizeSearchBranding, buildSearchBranding};
