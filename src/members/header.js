import {memberSession} from './session.js';
const header=document.querySelector('body>header');
if(header&&!location.pathname.startsWith('/admin')){
 let group=header.querySelector('.header-account-links')||header.querySelector('.member-header nav');
 if(!group&&header.classList.contains('member-header'))group=header.querySelector('nav');
 if(!group){group=document.createElement('div');group.className='member-session-links';header.prepend(group);header.classList.add('has-member-session');}
 group.setAttribute('role','group');group.setAttribute('aria-label','회원 메뉴');
 let client;
 const link=(label,href)=>{const a=document.createElement('a');a.textContent=label;a.href=href;return a;};
 function render(session){
  group.replaceChildren();
  if(header.classList.contains('member-header'))group.append(link('홈페이지','/'));
  if(!session){const next=location.pathname+location.search+location.hash;const suffix=/^\/(login|signup|account|reset-password)/.test(location.pathname)?'':'?next='+encodeURIComponent(next);group.append(link('로그인','/login'+suffix),link('회원가입','/signup'+suffix));return;}
  const logout=document.createElement('button');logout.type='button';logout.textContent='로그아웃';
  logout.onclick=async()=>{logout.disabled=true;try{const {error}=await client.auth.signOut();if(error)throw error;sessionStorage.removeItem('kjt-member-return');for(const key of Object.keys(sessionStorage))if(key.startsWith('kjt-member-draft-'))sessionStorage.removeItem(key);render(null);if(location.pathname==='/account')location.assign('/login');}catch{logout.disabled=false;logout.textContent='로그아웃 다시 시도';logout.title='로그아웃을 완료하지 못했습니다. 다시 눌러주세요.';}};
  group.append(link('내 계정','/account'),logout);
 }
 render(null);
 memberSession().then(state=>{client=state.client;render(state.session);client.auth.onAuthStateChange((_event,session)=>render(session));}).catch(()=>{render(null);});
}
