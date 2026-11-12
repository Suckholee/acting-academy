import {getMemberClient} from './session.js';
const {safeReturn,passwordError,phoneError}=require('./model.cjs');
const {mountDashboard}=require('./dashboard.cjs');
const root=document.querySelector('#member-app');if(!root)throw Error('Member root missing');
const page=root.dataset.page;let config,client,current,profile;
const recovery=new URLSearchParams(location.search).get('recovery')==='1';
const providerName=p=>({google:'Google',kakao:'카카오',email:'이메일'})[p]||p;
function node(tag,text,attrs={}){const n=document.createElement(tag);if(text)n.textContent=text;for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;}
function field(form,label,type='text',opts={}){const wrap=node('label',label,{class:'member-field'}),input=node('input',null,{type,...opts});wrap.append(input);if(type==='password'){const show=node('button','비밀번호 표시',{type:'button',class:'member-text-button','aria-pressed':'false'});show.onclick=()=>{const shown=input.type==='password';input.type=shown?'text':'password';show.textContent=shown?'비밀번호 숨기기':'비밀번호 표시';show.setAttribute('aria-pressed',String(shown));};wrap.append(show);}form.append(wrap);return input;}
function status(parent){const n=node('p','',{role:'status',class:'member-message','aria-live':'polite'});parent.append(n);return n;}
function action(parent,text,callback){const b=node('button',text,{type:'button',class:'member-button'});b.onclick=callback;parent.append(b);return b;}
async function api(url,data,method='POST',token){const r=await fetch(url,{method,credentials:'same-origin',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(method==='GET'?{}:{body:JSON.stringify(data)})});const value=await r.json();if(!r.ok)throw Error(value.error||'잠시 후 다시 시도해주세요.');return value;}
const demo=async(action,data={})=>api('/api/member-demo',{action,...data});
async function account(method='GET',data){if(config.demo){if(method==='GET'){const data=await api('/api/member-demo',null,'GET');return {profile:data.user,verified:true}};return {profile:(await demo(method==='POST'?'withdraw':'profile',data)).user};}const {data:session}=await client.auth.getSession();return api('/api/member-account',data,method,session.session?.access_token);}
function consent(form){
 const checks=[];
 const labels=config.demo?['로컬 데모 이용 및 테스트 정보 입력에 동의합니다.']:['[필수] 회원 서비스 이용약관에 동의합니다.','[필수] 개인정보 수집·이용에 동의합니다.'];
 if(!config.demo)form.append(node('p','수집·이용 목적: 회원 식별, 가입·로그인, 계정 복구 및 서비스 연락. 필수 항목: 이름, 이메일, 휴대전화 번호, 비밀번호 인증정보, 계정·인증·동의 기록. 보유기간: 회원 탈퇴 시까지. 동의를 거부할 수 있으나 회원가입은 제한됩니다. 법령상 별도 보존 대상은 분리 보관합니다.',{class:'member-note'}));
 for(const text of labels){const label=node('label',null,{class:'member-consent'}),check=node('input',null,{type:'checkbox',required:''});label.append(check,node('span',text));form.append(label);checks.push(check);}
 if(config.policiesReady){const p=node('p',null,{class:'member-links'});p.append(node('a','이용약관',{href:config.termsUrl,target:'_blank',rel:'noopener'}),node('a','개인정보 처리방침',{href:config.privacyUrl,target:'_blank',rel:'noopener'}));form.append(p);}
 return {get checked(){return checks.every(check=>check.checked);}};
}
function submit(form,label,callback){const b=node('button',label,{type:'submit',class:'member-button member-primary'});const msg=status(form);form.append(b);form.onsubmit=async e=>{e.preventDefault();b.disabled=true;msg.textContent='처리 중입니다…';try{await callback(msg);}catch(error){msg.textContent=error.message;}finally{b.disabled=false;}};return msg;}
function navlinks(parent,links){const p=node('p',null,{class:'member-links'});for(const [text,href]of links)p.append(node('a',text,{href}));parent.append(p);}
function rememberReturn(){const value=safeReturn(new URLSearchParams(location.search).get('next')||sessionStorage.getItem('kjt-member-return'));sessionStorage.setItem('kjt-member-return',value);return value;}
function finish(){const destination=safeReturn(sessionStorage.getItem('kjt-member-return'));sessionStorage.removeItem('kjt-member-return');location.assign(destination);}
function social(parent,link=false,connected=[]){const message=status(parent);for(const provider of ['google','kakao']){if(link&&connected.includes(provider))continue;const button=action(parent,providerName(provider)+(link?' 계정 연결':'로 계속하기'),async()=>{button.disabled=true;try{
 if(!config.providers.includes(provider))throw Error(providerName(provider)+' 로그인을 준비하고 있습니다. 이메일로 계속해주세요.');
 if(config.demo){await demo(link?'link':'oauth',{provider});if(link)location.reload();else finish();return;}
 const fn=link?'linkIdentity':'signInWithOAuth';const {error}=await client.auth[fn]({provider,options:{redirectTo:location.origin+'/account'}});if(error)throw Error('인증을 시작하지 못했습니다. 다시 시도하거나 다른 방법을 선택해주세요.');
 }catch(e){message.textContent=e.message;}finally{button.disabled=false;}});button.disabled=!config.providers.includes(provider)||(!config.demo&&!config.registrationOpen&&!link);if(button.disabled){button.title=providerName(provider)+' 로그인 연결을 준비 중입니다.';button.textContent+=' · 준비 중';}button.classList.add('member-'+provider,'member-social');const label=node('span',button.textContent);const icon=node('img',null,{src:'/assets/auth/'+provider+(provider==='google'?'.png':'.svg'),alt:'','aria-hidden':'true',class:'member-social-icon',width:'20',height:'20'});button.replaceChildren(icon,label);}}
function verifyEmail(email,parent){parent.replaceChildren(node('h2','이메일을 확인해주세요'),node('p',email+'로 보낸 인증 코드를 입력해주세요.'));if(config.demo)parent.append(node('p','데모 인증 코드는 123456입니다. 실제 메일은 발송되지 않습니다.',{class:'member-note'}));const form=node('form');const code=field(form,'인증 코드','text',{inputmode:'numeric',autocomplete:'one-time-code',required:'',minlength:'6',maxlength:'8'});submit(form,'인증하고 계속하기',async()=>{if(config.demo)await demo('verify',{email,code:code.value});else{const {error}=await client.auth.verifyOtp({email,token:code.value,type:'signup'});if(error)throw Error('인증 코드가 잘못되었거나 만료되었습니다. 새 코드를 요청해주세요.');}finish();});parent.append(form);const resendMsg=status(parent);let until=0;const resend=action(parent,'인증 코드 다시 받기',async()=>{if(Date.now()<until)return;until=Date.now()+60000;resend.disabled=true;try{if(config.demo)await demo('resend',{email});else{const {error}=await client.auth.resend({type:'signup',email});if(error)throw error;}resendMsg.textContent='일치하는 가입 요청이 있다면 인증 메일을 보내드립니다. 스팸함도 확인해주세요.';}catch{resendMsg.textContent='재발송을 완료하지 못했습니다. 잠시 후 다시 시도해주세요.';}setTimeout(()=>{resend.disabled=false;},60000);});navlinks(parent,[['이메일 주소를 수정하고 다시 가입하기','/signup'],['로그인 도움말','/login#help']]);}
function login(){
 rememberReturn();root.append(node('h1','로그인'),node('p','간편로그인 또는 가입한 이메일로 로그인해주세요.'));social(root);root.append(node('p','또는 이메일로 로그인',{class:'member-divider'}));
 const form=node('form'),email=field(form,'이메일','email',{autocomplete:'username',required:'',maxlength:'254'}),password=field(form,'비밀번호','password',{autocomplete:'current-password',required:'',maxlength:'128'});
 submit(form,'로그인하기',async()=>{
  const address=email.value.trim().toLowerCase();
  if(config.demo)await demo('login',{email:address,password:password.value});
  else{const {error}=await client.auth.signInWithPassword({email:address,password:password.value});if(error)throw Error('이메일·비밀번호 또는 인증 상태를 확인해주세요.');}
  const result=await account();if(result.profile?.status!=='active'){await logout();throw Error('현재 이용할 수 없는 계정입니다.');}finish();
 });root.append(form);navlinks(root,[['회원가입','/signup'],['비밀번호 찾기','/reset-password']]);
}
function signup(){rememberReturn();if(!config.demo&&!config.registrationOpen){root.append(node('h1','회원가입 준비 중'),node('p','인증 서비스 연결과 최종 점검을 마친 뒤 회원가입을 시작합니다.'));navlinks(root,[['이용약관',config.termsUrl||'/terms'],['개인정보 처리방침',config.privacyUrl||'/privacy'],['홈페이지로 돌아가기','/']]);return;}
 root.append(node('h1','회원가입'),node('p','이메일을 계정으로 사용합니다. 간편가입 또는 이메일 인증으로 가입해주세요. Gmail 외의 이메일도 사용할 수 있습니다.'));social(root);root.append(node('p','또는 이메일로 가입',{class:'member-divider'}));
 const form=node('form');
 const name=field(form,'이름','text',{autocomplete:'name',required:'',minlength:'2',maxlength:'40'}),email=field(form,'이메일','email',{autocomplete:'email',required:'',maxlength:'254'}),phone=field(form,'휴대전화 번호','tel',{autocomplete:'tel',required:'',maxlength:'15'}),password=field(form,'비밀번호','password',{autocomplete:'new-password',required:'',minlength:'12',maxlength:'128'}),confirm=field(form,'비밀번호 확인','password',{autocomplete:'new-password',required:'',minlength:'12',maxlength:'128'});
 const agree=consent(form);
 submit(form,'인증 메일 받기',async()=>{
  const error=passwordError(password.value)||phoneError(phone.value);if(error)throw Error(error);
  if(password.value!==confirm.value)throw Error('비밀번호 확인이 일치하지 않습니다.');if(!agree.checked)throw Error('동의 내용을 확인해주세요.');
  if(!config.demo&&(!config.registrationOpen||!config.policiesReady))throw Error('회원가입은 아직 시작하지 않았습니다.');
  const address=email.value.trim().toLowerCase(),data={mode:'email',name:name.value.trim(),email:address,phone:phone.value,password:password.value,consent:true};
  if(config.demo)await demo('signup',data);else await api('/api/member-auth',{action:'signup',...data});
  password.value=confirm.value='';verifyEmail(address,root);
 });root.append(form);navlinks(root,[['이미 계정이 있나요? 로그인','/login']]);
}
function reset(){root.append(node('h1','비밀번호 재설정'),node('p','이메일로 가입한 계정의 비밀번호를 다시 설정합니다.'));const form=node('form'),email=field(form,'이메일','email',{required:'',autocomplete:'email'});submit(form,'재설정 메일 요청',async msg=>{if(config.demo){const data=await demo('recover',{email:email.value});msg.textContent=data.message;}else{await client.auth.resetPasswordForEmail(email.value.trim(),{redirectTo:location.origin+'/account?recovery=1'});msg.textContent='일치하는 계정이 있다면 안내 메일을 보내드립니다. 스팸함과 이메일 주소를 확인해주세요.';}});root.append(form);navlinks(root,[['로그인으로 돌아가기','/login']]);}
async function logout(){for(const key of Object.keys(sessionStorage))if(key.startsWith('kjt-member-draft-'))sessionStorage.removeItem(key);if(config.demo)await demo('logout');else{const {error}=await client.auth.signOut();if(error)throw Error('로그아웃을 완료하지 못했습니다. 다시 시도해주세요.');}}
async function accountAuditions(parent,onChange=()=>{}){
 const section=node('section',null,{class:'account-section account-auditions','aria-labelledby':'account-auditions-title'});
 section.append(node('h2','내 오디션 신청 내역',{id:'account-auditions-title'}),node('p','신청한 배역과 접수 정보를 확인하세요. 심사 일정과 결과는 담당자가 별도로 안내합니다.',{class:'account-section-description'}));
 const list=node('div',null,{class:'account-application-list'}),message=status(section);section.append(list);parent.append(section);
 let offset=0,applications=[];
 const more=action(section,'신청 내역 더 보기',()=>load(false));more.hidden=true;
 async function call(data,method='GET',page=0){const {data:session}=await client.auth.getSession();return api('/api/member-casting'+(method==='GET'?'?offset='+page:''),data,method,session.session?.access_token);}
 const date=value=>new Date(value).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});
 async function load(reset){
  more.disabled=true;message.textContent='신청 내역을 불러오고 있습니다…';onChange({applications,loading:true});
  try{
   const result=await call(null,'GET',reset?0:offset);if(reset){list.replaceChildren();applications=[];}applications.push(...result.applications);
   if(!result.applications.length&&!list.children.length)list.append(node('p','아직 신청한 오디션이 없습니다. 모집 중인 오디션을 확인해보세요.',{class:'account-empty'}));
   for(const a of result.applications){
    const item=node('article',null,{class:'account-application'});item.append(node('span',a.status,{class:'member-badge'}),node('h3',a.title));
    const details=node('dl');for(const [label,value]of [['지원 배역',a.roles.join(' · ')],['접수일',date(a.submittedAt)],['참석 가능일',a.dates.join(' · ')],['프로필',a.profileName]]){details.append(node('dt',label),node('dd',value||'—'));}item.append(details);
    if(a.closesAt)item.append(node('p',(a.canEdit?'수정 가능 기한: ':'접수 마감: ')+date(a.closesAt),{class:'account-section-description'}));
    const links=[];if(a.viewUrl)links.push([a.canEdit?'지원서 확인 · 수정':'제출한 지원서 보기',a.viewUrl]);if(a.callUrl)links.push(['공고 보기',a.callUrl]);navlinks(item,links);list.append(item);
   }
   offset=result.nextOffset;more.hidden=offset===null;message.textContent='';onChange({applications,hasMore:offset!==null});
  }catch(e){message.textContent=e.message;more.hidden=false;more.textContent='다시 불러오기';onChange({applications,error:e.message});}
  finally{more.disabled=false;}
 }
 navlinks(section,[['모집 중인 오디션 보기','/auditions']]);
 const legacy=node('details',null,{class:'member-help account-legacy'});legacy.append(node('summary','이전에 제출한 지원서 연결'),node('p','회원가입 전에 제출했다면 접수 완료 화면에서 받은 수정 전용 링크로 본인 지원서를 연결할 수 있습니다.',{class:'account-section-description'}));
 const form=node('form'),url=field(form,'수정 전용 링크','url',{required:'',maxlength:'2048',autocomplete:'off',placeholder:'https://www.kactstar.com/audition-edit#…'});
 submit(form,'내 계정에 연결',async msg=>{let parsed;try{parsed=new URL(url.value);}catch{throw Error('수정 전용 링크를 확인해주세요.');}if(!['www.kactstar.com','kactstar.com',location.hostname].includes(parsed.hostname)||parsed.pathname!=='/audition-edit')throw Error('홈페이지에서 받은 수정 전용 링크를 입력해주세요.');const values=new URLSearchParams(parsed.hash.slice(1));await call({action:'link',id:values.get('id'),key:values.get('key')},'POST');url.value='';await load(true);msg.textContent='지원서를 내 계정에 연결했습니다.';});
 legacy.append(form);section.append(legacy);await load(true);
}
function accountSetting(title,description,open=false){
 const section=node('details',null,{class:'account-setting'});
 if(open)section.open=true;
 const summary=node('summary'),copy=node('span',null,{class:'account-setting-copy'});
 copy.append(node('strong',title),node('span',description));
 summary.append(copy,node('span','설정',{class:'account-setting-toggle','aria-hidden':'true'}));
 const content=node('div',null,{class:'account-setting-content'});section.append(summary,content);root.append(section);
 let moving=false;
 summary.addEventListener('click',async event=>{
  if(!content.animate||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  event.preventDefault();if(moving)return;moving=true;
  const opening=!section.open;section.open=true;
  const height=content.getBoundingClientRect().height;
  const frames=[{height:'0px',opacity:0},{height:height+'px',opacity:1}];
  const animation=content.animate(opening?frames:frames.reverse(),{duration:200,easing:'ease-in-out'});
  try{await animation.finished;}catch{}section.open=opening;moving=false;
 });
 return {section,content};
}
async function accountPage(loadedResult){
 let dashboard;
 root.append(node('p','MEMBER ACCOUNT',{class:'account-eyebrow'}),node('h1','내 계정'),node('p','회원 정보와 로그인 방법을 관리하세요.',{class:'account-intro'}));
 try{
  const result=loadedResult||await account();profile=result.profile;
  if(!profile)throw Error('로그인이 필요합니다.');
  if(profile.status!=='active'){
   root.append(node('p',profile.status==='withdrawal_requested'?'탈퇴 요청이 접수되었습니다. 운영자가 처리하면 별도로 안내드립니다.':'현재 이용이 중지된 계정입니다.'));
   action(root,'로그아웃',async()=>{await logout();location.assign('/login');});return;
  }
  const pendingReturn=safeReturn(sessionStorage.getItem('kjt-member-return'));
  if(profile.consented_at&&!recovery&&pendingReturn.startsWith('/auditions/')){sessionStorage.removeItem('kjt-member-return');location.assign(pendingReturn);return;}
  const onboarding=!profile.consented_at&&!recovery;
  if(onboarding){root.querySelector('h1').textContent='가입 마무리';root.querySelector('.account-intro').textContent='필수 정보와 이용 동의만 확인하면 가입이 완료됩니다.';}
  if(!onboarding&&new URLSearchParams(location.search).get('welcome')==='1')root.append(node('p','가입이 완료되었습니다. 아카데미에 오신 것을 환영합니다.',{class:'account-welcome',role:'status'}));
  const overview=node('div',null,{class:'account-overview'});
  overview.append(node('span',profile.email,{class:'account-email'}),node('span',result.verified?'이메일 인증 완료':'이메일 인증 필요',{class:'member-badge'}));root.append(overview);
  const profileSection=node('section',null,{class:'account-section','aria-labelledby':'account-profile-title'});
  const profileTitle=node('h2',profile.consented_at?'기본 정보':'회원 정보',{id:'account-profile-title'});
  const profileIntro=node('p',profile.consented_at?'이름과 연락처를 최신 정보로 유지해주세요.':'이름·연락처와 필수 이용 동의를 확인하면 가입이 완료됩니다.',{class:'account-section-description'});
  profileSection.append(profileTitle,profileIntro);
  const form=node('form',null,{class:'account-profile-form'}),fields=node('div',null,{class:'account-fields'});form.append(fields);
  const name=field(fields,'이름','text',{required:'',minlength:'2',maxlength:'40',autocomplete:'name'}),phone=field(fields,'휴대전화 번호','tel',{autocomplete:'tel',required:''});
  name.value=profile.name||'';phone.value=profile.phone||'';
  const draftKey='kjt-member-draft-'+profile.user_id;
  try{const draft=JSON.parse(sessionStorage.getItem(draftKey)||'null');if(draft){name.value=draft.name;phone.value=draft.phone;}}catch{}
  form.oninput=()=>sessionStorage.setItem(draftKey,JSON.stringify({name:name.value,phone:phone.value}));
  const consentArea=node('div',null,{class:'account-consents'});
  const agree=profile.consented_at?null:consent(consentArea);if(agree)form.append(consentArea);
  let needsConsent=!!agree;
  submit(form,needsConsent?'가입 완료하기':'변경사항 저장',async msg=>{
   if(needsConsent&&!agree.checked)throw Error('이용 동의를 확인해주세요.');
   if(!config.demo&&needsConsent&&(!config.policiesReady||!config.registrationOpen))throw Error('회원가입 개시 후 가입을 마무리할 수 있습니다.');
   const saved=await account('PATCH',{name:name.value,phone:phone.value,consent:needsConsent&&agree.checked});dashboard?.updateProfile(saved.profile||{name:name.value,phone:phone.value});
   sessionStorage.removeItem(draftKey);
   if(onboarding){
    if(pendingReturn.startsWith('/auditions/')){sessionStorage.removeItem('kjt-member-return');location.assign(pendingReturn);return;}
    const updated=await account();
    const reduceMotion=typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fade=root.animate&&!reduceMotion?root.animate([{opacity:1},{opacity:0}],{duration:120,fill:'forwards'}):null;
    if(fade)await fade.finished;
    history.replaceState(null,'','/account?welcome=1');
    root.replaceChildren();root.classList.remove('account-onboarding');await accountPage(updated);
    if(fade)fade.cancel();
    if(root.animate&&!reduceMotion)root.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:200,easing:'ease-out'});
    root.querySelector('h1').setAttribute('tabindex','-1');root.querySelector('h1').focus({preventScroll:true});
    root.scrollIntoView?.({behavior:reduceMotion?'auto':'smooth',block:'start'});return;
   }
   msg.textContent=needsConsent?'가입이 완료되었습니다. 홈페이지를 이용해보세요.':'변경사항을 저장했습니다.';
   needsConsent=false;consentArea.remove();profileTitle.textContent='기본 정보';profileIntro.textContent='이름과 연락처를 최신 정보로 유지해주세요.';form.querySelector('[type="submit"]').textContent='변경사항 저장';
  });
  profileSection.append(form);root.append(profileSection);
  if(onboarding){root.classList.add('account-onboarding');navlinks(root,[['홈페이지로 돌아가기','/']]);return;}
  const auditionArea=node('div');root.insertBefore(auditionArea,profileSection);
  root.append(node('h2','로그인 및 보안',{class:'account-group-title'}),node('p','필요한 항목을 열어 설정하세요. 추가 로그인 방법은 선택 사항입니다.',{class:'account-section-description'}));
  const identities=config.demo?current.providers.map(provider=>({provider,id:provider})):((await client.auth.getUserIdentities()).data?.identities||[]);
  const identityPanel=accountSetting('로그인 방법',identities.map(i=>providerName(i.provider)).join(' · ')+' 연결됨');
  for(const identity of identities){
   const row=node('div',null,{class:'member-identity'});row.append(node('span',providerName(identity.provider)+' 연결됨'));
   if(identity.provider!=='email'&&identities.length>1)action(row,'연결 해제',async()=>{
    if(!confirm('이 로그인 수단의 연결을 해제할까요? 다른 로그인 수단은 유지됩니다.'))return;
    try{if(config.demo)await demo('unlink',{provider:identity.provider});else{const {error}=await client.auth.unlinkIdentity(identity);if(error)throw error;}location.reload();}
    catch{alert('연결 해제에 실패했습니다. 다른 로그인 수단과 최근 로그인 상태를 확인해주세요.');}
   });
   identityPanel.content.append(row);
  }
  identityPanel.content.append(node('p','다른 로그인 방법을 연결해도 같은 계정을 이용합니다. 다른 회원이 사용하는 계정은 연결할 수 없습니다. 연결을 해제해도 Google·카카오 계정 자체는 삭제되지 않습니다.',{class:'member-note'}));
  social(identityPanel.content,true,identities.map(i=>i.provider));
  const hasEmail=identities.some(i=>i.provider==='email');
  const passwordTitle=recovery?'새 비밀번호 설정':hasEmail?'비밀번호 변경':'이메일 로그인 추가';
  const passwordPanel=accountSetting(passwordTitle,recovery?'새 비밀번호를 설정해 계정을 다시 이용하세요.':hasEmail?'계정 비밀번호를 변경할 수 있습니다.':'비밀번호를 설정하면 이메일로도 로그인할 수 있습니다.',recovery);
  if(recovery)root.insertBefore(passwordPanel.section,profileSection);
  const passForm=node('form');
  const old=recovery||!hasEmail?null:field(passForm,'현재 비밀번호','password',{autocomplete:'current-password',required:''});
  const next=field(passForm,'새 비밀번호','password',{autocomplete:'new-password',required:'',minlength:'12',maxlength:'128'}),check=field(passForm,'새 비밀번호 확인','password',{autocomplete:'new-password',required:'',minlength:'12',maxlength:'128'});
  passForm.append(node('p','비밀번호는 12자 이상으로 설정해주세요.',{class:'account-section-description'}));
  submit(passForm,'비밀번호 저장',async msg=>{
   const error=passwordError(next.value);if(error)throw Error(error);if(next.value!==check.value)throw Error('비밀번호 확인이 일치하지 않습니다.');
   if(config.demo)await demo('password',{password:next.value,currentPassword:old?.value});
   else{const {error}=await client.auth.updateUser({password:next.value,...(old?{current_password:old.value}:{})});if(error)throw Error('비밀번호를 변경하지 못했습니다. 현재 비밀번호 또는 복구 링크의 유효성을 확인해주세요.');}
   if(old)old.value='';next.value=check.value='';msg.textContent='비밀번호를 변경했습니다.';
  });passwordPanel.content.append(passForm);
  const controls=node('div',null,{class:'account-controls'});navlinks(controls,[['홈페이지로 돌아가기','/']]);action(controls,'로그아웃',async()=>{await logout();location.assign('/login');});root.append(controls);
  const withdraw=node('details',null,{class:'member-help account-withdraw'});withdraw.append(node('summary','회원 탈퇴 요청'),node('p','로그아웃과 달리 회원 이용을 종료하는 요청입니다. 즉시 삭제되지 않으며 운영자가 보관 대상과 처리 여부를 확인합니다.'));
  const wf=node('form'),confirmText=field(wf,'확인 문구 탈퇴 요청','text',{required:''});submit(wf,'탈퇴 요청 접수',async()=>{await account('POST',{confirm:confirmText.value,action:'withdraw'});await logout();location.assign('/login');});withdraw.append(wf);root.append(withdraw);
  dashboard=mountDashboard({root,profile,verified:result.verified,overview,profileSection,auditionArea,identityPanel,passwordPanel,withdraw,recovery,welcome:new URLSearchParams(location.search).get('welcome')==='1'});
  accountAuditions(auditionArea,state=>dashboard.updateApplications(state));
  if(!config.demo)client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){root.prepend(node('p','세션이 만료되었습니다. 다시 로그인한 후 저장해주세요.',{role:'alert',class:'member-note'}));}});
 }catch(error){root.append(node('p',error.message,{role:'alert'}));navlinks(root,[['로그인하기','/login?next=/account']]);}
}
async function adminPage(){root.append(node('h1','회원 관리'),node('p','이름·이메일·연락처로 검색하고 회원 이용 상태를 관리합니다. 일반 회원가입으로 관리자 권한이 부여되지 않습니다.'));const auth=await api('/api/admin-auth',null,'GET');if(!auth.authenticated){const form=node('form'),password=field(form,'관리자 비밀번호','password',{required:'',autocomplete:'current-password'});submit(form,'관리자로 로그인',async()=>{await api('/api/admin-auth',{password:password.value});location.reload();});root.append(form);return;}navlinks(root,[['상담방·일지 열기','/admin/consultation'],['홈페이지 관리','/?admin=1']]);action(root,'관리자 로그아웃',async()=>{await api('/api/admin-auth',{},'DELETE');location.reload();});const form=node('form',null,{class:'member-search'}),search=field(form,'회원 검색','search',{placeholder:'이름, 이메일, 연락처',maxlength:'80'});root.append(form);const result=node('div');root.append(result);let offset=0;async function load(){result.replaceChildren();try{const data=await api('/api/admin-members?q='+encodeURIComponent(search.value)+'&offset='+offset,null,'GET');const members=data.members||[];result.append(node('p',`${offset+1}번째부터 ${members.length}명 표시`));for(const member of members){const card=node('article',null,{class:'member-record'});card.append(node('h2',member.name||'가입 정보 입력 전'),node('p',member.email),node('p',member.phone||'연락처 미입력'),node('p','가입일 '+new Date(member.created_at).toLocaleDateString('ko-KR')));const label=node('label','이용 상태'),select=node('select');for(const [v,t]of [['active','이용 가능'],['inactive','이용 중지'],['withdrawal_requested','탈퇴 요청']]){const opt=node('option',t,{value:v});select.append(opt);}select.value=member.status;label.append(select);card.append(label);const msg=status(card);action(card,'회원 상태 저장',async()=>{try{await api('/api/admin-members',{id:member.user_id,status:select.value},'PATCH');msg.textContent='회원 상태를 저장했습니다.';}catch(e){msg.textContent=e.message;}});result.append(card);}if(!members.length)result.append(node('p','검색 결과가 없습니다.'));const pager=node('div',null,{class:'member-links'});if(offset>0)action(pager,'이전 50명',()=>{offset-=50;load();});if(members.length===50)action(pager,'다음 50명',()=>{offset+=50;load();});result.append(pager);}catch(error){result.append(node('p',error.message,{role:'alert'}));}}submit(form,'검색',async()=>{offset=0;await load();});await load();}
(async()=>{root.replaceChildren(node('p','화면을 준비하고 있습니다…'));try{config=await api('/api/member-config',null,'GET');root.replaceChildren();if(config.demo){root.append(node('p','로컬 데모 — 소셜 인증·메일 발송은 실제 연동되지 않습니다.',{class:'member-note'}));current=(await api('/api/member-demo',null,'GET')).user;}else if(config.ready){client=getMemberClient(config);await client.auth.getSession();}else if(page!=='admin'){root.append(node('h1','회원 서비스를 준비하고 있습니다'),node('p','인증 서비스 연결 후 회원가입·로그인을 사용할 수 있습니다.'));return;}
 const params=new URLSearchParams(location.search);if(params.get('error')||location.hash.includes('error=')){root.append(node('p','인증이 취소되었거나 링크가 만료되었습니다. 로그인 화면에서 다시 시작해주세요.',{role:'alert'}));history.replaceState(null,'',location.pathname);}
 if(page==='login')login();else if(page==='signup')signup();else if(page==='reset')reset();else if(page==='account')await accountPage();else if(page==='admin')await adminPage();
 }catch(error){root.replaceChildren(node('h1','연결 상태를 확인해주세요'),node('p',error.message,{role:'alert'}));navlinks(root,[['다시 시도','/login']]);}})();
