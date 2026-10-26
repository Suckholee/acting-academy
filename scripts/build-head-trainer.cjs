const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const t = require('../content/kim-jung-tae.json');
const file = name => path.join(root, 'dist', name);
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const link = (url, label) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
const photo = `<div class="faculty-photo faculty-real-photo kim-current-photo"><img src="${t.photos[0].file}" alt="김정태 대표 강사 · 2025년 공개 프로필 사진"><span class="head-trainer-badge">대표 강사</span></div>`;
const photoViewer = `<div class="profile-photo-viewer" data-profile-gallery><div class="profile-photo-stage">${t.photos.map((p,i)=>`<img class="profile-photo-slide kim-slide-${i} ${i===0?'is-active':''}" src="${p.file}" alt="김정태 대표 강사 ${esc(p.label)}" data-photo-label="${esc(p.label)}" aria-hidden="${i!==0}">`).join('')}<span class="head-trainer-badge">대표 강사</span></div><div class="profile-photo-thumbs" role="group" aria-label="김정태 대표 강사 사진 선택">${t.photos.map((p,i)=>`<button type="button" data-photo-index="${i}" aria-label="${esc(p.label)} 보기" aria-pressed="${i===0}"><img src="${p.file}" alt=""></button>`).join('')}</div></div>`;
const card = `<article class="faculty-card faculty-head-card" data-category="head"><a href="/trainers/${t.slug}" aria-label="김정태 대표 강사 프로필 보기">${photo}<div class="faculty-card-copy"><span class="faculty-label">대표 강사 / HEAD COACH</span><h2>김정태</h2><p>배우 · 대표 강사<span aria-hidden="true">↗</span></p></div></a></article>`;
const note = '김정태 대표 강사 · 임도윤 상담 및 강사<br>PROFILE SAMPLE 표시가 있는 소개는 분야별 예시입니다.';
const footer = html => html.replace(/(<footer class="faculty-footer">[\s\S]*?<p>)[\s\S]*?(<\/p>)/, `$1${note}$2`);
let listing = fs.readFileSync(file('trainers.html'), 'utf8');
listing = listing.replace(/<article class="faculty-card faculty-head-card"[\s\S]*?<\/article>/g, '');
listing = listing.replace('<div class="faculty-grid">', `<div class="faculty-grid">${card}`);
if (!listing.includes('data-filter="head"')) listing = listing.replace('<span class="faculty-count"', '<button data-filter="head" aria-pressed="false">대표 강사</button><span class="faculty-count"');
listing = listing.replace(/\d+ COACHES/, '06 COACHES').replace(/(?:김정태 대표 강사와 )*임도윤 강사 프로필을 만나보세요\./, '김정태 대표 강사와 임도윤 강사 프로필을 만나보세요.');
fs.writeFileSync(file('trainers.html'), footer(listing));
const template = fs.readFileSync(file('trainers/im-do-yoon.html'), 'utf8');
const start = template.slice(0, template.indexOf('<main id="main">') + '<main id="main">'.length)
.replace(' im-do-yoon-atmosphere', '')
.replace('profile-page', 'profile-page jung-tae-atmosphere')
.replace(/<title>.*?<\/title>/, '<title>김정태 대표 강사 | 김정태 배우아카데미</title>')
.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="김정태 배우아카데미 대표 강사 김정태. 배우 프로필 사진, 영화·드라마 대표 출연작과 2011 MBC 드라마대상 PD상 수상 경력.">');
const end = footer(template.slice(template.indexOf('</main>')));
const credits = rows => `<ul class="profile-credit-list">${rows.map(([name,role])=>`<li><strong>${esc(name)}</strong></li>`).join('')}</ul>`;
const gallery = t.photos.map((p,i)=>`<figure><div class="head-gallery-photo ${p.className}"><img src="${p.file}" alt="김정태 배우 ${esc(p.label)}" loading="lazy"></div><figcaption><strong>${esc(p.label)}</strong><span>${esc(p.credit)}</span>${link(p.source,'사진 출처')}</figcaption></figure>`).join('');
const body = `<section class="profile-hero faculty-wrap"><a class="profile-back" href="/trainers?category=head">← 강사소개</a><div class="profile-layout">${photoViewer}<div class="profile-heading"><p class="faculty-kicker">HEAD COACH <span>/ KIM JUNG TAE</span></p><h1>김정태</h1><h2>배우 · 대표 강사</h2><p class="head-trainer-intro">${esc(t.intro)}</p><p class="profile-description">${esc(t.bio)}</p><a class="button gold" href="/?consult=basic">수업 상담하기 ↗</a><p class="head-photo-credit">${link(t.photos[0].source,'사진: 피에이엔터테인먼트 제공')}</p></div></div></section><div class="profile-tabs"><div class="faculty-wrap"><a href="#career">학력·경력</a><a href="#film">영화</a><a href="#drama">드라마</a><a href="#photos">프로필 사진</a></div></div><div class="profile-body faculty-wrap"><section id="career" class="profile-section hyung-min-section faculty-reveal"><div><p class="faculty-kicker">01 / BACKGROUND</p><h2>학력 · 경력</h2></div><div class="career-list"><div><h3>담당</h3><p>김정태 배우아카데미 대표 강사</p></div><div><h3>데뷔</h3><p>${esc(t.debut)}</p></div><div><h3>수상</h3><p>${esc(t.award)}</p></div></div></section><section id="film" class="profile-section hyung-min-section faculty-reveal"><div><p class="faculty-kicker">02 / FILM</p><h2>영화</h2><p class="faculty-notice">주요 작품을 선별한 목록입니다.</p></div><div>${credits(t.films)}</div></section><section id="drama" class="profile-section hyung-min-section faculty-reveal"><div><p class="faculty-kicker">03 / DRAMA</p><h2>드라마</h2></div><div>${credits(t.dramas)}</div></section><section id="photos" class="head-photo-section faculty-reveal"><p class="faculty-kicker">04 / PORTRAITS</p><h2>프로필 사진</h2><div class="head-photo-gallery">${gallery}</div></section><section class="head-source-section"><p class="faculty-kicker">PROFILE SOURCES</p><div>${t.sources.map(s=>link(s.url,s.label)).join('')}</div><a class="profile-list-link" href="/trainers">전체 강사 보기 <span>↗</span></a></section><p class="profile-background-credit">배경 이미지는 AI로 제작한 강의 장면입니다.</p></div>`;
fs.writeFileSync(file(`trainers/${t.slug}.html`), start + body + end);
// Keep the head coach visible from the other real instructor profile.
let im = fs.readFileSync(file('trainers/im-do-yoon.html'), 'utf8');
im = im.replace(/<article class="faculty-card faculty-head-card"[\s\S]*?<\/article>/g, '').replace('<div class="faculty-grid">', `<div class="faculty-grid">${card}`);
fs.writeFileSync(file('trainers/im-do-yoon.html'), footer(im));
console.log('Built 김정태 head coach profile with 3 sourced photo assets and 19 selected credits.');
