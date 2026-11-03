const courses = require('../../content/courses.json');
const {browserSource} = require('../analytics/attribution.cjs');
const root = document.querySelector('#enrollment-root');
const query = new URLSearchParams(location.search);
const source = (query.get('source') || query.get('utm_source') || '').toLowerCase() === 'instagram' ? 'instagram' : 'website';
const selectedCourse = courses.some(c => c.id === query.get('course')) ? query.get('course') : '';
const state = {name:'',phone:'',course:selectedCourse,consent:false,busy:false,done:false};
// Capture the entry platform before the visitor spends time completing the form.
const attributionSource = browserSource();
const el = (tag,text,attrs={}) => {const n=document.createElement(tag);if(text)n.textContent=text;for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
function render(){
 root.replaceChildren();
 const nav=el('div',null,{class:'apply-nav'});
 nav.append(el('a','← 홈페이지',{href:'/',class:'apply-home'}),el('a','김정태 배우아카데미',{href:'/',class:'brand'}));root.append(nav);
 const content=el('section',null,{class:'apply-content'+(state.done?' done':'')});root.append(content);
 if(state.done){
  content.setAttribute('tabindex','-1');
  content.append(el('span','✓',{class:'done-check','aria-hidden':'true'}),el('p','수강 상담 신청',{class:'eyebrow'}),el('h1','상담 신청이 접수되었습니다.'),el('p','임도윤 실장이 남겨주신 번호로 직접 연락드리겠습니다.'),el('p','수강 확정은 상담 후 진행됩니다.',{class:'muted'}),el('a','홈페이지로 돌아가기',{href:'/',class:'primary-link'}));content.focus();return;
 }
 content.append(el('p','수강 상담 신청',{class:'eyebrow'}),el('h1','배우를 향한 다음 준비,\n함께 이야기해요.'),el('p','이름과 연락처만 남겨주세요.\n임도윤 실장이 직접 연락드립니다.',{class:'muted apply-lead'}));
 const form=el('form',null,{'aria-label':'수강 상담 신청','aria-busy':'false'});
 for(const[key,title,type]of [['name','이름','text'],['phone','휴대전화 번호','tel']]){
  const label=el('label',title,{class:'field'}),input=el('input',null,{type,name:key,required:'',autocomplete:key==='name'?'name':'tel',maxlength:key==='name'?'40':'15',...(key==='name'?{minlength:'2',placeholder:'이름을 입력해주세요'}:{inputmode:'tel',placeholder:'010-0000-0000'})});
  input.value=state[key];input.oninput=()=>{state[key]=input.value;};label.append(input);form.append(label);
 }
 const optional=el('details',null,{class:'apply-optional'});if(state.course)optional.setAttribute('open','');optional.append(el('summary','관심 과정 남기기 (선택)'));
 const label=el('label','관심 과정',{class:'field'}),select=el('select',null,{name:'course'});select.append(el('option','상담 후 선택할게요',{value:''}));
 for(const course of courses)select.append(el('option',course.title,{value:course.id}));select.value=state.course;select.onchange=()=>{state.course=select.value;};label.append(select);optional.append(label);form.append(optional);
 form.append(el('p','주식회사 스토리나인(김정태 배우아카데미)은 상담 연락을 위해 이름·휴대전화 번호·유입 플랫폼을 수집하며, 관심 과정은 선택한 경우에만 수집합니다. 상담 및 연락 완료 시까지 보관합니다. 동의를 거부할 수 있으나 온라인 신청이 제한됩니다.',{class:'privacy',id:'apply-privacy'}));
 const consent=el('label',null,{class:'consent'}),checkbox=el('input',null,{type:'checkbox',name:'consent',required:'','aria-describedby':'apply-privacy'});checkbox.checked=state.consent;checkbox.onchange=()=>{state.consent=checkbox.checked;};consent.append(checkbox,document.createTextNode('개인정보 수집·이용에 동의합니다. (필수)'));form.append(consent);
 const status=el('p','',{role:'status','aria-live':'polite',class:'status'}),submit=el('button','상담 신청하기',{type:'submit',class:'primary'});
 form.append(status,submit,el('p','신청 후 담당자가 연락드립니다. 수강 등록은 상담 후 결정하세요.',{class:'apply-note'}),el('a','개인정보 처리방침',{href:'/privacy',target:'_blank',rel:'noopener',class:'privacy-link'}));content.append(form);
 form.onsubmit=async event=>{
  event.preventDefault();if(state.busy||state.done)return;state.busy=true;form.setAttribute('aria-busy','true');
  const controls=[...form.querySelectorAll('input,select,button')];controls.forEach(c=>{c.disabled=true;});status.textContent='상담 신청을 접수하고 있습니다…';
  try{
   const payload={name:state.name.trim(),phone:state.phone.trim(),consent:state.consent,source,attributionSource};if(state.course)payload.course=state.course;
   const response=await fetch('/api/course-application',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),data=await response.json();
   if(!response.ok||!data.id)throw Error(data.error||'접수를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.');state.done=true;render();
  }catch(error){status.textContent=error.message||'연결을 확인하고 다시 시도해주세요.';controls.forEach(c=>{c.disabled=false;});}
  finally{state.busy=false;form.setAttribute('aria-busy','false');}
 };
}
render();
