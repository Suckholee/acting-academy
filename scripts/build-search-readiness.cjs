const fs = require('node:fs');
const path = require('node:path');

const descriptions = {
  trainers: '김정태 배우아카데미의 김형민·임도윤·편보승 강사를 소개합니다. 강사별 학력, 교육 경력과 작품 활동을 확인하세요.',
  reviews: '김정태 배우아카데미 수강후기를 준비하고 있습니다. 실제 후기가 등록되기 전에는 함께 만들어갈 배움과 성장의 방향을 안내합니다.',
};

function buildSearchReadiness(directory) {
  const excluded = new Set();
  const changed = new Set();
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(file); continue; }
      if (!entry.name.endsWith('.html')) continue;
      const route = '/' + path.relative(directory, file).split(path.sep).join('/').replace(/\.html$/, '').replace(/^index$/, '');
      const original = fs.readFileSync(file, 'utf8');
      let html = original.replace(/<meta\b(?=[^>]*\bid=["']pending-student-profile["'])[^>]*>/gi, '');
      // Exclude only unpublished student detail samples, not real profiles or course pages.
      if (/^\/works\/actor-[1-4]$/.test(route) && html.includes('작품명 · 배역 · 참여 내용은 실제 자료 확인 후 교체합니다.')) {
        html = html.replace(/<meta\b(?=[^>]*\bname=["']robots["'])[^>]*>/gi, '');
        html = html.replace('</head>', '<meta id="pending-student-profile" name="robots" content="noindex, follow"></head>');
      }
      const description = descriptions[route.slice(1)];
      if (description) {
        html = html.replace(/<meta\b(?=[^>]*\bname=["']description["'])[^>]*>/gi, `<meta name="description" content="${description}">`)
          .replace(/<meta\b(?=[^>]*\bproperty=["']og:description["'])[^>]*>/gi, `<meta property="og:description" content="${description}">`);
      }
      if (route === '/trainers') html = html.replace('김정태 원장와 편보승·김형민·임도윤 강사의 프로필을 만나보세요.', '김형민·임도윤·편보승 강사의 프로필을 만나보세요.');
      if (/<meta\b[^>]*\bcontent=["'][^"']*noindex/i.test(html)) excluded.add(route);
      if (html !== original) { fs.writeFileSync(file, html); changed.add(route); }
    }
  }
  walk(directory);
  const sitemapFile = path.join(directory, 'sitemap.xml');
  const sitemap = fs.readFileSync(sitemapFile, 'utf8').replace(/\s*<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/g, (entry, url) => {
    const route = new URL(url).pathname;
    if (excluded.has(route)) return '';
    // A content change, rather than every rebuild, advances the modification date.
    if (changed.has(route)) return entry.replace(/<lastmod>[^<]*<\/lastmod>/, '<lastmod>2026-10-26</lastmod>');
    return entry;
  });
  fs.writeFileSync(sitemapFile, sitemap);
  return {excluded: [...excluded], changed: [...changed]};
}

module.exports = {buildSearchReadiness};
if (require.main === module) console.log(buildSearchReadiness(path.resolve(process.argv[2] || path.join(__dirname, '../published-source'))));
