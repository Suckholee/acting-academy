const {escape:e,imageURL}=require('./model.cjs');
const courses=require('../../content/courses.json');
const {graph,jsonScript,modifiedAt}=require('./structured.cjs');
const ORIGIN='https://www.kactstar.com';
const {siteHeader}=require('./navigation.cjs');
const {cardTitle}=require('./presentation.cjs');
function shell(title,description,body,path='/journal',status=200,structured=null,preview=false){return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)} | 김정태 배우아카데미</title><meta name="description" content="${e(description)}">${preview?'<meta name="robots" content="noindex,nofollow">':status===200?'':'<meta name="robots" content="noindex">'}<link rel="canonical" href="${ORIGIN}${path}"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:type" content="article"><meta property="og:url" content="${ORIGIN}${path}">${structured?`<script type="application/ld+json">${jsonScript(structured)}</script>`:''}<link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/editorial.css"></head><body class="editorial-body">${siteHeader()}<main class="journal-main">${body}</main><footer class="journal-footer">김정태 배우아카데미 · 주식회사 스토리나인 <a href="/privacy">개인정보 처리방침</a></footer></body></html>`;}
function photo(card,cls=''){try{return card?.image?`<img class="${cls}" src="${e(imageURL(card.image))}" alt="${e(card.imageAlt||card.title)}" loading="lazy">`:'';}catch{return '';}}
function paragraphs(text){return String(text||'').split(/\n\s*\n/).map(p=>`<p>${e(p).replaceAll('\n','<br>')}</p>`).join('');}
function isWebtoon(card){return /웹툰|webtoon/i.test([card.title,card.imageAlt,card.imagePrompt].join(' '));}
function illustration(card){
 if(!card)return '';
 const img=photo(card,'journal-illustration-image');if(!img)return '';
 return `<figure class="journal-illustration${isWebtoon(card)?' journal-illustration-webtoon':''}">${img}</figure>`;
}
function articleBody(a,{preview=false}={}){
 const course=courses.find(c=>c.id===a.course),date=new Date(a.publishedAt).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'});
 const pictures=a.cards.filter(c=>c.image&&!isWebtoon(c)),webtoons=a.cards.filter(c=>c.image&&isWebtoon(c));
 const questions=a.sections||[],webtoonAfter=Math.min(1,questions.length-1);
   const cards=a.cards.map((c,i)=>`<article class="editorial-card ${i===0?'card-cover':''} ${cardTitle(c).length>32||c.body.length>120?'card-dense':''}"><div class="card-eyebrow">ACTOR'S NOTE <span>${String(i+1).padStart(2,'0')} / ${String(a.cards.length).padStart(2,'0')}</span></div><div class="card-photo">${photo(c)}</div><h3>${e(cardTitle(c))}</h3><p>${e(c.body)}</p><div class="card-brand">김정태 배우아카데미</div></article>`).join('');
   const direct=a.question&&a.answer?`<section class="journal-direct-answer" aria-labelledby="answer-question"><p class="journal-label">먼저 답해드리면</p><h2 id="answer-question">${e(a.question)}</h2>${paragraphs(a.answer)}</section>`:'';
   const toc=(a.sections||[]).length?`<nav class="journal-toc" aria-label="본문 목차"><p>이 글에서 답하는 질문</p><ol>${a.sections.map((q,i)=>`<li><a href="#question-${i+1}">${e(q.question)}</a></li>`).join('')}${a.faq?.length?'<li><a href="#related-questions">이어서 궁금할 질문</a></li>':''}</ol></nav>`:'';
   const sections=questions.map((q,i)=>`<section class="journal-answer-section" aria-labelledby="question-${i+1}"><h2 id="question-${i+1}">${e(q.question)}</h2><div class="journal-prose">${paragraphs(q.answer)}</div>${illustration(pictures[i+1])}</section>${i===webtoonAfter?webtoons.map(illustration).join(''):''}`).join('');
   const remaining=pictures.slice(questions.length+1).map(illustration).join('')+(questions.length?'':webtoons.map(illustration).join(''));
   const faq=a.faq?.length?`<section id="related-questions" class="journal-related"><h2>이어서 궁금할 질문</h2>${a.faq.map(q=>`<div class="journal-related-item"><h3>${e(q.question)}</h3>${paragraphs(q.answer)}</div>`).join('')}</section>`:'';
   const sources=a.sources?.length?`<section id="sources" class="journal-sources"><h2>확인한 출처</h2><ol>${a.sources.map(s=>`<li><a href="${e(s.url)}" target="_blank" rel="noopener noreferrer">${e(s.title)}</a></li>`).join('')}</ol></section>`:'';
   const updated=new Date(modifiedAt(a)).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'});
   const meta=preview&&!a.publishedAt?`작성 · ${e(a.author)}<br>게시 전 · 비공개 초안`:`작성 · ${e(a.author)}<br>게시 <time datetime="${e(a.publishedAt)}">${e(date)}</time> · 최근 수정 <time datetime="${e(modifiedAt(a))}">${e(updated)}</time>`;
   const body=`<article class="journal-article"><nav class="journal-breadcrumb" aria-label="페이지 경로"><a href="/">홈</a><span aria-hidden="true">/</span><a href="/journal">연기 노트</a></nav><p class="journal-label">AUDITION QUESTIONS</p><h1>${e(a.title)}</h1><p class="journal-summary">${e(a.summary)}</p>${illustration(pictures[0])}${direct}<p class="journal-meta">${meta}</p>${toc}<div class="journal-prose">${paragraphs(a.body)}</div>${sections}${remaining}${faq}${sources}<section class="journal-cards" aria-labelledby="cards-title"><h2 id="cards-title">카드로 다시 보기</h2><div class="card-strip">${cards}</div></section><aside class="journal-consult"><h2>나에게 필요한 다음 준비는?</h2><p>${course?e(course.title)+' 과정과 수업을 상담해보세요.':'연기·촬영·오디션 준비를 함께 이야기해보세요.'}</p><a class="journal-cta" href="/apply${course?'?course='+course.id:''}">수강 상담하기 ↗</a></aside></article>`;
 return body;
}
function articleDocument(a,{preview=false}={}){return shell(a.title,a.summary,articleBody(a,{preview}),preview?'/admin/editorial':'/journal/'+a.id,200,preview?null:graph(a),preview);}
module.exports={shell,photo,paragraphs,articleBody,articleDocument};
