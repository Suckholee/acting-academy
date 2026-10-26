const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
for (const slug of ['kim-hyung-min', 'pyeon-bo-seung']) {
  const {introductionQuote} = require(`../content/${slug}.json`);
  const file = path.join(root, 'published-source/trainers', `${slug}.html`);
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(/<blockquote class="instructor-introduction">[\s\S]*?<\/blockquote>/g, '');
  const identity = /(<div class="profile-identity">[\s\S]*?<\/div>)/;
  if (!identity.test(html)) throw new Error(`Missing profile identity: ${slug}`);
  html = html.replace(identity, `$1<blockquote class="instructor-introduction">${escape(introductionQuote)}</blockquote>`);
  fs.writeFileSync(file, html);
}
