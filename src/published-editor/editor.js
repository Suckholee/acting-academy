const {GROUP_SELECTOR,validImage,normalizePage,sharedKey}=require('./model.cjs');
const page=normalizePage(location.pathname);
const adminEntry=new URLSearchParams(location.search).get('admin')==='1';
const defaultCurricula=__KJT_COURRICULUM__;
const groups=[];let pages={},revision=0,ready=false,admin=false,preview=false,dirty=false,returnFocus;
const originals=new Map();
const courseIdFor=element=>{const node=element.querySelector('[data-course-id],[data-course]');return node?.dataset.courseId||node?.dataset.course;};
function elementPath(node){const parts=[];while(node&&node!==document.body){const siblings=node.parentElement?[...node.parentElement.children].filter(n=>n.tagName===node.tagName):[node];parts.unshift(node.tagName.toLowerCase()+':'+siblings.indexOf(node));node=node.parentElement;}return parts.join('/');}
const candidates=[...document.querySelectorAll(GROUP_SELECTOR)];
for(const [index,element] of candidates.entries()){
 const fields=[];
 for(const node of element.querySelectorAll('h1,h2,h3,h4,p,summary,dd,li,small,img,span')){
  if(node.closest(GROUP_SELECTOR)!==element||node.closest('nav,form,.profile-photo-thumbs,[aria-hidden="true"]')||(node.tagName!=='IMG'&&node.closest('button')))continue;
  if(node.tagName==='SMALL'&&node.closest('dd'))continue;
  if(node.tagName==='SPAN'&&(node.children.length||!node.textContent.trim()||node.textContent.trim().length<3))continue;
  if(node.tagName!=='IMG'&&node.querySelector('h1,h2,h3,h4,p,li,span,img'))continue;
  const type=node.tagName==='IMG'?'image':'text';
  const value=type==='image'?node.getAttribute('src'):node.innerText||node.textContent;
  if(!value?.trim())continue;
  const key=sharedKey(page,elementPath(node));
  const course=courseIdFor(element);
  const shared=element.classList.contains('tuition-info')?'tuition':course&&element.classList.contains('course')?'course-'+course:null;
  const trainer=element.querySelector('a[href*="/trainers/"]')?.getAttribute('href')?.split('/').pop()||(element.classList.contains('profile-hero')?page.split('/').pop():null);
  const trainerSlot=trainer&&['김정태','편보승','임도윤','김형민'].includes(value.trim())?'name':trainer&&['대표 강사','주임강사','전임강사','상담 및 강사'].includes(value.trim())?'role':null;
  const curriculumId=element.classList.contains('curriculum')?page.split('/').pop():null;
  const article=node.closest('.curriculum article');const articleIndex=article?[...element.querySelectorAll('article')].indexOf(article):-1;
  const curriculumSlot=articleIndex>=0&&(node.tagName==='H3'||node.tagName==='P')?`step-${articleIndex}-${node.tagName==='H3'?'title':'description'}`:null;
  const courseSlot=course&&element.classList.contains('course')?(node.tagName==='IMG'?0:node.matches('.art-label')?1:node.matches('.art-foot')?2:node.matches('.tag')?3:node.tagName==='H3'?4:node.matches('.course-intro,.course-body p:not(.tag)')?5:fields.length):fields.length;
  const sharedId=curriculumSlot?sharedKey('class-values-'+curriculumId,curriculumSlot):trainerSlot?sharedKey('trainer-'+trainer,trainerSlot):shared?sharedKey(shared,courseSlot):null;
  fields.push({key,sharedId,type,node,value,label:type==='image'?(node.alt||'사진'):node.tagName==='DD'?(node.previousElementSibling?.textContent.trim()||'수업 정보'):trainerSlot==='name'?'강사 이름':trainerSlot==='role'?'강사 직함':value.trim().slice(0,36)});
  originals.set(key,{node,type,value,sharedId,html:node.innerHTML});
 }
 const courseId=element.classList.contains('course')?courseIdFor(element):null;
 if(courseId)for(const [i,step]of (defaultCurricula[courseId]||[]).entries())for(const slot of ['title','description']){
  const node=el('span',step[slot]);const key=sharedKey(page,`values-${courseId}-${i}-${slot}`);const sharedId=sharedKey('class-values-'+courseId,`step-${i}-${slot}`);const f={key,type:'text',node,value:step[slot],sharedId,label:`핵심 가치 ${i+1} ${slot==='title'?'제목':'설명'}`};fields.push(f);originals.set(key,{...f,html:node.innerHTML});
 }
 if(!fields.length)continue;
 const title=element.querySelector('h1,h2,h3')?.textContent.trim()|| (element.classList.contains('tuition-info')?'수강료 및 수업 안내':'홈페이지 영역');
 groups.push({element,fields,title});
}
function setField(field,value){if(field.type==='image'){field.node.setAttribute('src',value);const gallery=field.node.closest('[data-profile-gallery]');if(gallery){const index=[...gallery.querySelectorAll('.profile-photo-slide')].indexOf(field.node);const thumb=gallery.querySelectorAll('.profile-photo-thumbs img')[index];if(thumb)thumb.src=value;}}else {field.node.textContent=value;field.node.style.whiteSpace='pre-line';}}
function refreshLabels(){for(const group of groups){const link=group.element.querySelector('a[href*="/trainers/"]');const name=group.fields.find(f=>f.label==='강사 이름');const role=group.fields.find(f=>f.label==='강사 직함');if(link&&name)link.setAttribute('aria-label',name.node.textContent+' '+(role?.node.textContent||'')+' 프로필 보기');}}
function applyContent(){
 for(const original of originals.values()){const entry=(pages['/shared']||[]).find(e=>e.key===original.sharedId);if(entry&&entry.type===original.type&&(entry.type!=='image'||validImage(entry.value)))setField(original,entry.value);}
 for(const entry of pages[page]||[]){const original=originals.get(entry.key);if(original&&!original.sharedId&&original.type===entry.type&&(entry.type!=='image'||validImage(entry.value)))setField({...original},entry.value);}
 refreshLabels();
}
function draftEntries(){return [...originals].filter(([,f])=>!f.sharedId).map(([key,f])=>({key,type:f.type,value:f.type==='image'?f.node.getAttribute('src'):f.node.innerText||f.node.textContent})).filter(e=>e.value!==originals.get(e.key).value);}
function sharedEntries(){const result=new Map((pages['/shared']||[]).map(e=>[e.key,e]));for(const f of originals.values()){if(!f.sharedId)continue;const value=f.type==='image'?f.node.getAttribute('src'):f.node.innerText||f.node.textContent;if(value!==f.value||result.has(f.sharedId))result.set(f.sharedId,{key:f.sharedId,type:f.type,value});}return [...result.values()];}
function el(tag,text,attrs={}){const n=document.createElement(tag);if(text)n.textContent=text;for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;}
async function request(url,options={}){const r=await fetch(url,{credentials:'same-origin',...options,headers:{'Content-Type':'application/json',...options.headers}});const data=await r.json();if(!r.ok)throw new Error(data.error||'요청을 완료하지 못했습니다.');return data;}
const toggle=el('button','관리자 모드',{type:'button',class:'kjt-editor-toggle',hidden:''});document.body.append(toggle);
const toolbar=el('div',null,{class:'kjt-editor-toolbar','aria-label':'컴포넌트 편집 도구'});
const status=el('span','컴포넌트를 눌러 수정하세요',{role:'status'});
const save=el('button','홈페이지에 저장',{type:'button'});const cancel=el('button','변경 취소',{type:'button'});const view=el('button','방문자 미리보기',{type:'button'});const logout=el('button','로그아웃',{type:'button'});
const membersLink=el('a','회원 관리',{href:'/admin/members'});toolbar.append(status,save,cancel,view,membersLink,logout);document.body.append(toolbar);
const modal=el('dialog',null,{class:'kjt-editor-dialog','aria-label':'컴포넌트 수정'});document.body.append(modal);
const notice=el('p',null,{class:'kjt-editor-notice',role:'status'});
function message(text){status.textContent=text;}
function renderMode(){document.body.classList.toggle('kjt-editing',admin&&!preview);toolbar.hidden=!admin;toggle.hidden=admin||!adminEntry;save.disabled=!dirty||!ready;cancel.disabled=!dirty;view.textContent=preview?'편집 화면으로':'방문자 미리보기';}
function closeModal(){modal.close();returnFocus?.focus();}
function openModal(title){returnFocus=document.activeElement;modal.replaceChildren();const header=el('div',null,{class:'kjt-editor-heading'});const heading=el('h2',title);heading.id='kjt-editor-title';modal.setAttribute('aria-labelledby',heading.id);const close=el('button','닫기',{type:'button'});close.onclick=closeModal;header.append(heading,close);modal.append(header);modal.showModal();}
modal.addEventListener('close',()=>returnFocus?.focus());
modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
function edit(group){
 openModal(`${group.title} 수정`);const profile=group.element.querySelector('a[href*="/trainers/"]')?.getAttribute('href');if(profile)modal.append(el('a','학력·경력·작품은 상세 프로필에서 편집하기',{href:profile}));const form=el('form');const inputs=[];
 const priority=f=>['강사 이름','강사 직함'].includes(f.label)?0:f.node.matches('h1,h2,h3')?1:f.type==='image'?3:f.label.startsWith('커리큘럼')?4:2;
 for(const field of [...group.fields].sort((a,b)=>priority(a)-priority(b))){
  const label=el('label',field.label,{class:'kjt-editor-field'});const input=el(field.type==='image'?'input':'textarea');input.value=field.type==='image'?field.node.getAttribute('src'):field.node.innerText||field.node.textContent;
  if(field.type==='image'){input.type='text';input.inputMode='url';input.placeholder='/assets/사진.jpg 또는 https://…';const file=el('input',null,{type:'file',accept:'image/jpeg,image/png,image/webp'});const upload=el('span','사진 파일은 2MB 이하 JPG·PNG·WEBP');file.onchange=async()=>{const f=file.files[0];if(!f)return;if(f.size>2*1024*1024){notice.textContent='사진은 2MB 이하로 선택해주세요.';return;}file.disabled=true;try{const image=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f);});const data=await request('/api/admin-upload',{method:'POST',body:JSON.stringify({image})});input.value=data.url;notice.textContent='사진을 업로드했습니다. 컴포넌트에 적용 후 홈페이지에 저장하세요.';}catch(e){notice.textContent=e.message;}finally{file.disabled=false;}};label.append(input,file,upload);}else{input.rows=Math.min(6,Math.max(2,input.value.split('\n').length));label.append(input);}
  inputs.push({field,input});form.append(label);
 }
 notice.textContent='컴포넌트에 적용한 뒤 상단의 홈페이지에 저장을 누르세요.';const actions=el('div',null,{class:'kjt-editor-actions'});const discard=el('button','취소',{type:'button'});discard.onclick=closeModal;const apply=el('button','컴포넌트에 적용',{type:'submit'});actions.append(discard,apply);form.append(notice,actions);
 form.onsubmit=e=>{e.preventDefault();if(inputs.some(({field,input})=>input.value.length>12000||(field.type==='image'&&!validImage(input.value)))){notice.textContent='사진 경로 또는 입력 길이를 확인해주세요.';return;}for(const {field,input}of inputs){const current=field.type==='image'?field.node.getAttribute('src'):field.node.innerText||field.node.textContent;if(current===input.value)continue;setField(field,input.value);if(field.sharedId)for(const f of originals.values())if(f.sharedId===field.sharedId)setField(f,input.value);}refreshLabels();dirty=true;renderMode();message('변경사항이 있습니다. 홈페이지에 저장해주세요.');closeModal();};modal.append(form);
}
for(const group of groups){group.element.classList.add('kjt-editable-component');const button=el('button',`${group.title} 수정`,{type:'button',class:'kjt-component-edit'});button.onclick=e=>{e.preventDefault();e.stopPropagation();edit(group);};group.element.append(button);}
document.addEventListener('click',e=>{if(!admin||preview||e.target.closest('.kjt-editor-dialog,.kjt-editor-toolbar,.kjt-component-edit'))return;const group=groups.find(g=>g.element===e.target.closest('.kjt-editable-component'));if(!group)return;e.preventDefault();e.stopImmediatePropagation();edit(group);},true);
toggle.onclick=()=>{openModal('관리자 로그인');const form=el('form');const label=el('label','관리자 비밀번호',{class:'kjt-editor-field'});const input=el('input',null,{type:'password',autocomplete:'current-password',required:''});label.append(input);const help=el('p','운영용 관리자 계정으로 로그인하세요.',{role:'status'});const submit=el('button','로그인',{type:'submit'});form.append(label,help,submit);form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;try{await request('/api/admin-auth',{method:'POST',body:JSON.stringify({password:input.value})});admin=true;renderMode();message(ready?'수정할 컴포넌트를 누르세요.':'저장소 미연결: 편집 미리보기만 가능합니다.');closeModal();}catch(err){help.textContent=err.message;}finally{submit.disabled=false;}};modal.append(form);input.focus();};
save.onclick=async()=>{save.disabled=true;try{const next={...pages,[page]:draftEntries(),'/shared':sharedEntries()};const result=await request('/api/site-content',{method:'PUT',body:JSON.stringify({pages:next,revision})});pages=next;revision=result.revision;dirty=false;message('저장했습니다. 방문자 화면에도 반영됩니다.');}catch(e){message(e.message);}finally{renderMode();}};
cancel.onclick=()=>{if(!confirm('저장하지 않은 변경사항을 취소할까요?'))return;for(const f of originals.values()){if(f.type==='image')f.node.setAttribute('src',f.value);else f.node.innerHTML=f.html;}applyContent();dirty=false;message('저장된 내용으로 되돌렸습니다.');renderMode();};
view.onclick=()=>{preview=!preview;renderMode();};
logout.onclick=async()=>{if(dirty&&!confirm('저장하지 않은 변경이 있습니다. 취소하고 로그아웃할까요?'))return;try{await request('/api/admin-auth',{method:'DELETE'});location.reload();}catch(e){message(e.message);}};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
(async()=>{try{const content=await request('/api/site-content');pages=content.pages||{};revision=content.revision||0;ready=content.ready;applyContent();const auth=await request('/api/admin-auth');admin=auth.authenticated;renderMode();if(admin)message(ready?'수정할 컴포넌트를 누르세요.':'저장소 미연결: 편집 미리보기만 가능합니다.');}catch(e){message(e.message);renderMode();}})();
renderMode();

window.kjtEditableCourse=id=>{const group=groups.find(g=>g.element.classList.contains('course')&&courseIdFor(g.element)===id);const get=(i,slot)=>{const field=[...originals.values()].find(f=>f.sharedId===sharedKey('class-values-'+id,`step-${i}-${slot}`));const saved=(pages['/shared']||[]).find(f=>f.key===sharedKey('class-values-'+id,`step-${i}-${slot}`));return field?.node.textContent??saved?.value??defaultCurricula[id]?.[i]?.[slot]??'';};return {title:group?.element.querySelector('h3')?.textContent,intro:group?.element.querySelector('.course-intro,.course-body p:not(.tag)')?.textContent,steps:(defaultCurricula[id]||[]).map((_,i)=>get(i,'title')+' — '+get(i,'description'))};};
