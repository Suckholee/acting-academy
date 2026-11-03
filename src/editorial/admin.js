import {cardPreview,downloadCard} from './cards.js';
import {uploadImage} from '../operations/ui.js';
const {createPublicationPreview}=require('./preview.cjs');
const {content}=require('./model.cjs');
const courses=require('../../content/courses.json');
const root=document.querySelector('#editorial-admin');
const el=(tag,text,attrs={})=>{const n=document.createElement(tag);if(text!==null&&text!==undefined)n.textContent=text;for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
let viewMode='preview';
let records=[],current=null,dirty=false,busy=false,aiReady=false,demo=false,offset=0,nextOffset=null,imageConsent=false;
const blank=()=>({title:'',summary:'',body:'',author:'김정태 배우아카데미',course:'',question:'',answer:'',sections:[],faq:[],sources:[],cards:Array.from({length:5},()=>({title:'',body:'',image:'',imageAlt:'',imagePrompt:''}))});
async function request(url,options={}){const r=await fetch(url,{credentials:'same-origin',...options,headers:{'Content-Type':'application/json',...options.headers}});let data;try{data=await r.json();}catch{throw Error('응답을 확인하지 못했습니다. 입력을 보관하고 다시 시도해주세요.');}if(!r.ok)throw Error(data.error||'작업을 완료하지 못했습니다.');return data;}
function field(parent,title,value,{area=false,max=100,rows=3,...attrs}={}){const label=el('label',title,{class:'editorial-field'}),input=el(area?'textarea':'input',null,{...(area?{rows:String(rows)}:{type:'text'}),maxlength:String(max),...attrs});input.value=value;label.append(input);parent.append(label);return input;}
function button(parent,title,run,cls=''){const b=el('button',title,{type:'button',class:cls});b.onclick=run;parent.append(b);return b;}
function check(parent,title){const label=el('label',null,{class:'editorial-check'}),input=el('input',null,{type:'checkbox'});label.append(input,el('span',title));parent.append(label);return input;}
function mayLeave(){return !dirty||confirm('저장하지 않은 수정 내용이 있습니다. 다른 글을 여시겠어요?');}
function lock(value){busy=value;root.setAttribute('aria-busy',String(value));root.querySelectorAll('button,input,textarea,select').forEach(n=>n.disabled=value);if(!value){const generate=root.querySelector('[data-generate]');if(generate)generate.disabled=!aiReady;}}
async function load(){const data=await request('/api/admin-editorial?offset='+offset);records=data.records;nextOffset=data.nextOffset;aiReady=data.aiReady;demo=data.demo;if(!current&&records.length){current=structuredClone(records[0]);viewMode='preview';}render();}
async function open(id){if(busy||!mayLeave())return;try{const {record}=await request('/api/admin-editorial?id='+id);current=record;dirty=false;viewMode='preview';render();}catch(error){message(error.message);}}
let notice;
function message(text){if(notice)notice.textContent=text;}
function render(){
 root.replaceChildren();root.append(el('p','CONTENT STUDIO',{class:'journal-label'}),el('h1','정보성 콘텐츠 발행'),el('p','발행될 모습으로 글과 이미지를 확인하고, 필요한 내용을 편집하세요.',{class:'editorial-subtitle'}));
 if(demo)root.append(el('p','미리보기 모드 · AI 생성 예시와 저장은 이 기기에서만 시연됩니다.',{class:'editorial-demo'}));
 const workspace=el('div',null,{class:'editorial-workspace'}),sidebar=el('aside',null,{class:'editorial-library','aria-label':'저장한 글'}),main=el('div',null,{class:'editorial-main'});workspace.append(sidebar,main);root.append(workspace);
 const top=el('div',null,{class:'editorial-library-top'});top.append(el('h2','콘텐츠 목록'));button(top,'새 글',()=>{if(mayLeave()){current=null;dirty=false;render();}});sidebar.append(top);
 if(!records.length)sidebar.append(el('p','저장한 초안이 없습니다.',{class:'editorial-muted'}));
 for(const r of records){const b=button(sidebar,r.draft.title,()=>open(r.id),'editorial-record');b.setAttribute('aria-pressed',String(r.id===current?.id));b.append(el('span',r.published?(JSON.stringify((({modifiedAt,...text})=>text)(r.published))===JSON.stringify(r.draft)?'게시 중':'게시 중 · 수정 초안'):'비공개 초안'));}
 const paging=el('div',null,{class:'editorial-pagination'});if(offset)button(paging,'이전',async()=>{if(mayLeave()){offset=Math.max(0,offset-50);current=null;dirty=false;await load();}});if(nextOffset!==null)button(paging,'다음',async()=>{if(mayLeave()){offset=nextOffset;current=null;dirty=false;await load();}});sidebar.append(paging);
 if(current&&viewMode==='preview'){
  notice=el('p','',{role:'status','aria-live':'polite',class:'editorial-status'});main.append(notice);
  main.append(createPublicationPreview(current,{onEdit:()=>{viewMode='edit';render();}}));
  if(dirty)message(current.id?'저장하지 않은 수정 내용의 미리보기입니다. 내용 편집에서 비공개로 저장할 수 있습니다.':'아직 저장하지 않은 초안입니다. 내용을 편집한 뒤 비공개로 저장해주세요.');
  return;
 }
 const generate=el('form',null,{class:'editorial-generator'});generate.append(el('h2','어떤 고민에 답할까요?'));
 const keywords=field(generate,'준비생의 질문·키워드',current?.keywords||'',{max:300,placeholder:'예: 연기 경험이 없는데 첫 오디션은 어떻게 준비하나요?',name:'keywords',required:'',minlength:'2'});
 const suggestions=el('details',null,{class:'editorial-topic-suggestions'});suggestions.append(el('summary','주제로 고를 수 있는 질문'));const topics=el('div',null,{class:'editorial-topic-buttons'});for(const text of ['연기 경험이 없는데 첫 오디션은 어떻게 준비하나요?','직장인이 퇴근 후 오디션을 준비하려면 무엇부터 해야 하나요?','30대에 연기를 시작해도 오디션에 지원할 수 있나요?','자유연기 대본은 어떻게 고르고 몇 분으로 준비하나요?','셀프테이프에서 카메라를 봐야 하나요?','오디션에서 계속 떨어지는데 무엇을 점검해야 하나요?','프로필 사진과 연기 영상 중 무엇을 먼저 준비해야 하나요?'])button(topics,text,()=>{keywords.value=text;keywords.focus();});suggestions.append(topics);generate.append(suggestions);
 const context=field(generate,'강사 경험·참고 내용 (선택)','',{area:true,max:4000,rows:3,placeholder:'실제 지도 기준, 강사 경험, 확인한 공고의 관련 원문을 적어주세요. 개인정보는 제외해주세요.'});
 const references=field(generate,'공개 참고 자료 (선택)',(current?.draft?.sources||[]).map(s=>s.title+' | '+s.url).join('\n'),{area:true,max:14000,rows:2,placeholder:'한 줄에 자료명 | https://공식자료주소'});generate.append(el('p','원문을 확인한 자료만 적어주세요. 근거로 쓸 문장은 위 참고 내용에도 함께 넣어주세요.',{class:'editorial-muted'}));
 const consent=check(generate,'키워드·참고 내용·카드 문구를 외부 AI에 전송해 글과 이미지를 만드는 데 동의합니다.');
 const actions=el('div',null,{class:'editorial-actions'}),make=el('button','글·카드뉴스 초안 만들기',{type:'submit',class:'editorial-primary','data-generate':''});make.disabled=!aiReady;actions.append(make);button(actions,'직접 작성',()=>{if(mayLeave()){current={draft:blank(),keywords:keywords.value,review_notes:[]};dirty=true;viewMode='edit';render();}});generate.append(actions);
 if(!aiReady)generate.append(el('p','AI 연결이 준비되지 않았습니다. 직접 작성과 초안 저장은 이용할 수 있습니다.',{class:'editorial-muted'}));
 if(current){const details=el('details',null,{class:'editorial-regenerate'});details.append(el('summary','새 초안 만들기'));generate.append(details);for(const child of [...generate.children])if(child!==details)details.append(child);}
 const genStatus=el('p','',{role:'status','aria-live':'polite'});generate.append(genStatus);main.append(generate);
 generate.onsubmit=async event=>{event.preventDefault();if(busy)return;if(!consent.checked){genStatus.textContent='AI 전송 안내에 동의해주세요.';return;}if(!mayLeave())return;lock(true);genStatus.textContent='글과 카드뉴스 초안을 만들고 있습니다…';try{const result=await request('/api/admin-editorial',{method:'POST',body:JSON.stringify({action:'generate',keywords:keywords.value.trim(),context:context.value.trim(),sources:readSources(references.value),consent:true})});current={draft:result.draft,keywords:keywords.value.trim(),review_notes:result.reviewNotes};dirty=true;imageConsent=true;viewMode='preview';render();lock(true);await generateMissingImages();render();message(result.mode==='demo'?'시연용 사진이 포함된 예시입니다. 실제 AI 생성 결과가 아닙니다.':'글과 이미지 초안을 만들었습니다. 내용을 확인하고 저장해주세요.');}catch(error){if(current){render();message(error.message+' 완성된 글과 이미지는 화면에 보관됩니다.');}else genStatus.textContent=error.message;}finally{lock(false);}};
 notice=el('p','',{role:'status','aria-live':'polite',class:'editorial-status'});main.append(notice);
 if(current)renderEditor(main);else main.append(el('div','위에 키워드를 입력하거나 저장한 글을 선택해주세요.',{class:'editorial-start'}));
}
function renderEditor(parent){
 const draft=current.draft;draft.sections ||= [];draft.faq ||= [];draft.sources ||= [];const form=el('form',null,{class:'editorial-editor'});parent.append(form);
 const heading=el('div',null,{class:'editorial-editor-heading'});heading.append(el('h2','내용 확인과 편집'),el('span',current.published?'게시 중 · 수정은 다시 게시해야 공개됩니다.':'비공개 초안',{class:'editorial-badge'}));form.append(heading);
 button(heading,'발행 화면으로 보기',()=>{try{updateDraft();content(draft);viewMode='preview';render();}catch(error){message('글 제목·본문·카드 문구와 출처 주소를 확인한 뒤 미리보기를 열어주세요.');}});
 const title=field(form,'글 제목',draft.title,{max:100,name:'article-title',required:''});
 const question=field(form,'이 글이 답하는 대표 질문',draft.question||'',{max:180,placeholder:'예: 셀프테이프에서 카메라를 봐야 하나요?'}),answer=field(form,'먼저 보여줄 핵심 답변',draft.answer||'',{area:true,max:600,rows:4,placeholder:'질문에 바로 답하고, 달라질 수 있는 조건도 함께 적어주세요.'});
 const summary=field(form,'짧은 소개',draft.summary,{area:true,max:300,rows:2,required:''});
 const body=field(form,'도입·독자 상황',draft.body,{area:true,max:14000,rows:12,required:'',minlength:'20'});
 const qaFields={};
 for(const [key,heading,max]of [['sections','상황별 질문과 구체적인 답변',6],['faq','이어서 궁금할 관련 질문',5]]){
  const section=el('section',null,{class:'editorial-qa-fields'});section.append(el('h2',heading));qaFields[key]=[];
  const pairs=draft[key].length?draft[key]:Array.from({length:2},()=>({question:'',answer:''}));
  pairs.forEach((pair,i)=>{const box=el('fieldset');box.append(el('legend',(key==='sections'?'상황별 질문 ':'관련 질문 ')+(i+1)));const q=field(box,(key==='sections'?'상황별 ':'관련 ')+(i+1)+' 질문',pair.question,{max:180}),a=field(box,(key==='sections'?'상황별 ':'관련 ')+(i+1)+' 답변',pair.answer,{area:true,max:2200,rows:4});qaFields[key].push({q,a});button(box,'이 질문 삭제',()=>{qaFields[key].splice(i,1);updateDraft();dirty=true;render();});section.append(box);});
  if(pairs.length<max)button(section,'질문 추가',()=>{updateDraft();draft[key].push({question:'',answer:''});dirty=true;render();});form.append(section);
 }
 const referenceEditor=field(form,'확인한 공개 출처',(draft.sources||[]).map(s=>s.title+' | '+s.url).join('\n'),{area:true,max:14000,rows:3,placeholder:'한 줄에 자료명 | https://공식자료주소'});
 const meta=el('div',null,{class:'editorial-meta-fields'}),author=field(meta,'작성자·검수자 표시',draft.author,{max:60,required:''}),courseWrap=el('label','관련 교육과정 (선택)',{class:'editorial-field'}),course=el('select');course.append(el('option','공통 상담 안내',{value:''}));for(const c of courses)course.append(el('option',c.title,{value:c.id}));course.value=draft.course;courseWrap.append(course);meta.append(courseWrap);form.append(meta);
 if(current.review_notes?.length){const notes=el('details',null,{class:'editorial-review-notes',open:''});notes.append(el('summary','게시 전 확인할 내용'));const list=el('ul');for(const n of current.review_notes)list.append(el('li',n));notes.append(list);form.append(notes);}
 const cardHeading=el('div',null,{class:'editorial-editor-heading'});cardHeading.append(el('h2','카드뉴스 이미지와 문구'));form.append(cardHeading);
 const imageApproval=check(form,'카드 문구와 이미지 설명을 외부 AI에 전송해 이미지를 생성하는 데 동의합니다.');imageApproval.checked=imageConsent;imageApproval.onchange=()=>{imageConsent=imageApproval.checked;};
 form.append(el('p','각 카드에 이미지를 넣어주세요. AI 이미지는 가상 장면입니다. 실제 사진으로 교체할 수 있습니다.',{class:'editorial-muted'}));
 button(form,'빠진 이미지 모두 생성',async()=>{if(busy)return;if(!imageApproval.checked){message('이미지 AI 전송 안내에 동의해주세요.');return;}updateDraft();lock(true);try{await generateMissingImages();render();message('카드 이미지를 모두 준비했습니다. 확인 후 초안을 저장해주세요.');}catch(error){render();message(error.message);}finally{lock(false);}});
 const cardFields=el('div',null,{class:'editorial-card-fields'});form.append(cardFields);const fields=[];
 const updateDraft=()=>{Object.assign(draft,{question:question.value,answer:answer.value,sections:qaFields.sections.map(f=>({question:f.q.value,answer:f.a.value})).filter(p=>p.question.trim()||p.answer.trim()),faq:qaFields.faq.map(f=>({question:f.q.value,answer:f.a.value})).filter(p=>p.question.trim()||p.answer.trim()),sources:readSources(referenceEditor.value),title:title.value,summary:summary.value,body:body.value,author:author.value,course:course.value||'',cards:fields.map(f=>Object.assign(f.card,{title:f.title.value,body:f.body.value,imageAlt:f.alt.value,imagePrompt:f.prompt.value}))});};
 for(const[c,i]of draft.cards.map((c,i)=>[c,i])){
  const box=el('fieldset');box.append(el('legend','카드 '+(i+1)));
  const thumb=el('div',null,{class:'editorial-image-slot'});box.append(thumb);
  const showImage=()=>{thumb.replaceChildren(c.image?el('img',null,{src:c.image,alt:c.imageAlt||c.title}):el('span','이미지를 넣어주세요'));};showImage();
  const t=field(box,'카드 '+(i+1)+' 제목',c.title,{max:60,required:''}),b=field(box,'카드 '+(i+1)+' 내용',c.body,{area:true,max:240,rows:3,required:''});
  const prompt=field(box,'카드 '+(i+1)+' 이미지 장면 설명',c.imagePrompt||'',{area:true,max:1200,rows:2,placeholder:'예: 삼각대에 놓인 카메라 옆에서 대본을 읽는 성인 배우'}),alt=field(box,'카드 '+(i+1)+' 사진 설명',c.imageAlt||'',{max:300,placeholder:'화면을 보지 못하는 사람에게 전달할 사진 설명'});fields.push({card:c,title:t,body:b,prompt,alt});
  const imageActions=el('div',null,{class:'editorial-actions'});box.append(imageActions);
  const changed=()=>{if(!c.imageAlt)c.imageAlt=c.title;alt.value=c.imageAlt;dirty=true;reviewed.checked=false;showImage();repaint();};
  button(imageActions,c.image?'AI 이미지 다시 만들기':'AI 이미지 생성',async()=>{if(busy)return;if(!imageApproval.checked){message('이미지 AI 전송 안내에 동의해주세요.');return;}updateDraft();lock(true);message('카드 '+(i+1)+' 이미지를 만들고 있습니다…');try{const result=await makeImage(draft.cards[i]);c.image=result.image;c.imagePrompt=draft.cards[i].imagePrompt;changed();message('이미지를 만들었습니다. 확인 후 초안을 저장해주세요.');}catch(error){message(error.message);}finally{lock(false);}});
  const uploadLabel=el('label','사진 올리기',{class:'editorial-photo-upload'}),file=el('input',null,{type:'file',accept:'image/jpeg,image/png,image/webp','aria-label':'카드 '+(i+1)+' 사진 올리기'});uploadLabel.append(file);imageActions.append(uploadLabel);
  file.onchange=async()=>{if(!file.files?.length||busy)return;updateDraft();lock(true);message('사진을 올리고 있습니다…');try{c.image=await uploadImage(file.files[0]);changed();message('사진을 올렸습니다. 사진 설명을 확인하고 초안을 저장해주세요.');}catch(error){message(error.message);}finally{file.value='';lock(false);}};
  if(draft.cards.length>3)button(box,'카드 삭제',()=>{updateDraft();draft.cards.splice(i,1);dirty=true;render();});cardFields.append(box);
 }
 if(draft.cards.length<8)button(form,'카드 추가',()=>{updateDraft();draft.cards.push({title:'',body:'',image:'',imageAlt:'',imagePrompt:''});dirty=true;render();});
 const preview=el('section',null,{class:'editorial-preview','aria-label':'카드뉴스 미리보기'});preview.append(el('h2','카드뉴스 미리보기'));
 const cards=el('div',null,{class:'card-strip'});preview.append(cards);form.append(preview);
 const repaint=()=>{cards.replaceChildren();draft.cards.forEach((c,i)=>{const wrap=el('div',null,{class:'editorial-card-download'});wrap.append(cardPreview(c,i,draft.cards.length));button(wrap,'카드 '+(i+1)+' PNG 저장',async()=>{try{await downloadCard(c,i,draft.cards.length);}catch(error){message(error.message);}});cards.append(wrap);});};repaint();
 button(preview,'발행 화면으로 보기',()=>{try{updateDraft();content(draft);viewMode='preview';render();}catch(error){message('글 제목·본문·카드 문구와 출처 주소를 확인한 뒤 미리보기를 열어주세요.');}});
 const reviewed=check(form,'질문에 대한 답, 출처·적용 조건, 카드 이미지와 표현을 확인했습니다. 이 내용으로 홈페이지에 게시합니다.');
 const bar=el('div',null,{class:'editorial-actions editorial-save-bar'}),save=el('button','비공개 초안 저장',{type:'submit'});bar.append(save);const publish=button(bar,current.published?'확인한 수정 내용 게시':'확인 후 홈페이지에 게시',()=>{if(!form.reportValidity())return;if(!draft.question||!draft.answer||draft.sections.length<2||draft.faq.length<2){message('대표 질문·핵심 답변, 상황별 질문 2개와 관련 질문 2개 이상을 준비해주세요.');return;}if(draft.cards.some(c=>!c.image||!c.imageAlt)){message('모든 카드에 이미지와 사진 설명을 넣어주세요.');return;}if([...cards.querySelectorAll('img')].some(img=>!img.complete||!img.naturalWidth)){message('카드 이미지가 모두 보이는지 확인한 뒤 게시해주세요.');return;}if(!reviewed.checked){message('내용 확인 체크를 선택한 뒤 게시해주세요.');return;}persist('publish');},'editorial-primary');
 if(current.published){button(bar,'게시 중지',()=>persist('unpublish'));bar.append(el('a','공개 글 보기 ↗',{href:'/journal/'+current.id,target:'_blank',rel:'noopener'}));}
 form.append(bar,el('p','초안 저장만으로는 공개되지 않습니다. 카드 PNG 저장은 홈페이지 게시와 별개입니다.',{class:'editorial-muted'}));
 form.addEventListener('input',event=>{if(event.target===reviewed||event.target===imageApproval||event.target.type==='file')return;updateDraft();dirty=true;reviewed.checked=false;repaint();});
 form.onsubmit=event=>{event.preventDefault();persist('save');};
 async function persist(action){if(busy)return;updateDraft();if(action!=='save'&&!current.id){message('먼저 비공개 초안을 저장한 뒤 내용을 확인해주세요.');return;}lock(true);message('저장하고 있습니다…');try{const data=await request('/api/admin-editorial',{method:'PUT',body:JSON.stringify({action,id:current.id,revision:current.revision,draft,keywords:current.keywords||'',reviewNotes:current.review_notes||[],reviewed:reviewed.checked})});current=data.record;dirty=false;try{const list=await request('/api/admin-editorial?offset='+offset);records=list.records;nextOffset=list.nextOffset;}catch{records=[current,...records.filter(r=>r.id!==current.id)];}render();message(action==='publish'?'홈페이지에 게시했습니다.':action==='unpublish'?'게시를 중지했습니다. 초안은 보관됩니다.':'비공개 초안을 저장했습니다.');}catch(error){message(error.message);}finally{lock(false);}}
}
function readSources(text){return text.split('\n').filter(s=>s.trim()).map(line=>{const i=line.indexOf('|');return i<0?{title:line.trim(),url:line.trim()}:{title:line.slice(0,i).trim(),url:line.slice(i+1).trim()};});}
async function makeImage(card){return request('/api/admin-editorial-image',{method:'POST',body:JSON.stringify({title:card.title,body:card.body,prompt:card.imagePrompt||'',consent:true})});}
async function generateMissingImages(){const cards=current.draft.cards;for(let i=0;i<cards.length;i++){if(cards[i].image)continue;message('카드 이미지 '+(i+1)+' / '+cards.length+' 생성 중… 잠시 기다려주세요.');const result=await makeImage(cards[i]);cards[i].image=result.image;cards[i].imageAlt ||= cards[i].title;dirty=true;render();lock(true);} }
async function initialize(){try{const auth=await request('/api/admin-auth');if(auth.authenticated)return await load();}catch{}
 root.replaceChildren(el('h1','콘텐츠 발행 관리'));const form=el('form',null,{class:'editorial-login'}),password=field(form,'관리자 비밀번호','',{type:'password',autocomplete:'current-password',required:''}),status=el('p','',{role:'status'}),submit=el('button','로그인',{type:'submit',class:'editorial-primary'});form.append(submit,status);root.append(form);form.onsubmit=async event=>{event.preventDefault();submit.disabled=true;try{await request('/api/admin-auth',{method:'POST',body:JSON.stringify({password:password.value})});await load();}catch(error){status.textContent=error.message;}finally{submit.disabled=false;}};
}
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
initialize();
