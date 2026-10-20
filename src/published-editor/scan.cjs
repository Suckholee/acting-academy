const {GROUP_SELECTOR,sharedKey}=require('./model.cjs');
function scan(document,page,defaultCurricula={}){
const groups=[],originals=new Map();
const el=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
const courseIdFor=element=>{const node=element.querySelector('[data-course-id],[data-course]');return node?.dataset.courseId||node?.dataset.course;};
function elementPath(node){const parts=[];while(node&&node!==document.body){const siblings=node.parentElement?[...node.parentElement.children].filter(n=>n.tagName===node.tagName):[node];parts.unshift(node.tagName.toLowerCase()+':'+siblings.indexOf(node));node=node.parentElement;}return parts.join('/');}
const candidates=[...document.querySelectorAll(GROUP_SELECTOR)];
for(const [index,element] of candidates.entries()){
 if(element.matches('.class-planner'))continue;
 const fields=[];
 for(const node of element.querySelectorAll('h1,h2,h3,h4,p,summary,dd,li,small,img,span')){
  if(node.closest(GROUP_SELECTOR)!==element||(node.closest('nav,form,.profile-photo-thumbs')||(node.closest('[aria-hidden="true"]')&&!node.closest('.journey-panel,[data-profile-gallery]')))||(node.tagName!=='IMG'&&node.closest('button')))continue;
  if(node.tagName==='SMALL'&&node.closest('dd'))continue;
  if(node.tagName==='SPAN'&&(node.children.length||!node.textContent.trim()||node.textContent.trim().length<3))continue;
  if(node.tagName!=='IMG'&&node.querySelector('h1,h2,h3,h4,p,li,span,img'))continue;
  const type=node.tagName==='IMG'?'image':'text';
  const value=type==='image'?node.getAttribute('src'):node.innerText||node.textContent;
  if(!value?.trim())continue;
  const key=sharedKey(page,elementPath(node));
  const course=courseIdFor(element);
  const shared=element.classList.contains('tuition-info')?'tuition':course&&element.classList.contains('course')?'course-'+course:null;
  const trainer=element.matches('.faculty-card,.mentor-card,.profile-hero,.instructor-team article')&&(element.querySelector('a[href*="/trainers/"]')?.getAttribute('href')?.split('/').pop()||(element.classList.contains('profile-hero')?page.split('/').pop():null));
  const trainerSlot=trainer&&['김정태','편보승','임도윤','김형민'].includes(value.trim())?'name':trainer&&['대표 강사','주임강사','전임강사','상담 및 강사'].includes(value.trim())?'role':null;
  const curriculumId=element.classList.contains('curriculum')?page.split('/').pop():null;
  const article=node.closest('.curriculum article');const articleIndex=article?[...element.querySelectorAll('article')].indexOf(article):-1;
  const curriculumSlot=articleIndex>=0&&(node.tagName==='H3'||node.tagName==='P')?`step-${articleIndex}-${node.tagName==='H3'?'title':'description'}`:null;
  const courseSlot=course&&element.classList.contains('course')?(node.tagName==='IMG'?0:node.matches('.art-label')?1:node.matches('.art-foot')?2:node.matches('.tag')?3:node.tagName==='H3'?4:node.matches('.course-intro,.course-body p:not(.tag)')?5:fields.length):fields.length;
  const sharedId=curriculumSlot?sharedKey('class-values-'+curriculumId,curriculumSlot):trainerSlot?sharedKey('trainer-'+trainer,trainerSlot):shared?sharedKey(shared,courseSlot):null;
  fields.push({key,sharedId,type,node,value,label:type==='image'?(node.closest('.video-slot-frame')?'영상 표지 이미지 (선택)':node.alt||'사진'):node.tagName==='DD'?(node.previousElementSibling?.textContent.trim()||'수업 정보'):trainerSlot==='name'?'강사 이름':trainerSlot==='role'?'강사 직함':value.trim().slice(0,36)});
  originals.set(key,{node,type,value,sharedId,html:node.innerHTML});
 }
 const courseId=element.classList.contains('course')?courseIdFor(element):null;
 if(courseId)for(const [i,step]of (defaultCurricula[courseId]||[]).entries())for(const slot of ['title','description']){
  const node=el('span',step[slot]);const key=sharedKey(page,`values-${courseId}-${i}-${slot}`);const sharedId=sharedKey('class-values-'+courseId,`step-${i}-${slot}`);const f={key,type:'text',node,value:step[slot],sharedId,label:`핵심 가치 ${i+1} ${slot==='title'?'제목':'설명'}`};fields.push(f);originals.set(key,{...f,html:node.innerHTML});
 }
 for(const frame of element.querySelectorAll('.video-slot-frame')){
  if(frame.closest(GROUP_SELECTOR)!==element)continue;
  const key=sharedKey(page,elementPath(frame)+':video');const sharedId=frame.closest('#instructor-video')?sharedKey('video-instructor','source'):null;
  const field={key,sharedId,type:'video',node:frame,value:'',label:'재생할 영상'};fields.push(field);originals.set(key,{...field});
 }
 if(!fields.length)continue;
 const title=element.querySelector('h1,h2,h3,summary')?.textContent.trim()||element.getAttribute('aria-label')|| (element.classList.contains('tuition-info')?'수강료 및 수업 안내':element.classList.contains('head-source-section')?'프로필 자료·출처':'홈페이지 영역');
 groups.push({element,fields,title,legacyId:sharedKey(page,elementPath(element))});
}

return {groups,originals};
}
module.exports={scan};
