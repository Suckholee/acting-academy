const fs = require('node:fs');
const path = require('node:path');

const BRAND = '김정태 배우아카데미';
const ORIGIN = 'https://www.kactstar.com';

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
    const title = `${BRAND} | KIM JUNG TAE ACTING ACADEMY`;
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
      .replace(/<meta\b(?=[^>]*\bproperty=["']og:title["'])[^>]*>/gi, `<meta property="og:title" content="${title}">`)
      .replace(/<script\b[^>]*\bid=["']academy-search-identity["'][^>]*>[\s\S]*?<\/script>/gi, '');
    const identity = {
      '@context': 'https://schema.org',
      '@graph': [
        {'@type': 'WebSite', '@id': `${ORIGIN}/#website`, url: `${ORIGIN}/`, name: BRAND,
          publisher: {'@id': `${ORIGIN}/#academy`}},
        {'@type': 'EducationalOrganization', '@id': `${ORIGIN}/#academy`, url: `${ORIGIN}/`, name: BRAND}
      ]
    };
    html = html.replace('</head>', `<script id="academy-search-identity" type="application/ld+json">${JSON.stringify(identity)}</script></head>`);
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
