const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
for (const file of ['index.html', 'facilities.html', 'faq.html']) {
 const target = path.join(root, 'dist', file);
 let html = fs.readFileSync(target, 'utf8');
 html = html.replace('서울 강남권 중심 위치 (상세 위치 및 방문 예약 확정 시 개별 안내)', '마곡역 인근 · 로뎀타워 3층');
 html = html.replace('월 — 토: 10:00 ~ 22:00<br>일요일 및 공휴일: 사전 예약 연습실 운영', '수업은 주 1회 진행합니다.<br>반별 수업 요일·개강 일정 및 상담 가능 시간은 추후 안내합니다.');
 html = html.replace('방문 상담은 쾌적한 1:1 안내를 위해 사전 예약제로 운영됩니다.', '마곡역 인근 로뎀타워 3층에 위치해 있습니다.');
 html = html.replace('온라인 간편 상담 신청 시 담당 코치가 직접 연락드립니다.', '상담 담당: 임도윤<br>대표 연락처와 상담 가능 시간은 추후 안내합니다.');
 html = html.replace('정규 과정 수강생에게는 블랙박스 스튜디오와 대본 리딩룸 등 전문 연습 공간을 무료로 지원합니다. 모바일 예약 시스템을 통해 비어있는 시간대에 자유롭게 예약하여 개인 및 팀 연습을 진행하실 수 있습니다.', '강의실과 연습 공간을 갖추고 있습니다. 수업 외 이용 가능 시간, 예약 방법 및 이용 조건은 확정 후 안내합니다.');
 if (file === 'index.html' && !html.includes('id="location-info"')) {
  html = html.replace('<section class="finder section"', '<section class="section" id="location-info"><p class="eyebrow dark">/ LOCATION & CLASS /</p><h2>마곡역 가까이,<br>로뎀타워 3층.</h2><p>주 1회, 회당 3시간(8명 기준) · 반별 최대 8명<br>반별 수업 요일과 개강 일정은 추후 안내합니다.</p><a class="button dark-button" href="/facilities#location">시설과 위치 확인하기 ↗</a></section><section class="finder section"');
 }
 if (file === 'facilities.html') html = html.replace('<!-- 오시는 길 / 위치 안내 -->\n    <section class="section"', '<!-- 오시는 길 / 위치 안내 -->\n    <section id="location" class="section"');
 fs.writeFileSync(target, html);
}
console.log('Verified Magok location and operating information applied.');
