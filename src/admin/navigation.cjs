const groups=[
 {id:'home',label:'대시보드',items:[['/admin','업무 대시보드']]},
 {id:'casting',label:'오디션 관리',items:[['/admin/casting','공고 · 배역'],['/admin/casting?section=applicants','지원자 검토'],['/admin/casting?section=schedule','오디션 일정'],['/admin/casting?section=messages','안내문 준비'],['/admin/casting?section=report','접수 통계']]},
 {id:'website',label:'홈페이지 관리',items:[['/admin/website','페이지 편집'],['/admin/members','회원 관리']]},
 {id:'content',label:'콘텐츠 관리',items:[['/admin/editorial','블로그 · 콘텐츠 발행'],['/admin/ai','AI 작업실'],['/admin/visitor-sources','방문 · 유입 통계']]},
 {id:'consultation',label:'상담 · 신청 관리',items:[['/admin/admissions','상담 신청'],['/admin/consultation','상담실'],['/admin/event-applications','무료특강 신청']]},
 {id:'settings',label:'설정',items:[['/admin/settings','로그인 · 운영 설정'],['/admin/casting?section=settings','지원서 보관'],['/admin/casting?section=security','오디션 보안']]}
];
const websitePages=[['/','홈'],['/about','아카데미 소개'],['/programs','교육과정'],['/trainers','강사소개'],['/works','수강생 작품 활동'],['/reviews','수강후기'],['/facilities','시설 안내'],['/faq','자주 묻는 질문'],['/notices','공지사항']];
function normalized(path){return path.replace(/\.html$/,'').replace(/\/$/,'')||'/';}
function activeItem(url){const u=new URL(url,'https://www.kactstar.com'),path=normalized(u.pathname);if(u.searchParams.get('admin')==='1')return '/admin/website';if(path==='/admin/casting'){const view=u.searchParams.get('view')||u.searchParams.get('section')||'';return ['applicants','schedule','messages','report','settings','security'].includes(view)?'/admin/casting?section='+view:'/admin/casting';}return path;}
function safeReturn(value){try{if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||value.includes('\\'))return '/admin';const u=new URL(value,'https://www.kactstar.com');if(u.origin!=='https://www.kactstar.com')return '/admin';const path=normalized(u.pathname);if(groups.flatMap(g=>g.items).some(([href])=>new URL(href,'https://www.kactstar.com').pathname===path)&&path!=='/admin')return u.pathname+u.search+u.hash;if(u.searchParams.get('admin')==='1'&&(websitePages.some(([p])=>p===path)||/^\/(trainers|courses|works)\/[a-z0-9-]+$/.test(path)))return u.pathname+u.search+u.hash;}catch{}return '/admin';}
function navigation(url){const u=new URL(url,'https://www.kactstar.com'),callId=u.searchParams.get('callId'),valid=/^[a-f0-9-]{36}$/i.test(callId||'');return groups.map(g=>({...g,items:g.items.map(([href,label])=>{if(valid&&href.startsWith('/admin/casting?section='))href='/admin/casting?'+new URLSearchParams({callId,view:new URL(href,u).searchParams.get('section')});return {href,label,active:activeItem(href)===activeItem(u.href)};})}));}
module.exports={groups,websitePages,normalized,activeItem,safeReturn,navigation};
