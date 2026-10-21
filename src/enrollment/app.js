const courses=require('../../content/courses.json');
const {purposes,regions}=require('./model.cjs');
const root=document.querySelector('#enrollment-root');
const query=new URLSearchParams(location.search);
const state={step:0,purpose:'',course:'',region:'',name:'',phone:'',consent:false,busy:false,done:false};
const source=query.get('source')==='instagram'||query.get('utm_source')==='instagram'?'instagram':'website';
const el=(tag,text,attrs={})=>{const n=document.createElement(tag);if(text)n.textContent=text;for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
const steps=[{key:'purpose',title:'어떤 목적으로 연기를 배우고 싶으세요?',subtitle:'나에게 맞는 수업을 함께 찾아드릴게요.',options:purposes.map(x=>[x,x])},{key:'course',title:'관심 있는 과정은 무엇인가요?',subtitle:'선택한 과정은 상담 때 다시 조정할 수 있어요.',options:courses.map(c=>[c.id,c.title])},{key:'region',title:'어느 지역에서 오시나요?',subtitle:'상담과 수강 안내를 위해 알려주세요.',options:regions.map(x=>[x,x])}];
function render(){
 root.replaceChildren();
 const nav=el('div',null,{class:'apply-nav'}),back=el('button','‹',{type:'button','aria-label':'이전 단계'}),close=el('a','×',{href:'/?chat=1','aria-label':'챗봇으로 돌아가기'});
 back.disabled=state.step===0||state.busy||state.done;back.onclick=()=>{state.step--;render();};nav.append(back,el('a','김정태 배우아카데미',{href:'/',class:'brand'}),close);root.append(nav);
 if(state.done){const done=el('section',null,{class:'apply-content done',tabindex:'-1'});done.append(el('span','✓',{class:'done-check'}),el('p','상담 대기 등록 완료',{class:'eyebrow'}),el('h1','신청이 접수되었습니다.'),el('p','임도윤 실장이 남겨주신 번호로 직접 연락드리겠습니다.'),el('p','수강 확정은 상담 후 진행됩니다.',{class:'muted'}),el('a','홈페이지로 돌아가기',{href:'/',class:'primary-link'}));root.append(done);done.focus();return;}
 const progress=el('div',null,{class:'progress',role:'progressbar','aria-label':'신청 진행 단계','aria-valuemin':'1','aria-valuemax':'4','aria-valuenow':String(state.step+1)});for(let i=0;i<4;i++)progress.append(el('i',null,{class:i<=state.step?'filled':''}));root.append(progress);
 const content=el('section',null,{class:'apply-content'});root.append(content);content.append(el('p',`${state.step+1} / 4 · 수강 상담 신청`,{class:'eyebrow'}));
 if(state.step<3){const step=steps[state.step];const title=el('h1',step.title,{tabindex:'-1'});content.append(title,el('p',step.subtitle,{class:'muted'}));const choices=el('div',null,{class:'choices',role:'group','aria-label':step.title});for(const [value,label]of step.options){const button=el('button',label,{type:'button',class:'choice','aria-pressed':String(state[step.key]===value)});button.append(el('span',state[step.key]===value?'●':'○',{'aria-hidden':'true'}));button.onclick=()=>{state[step.key]=value;state.step++;render();};choices.append(button);}content.append(choices);title.focus({preventScroll:true});window.scrollTo(0,0);return;}
 const title=el('h1','연락처를 남겨주세요.',{tabindex:'-1'});content.append(title,el('p','상담 대기자 명단에 등록하면 임도윤 실장이 연락드립니다.',{class:'muted'}));
 const summary=el('div',null,{class:'summary'});summary.append(el('strong',courses.find(c=>c.id===state.course)?.title||''),el('p',state.purpose+' · '+state.region));content.append(summary);
 const form=el('form');for(const [key,text,type]of [['name','이름','text'],['phone','휴대전화 번호','tel']]){const label=el('label',text,{class:'field'}),input=el('input',null,{type,name:key,required:'',autocomplete:key==='name'?'name':'tel',maxlength:key==='name'?'40':'15',...(key==='phone'?{inputmode:'tel',placeholder:'010-0000-0000'}:{})});input.value=state[key];input.oninput=()=>state[key]=input.value;label.append(input);form.append(label);}
 form.append(el('p','주식회사 스토리나인(김정태 배우아카데미)은 상담 연락을 위해 이름·휴대전화·수강 목적·희망 과정·지역을 수집하며, 상담 및 연락 완료 시까지 보관합니다. 동의를 거부할 수 있으나 온라인 신청이 제한됩니다.',{class:'privacy'}));
 const consent=el('label',null,{class:'consent'}),checkbox=el('input',null,{type:'checkbox',required:''});checkbox.checked=state.consent;checkbox.onchange=()=>state.consent=checkbox.checked;consent.append(checkbox,document.createTextNode('개인정보 수집·이용에 동의합니다. (필수)'));form.append(consent);
 const status=el('p','',{role:'status',class:'status'}),submit=el('button','동의하고 상담 신청하기',{type:'submit',class:'primary'});form.append(status,submit);content.append(form);
 form.onsubmit=async event=>{event.preventDefault();if(state.busy)return;state.busy=true;submit.disabled=true;back.disabled=true;status.textContent='상담 대기자 명단에 등록하고 있습니다…';try{const response=await fetch('/api/course-application',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:state.name,phone:state.phone,purpose:state.purpose,course:state.course,region:state.region,consent:state.consent,source})});const data=await response.json();if(!response.ok)throw Error(data.error||'접수를 확인하지 못했습니다.');state.done=true;state.busy=false;render();}catch(error){status.textContent=error.message||'연결을 확인하고 다시 시도해주세요.';state.busy=false;submit.disabled=false;back.disabled=false;}};
 title.focus({preventScroll:true});window.scrollTo(0,0);
}
render();
