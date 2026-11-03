const {PLATFORMS}=require('./source-model.cjs');
const LABELS={...Object.fromEntries(PLATFORMS.map(p=>[p.key,p.name])),direct:'직접 방문·출처 없음',other:'기타 외부 경로',unknown:'출처 확인 불가',uncollected:'기존 신청 · 출처 미수집'};
function createConversionPanel({fetcher=fetch,initialPeriod='today'}={}){
 const el=(tag,text,className)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(className)n.className=className;return n;};
 const element=el('section',null,'kjt-sources-panel kjt-engagement-panel');element.setAttribute('aria-label','신청으로 이어진 유입 경로');element.hidden=true;
 const heading=el('div',null,'kjt-sources-heading'),refresh=el('button','새로고침');refresh.type='button';refresh.setAttribute('aria-label','신청 유입 경로 새로고침');heading.append(el('h2','신청으로 이어진 유입 경로'),refresh);
 const status=el('p',null,'kjt-sources-state');status.setAttribute('role','status');const result=el('div',null,'kjt-sources-result');
 element.append(heading,el('p','어떤 플랫폼에서 들어온 방문이 실제 신청 접수로 이어졌는지 비교합니다. 위에서 선택한 기간으로 함께 조회합니다.','kjt-sources-description'),status,result,
  el('p','한 탭에서 이번 방문의 최초 출처를 유지합니다(마지막 페이지 이동 후 30분). 주소의 유입 플랫폼 표시 또는 전달된 출처를 사용하며, 브라우저 설정으로 출처가 누락될 수 있습니다. 과거 신청의 출처를 현재 방문 통계로 추정하지 않습니다.','kjt-sources-note'),
  el('p','신청 건수는 실제 저장된 접수 기준입니다. 방문자 수와 단위·수집 시작 시점이 달라 전환율을 임의로 계산하지 않습니다. 무료 특강 접수는 참석 확정과 다릅니다.','kjt-sources-note'));
 let active=false,period=['today','7d','30d'].includes(initialPeriod)?initialPeriod:'today',version=0,timer;
 function schedule(){clearTimeout(timer);if(active)timer=setTimeout(()=>{if(document.hidden)schedule();else load();},3600000);}
 async function load(){
  if(!active)return;const current=++version;clearTimeout(timer);refresh.disabled=true;result.replaceChildren();status.textContent='신청 유입 경로를 불러오는 중…';
  try{
   const response=await fetcher('/api/admin-application-sources?period='+period,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)}),data=await response.json();
   if(current!==version||!active)return;if(!response.ok)throw Error(data.error||'신청 유입 경로를 불러오지 못했습니다.');
   if(data.period!==period||!Array.isArray(data.sources))throw Error('신청 유입 경로 응답을 확인할 수 없습니다.');
   const at=new Date(data.updatedAt).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false});status.textContent=data.from+' ~ '+data.through+' · 한국 시간 · '+at+' 기준';
   if(!data.sources.length){result.append(el('p','선택한 기간에 접수된 신청이 없습니다.'));return;}
   const table=el('table'),head=el('thead'),tr=el('tr'),body=el('tbody');for(const title of ['최초 유입 경로','수강 상담 신청','11/7 무료 특강 신청']){const th=el('th',title);th.scope='col';tr.append(th);}head.append(tr);
   for(const source of [...data.sources].sort((a,b)=>b.consultations+b.events-a.consultations-a.events)){
    if(!Object.hasOwn(LABELS,source.source)||![source.consultations,source.events].every(n=>Number.isSafeInteger(n)&&n>=0))throw Error('신청 유입 경로 응답을 확인할 수 없습니다.');
    const row=el('tr');row.append(el('td',LABELS[source.source]),el('td',source.consultations.toLocaleString('ko-KR')+'건'),el('td',source.events.toLocaleString('ko-KR')+'건'));body.append(row);
   }
   table.append(head,body);result.append(table);
  }catch(error){if(current===version&&active)status.textContent=error.message;}finally{if(current===version){refresh.disabled=false;schedule();}}
 }
 refresh.onclick=load;document.addEventListener('visibilitychange',()=>{if(!document.hidden&&active)load();});
 return{element,setActive(value){if(value===active)return;active=value;version++;element.hidden=!value;clearTimeout(timer);if(value)load();else result.replaceChildren();},setPeriod(value){if(!['today','7d','30d'].includes(value)||value===period)return;period=value;if(active)load();}};
}
module.exports={createConversionPanel};
