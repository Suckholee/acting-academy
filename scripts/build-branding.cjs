const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '../dist');
let count = 0;
function walk(dir) {
 for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
  const target = path.join(dir, entry.name);
  if (entry.isDirectory()) { walk(target); continue; }
  if (!entry.name.endsWith('.html')) continue;
  const html = fs.readFileSync(target, 'utf8');
  let normalized = html.replace(/김정태\s*연기\s*아카데미/g, '김정태 배우아카데미').replace(/(brand-category["']>)(?:연기|배우)\s*아카데미/g, '$1배우아카데미');
  if(normalized.includes('<header')&&!normalized.includes('/mobile-header.js'))normalized=normalized.replace('</head>','<script src="/mobile-header.js" defer></script></head>');
  if (normalized !== html) fs.writeFileSync(target, normalized);
  count++;
 }
}
walk(root);
console.log(`Verified consistent academy branding across ${count} HTML pages.`);
