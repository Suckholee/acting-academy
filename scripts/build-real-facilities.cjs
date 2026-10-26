const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const rooms = [
  ['facility-classroom-corrected.png', '연기 강의실', '넓은 우드 바닥과 전면 거울이 있는 강의실입니다.'],
  ['facility-practice-corrected.png', '연습 공간', '유리 벽으로 구분된 공간에서 장면과 대본을 연습합니다.'],
  ['facility-common-corrected.png', '공용 공간', '수업 전후 준비를 위한 싱크대와 수납 공간입니다.'],
];
const cards = rooms.map(([image, title, copy]) => `<article class="facility-card"><button class="gallery-open" data-image="/assets/${image}" data-caption="${title}" data-note="실제 시설 사진 · AI 보정" aria-label="${title} 사진 크게 보기"><img src="/assets/${image}" alt="${title} 실제 사진 AI 보정본" loading="lazy"><span>크게 보기 ＋</span></button><h3>${title}</h3><p>${copy}</p></article>`).join('');
for (const file of ['index.html', 'facilities.html']) {
  const target = path.join(root, 'dist', file);
  let html = fs.readFileSync(target, 'utf8');
  html = html.replace(/(<div class="carousel" data-carousel="facilities"[^>]*>\s*<div class="carousel-track">)[\s\S]*?(<\/div>\s*<div class="carousel-controls">)/, `$1${cards}$2`);
  html = html.replace('연습부터 촬영까지, 공간 구성 예시.<br>사진은 실제 학원 시설이 아닌 참고 이미지입니다.', '직접 촬영한 아카데미의 공간입니다.<br>밝기·균형 보정 및 촬영자·공사 자재 제거를 적용했습니다.');
  html = html.replace('최적의 연습 환경을 갖춘<br>3대 전문 공간.', '수업과 연습이 이어지는<br>우리의 공간.');
  html = html.replace('수업뿐만 아니라 수강생의 개인 및 팀 연습을 위한<br>예약제 자율 연습실을 상시 지원합니다.', '직접 촬영한 실제 시설 사진입니다.<br>AI로 밝기와 균형을 보정하고 촬영자·공사 자재를 제거했습니다.');
  html = html.replace('블랙박스 스튜디오, 대본 리딩룸, 쇼케이스 무대. 배우의 몰입을 돕는 김정태 배우아카데미 시설 안내.', '실제 연기 강의실, 연습 공간, 공용 공간 사진으로 보는 김정태 배우아카데미 시설 안내.');
  html = html.replace('배우의 호흡과 움직임, 카메라 렌즈의 작은 각도까지 온전히 집중할 수 있도록 세심하게 구성된 전문 트레이닝 및 촬영 환경입니다.', '호흡과 움직임을 익히는 강의실부터 장면을 연습하는 공간까지, 아카데미의 실제 공간을 소개합니다.');
  // Replace unsupported equipment and operating promises with visible facility information.
  html = html.replace(/<!-- 공간 상세 및 연습실 운영 안내 -->[\s\S]*?<!-- 오시는 길 \/ 위치 안내 -->/, `<section class="section" style="max-width:1180px;margin:0 auto;padding:60px max(4vw,20px)"><p class="eyebrow dark">/ Our Space /</p><h2>공간을 둘러보세요.</h2><p>전면 거울과 우드 바닥, 유리로 구분된 연습 공간, 수납과 준비를 위한 공용 공간을 갖추고 있습니다.<br>방문 및 공간 이용 안내는 상담을 통해 확인해 주세요.</p></section><!-- 오시는 길 / 위치 안내 -->`);
  fs.writeFileSync(target, html);
}
console.log('Actual facility photographs applied to home and facilities pages.');
