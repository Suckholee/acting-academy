const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const origin = 'https://scene-academy.vercel.app';
const pages = ['index', 'about', 'programs', 'trainers', 'works', 'reviews', 'facilities', 'faq'];
const labels = ['홈', '아카데미 소개', '교육과정', '강사소개', '수강생 작품 활동', '수강후기', '시설 안내', '자주 묻는 질문'];
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
for (const [i, page] of pages.entries()) {
 const file = path.join(root, 'dist', `${page}.html`);
 let html = fs.readFileSync(file, 'utf8');
 html = html.replace(/<!-- page-sharing-head -->[\s\S]*?<!-- \/page-sharing-head -->/g, '').replace(/<!-- page-sharing -->[\s\S]*?<!-- \/page-sharing -->/g, '');
 html = html.replace(/<meta property="og:[^"]+"[^>]*>/g, '');
 const url = `${origin}${page === 'index' ? '/' : `/${page}`}`;
 const title = `${labels[i]} | 김정태 배우아카데미`;
 const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] || '김정태 배우아카데미의 수업과 공간을 만나보세요.';
 html = html.replace('</head>', `<!-- page-sharing-head --><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${description}"><meta property="og:type" content="website"><meta property="og:url" content="${url}"><meta property="og:image" content="${origin}/assets/facility-classroom-corrected.png"><meta property="og:locale" content="ko_KR"><link rel="canonical" href="${url}"><link rel="stylesheet" href="/sharing.css"><script src="/sharing.js" defer></script><!-- /page-sharing-head --></head>`);
 const section = `<!-- page-sharing --><div class="page-sharing" aria-label="페이지 링크 복사"><button type="button" data-copy-page="${page === 'index' ? '/' : `/${page}`}" data-page-title="${labels[i]}">링크 복사 ↗</button><p class="page-sharing-status" role="status" aria-live="polite"></p><label class="page-sharing-fallback" hidden>아래 주소를 복사해 주세요.<input type="text" readonly aria-label="공유할 페이지 주소"></label></div><!-- /page-sharing -->`;
 html = html.replace('</main>', `${section}</main>`);
 fs.writeFileSync(file, html);
}
console.log('Page sharing and social previews added to 8 public pages.');
