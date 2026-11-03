const SECTIONS=[
  {id:'other_public',label:'기타 공개 페이지',selector:'main',fallback:true},
  {id:'application',label:'수강 상담 신청 페이지',selector:'#enrollment-root'},
  {id:'event_application',label:'무료 특강 신청 페이지',selector:'main.event-layout'},
  {id:'event_popup',label:'첫 안내 팝업',selector:'dialog.academy-event-popup[open]',overlay:true},
  {id:'hero',label:'첫 화면',selector:'main > .hero'},
  {id:'intro_video',label:'아카데미 소개 영상',selector:'#instructor-video'},
  {id:'reel',label:'홍보 영상 모음',selector:'#academy-reel'},
  {id:'about',label:'아카데미 소개',selector:'#about'},
  {id:'programs',label:'교육과정',selector:'#programs'},
  {id:'journey',label:'배우 성장 과정',selector:'main > .journey'},
  {id:'method',label:'수업 방식',selector:'#method'},
  {id:'stories',label:'강사진 소개',selector:'#stories'},
  {id:'reviews',label:'수강후기',selector:'#reviews'},
  {id:'mentors',label:'교육진 프로필',selector:'#mentors'},
  {id:'facilities',label:'시설 안내',selector:'#facilities'},
  {id:'location',label:'오시는 길',selector:'#location-info'},
  {id:'tuition',label:'교습비 안내',selector:'main > .tuition-info'},
  {id:'finder',label:'수업 찾기',selector:'#find'},
  {id:'faq',label:'자주 묻는 질문',selector:'#faq'},
  {id:'partners',label:'파트너스',selector:'#partners'},
  {id:'closing',label:'상담 신청 안내',selector:'main > .closing'},
];
const TIME_EVENTS={section_time_10s:10,section_time_5s:5,section_time_1s:1};
const DWELL_PATHS=['/','/index.html','/apply','/apply.html','/events/kim-jung-tae-20261107','/events/kim-jung-tae-20261107.html'];
module.exports={SECTIONS,TIME_EVENTS,DWELL_PATHS};
