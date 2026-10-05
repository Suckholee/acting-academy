import { createClient } from '@supabase/supabase-js';
import { groups } from './fields.js';
const $=id=>document.getElementById(id), bucket='academy-materials';
let db,user,member,current,preview=false,dirty=false,busy=false,records=[];
const text=(id,value)=>$(id).textContent=value;
function message(value){text('global-message',value);}
function fail(error){console.error('Materials operation failed:',error?.code||'unavailable');message('처리하지 못했습니다. 연결 상태와 접근 권한을 확인한 뒤 다시 시도해주세요. 입력 내용은 화면에 남아 있습니다.');}
function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);return b;}
function canEdit(){return !preview&&current?.owner_id===user?.id&&current?.status==='draft';}
function applyLock(){const editable=preview||canEdit();$('material-form').querySelectorAll('input,textarea').forEach(el=>el.disabled=!editable||busy);$('files').disabled=!canEdit()||busy;$('save-draft').disabled=!canEdit()||busy;$('submit').disabled=!canEdit()||busy;$('back-list').disabled=busy;$('logout').disabled=busy;$('review-save').disabled=busy;$('new-trainer').disabled=busy;$('new-operator').disabled=busy;}
async function run(fn){if(busy)return;busy=true;applyLock();message('');try{await fn()}catch(e){fail(e)}finally{busy=false;applyLock()}}
const unwrap=result=>{if(result.error)throw result.error;return result.data;};
function getPayload(){const payload={};for(const input of $('fields').querySelectorAll('[name]'))payload[input.name]=input.value.trim();payload.consent=$('consent').checked;return payload;}
function leave(){return !dirty||confirm('저장하지 않은 내용이 있습니다. 목록으로 이동할까요?');}
function drawFields(kind,payload={}){
 $('fields').replaceChildren();
 for(const [i,[title,desc,fields]] of groups[kind].entries()){
  const section=document.createElement('section');section.className='form-section';
  const heading=document.createElement('div');heading.className='section-heading';
  const number=document.createElement('span');number.textContent=`0${i+1}`;const h=document.createElement('h3');h.textContent=title;const p=document.createElement('p');p.textContent=desc;heading.append(number,h,p);
  const body=document.createElement('div');body.className='section-fields';
  for(const [name,label,placeholder,type] of fields){const field=document.createElement('div'),l=document.createElement('label'),input=document.createElement(type==='textarea'?'textarea':'input');l.htmlFor=`field-${name}`;l.textContent=label;input.id=`field-${name}`;input.name=name;input.placeholder=placeholder;input.value=payload[name]||'';input.maxLength=type==='textarea'?5000:500;if(type==='textarea')input.rows=4;field.append(l,input);body.append(field);}
  section.append(heading,body);$('fields').append(section);
 }
 $('consent').checked=payload.consent===true;
}
async function showRecord(record){
 current=record;dirty=false;$('editor').hidden=false;$('records').hidden=true;
 text('document-title',record.kind==='trainer'?'강사소개 자료':'운영사 자료');drawFields(record.kind,record.payload);
 text('save-state',preview?'미리보기 · 저장 안 됨':`${record.status==='submitted'?'제출됨':'임시 저장됨'} · ${new Date(record.updated_at).toLocaleString('ko-KR')}`);
 $('preview-note').hidden=!preview;$('review-controls').hidden=preview||member?.role!=='reviewer';$('review-note').hidden=true;
 $('save-draft').textContent='임시 저장';
 let resume=document.getElementById('resume');if(resume)resume.remove();
 if(!preview&&record.status==='submitted'&&record.owner_id===user.id){resume=button('작성 재개',()=>run(async()=>{const data=unwrap(await db.from('material_submissions').update({status:'draft'}).eq('id',current.id).eq('version',current.version).select().maybeSingle());if(!data)throw new Error('conflict');await showRecord(data)}));resume.id='resume';document.querySelector('.editor-actions').prepend(resume);}
 applyLock();
 if(preview){$('file-list').replaceChildren();return;}
 const review=unwrap(await db.from('material_reviews').select('*').eq('submission_id',record.id).maybeSingle());
 if(review){const states={checking:'확인 중',needs_info:'추가 자료 요청',complete:'확인 완료'};text('review-note',`${states[review.state]}${record.status==='draft'?' · 이전 제출에 대한 검토':''}\n${review.note}`);$('review-note').hidden=false;}
 $('review-state').value=review?.state||'checking';$('review-text').value=review?.note||'';
 await loadFiles();
}
async function loadFiles(){
 const prefix=`${current.owner_id}/${current.id}`;
 const data=unwrap(await db.storage.from(bucket).list(prefix,{limit:100,sortBy:{column:'name',order:'asc'}}));$('file-list').replaceChildren();
 for(const file of data.filter(f=>f.id)){const li=document.createElement('li'),label=document.createElement('span');label.textContent=file.name.replace(/^[a-f0-9-]{36}--/,'');li.append(label,button('다운로드',()=>run(async()=>{const blob=unwrap(await db.storage.from(bucket).download(`${prefix}/${file.name}`));const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=label.textContent;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)})));if(canEdit())li.append(button('삭제',()=>run(async()=>{if(!confirm('이 첨부파일을 삭제할까요?'))return;unwrap(await db.storage.from(bucket).remove([`${prefix}/${file.name}`]));await loadFiles();})));$('file-list').append(li);}
}
async function listRecords(){
 current=null;dirty=false;$('editor').hidden=true;$('records').hidden=false;
 records=unwrap(await db.from('material_submissions').select('id,owner_id,kind,status,payload,version,created_at,updated_at,submitted_at').order('updated_at',{ascending:false}));
 $('records').replaceChildren();
 if(!records.length){const p=document.createElement('p');p.className='empty';p.textContent='아직 작성한 자료가 없습니다. 위 버튼을 눌러 시작해주세요.';$('records').append(p);}
 for(const r of records){const b=button('',()=>{preview=false;run(()=>showRecord(r))});b.className='record';const title=document.createElement('strong');title.textContent=r.payload.name||'이름 작성 전';const detail=document.createElement('span');detail.textContent=`${r.kind==='trainer'?'강사':'운영사'} · ${r.status==='submitted'?'제출 완료':'작성 중'} · ${new Date(r.updated_at).toLocaleDateString('ko-KR')}`;b.append(title,detail);$('records').append(b);}
}
async function create(kind){if(!leave())return;preview=false;await run(async()=>{const data=unwrap(await db.from('material_submissions').insert({kind,owner_id:user.id,payload:{},status:'draft'}).select().single());await showRecord(data);});}
async function save(status){
 const payload=getPayload();
 if(status==='submitted'&&(!payload.name||payload.name.length<2||!payload.contact||payload.contact.length<3||!payload.consent)){message('이름, 자료 확인용 연락처, 자료 제출 동의를 확인해주세요. 다른 항목은 미정으로 남겨도 됩니다.');return;}
 if(new TextEncoder().encode(JSON.stringify(payload)).length>60000){message('입력 내용이 너무 깁니다. 긴 소개서는 파일로 첨부해주세요.');return;}
 const data=unwrap(await db.from('material_submissions').update({payload,status}).eq('id',current.id).eq('version',current.version).select().maybeSingle());
 if(!data){message('다른 창에서 자료가 변경됐습니다. 현재 작성 내용을 복사해 보관한 뒤 목록을 새로 불러와주세요. 이번 내용은 저장되지 않았습니다.');return;}
 current=data;dirty=false;await showRecord(data);message(status==='submitted'?'자료가 제출되었습니다. 담당자가 확인한 뒤 필요한 내용을 안내드립니다.':'계정에 임시 저장했습니다. 다른 기기에서도 로그인해 이어 쓸 수 있습니다.');
}
$('material-form').addEventListener('input',()=>{if(!preview){dirty=true;text('save-state','저장하지 않은 변경사항')}});
$('material-form').addEventListener('submit',event=>{event.preventDefault();if(canEdit())run(()=>save('submitted'))});
$('save-draft').addEventListener('click',()=>{if(canEdit())run(()=>save('draft'))});
$('back-list').addEventListener('click',()=>{if(!leave())return;if(preview){$('workspace').hidden=true;$('access').hidden=false;current=null;dirty=false;}else run(listRecords)});
$('new-trainer').addEventListener('click',()=>preview?showRecord({kind:'trainer',payload:{}}):create('trainer'));
$('new-operator').addEventListener('click',()=>preview?showRecord({kind:'operator',payload:{}}):create('operator'));
$('preview').addEventListener('click',()=>{preview=true;$('access').hidden=true;$('workspace').hidden=false;$('new-trainer').hidden=false;$('new-operator').hidden=false;text('workspace-title','작성 항목 미리보기');showRecord({kind:'trainer',payload:{}})});
$('files').addEventListener('change',()=>run(async()=>{
 if(!canEdit())return;
 const files=[...$('files').files];
 const types={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',heic:'image/heic',heif:'image/heif',pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
 if(files.length+$('file-list').children.length>50){message('자료 1건에 파일은 최대 50개까지 올려주세요.');return;}
 for(const file of files){const ext=file.name.split('.').pop().toLowerCase();if(!types[ext]||file.size>20*1024*1024||!file.size){message(`${file.name}: 지원되는 파일 형식과 20MB 제한을 확인해주세요.`);return;}}
 let done=0;
 try {for(const file of files){text('upload-state',`${done+1} / ${files.length} 파일 업로드 중…`);const ext=file.name.split('.').pop().toLowerCase(),name=file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-150);unwrap(await db.storage.from(bucket).upload(`${current.owner_id}/${current.id}/${crypto.randomUUID()}--${name}`,file,{contentType:types[ext],upsert:false}));done++;}text('upload-state',`${done}개 파일이 저장되었습니다.`);}finally{await loadFiles();$('files').value='';if(done<files.length)text('upload-state',`${done}개 저장됨. 실패한 파일은 다시 선택해주세요.`);}
}));
$('review-save').addEventListener('click',()=>run(async()=>{unwrap(await db.from('material_reviews').upsert({submission_id:current.id,state:$('review-state').value,note:$('review-text').value.trim(),updated_at:new Date().toISOString()}));message('검토 메모를 저장했습니다. 제출자도 확인할 수 있습니다.');}));
$('logout').addEventListener('click',()=>run(async()=>{if(dirty&&!confirm('저장하지 않은 내용을 남기고 로그아웃할까요?'))return;unwrap(await db.auth.signOut());dirty=false;location.reload();}));
$('login').addEventListener('submit',event=>{event.preventDefault();run(async()=>{const b=$('login').querySelector('button');b.disabled=true;try{unwrap(await db.auth.signInWithOtp({email:$('email').value.trim(),options:{shouldCreateUser:false,emailRedirectTo:location.origin+'/materials'}}));text('login-result','초대된 주소라면 로그인 링크가 발송됩니다. 메일함을 확인해주세요.');}finally{b.disabled=false;}})});
addEventListener('beforeunload',event=>{if(dirty||busy){event.preventDefault();event.returnValue='';}});
async function init(){
 try {const response=await fetch('/api/materials-config');if(!response.ok)throw new Error('config');const config=await response.json();if(!config.ready){$('setup').hidden=false;return;}
 db=createClient(config.url,config.key);const {data:{session},error}=await db.auth.getSession();if(error)throw error;
 if(!session){$('login').querySelector('button').disabled=false;return;}
 user=session.user;member=unwrap(await db.from('material_members').select('role,display_name').eq('user_id',user.id).maybeSingle());$('logout').hidden=false;
 if(!member){message('자료 제출 권한이 아직 등록되지 않았습니다. 초대한 담당자에게 알려주세요.');return;}
 $('access').hidden=true;$('workspace').hidden=false;text('workspace-title',member.role==='reviewer'?'전체 자료 취합 현황':`${member.display_name}님의 자료`);$('new-trainer').hidden=member.role==='operator';$('new-operator').hidden=member.role==='trainer';await listRecords();
 }catch(error){fail(error);$('setup').hidden=false;}
}
init();
