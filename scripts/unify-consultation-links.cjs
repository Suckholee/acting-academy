const fs = require('node:fs');
const path = require('node:path');
const { parseHTML } = require('linkedom');

// Run after page generators so every public consultation entry uses the same form.
function unifyConsultationLinks(directory) {
  let changed = 0;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { if (!['admin', 'events'].includes(entry.name)) changed += unifyConsultationLinks(file); continue; }
    if (!entry.name.endsWith('.html')) continue;
    const original = fs.readFileSync(file, 'utf8');
    const { document } = parseHTML(original);
    let dirty = false;
    for (const dialog of document.querySelectorAll('.phone-consult-dialog')) { dialog.remove(); dirty = true; }
    for (const node of document.querySelectorAll('[data-consult], a[href*="?consult="], a[href^="tel:"]')) {
      const link = node.tagName === 'A' ? node : document.createElement('a');
      if (link !== node) {
        for (const attribute of node.attributes) link.setAttribute(attribute.name, attribute.value);
        link.innerHTML = node.innerHTML;
        node.replaceWith(link);
      }
      link.removeAttribute('data-consult');
      link.removeAttribute('type');
      link.setAttribute('href', '/apply');
      // Keep existing layout and course-specific wording while removing telephone prompts.
      link.innerHTML = link.innerHTML.replace(/1:1 교육 전화 상담하기/g, '1:1 교육 상담 신청하기').replace(/전화 상담/g, '상담 신청').replace(/학원으로 전화하기|상담 담당자에게 전화하기/g, '상담 신청하기');
      dirty = true;
    }
    if (dirty) { fs.writeFileSync(file, document.toString()); changed++; }
  }
  return changed;
}
module.exports = { unifyConsultationLinks };
if (require.main === module) console.log(`상담 신청 링크 통일: ${unifyConsultationLinks(path.resolve(__dirname, '../published-source'))} pages`);
