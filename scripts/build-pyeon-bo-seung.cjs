const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const t = require('../content/pyeon-bo-seung.json');
const file = name => path.join(root, 'dist', name);
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const photo = `<div class="faculty-photo faculty-real-photo hyung-min-photo"><img src="${t.photos[0]}" alt="편보승 강사 프로필 사진"></div>`;
const photoLabels = ['블랙 재킷 프로필', '핑크 재킷 프로필', '데님 프로필'];
const photoViewer = `<div class="profile-photo-viewer" data-profile-gallery><div class="profile-photo-stage">${t.photos.map((src,i)=>`<img class="profile-photo-slide ${i===0?'is-active':''} im-profile-slide" src="${src}" alt="편보승 강사 ${photoLabels[i]}" data-photo-label="${photoLabels[i]}" aria-hidden="${i!==0}">`).join('')}</div><div class="profile-photo-thumbs" role="group" aria-label="편보승 강사 사진 선택">${t.photos.map((src,i)=>`<button type="button" data-photo-index="${i}" aria-label="${photoLabels[i]} 보기" aria-pressed="${i===0}"><img src="${src}" alt=""></button>`).join('')}</div></div>`;
const card = `<article class="faculty-card faculty-pyeon-card" data-category="acting"><a href="/trainers/${t.slug}" aria-label="편보승 강사 프로필 보기">${photo}<div class="faculty-card-copy"><span class="faculty-label">주임강사</span><h2>편보승</h2><p>${t.english}<span aria-hidden="true">↗</span></p></div></a></article>`;
const footerNote = '김정태 대표 강사 · 편보승 주임강사 · 김형민 전임강사 · 임도윤 상담 및 강사<br>PROFILE SAMPLE 표시가 있는 소개는 분야별 예시입니다.';
const footer = html => html.replace(/(<footer class="faculty-footer">[\s\S]*?<p>)[\s\S]*?(<\/p>)/, `$1${footerNote}$2`);
const removeCard = html => html.replace(/<article class="faculty-card faculty-pyeon-card"[\s\S]*?<\/article>/g, '');
let listing = removeCard(fs.readFileSync(file('trainers.html'), 'utf8'));
listing = listing.replace(/(<article class="faculty-card faculty-head-card"[\s\S]*?<\/article>)/, `$1${card}`);
if (!listing.includes('data-filter="acting"')) listing = listing.replace('<span class="faculty-count"', '<button data-filter="acting" aria-pressed="false">주임강사</button><span class="faculty-count"');
const count = [...listing.matchAll(/<article class="faculty-card/g)].length;
listing = listing.replace(/\d+ COACHES/, `${String(count).padStart(2,'0')} COACHES`)
.replace(/<p class="faculty-notice">[^<]*PROFILE SAMPLE[^<]*<\/p>/, '<p class="faculty-notice">김정태 대표 강사와 편보승·김형민·임도윤 강사 프로필을 만나보세요. PROFILE SAMPLE 표시는 분야별 소개 예시입니다.</p>');
fs.writeFileSync(file('trainers.html'), footer(listing));
const template = fs.readFileSync(file('trainers/im-do-yoon.html'), 'utf8');
const start = template.slice(0, template.indexOf('<main id="main">') + '<main id="main">'.length)
.replace(' im-do-yoon-atmosphere', '')
.replace('profile-page', 'profile-page pyeon-atmosphere')
.replace(/<title>.*?<\/title>/, '<title>편보승 PYEON BO SEUNG | 김정태 배우아카데미</title>')
.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="편보승 강사 프로필. 수원대학교 연극영화과 학사·석사, 교육 경력과 영화·드라마 작품 이력.">');
const end = footer(template.slice(template.indexOf('</main>')));
const rows = list => `<ul class="profile-credit-list">${list.map(([name,detail])=>`<li><strong>${esc(name)}</strong>${detail?`<span>${esc(detail)}</span>`:''}</li>`).join('')}</ul>`;
const groups = (list,drama=false) => [...new Set(list.map(row=>row[0]))].map(year=>`<div class="hyung-min-year-group"><h3>${esc(year)}</h3>${rows(list.filter(row=>row[0]===year).map(row=>drama?[row[2],'']:[row[1],'']))}</div>`).join('');
const section = (id,kicker,title,contents) => `<section id="${id}" class="profile-section hyung-min-section faculty-reveal"><div><p class="faculty-kicker">${kicker}</p><h2>${title}</h2></div><div class="hyung-min-section-content">${contents}</div></section>`;
const body = `<section class="profile-hero faculty-wrap"><a class="profile-back" href="/trainers?category=acting">← 강사소개</a><div class="profile-layout">${photoViewer}<div class="profile-heading hyung-min-heading"><p class="faculty-kicker">ACTOR &amp; COACH <span>/ PROFILE</span></p><h1>${t.name}</h1><h2>${t.title}</h2><p class="hyung-min-title">${t.english}</p><p class="profile-description">${t.education.map(esc).join('<br>')}</p><a class="button gold" href="/?consult=basic">수업 상담하기 ↗</a></div></div></section><div class="profile-tabs hyung-min-tabs"><div class="faculty-wrap"><a href="#career">학력·경력</a><a href="#film">영화</a><a href="#drama">드라마</a><a href="#notes">기타사항</a></div></div><div class="profile-body faculty-wrap">${section('career','01 / BACKGROUND','학력 · 경력',`<h3 class="hyung-min-group-title">학력</h3>${rows(t.education.map(v=>[v,'']))}<h3 class="hyung-min-group-title">교육 경력</h3>${rows(t.career.map(v=>[v,'']))}`)}${section('film','02 / FILM','영화',groups(t.films))}${section('drama','03 / DRAMA','드라마',groups(t.dramas,true))}${section('notes','04 / CAREER NOTE','기타사항',rows([[t.note,'']]))}<a class="profile-list-link" href="/trainers">전체 강사 보기 <span>↗</span></a><p class="profile-background-credit">배경 이미지는 AI로 제작한 강의 장면입니다.</p></div>`;
fs.writeFileSync(file(`trainers/${t.slug}.html`), start + body + end);
for (const slug of ['im-do-yoon','kim-jung-tae','kim-hyung-min']) {
  let html = removeCard(fs.readFileSync(file(`trainers/${slug}.html`), 'utf8'));
  if (html.includes('<div class="faculty-grid">')) html = html.replace(/(<article class="faculty-card faculty-head-card"[\s\S]*?<\/article>)/, `$1${card}`);
  fs.writeFileSync(file(`trainers/${slug}.html`), footer(html));
}
console.log('Built 편보승 profile: 13 dramas, 9 films, 3 photos.');
