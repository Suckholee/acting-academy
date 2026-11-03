const links=[
 ['/about','아카데미 소개'],
 ['/programs','교육과정'],
 ['/trainers','강사소개'],
 ['/works','수강생 작품 활동'],
 ['/reviews','수강후기'],
 ['/facilities','시설 안내'],
 ['/faq','자주 묻는 질문'],
 ['/journal','연기 노트'],
 ['/ai-audition','AI 오디션'],
 ['/notices','공지사항']
];
function siteHeader(current='/journal'){
 const menu=links.map(([href,label])=>`<a href="${href}"${href===current?' aria-current="page"':''}>${label}</a>`).join('');
 return `<header class="journal-nav journal-site-header"><a href="/" class="journal-brand" aria-label="김정태 배우아카데미 홈"><span class="journal-brand-ko">김정태 <span class="journal-brand-category">배우아카데미</span></span><span class="journal-brand-en">KIM JUNG TAE ACTING ACADEMY</span></a><nav class="journal-desktop-menu" aria-label="주 메뉴">${menu}</nav><a href="/apply" class="journal-cta journal-site-consult">상담 신청 ↗</a><details class="journal-mobile-menu"><summary aria-label="전체 메뉴">메뉴 <span aria-hidden="true">☰</span></summary><nav aria-label="전체 메뉴">${menu}<a href="/apply" class="journal-menu-consult">상담 신청 ↗</a></nav></details></header>`;
}
module.exports={links,siteHeader};
