const courseCatalog=require('../../content/courses.json');
const workspace=document.querySelector('#ai-workspace');
const node=(tag,text,attrs={})=>{const n=document.createElement(tag);if(text)n.textContent=text;for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
async function request(url,options={}){const response=await fetch(url,{credentials:'same-origin',...options,headers:{'Content-Type':'application/json',...options.headers}});let data;try{data=await response.json();}catch{throw Error('연결을 확인한 후 다시 시도해주세요.');}if(!response.ok)throw Error(data.error||'요청을 완료하지 못했습니다.');return data;}
const post=(url,data)=>request(url,{method:'POST',body:JSON.stringify(data)});
const tasks=workspace?[
 ['reply','상담 답변 초안','문의 내용을 입력하면 담당자가 검토할 답변을 작성합니다.','처음 연기를 배우는데 어떤 반이 좋을까요?'],
 ['summary','상담 요약','상담 기록의 핵심과 다음 확인 사항을 정리합니다.','성인 입문자가 취미반과 카메라 연기 과정에 관심이 있습니다. 수업 시간과 수강료를 문의했습니다.'],
 ['faq','FAQ 제안','문의 기록에서 자주 묻는 질문과 답변 후보를 만듭니다.','처음 배우는 사람도 수강할 수 있나요? 시니어 과정도 있나요? 수업 시간은 언제인가요?'],
 ['marketing','홍보 글 초안','제공한 사실을 바탕으로 공지와 SNS 글을 작성합니다.','취미로 연기를 시작하고 싶은 분들에게 취미반을 소개해주세요. 개강일과 수강료는 담당자에게 문의하도록 안내해주세요.'],
 ['review','후기 편집','실제 후기의 의미를 유지하며 문장을 다듬습니다.','처음에는 사람들 앞에서 말하기가 어색했는데, 연습하면서 조금씩 편해졌어요.']
]:[['inquiry','AI 문의','교육과정에 대해 편하게 물어보세요.','처음 연기를 배우는데 어떤 과정이 있나요?'],['recommend','과정 추천','관심 분야와 수강 목적을 알려주세요.','취미로 뮤지컬과 보컬을 배우고 싶어요.']];
let task=tasks[0][0],busy=false,mode='unavailable';
const root=node(workspace?'section':'dialog',null,{class:'academy-ai '+(workspace?'ai-workspace':'ai-chat'),'aria-label':workspace?'AI 작업실':'AI 상담'});
if(workspace)workspace.append(root);else document.body.append(root);
const header=node('div',null,{class:'ai-header'});header.append(node('span','KJT / AI ASSISTANT',{class:'ai-eyebrow'}),node('h2',workspace?'운영에 여유를 더하는 AI 작업실':'당신의 다음 장면을 함께 찾아요.'));
const badge=node('p','연결 확인 중',{class:'ai-mode',role:'status'});header.append(badge);
let launcher;
if(!workspace){const close=node('button','닫기',{type:'button',class:'ai-close'});close.onclick=()=>root.close();header.append(close);launcher=node('button','✦ AI 상담',{type:'button',class:'ai-launcher','aria-haspopup':'dialog'});launcher.onclick=()=>{if(!root.open)root.showModal();};document.body.append(launcher);root.addEventListener('close',()=>launcher.focus());}
root.append(header);
const builtInAnswer=text=>{
 if(/수강료|비용|가격|얼마/.test(text))return '기본 교습비는 월 40만 원입니다. 주 1회, 회당 3시간(8명 기준), 최대 8명으로 안내합니다. 기본 교습비 기준 3개월 등록 시 10% 할인되어 108만 원입니다. 프리미엄·개인 레슨은 별도 문의이며, 반별 일정과 등록 가능 여부는 담당자가 확인해 드립니다.';
 if(/위치|주소|오시는|어디/.test(text))return '서울 강서구 공항대로 186, 로뎀타워 306호입니다. 마곡역 4번 출구에서 도보 약 1분입니다. 대표전화 02-2666-4528, 상담 담당 010-9942-4528로 문의하실 수 있습니다.';
 if(/과정|어떤 반|종류/.test(text))return '다음 과정을 안내하고 있습니다.\n\n'+courseCatalog.map(c=>'• '+c.title+(c.audience?' ('+c.audience+')':'')).join('\n')+'\n\n관심 있는 분야를 알려주시면 안내해 드립니다. 반별 일정과 등록 가능 여부는 담당자 확인이 필요합니다.';
 if(/안녕|반가|처음/.test(text))return '안녕하세요. 김정태 배우아카데미입니다! 처음 배우는 분도 시작하실 수 있습니다. 관심 있는 분야나 수강 목적을 알려주세요. 아래 수강 신청하기 버튼으로 담당자에게 신청을 남길 수 있습니다.';
 return null;
};
let application;
if(!workspace){
 const welcome=node('div',null,{class:'ai-welcome'});
 welcome.append(node('p','안녕하세요. 김정태 배우아카데미입니다! 연기를 처음 시작하시나요? 수강료와 교육과정을 안내해 드릴게요.'));
 const quick=node('div',null,{class:'ai-quick','aria-label':'자주 묻는 질문'});
 for(const title of ['수강료 안내','교육과정 안내','위치 안내']){const button=node('button',title,{type:'button'});button.onclick=()=>{output.value=builtInAnswer(title);resultTitle.textContent='기본 안내';result.hidden=false;result.scrollIntoView({block:'nearest'});};quick.append(button);}
 const apply=node('button','수강 신청하기 →',{type:'button',class:'ai-apply-button'});
 apply.onclick=()=>{application.hidden=!application.hidden;apply.setAttribute('aria-expanded',String(!application.hidden));if(!application.hidden){application.scrollIntoView({block:'nearest'});application.querySelector('input').focus();}};
 apply.setAttribute('aria-expanded','false');
 welcome.append(quick,apply);root.append(welcome);
 application=node('form',null,{class:'ai-application',hidden:''});
 application.append(node('h3','수강 신청하기'),node('p','신청 후 담당자가 연락드려 일정과 등록 가능 여부를 확인합니다.'));
 const fields={};
 for(const [id,title,type]of [['name','이름','text'],['phone','휴대전화','tel']]){const label=node('label',title);const field=node('input',null,{type,name:id,required:'',maxlength:id==='name'?'40':'15',autocomplete:id==='name'?'name':'tel'});label.append(field);application.append(label);fields[id]=field;}
 const courseLabel=node('label','희망 과정'),select=node('select',null,{name:'course',required:''});select.append(node('option','과정을 선택해주세요',{value:''}));for(const c of courseCatalog)select.append(node('option',c.title,{value:c.id}));courseLabel.append(select);application.append(courseLabel);
 application.append(node('p','수집·이용: 주식회사 스토리나인(김정태 배우아카데미) / 항목: 이름·휴대전화·희망 과정 / 목적: 수강 신청 확인 및 연락 / 보유: 신청 처리 및 연락 완료 시까지. 동의를 거부할 수 있으나 온라인 신청이 제한됩니다.',{class:'ai-footnote'}));
 const agreeLabel=node('label',null,{class:'ai-consent'}),agree=node('input',null,{type:'checkbox',required:''});agreeLabel.append(agree,document.createTextNode('개인정보 수집·이용에 동의합니다. (필수)'));
 const send=node('button','수강 신청 접수',{type:'submit',class:'ai-submit'}),notice=node('p','',{role:'status',class:'ai-status'});
 application.append(agreeLabel,send,notice);root.append(application);
 application.onsubmit=async event=>{event.preventDefault();if(send.disabled)return;send.disabled=true;notice.textContent='신청을 접수하고 있습니다…';try{const data=await post('/api/course-application',{name:fields.name.value,phone:fields.phone.value,course:select.value,consent:agree.checked});notice.textContent=data.message;application.reset();send.textContent='접수 완료';}catch(error){notice.textContent=error.message;send.disabled=false;}};
 if(new URLSearchParams(location.search).get('chat')==='1')root.showModal();
}
const login=node('form',null,{class:'ai-login',hidden:''});login.append(node('h3','관리자 로그인'),node('p','홈페이지 관리자 계정으로 AI 작업실을 이용하세요.'));
const password=node('input',null,{type:'password',autocomplete:'current-password',placeholder:'관리자 비밀번호','aria-label':'관리자 비밀번호',required:''});
const signIn=node('button','로그인',{type:'submit'}),loginStatus=node('p','',{role:'status'});login.append(password,signIn,loginStatus);root.append(login);
const tools=node('div',null,{class:'ai-tools',...(workspace?{hidden:''}:{})});root.append(tools);
const tabs=node('div',null,{class:'ai-tabs','aria-label':'AI 기능 선택'}),description=node('p',tasks[0][2],{class:'ai-description'});
const buttons=[];
for(const [id,title,detail]of tasks){const b=node('button',title,{type:'button','aria-pressed':String(id===task)});b.onclick=()=>{if(busy)return;task=id;buttons.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));description.textContent=detail;input.value='';output.value='';result.hidden=true;status.textContent='';};buttons.push(b);tabs.append(b);}
tools.append(tabs,description);
const form=node('form',null,{class:'ai-form'}),label=node('label',workspace?'자료 또는 문의 내용':'궁금한 내용을 남겨주세요',{for:'academy-ai-input'});
const input=node('textarea',null,{id:'academy-ai-input',maxlength:'6000',rows:workspace?'7':'3',required:'',placeholder:workspace?'이름·전화번호 등 개인정보를 지우고 내용을 입력하세요.':'예: 취미로 카메라 연기를 배워보고 싶어요.'});
const consentLabel=node('label',null,{class:'ai-consent'}),consent=node('input',null,{type:'checkbox'});consentLabel.append(consent,document.createTextNode('입력 내용이 AI 답변 작성을 위해 OpenAI로 전송되는 것에 동의합니다. 개인정보는 입력하지 마세요.'));
const submit=node('button',workspace?'초안 만들기':'답변 받기',{type:'submit',class:'ai-submit',disabled:''});
const status=node('p','',{role:'status',class:'ai-status'});form.append(label,input,consentLabel,submit,status);tools.append(form);
const result=node('section',null,{class:'ai-result',hidden:''});const output=node('textarea',null,{rows:workspace?'12':'8','aria-label':workspace?'검토 및 수정할 AI 초안':'AI 안내 답변',...(!workspace?{readonly:''}:{})});
const resultTitle=node('h3',workspace?'검토할 초안':'안내 답변');result.append(resultTitle,output);
const links=node('div',null,{class:'ai-links'});for(const [title,url]of [['교육과정 보기','/programs'],['FAQ 보기','/faq'],['담당자 전화 상담','tel:01099424528']])links.append(node('a',title,{href:url}));result.append(links);
if(workspace){const copy=node('button','수정한 초안 복사',{type:'button',class:'ai-secondary'});copy.onclick=async()=>{try{await navigator.clipboard.writeText(output.value);status.textContent='초안을 복사했습니다. 게시 전 내용을 확인해주세요.';}catch{output.focus();output.select();status.textContent='초안을 선택했습니다. 복사 기능을 이용해주세요.';}};result.append(copy);}
tools.append(result,node('p',workspace?'생성한 초안은 확인·수정한 뒤 사용하세요. 자동 게시되거나 발송되지 않습니다.':'AI 안내는 참고용입니다. 수강 확정은 담당자의 일정·등록 가능 여부 확인 후 진행됩니다.',{class:'ai-footnote'}));
form.onsubmit=async event=>{event.preventDefault();if(busy)return;if(!workspace){const answer=builtInAnswer(input.value);if(answer||mode==='unavailable'){output.value=answer||'수강료·교육과정·위치는 위 버튼에서 바로 확인하실 수 있습니다. 자세한 문의는 수강 신청을 남기시거나 010-9942-4528로 연락해주세요.';resultTitle.textContent='기본 안내';result.hidden=false;status.textContent='';return;}}if(mode==='live'&&!consent.checked){status.textContent='AI 처리 안내에 동의해주세요.';return;}busy=true;submit.disabled=true;buttons.forEach(b=>b.disabled=true);result.hidden=true;status.textContent=workspace?'초안을 작성하고 있습니다…':'안내를 준비하고 있습니다…';try{const data=await post('/api/ai-assistant',{task,text:input.value,consent:consent.checked});output.value=data.answer;resultTitle.textContent=data.mode==='demo'?'시연용 예시 결과':workspace?'검토할 초안':'AI 안내 답변';result.hidden=false;status.textContent=data.mode==='demo'?'실제 AI가 생성한 답변이 아닌 기능 시연용 예시입니다.':'답변이 준비되었습니다.';}catch(error){status.textContent=error.message;}finally{busy=false;submit.disabled=workspace&&mode==='unavailable';buttons.forEach(b=>b.disabled=false);}};
login.onsubmit=async event=>{event.preventDefault();signIn.disabled=true;try{await post('/api/admin-auth',{password:password.value});password.value='';login.hidden=true;tools.hidden=false;loginStatus.textContent='';}catch(error){loginStatus.textContent=error.message;}finally{signIn.disabled=false;}};
async function initialize(){try{const config=await request('/api/ai-assistant');mode=config.mode;badge.textContent=mode==='demo'?'시연 모드 · 예시 응답':mode==='live'?'AI 연결됨':'기본 안내 · 수강 신청 이용 가능';submit.disabled=workspace&&!config.ready;consentLabel.hidden=mode!=='live';if(workspace){const session=await request('/api/admin-auth');login.hidden=session.authenticated;tools.hidden=!session.authenticated;}}catch{badge.textContent='연결을 확인해주세요 · 전화 상담 010-9942-4528';if(workspace)login.hidden=false;else submit.disabled=false;}}
initialize();
