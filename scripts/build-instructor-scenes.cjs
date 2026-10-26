const fs=require('node:fs');const path=require('node:path');const root=path.resolve(__dirname,'..','dist');
const coaches=[['kim-jung-tae','김정태','대표 강사','영화와 드라마에서 쌓아온 배우의 경험을 나눕니다.'],['pyeon-bo-seung','편보승','주임강사','신인배우 지도와 대학 강의 등 연기교육 경력을 만나보세요.'],['im-do-yoon','임도윤','상담 및 강사','연기 코칭 경력과 영화·드라마 작품 이력을 만나보세요.'],['kim-hyung-min','김형민','전임강사','영화·드라마·뮤지컬·연극을 아우르는 배우의 경험을 나눕니다.']];
for(const name of ['index.html','about.html']){
 const p=path.join(root,name);let h=fs.readFileSync(p,'utf8');
 const journeyImages=['kim-jung-tae-teaching-ai.png','im-do-yoon-feedback-ai.png','instructors-group-ai.png'];let i=0;
 h=h.replace(/(<article class="journey-panel[^>]*>[\s\S]*?<img )[^>]+>/g,(_,prefix)=>`${prefix}src="/assets/${journeyImages[i]}" alt="${['김정태 대표 강사의 AI 강의 장면','임도윤 강사의 AI 대본 피드백 장면','실제 강사 네 명을 바탕으로 제작한 AI 단체 이미지'][i++]}" loading="lazy">`);
 h=h.replace(/(<div class="method-image[^>]*>[\s\S]*?<img )[^>]+>/g, '$1src="/assets/pyeon-bo-seung-teaching-ai.png" alt="편보승 주임강사의 AI 연기 지도 장면" loading="lazy">');
 h=h.replace(/(<div class="about-photo[^>]*>[\s\S]*?<img )[^>]+>/g, '$1src="/assets/im-do-yoon-feedback-ai.png" alt="임도윤 강사의 AI 대본 피드백 장면" loading="lazy">');
 h=h.replace(/(<section[^>]*id="mentors"[^>]*>)[\s\S]*?(<div class="carousel"[^>]*>)/, '$1<div class="section-top"><div><p class="eyebrow dark">/ Meet Your Coaches /</p><h2>좋은 질문이,<br>더 깊은 연기를 만듭니다.</h2></div><p>우리의 실제 강사진을 만나보세요.<br>사진은 프로필을 바탕으로 AI로 제작했습니다.<br><a href="/trainers" class="course-button" style="color:#111;border-color:#bb9129;margin-top:10px">전체 강사소개 ↗</a></p></div>$2');
 h=h.replace(/(<section[^>]*id="mentors"[^>]*>[\s\S]*?<div class="carousel-track">)[\s\S]*?(<\/div><div class="carousel-controls">)/,(_,a,b)=>a+coaches.map(([slug,label,title,copy],i)=>`<article class="mentor-card"><div class="portrait instructor-portrait instructor-portrait-${i}"><img src="/assets/instructors-group-ai.png" alt="${label} 강사 AI 이미지" loading="lazy"></div><p class="tag">${title}</p><h3>${label}</h3><p>${copy}</p><a class="course-button" href="/trainers/${slug}">프로필 보기 <span>↗</span></a></article>`).join('')+b);
 fs.writeFileSync(p,h);
}
console.log('Applied actual instructor images to journey, teaching method, academy introduction and mentor cards.');
