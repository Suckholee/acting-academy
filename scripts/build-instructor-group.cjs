const fs=require('node:fs');const path=require('node:path');const root=path.resolve(__dirname,'..');
const coaches=[['kim-jung-tae','김정태','대표 강사'],['pyeon-bo-seung','편보승','주임강사'],['im-do-yoon','임도윤','상담 및 강사'],['kim-hyung-min','김형민','전임강사']];
for(const file of ['index.html','about.html']){
 const target=path.join(root,'dist',file);let html=fs.readFileSync(target,'utf8');
 html=html.replace(/<section class="actors-section[^\"]*" id="stories">[\s\S]*?<\/section>/,`<section class="actors-section scene-atmosphere scene-atmosphere-${file==='index.html'?'jung-tae':'pyeon'} instructor-team" id="stories"><div class="actors-heading"><div><p class="eyebrow">/ OUR INSTRUCTORS /</p><h2>서로 다른 얼굴,<br>각자의 빛나는 장면.</h2></div><p>김정태 배우아카데미의 강사진을 만나보세요.<br><a class="course-button" href="/trainers">전체 강사소개 ↗</a></p></div><div class="portrait-window"><div class="portrait-grid">${coaches.map(([slug,name,title],i)=>`<article><a href="/trainers/${slug}" aria-label="${name} ${title} 프로필 보기"><div class="portrait instructor-portrait instructor-portrait-${i}"><img src="/assets/instructors-group-ai.png" alt="${name} 강사 AI 프로필 이미지" loading="lazy"></div><h3>${name}</h3><p>${title}</p></a></article>`).join('')}</div></div><div class="motion-controls"><span>OUR INSTRUCTORS / 01—04</span><button type="button" data-team-motion aria-pressed="false">모션 일시정지 Ⅱ</button></div><p class="team-image-credit">강사 프로필 사진을 바탕으로 AI로 제작한 이미지입니다.</p><div class="actors-word" aria-hidden="true">KIM JUNG TAE</div></section>`);
 if(!html.includes('src="/instructor-team.js"'))html=html.replace('</body>','<script src="/instructor-team.js" defer></script></body>');
 fs.writeFileSync(target,html);
}
console.log('Updated home and academy introduction with four-instructor group portrait.');
