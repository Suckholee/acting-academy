const {createVisitorSummary}=require('./admin-summary.cjs');
const {createVisitorSources}=require('./source-panel.cjs');
const {createEngagementPanel}=require('./engagement-panel.cjs');
const {createConversionPanel}=require('./conversion-panel.cjs');
const root=document.querySelector('#visitor-sources-root');
const summary=createVisitorSummary();
const initialPeriod=new URLSearchParams(location.search).get('period');
const engagement=createEngagementPanel({initialPeriod});
const conversions=createConversionPanel({initialPeriod});
const sources=createVisitorSources({initialPeriod,onPeriodChange:period=>{history.replaceState(null,'','/admin/visitor-sources?period='+period);engagement.setPeriod(period);conversions.setPeriod(period);}});
const logout=document.querySelector('#sources-logout');
function el(tag,text,attrs={}){const node=document.createElement(tag);if(text)node.textContent=text;for(const[k,v]of Object.entries(attrs))node.setAttribute(k,v);return node;}
async function request(url,options={}){const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...options,headers:{'Content-Type':'application/json'}});const data=await response.json();if(!response.ok)throw Error(data.error||'요청을 완료하지 못했습니다.');return data;}
function showDashboard(){root.replaceChildren(summary.element,sources.element,conversions.element,engagement.element);summary.setActive(true);sources.setActive(true);engagement.setActive(true);conversions.setActive(true);logout.hidden=false;}
function showLogin(message='관리자 로그인 후 유입 경로를 확인할 수 있습니다.'){
  summary.setActive(false);sources.setActive(false);engagement.setActive(false);conversions.setActive(false);logout.hidden=true;
  const form=el('form',null,{class:'kjt-sources-login'}),label=el('label','관리자 비밀번호'),password=el('input',null,{type:'password',required:'',autocomplete:'current-password'});
  label.append(password);const button=el('button','로그인',{type:'submit'}),state=el('p',message,{role:'status'});form.append(label,button,state);root.replaceChildren(form);
  form.onsubmit=async event=>{event.preventDefault();button.disabled=true;state.textContent='로그인 중…';try{await request('/api/admin-auth',{method:'POST',body:JSON.stringify({password:password.value})});password.value='';showDashboard();}catch(error){state.textContent=error.message;}finally{button.disabled=false;}};
}
logout.onclick=async()=>{logout.disabled=true;try{await request('/api/admin-auth',{method:'DELETE'});showLogin();}catch(error){const state=el('p',error.message,{role:'alert'});root.prepend(state);}finally{logout.disabled=false;}};
(async()=>{try{const auth=await request('/api/admin-auth');if(auth.authenticated)showDashboard();else showLogin();}catch(error){showLogin(error.message);}})();
