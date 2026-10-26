const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '../dist');
const samples = [['shortform','숏폼 · 웹드라마'],['drama','드라마'],['movie','영화'],['commercial','광고']];
const notice = '<aside class="scenario-notice" style="padding:18px 22px;margin:24px 0;border:1px solid #cbb878;border-radius:12px;background:#f6f2e7;color:#39352d;line-height:1.8"><strong>목업 · 예시 콘텐츠</strong><br>아래 사진 영역과 작품·배역 정보는 화면 구성을 위한 예시입니다. 실제 수강생의 출연 또는 캐스팅 실적이 아닙니다.</aside>';
const cards = samples.map(([category,label],i) => `<article class="student-card" data-category="${category}"><a href="/works/actor-${i+1}"><div class="student-photo-box"><img src="/assets/student-photo-pending.svg" alt="수강생 사진 배치 예시"><span class="casting-badge">목업 · ${label}</span><span class="course-tag">수강생 활동 예시</span></div><div class="student-info"><div class="student-name-row"><h3>수강생 ${String(i+1).padStart(2,'0')}</h3><span>SAMPLE</span></div><p class="student-latest-work">작품명 · 배역 정보 예시</p><div class="student-work-count"><span>실제 실적이 아닌 목업</span><span class="btn-more">예시 보기 ↗</span></div></div></a></article>`).join('');
const banner = '<section class="works-banner"><div class="works-wrap"><p class="works-kicker">STUDENT WORKS / MOCKUP</p><h1><span>배움의 순간이,</span><span>스크린의 배역이 되다.</span></h1><p>수강생 작품 활동을 소개할 공간입니다. 현재는 화면 구성을 위한 목업입니다.</p></div></section>';
function write(file,body) {
 const target=path.join(root,file);
 let html=fs.readFileSync(target,'utf8');
 const sharing=html.match(/<!-- page-sharing -->[\s\S]*?<!-- \/page-sharing -->/)?.[0]||'';
 html=html.replace(/<main\b[^>]*>[\s\S]*?<\/main>/,`<main id="main">${body}${sharing}</main>`)
 .replace(/<title>[\s\S]*?<\/title>/,'<title>수강생 작품 활동 · 목업 | 김정태 배우아카데미</title>')
 .replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="수강생 작품 활동 페이지의 목업입니다. 실제 출연 또는 캐스팅 실적이 아닌 예시 콘텐츠입니다.">');
 fs.writeFileSync(target,html);
}
write('works.html',`${banner}<section class="works-main works-wrap">${notice}<div class="works-header-intro"><div><h2>수강생 작품 활동</h2><p>실제 자료가 준비되면 사진과 작품 정보가 이곳에 들어갑니다.</p></div></div><div class="works-filters" role="group" aria-label="작품 분야 필터"><button class="active" type="button" data-filter="all" aria-pressed="true">전체</button>${samples.map(([category,label])=>`<button type="button" data-filter="${category}" aria-pressed="false">${label}</button>`).join('')}<span class="works-total-badge">04 MOCKUPS</span></div><div class="works-grid">${cards}</div></section>`);
for(const [i,[category,label]] of samples.entries()) {
 write(`works/actor-${i+1}.html`,`${banner}<section class="works-main works-wrap"><a class="back-to-list" href="/works">← 수강생 작품 활동</a>${notice}<div class="profile-hero-grid"><div class="profile-photo-container"><img src="/assets/student-photo-pending.svg" alt="수강생 사진 배치 예시"></div><div class="profile-hero-content"><span class="student-sub-badge">목업 · ${label}</span><h1>수강생 ${String(i+1).padStart(2,'0')}<small>SAMPLE PROFILE</small></h1><p>수강생 소개와 작품 활동 정보가 들어갈 공간입니다.</p><p>작품명 · 배역 · 참여 내용은 실제 자료 확인 후 교체합니다.</p></div></div></section>`);
}
console.log('Built clearly labeled student activity mockups.');
