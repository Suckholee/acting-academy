const fs=require('node:fs');const path=require('node:path');const root=path.resolve(__dirname,'..','dist');
const summary='월 기본 교습비 40만 원 · 주 1회 · 회당 3시간(8명 기준) · 반별 최대 8명';
const iconPaths = [
 '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M7 15h3"/>',
 '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 11h16m-12 4h3"/>',
 '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m1-15a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v2"/>',
];
const items = [['월 교습비','40만 원'],['주당 수업 횟수','주 1회'],['회당 수업 시간','3시간 <small>8명 기준</small>'],['반별 정원','최대 8명']];
const block=`<section class="section tuition-info" aria-label="교습비 및 수업 안내"><p class="eyebrow dark">/ CLASS INFORMATION /</p><h2>교습비 및 수업 안내</h2><dl class="tuition-grid">${items.map(([label,value],i)=>`<div><dt><span class="tuition-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${iconPaths[i]}</svg></span>${label}</dt><dd>${value}</dd></div>`).join('')}</dl></section>`;
for(const name of ['index.html','programs.html','courses/basic.html','courses/camera.html','courses/audition.html']){
 const file=path.join(root,name);let h=fs.readFileSync(file,'utf8');h=h.replace(/<section class="section tuition-info"[\s\S]*?<\/section>/g,'');
 if(name.startsWith('courses/'))h=h.replace('<section class="section course-notes">',block+'<section class="section course-notes">');else h=h.replace('<section class="finder section"',block+'<section class="finder section"').replace('<section class="finder section"', '<section class="finder section"');
 if(!h.includes('class="section tuition-info"'))h=h.replace('<section class="closing">',block+'<section class="closing">');
 h=h.replace('확정된 수강료와 개강 일정은 아직 등록되지 않았습니다. 교육 상담 연결 후 안내할 예정입니다.',summary+'입니다. 반별 수업 요일과 개강 일정은 상담을 통해 안내합니다.');fs.writeFileSync(file,h);
}
const f=path.join(root,'faq.html');let h=fs.readFileSync(f,'utf8');h=h.replace(/(<summary>한 클래스당 수업 정원은 몇 명인가요\?<\/summary>\s*<p>)[\s\S]*?(<\/p>)/,'$1반별 정원은 최대 8명입니다. 주 1회 수업하며, 회당 수업 시간은 8명 기준 3시간입니다.$2');h=h.replace(/(<summary>수강료 안내와 등록 절차는 어떻게 되나요\?<\/summary>\s*<p>)[\s\S]*?(<\/p>)/,'$1월 기본 교습비는 40만 원입니다. 주 1회, 회당 3시간(8명 기준) 수업하며 반별 정원은 최대 8명입니다. 희망하는 반의 수업 요일과 개강 일정은 교육 상담을 통해 안내합니다.$2');fs.writeFileSync(f,h);console.log('Updated tuition, weekly frequency, class duration and maximum class size.');
