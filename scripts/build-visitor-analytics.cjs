const fs = require('node:fs');
const path = require('node:path');
const {isPublicVisit} = require('../src/analytics/policy.cjs');

function buildVisitorAnalytics(directory) {
  let count = 0;
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(file); continue; }
      if (!entry.name.endsWith('.html')) continue;
      const route = '/' + path.relative(directory, file).split(path.sep).join('/').replace(/\.html$/, '').replace(/^index$/, '');
      if (!isPublicVisit('https://www.kactstar.com' + route)) continue;
      const html = fs.readFileSync(file, 'utf8');
      if (html.includes('src="/visitor-analytics.js"')) continue;
      fs.writeFileSync(file, html.replace(/<\/head>/i, '<script defer src="/visitor-analytics.js"></script></head>'));
      count++;
    }
  }
  walk(directory);
  return count;
}

module.exports = {buildVisitorAnalytics};
