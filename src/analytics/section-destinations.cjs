const {SECTIONS}=require('./sections.cjs');
const anchors={hero:'hero',intro_video:'instructor-video',reel:'academy-reel',about:'about',programs:'programs',journey:'journey',method:'method',stories:'stories',reviews:'reviews',mentors:'mentors',facilities:'facilities',location:'location-info',tuition:'tuition-info',finder:'find',faq:'faq',partners:'partners',closing:'closing'};
const destinations=Object.fromEntries(Object.entries(anchors).map(([id,anchor])=>[id,{href:'/#'+anchor,image:'/assets/analytics-previews/'+id+'.jpg',context:'홈페이지 안의 측정 구간'}]));
destinations.application={href:'/apply',image:'/assets/analytics-previews/application.jpg',context:'수강 상담 신청 화면 전체'};
destinations.event_application={href:'/events/kim-jung-tae-20261107',image:'/assets/analytics-previews/event_application.jpg',context:'무료 특강 안내·신청 화면 전체'};
destinations.event_popup={href:'/#announcement',image:'/assets/events/november-2026/meta-poster-3.webp',context:'홈페이지 첫 안내 팝업 · 포스터 전체 합산'};
const relatedPages=[['아카데미 소개','/about'],['교육과정','/programs'],['강사소개','/trainers'],['수강생 작품','/works'],['수강후기','/reviews'],['시설 안내','/facilities'],['자주 묻는 질문','/faq'],['파트너스','/partners']];
function sectionDestination(section){
  const id=section.id??SECTIONS.find(item=>item.label===section.label)?.id;
  return Object.hasOwn(destinations,id)?destinations[id]:null;
}
module.exports={sectionDestination,relatedPages};
