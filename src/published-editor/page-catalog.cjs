const courses=require('../../content/courses.json');
const primaryPages=[['/','메인 홈페이지'],['/about','아카데미 소개'],['/programs','교육과정'],['/trainers','강사소개'],['/works','수강생 작품'],['/reviews','수강후기'],['/facilities','시설 안내'],['/faq','FAQ'],['/partners','파트너스']];
const detailPages=[
 {title:'교육과정 상세',pages:courses.map(c=>['/courses/'+c.id,c.title+(c.audience?' ('+c.audience+')':'')])},
 {title:'강사 상세 프로필',pages:[['/trainers/pyeon-bo-seung','편보승'],['/trainers/kim-hyung-min','김형민'],['/trainers/im-do-yoon','임도윤']]},
 {title:'수강생 작품 상세',pages:[1,2,3,4].map(i=>['/works/actor-'+i,'작품 프로필 '+i])}
];
function pageTitle(path){return [...primaryPages,...detailPages.flatMap(g=>g.pages)].find(([url])=>url===path)?.[1]||'홈페이지';}
module.exports={primaryPages,detailPages,pageTitle};
