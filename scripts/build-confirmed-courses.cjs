const fs = require('node:fs');
const path = require('node:path');
const courses = require('../content/courses.json');
const source = path.resolve(__dirname, '../published-source');
const note = '세부 커리큘럼과 반별 수업 일정은 추후 안내합니다. 상담 시 관심 있는 반을 말씀해주세요.';
const display = c => c.title + (c.audience && c.id !== 'senior-model' ? ` (${c.audience})` : '');
const filters = '<div class="filters" role="group" aria-label="교육과정 분류">' + [['all','전체 과정'],...courses.map(c=>[c.id,display(c)])].map(([id,label],i)=>`<button data-filter="${id}" aria-pressed="${i===0}"${i===0?' class="active"':''}>${label}</button>`).join('') + '</div>';
const cards = '<div class="course-grid">' + courses.map((c,i)=>`<article class="course" data-category="${c.category}"><a class="course-art course-link" href="/courses/${c.id}" data-course-id="${c.id}" aria-labelledby="course-title-${c.id}"><img src="${c.image}" alt="${c.imageAlt}" loading="lazy" width="${c.imageWidth || 1536}" height="${c.imageHeight || 1024}"><span class="art-label">${c.label}</span><span class="course-index" aria-hidden="true">${String(i+1).padStart(2,'0')} ↗</span><div class="course-content"><h3 id="course-title-${c.id}">${display(c)}</h3><p class="course-intro">${c.intro}</p></div></a></article>`).join('') + '</div>';
for (const page of ['index','programs']) {
  const file = path.join(source,page+'.html');
  let html = fs.readFileSync(file,'utf8');
  html = html.replace(/<div class="filters"[\s\S]*?<\/div>/,filters)
    .replace(/<div class="course-grid">[\s\S]*?<\/article><\/div>/,cards)
    .replace(/<div class="choices"[\s\S]*?<\/div>/,`<div class="choices" role="group" aria-label="관심 있는 수업">${courses.map((c,i)=>`<button data-recommend="${c.id}" aria-pressed="${i===0}"${i===0?' class="selected"':''}>${c.goal}</button>`).join('')}</div>`)
    .replace(/(<h3 id="recommend-title">)[\s\S]*?(<\/h3>)/,`$1${display(courses[0])}$2`)
    .replace(/(<p id="recommend-copy">)[\s\S]*?(<\/p>)/,`$1${courses[0].intro}$2`)
    .replace(/(id="recommend-button" data-course=")[^"]+/, '$1camera')
    .replace(/지금, 연기를 배우려는 이유는 무엇인가요\?/, '지금, 어떤 수업에 관심이 있나요?')
    .replace(/수업의 핵심 가치/g,'과정 안내')
    .replace(/href="\/courses\/basic" id="course-page-link"/g,'href="/courses/camera" id="course-page-link"')
    .replace(/(<p class="dialog-note">)[\s\S]*?(<\/p>)/,`$1${note}$2`)
    .replace(/\s*<p class="class-arrangement-note">[\s\S]*?<\/p>/g,'');
  fs.writeFileSync(file,html);
}
const appFile = path.join(source,'app.js');
let app = fs.readFileSync(appFile,'utf8');
const modalCourses = Object.fromEntries(courses.map(c=>[c.id,{title:display(c),label:c.label,intro:c.intro,steps:[note]}]));
app = app.replace(/^const courses=.*?;\n/,`const courses=${JSON.stringify(modalCourses)};\n`);
fs.writeFileSync(appFile,app);
// Preserve the existing navigation, styles and telephone consultation dialog.
const template = fs.readFileSync(path.join(source,'courses/camera.html'),'utf8');
for (const c of courses) {
  const url = `https://www.kactstar.com/courses/${c.id}`;
  const title = `${display(c)} | 김정태 배우아카데미 · 마곡`;
  const description = `${c.intro} 서울 강서구 마곡역 4번 출구에서 도보 약 1분. ${note}`;
  const main = `<main><section class="course-page-hero"><img style="object-position:50% 0%" src="${c.image}" alt="${c.imageAlt}" width="${c.imageWidth || 1536}" height="${c.imageHeight || 1024}"><div><p class="eyebrow">/ ${c.label} /</p><h1>${display(c)}</h1><p>${c.intro}</p></div></section><section class="section course-overview"><div><p class="eyebrow dark">/ Class Information /</p><h2>나에게 맞는 수업,<br>함께 찾아갑니다.</h2></div><p>${c.intro} ${note}</p></section><section class="section curriculum class-values"><p class="eyebrow dark">/ Class Information /</p><h2>과정 안내</h2><article><h3>${display(c)}</h3><p>${c.intro}</p></article><article><h3>커리큘럼 및 일정 안내</h3><p>${note}</p></article></section><section class="section course-notes"><h2>수강 상담 안내</h2><p>희망하는 반과 수강 목적을 알려주시면 담당자가 안내합니다.</p><a class="button gold" href="/?consult=${c.id}">이 과정 상담하기</a></section></main>`;
  const html = template.replace(/<title>[\s\S]*?<\/title>/,`<title>${title}</title>`)
    .replace(/<meta name="description"[^>]*>/,`<meta name="description" content="${description}">`)
    .replace(/<meta property="og:title"[^>]*>/g,'')
    .replace(/<meta property="og:description"[^>]*>/g,'')
    .replace('</head>',`<meta property="og:title" content="${title}"><meta property="og:description" content="${description}"></head>`)
    .replace(/<link rel="canonical"[^>]*>/,`<link rel="canonical" href="${url}">`)
    .replace(/<meta property="og:url"[^>]*>/,`<meta property="og:url" content="${url}">`)
    .replace(/href="\/\?consult=[^"]*"/g,`href="/?consult=${c.id}"`)
    .replace(/<main>[\s\S]*?<\/main>/,main);
  fs.writeFileSync(path.join(source,'courses',c.id+'.html'),html);
}
for (const [id,target] of [['basic','/programs'],['coaching','/programs'],['audition','/courses/audition-prep'],['stage','/courses/camera-advanced'],['speech','/programs']]) {
  fs.writeFileSync(path.join(source,'courses',id+'.html'),`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="robots" content="noindex, follow"><meta http-equiv="refresh" content="0;url=${target}"><title>교육과정 안내 | 김정태 배우아카데미</title></head><body><a href="${target}">확정 교육과정 보기</a></body></html>`);
}
const sitemapFile = path.join(source,'sitemap.xml');
let sitemap = fs.readFileSync(sitemapFile,'utf8').replace(/\s*<url><loc>[^<]*\/courses\/[^<]*<\/loc>[\s\S]*?<\/url>/g,'');
sitemap = sitemap.replace('</urlset>',courses.map(c=>`  <url><loc>https://www.kactstar.com/courses/${c.id}</loc><lastmod>2026-10-20</lastmod></url>`).join('\n')+'\n</urlset>');
fs.writeFileSync(sitemapFile,sitemap);
console.log('Confirmed courses: '+courses.map(display).join(', '));
