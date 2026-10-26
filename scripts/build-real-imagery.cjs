const fs=require('node:fs');const path=require('node:path');const root=path.resolve(__dirname,'..','dist');
const assets={'classroom.jpg':['im-do-yoon-feedback-ai.png','임도윤 강사 기반 AI 대본 피드백 이미지'],'rehearsal.jpg':['kim-hyung-min-camera-ai.png','김형민 전임강사 기반 AI 카메라 실습 이미지'],'actors.jpg':['instructors-group-ai.png','실제 강사 네 명을 바탕으로 제작한 AI 이미지'],'actor-1.jpg':['student-photo-pending.svg','수강생 사진 준비 중'],'actor-2.jpg':['student-photo-pending.svg','수강생 사진 준비 중'],'actor-3.jpg':['student-photo-pending.svg','수강생 사진 준비 중'],'actor-4.jpg':['student-photo-pending.svg','수강생 사진 준비 중']};
const samples=['foundation','camera','audition','scene'];
function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,item.name);if(item.isDirectory())walk(f);else if(f.endsWith('.html')){
 let h=fs.readFileSync(f,'utf8');
 // Student work pages must never use instructor imagery as student portraits.
 if (f === path.join(root, 'works.html') || f.startsWith(path.join(root, 'works') + path.sep)) {
  h = h.replace(/<img\b[^>]*src="[^"]*assets\/(?:kim-jung-tae-teaching-ai|im-do-yoon-feedback-ai|pyeon-bo-seung-teaching-ai|kim-hyung-min-camera-ai)\.png"[^>]*>/g, '<img src="/assets/student-photo-pending.svg" alt="수강생 사진 준비 중">');
  h = h.replace(/<span class="ai-reference-label"[^>]*>[\s\S]*?<\/span>/g, '');
 }

 h=h.replace(/<article class="faculty-card[^\"]*"[\s\S]*?<\/article>/g,card=>samples.some(slug=>card.includes(`/trainers/${slug}"`))?'':card);
 h=h.replace(/<img\b[^>]*>/g,tag=>{for(const [old,[asset,alt]]of Object.entries(assets)){if(tag.includes('assets/'+old)){const student=/assets\/actor-[1-4]\.jpg/.test(tag);let out=tag.replace(/src="[^"]*"/,`src="/assets/${asset}"`).replace(/alt="[^"]*"/,`alt="${alt}"`);return out;}}return tag;});
 h=h.replace(/<video class="hero-video"[\s\S]*?<\/video>/g,'').replace(/<div class="hero-film-label"[\s\S]*?<\/div>/g,'');
 h=h.replace(/<button[^>]*class="[^"]*video-toggle[^"]*"[^>]*>[\s\S]*?<\/button>/g,'').replace('KJT FILM / 수업 이미지 영상','KJT INSTRUCTORS / AI 수업 이미지');
 h=h.replace(/<button data-filter="(?:basic|camera|audition|scene)"[^>]*>[\s\S]*?<\/button>/g,'');
 h=h.replace(/\d+ COACHES/g,'04 COACHES').replace(/PROFILE SAMPLE[^<.]*(?:\.|<br>)?/g,'').replace(/분야별 소개 예시입니다\./g,'');
 fs.writeFileSync(f,h);
}}}
walk(root);
for(const slug of samples)fs.writeFileSync(path.join(root,'trainers',slug+'.html'),'<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/trainers"><title>실제 강사진 소개</title></head><body><a href="/trainers">실제 강사진 소개 보기</a></body></html>');
console.log('Replaced remaining fictional people imagery and removed sample instructor profiles.');
