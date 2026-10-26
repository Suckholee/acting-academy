const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const t = require('../content/im-do-yoon.json');
const file = name => path.join(root, 'dist', name);
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const photo = `<div class="faculty-photo faculty-real-photo"><img src="${esc(t.image)}" alt="${esc(t.name)} 강사 프로필 사진"></div>`;
const photoViewer = `<div class="profile-photo-viewer" data-profile-gallery><div class="profile-photo-stage">${t.photos.map((p,i)=>`<img class="profile-photo-slide ${i===0?'is-active':''} im-profile-slide" src="${p.file}" alt="임도윤 강사 ${esc(p.label)}" data-photo-label="${esc(p.label)}" aria-hidden="${i!==0}">`).join('')}</div><div class="profile-photo-thumbs" role="group" aria-label="임도윤 강사 사진 선택">${t.photos.map((p,i)=>`<button type="button" data-photo-index="${i}" aria-label="${esc(p.label)} 보기" aria-pressed="${i===0}"><img src="${p.file}" alt=""></button>`).join('')}</div></div>`;
const card = `<article class="faculty-card" data-category="consulting"><a href="/trainers/${t.slug}" aria-label="${t.name} 프로필 보기">${photo}<div class="faculty-card-copy"><span class="faculty-label">${t.title}</span><h2>${t.name}</h2><p>${t.title}<span aria-hidden="true">↗</span></p></div></a></article>`;
const footerNote = '임도윤 강사의 사진과 경력은 제공된 프로필을 기준으로 등록되었습니다.<br>PROFILE SAMPLE 표시가 있는 소개는 분야별 예시입니다.';
function updateFooter(html) {
  return html.replace(/(<footer class="faculty-footer">[\s\S]*?<p>)[\s\S]*?(<\/p>)/, `$1${footerNote}$2`);
}
let listing = fs.readFileSync(file('trainers.html'), 'utf8');
if (!listing.includes(`href="/trainers/${t.slug}"`)) {
  listing = listing.replace('<div class="faculty-grid">', `<div class="faculty-grid">${card}`);
  listing = listing.replace('<span class="faculty-count"', '<button data-filter="consulting" aria-pressed="false">상담 및 강사</button><span class="faculty-count"');
}
listing = listing.replace(/\d+ COACHES/, '05 COACHES').replace('PROFILE PREVIEW · 실제 강사 정보 등록 전, 분야별 소개 예시입니다.', '임도윤 강사 프로필을 만나보세요. PROFILE SAMPLE 표시는 분야별 소개 예시입니다.');
fs.writeFileSync(file('trainers.html'), updateFooter(listing));
const template = fs.readFileSync(path.join(root, 'content/profile-template.html'), 'utf8');
const start = template.slice(0, template.indexOf('<main id="main">') + '<main id="main">'.length)
  .replace('profile-page', 'profile-page im-do-yoon-atmosphere')
  .replace(/<title>.*?<\/title>/, `<title>${t.name} (${t.title}) | 김정태 배우아카데미</title>`)
  .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="임도윤 상담 및 강사. 서울예술대학 연극과 졸업, 지도 경력과 드라마·영화 출연 프로필.">`);
const end = updateFooter(template.slice(template.indexOf('</main>')));
const works = rows => `<ul class="profile-credit-list">${rows.map(([name]) => `<li><strong>${esc(name)}</strong></li>`).join('')}</ul>`;
const otherCards = [...listing.matchAll(/<article class="faculty-card"[\s\S]*?<\/article>/g)].map(m=>m[0]).filter(c=>!c.includes(`/trainers/${t.slug}`)).join('');
const body = `<section class="profile-hero faculty-wrap"><a class="profile-back" href="/trainers?category=consulting">← 강사소개</a><div class="profile-layout">${photoViewer}<div class="profile-heading"><p class="faculty-kicker">${t.title} <span>/ PROFILE</span></p><h1>${t.name}</h1><h2>${t.title}</h2><p class="profile-description">${esc(t.education)}<br>${esc(t.career)}</p><a class="button gold" href="/?consult=basic">상담 신청하기 ↗</a></div></div></section><div class="profile-tabs"><div class="faculty-wrap"><a href="#career">학력·경력</a><a href="#film">영화</a><a href="#drama">드라마</a></div></div><div class="profile-body faculty-wrap"><section id="career" class="profile-section faculty-reveal"><div><p class="faculty-kicker">01 / BACKGROUND</p><h2>학력 · 경력</h2></div><div class="career-list"><div><h3>학력사항</h3><p>${esc(t.education)}</p></div><div><h3>경력사항</h3><p>${esc(t.career)}</p></div></div></section><section id="film" class="profile-section faculty-reveal"><div><p class="faculty-kicker">02 / FILM</p><h2>영화</h2></div><div>${works(t.films.map(([,name])=>[name]))}</div></section><section id="drama" class="profile-section faculty-reveal"><div><p class="faculty-kicker">03 / DRAMA</p><h2>드라마</h2></div><div>${works(t.dramas)}</div></section><a class="profile-list-link" href="/trainers">전체 강사 보기 <span>↗</span></a></div><section class="faculty-related"><div class="faculty-wrap"><p class="faculty-kicker">MEET YOUR NEXT COACH</p><h2>다른 수업도 만나보세요.</h2><div class="faculty-grid">${otherCards}</div><p class="profile-background-credit">배경 이미지는 AI로 제작한 강의 장면입니다.</p></div></section>`;
fs.writeFileSync(file(`trainers/${t.slug}.html`), start + body + end);
console.log('Updated 임도윤 instructor listing and profile (20 dramas, 3 films).');
