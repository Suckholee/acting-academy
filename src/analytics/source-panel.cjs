const {sourceName}=require('./source-model.cjs');

function createVisitorSources({fetcher=fetch, initialPeriod='today', onPeriodChange=()=>{}}={}) {
  function el(tag,text,className) { const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node; }
  const element=el('section',null,'kjt-sources-panel');element.setAttribute('aria-label','방문자 유입 경로');element.hidden=true;
  const tools=el('div',null,'kjt-sources-tools'),period=el('select');period.setAttribute('aria-label','유입 경로 조회 기간');
  const selected=['today','7d','30d'].includes(initialPeriod)?initialPeriod:'today';
  for(const[value,title]of[['today','오늘'],['7d','최근 7일'],['30d','최근 30일']]) { const option=el('option',title);option.value=value;option.selected=value===selected;period.append(option); }
  const refresh=el('button','새로고침');refresh.type='button';refresh.setAttribute('aria-label','유입 경로 새로고침');
  const state=el('p','불러오는 중…','kjt-sources-state');state.setAttribute('role','status');
  const result=el('div',null,'kjt-sources-result');tools.append(period,refresh);
  element.append(tools,state,result,
    el('p','직접 방문·확인 불가는 주소 직접 입력, 즐겨찾기, 일부 앱·메신저 등에서 출처 정보가 전달되지 않은 방문을 포함합니다.','kjt-sources-note'),
    el('p','같은 플랫폼의 주소는 한 줄로 묶고 방문자 중복을 제거합니다. 여러 플랫폼을 이용한 방문자는 각각에 포함될 수 있습니다. 주요 플랫폼과 나머지 상위 20개 출처를 표시합니다.','kjt-sources-note'));
  let active=false,version=0,timer=null,lastLabel=null;
  function schedule(){clearTimeout(timer);if(active)timer=setTimeout(()=>{if(document.hidden)schedule();else load();},3600000);}
  async function load(){
    if(!active)return;const current=++version,selected=period.value;clearTimeout(timer);refresh.disabled=true;
    state.textContent='유입 경로를 불러오는 중…';
    try{
      const response=await fetcher('/api/admin-visitor-sources?period='+selected,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)});
      const data=await response.json();if(current!==version||!active)return;
      if(!response.ok)throw Error(data.error||'유입 경로를 불러오지 못했습니다.');
      if(!Array.isArray(data.sources)||data.period!==selected)throw Error('유입 경로 응답을 확인할 수 없습니다.');
      const time=new Date(data.updatedAt).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false});
      result.replaceChildren();state.textContent=(data.stale?'갱신 지연 · 이전 집계 · ':'')+(data.demo?'미리보기 예시 · ':'')+data.from+' ~ '+data.through+' · 한국 시간 · '+time+' 기준';
      lastLabel=state.textContent;if(!data.sources.length){result.append(el('p','선택한 기간에 집계된 방문이 없습니다.'));return;}
      const table=el('table'),head=el('thead'),headRow=el('tr'),body=el('tbody');
      for(const title of['유입 경로','방문자','조회 수']){const th=el('th',title);th.scope='col';headRow.append(th);}head.append(headRow);
      for(const source of data.sources){
        if(typeof source.hostname!=='string'||![source.visitors,source.pageviews].every(n=>Number.isSafeInteger(n)&&n>=0))throw Error('유입 경로 응답을 확인할 수 없습니다.');
        const row=el('tr'),name=el('td'),title=sourceName(source.hostname);name.append(el('strong',title));
        if(source.grouped)name.append(el('small','관련 주소 통합'));else if(source.hostname&&title!==source.hostname&&title!=='기타 경로')name.append(el('small',source.hostname));
        row.append(name,el('td',source.visitors.toLocaleString('ko-KR')+'명'),el('td',source.pageviews.toLocaleString('ko-KR')+'회'));body.append(row);
      }
      table.append(head,body);result.append(table);
    }catch(error){if(current===version&&active)state.textContent=error.message+(lastLabel?' · 마지막 정상 집계: '+lastLabel:'');}
    finally{if(current===version){refresh.disabled=false;schedule();}}
  }
  period.onchange=()=>{result.replaceChildren();lastLabel=null;onPeriodChange(period.value);load();};refresh.onclick=load;
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&active)load();});
  return {element,setActive(value){if(active===value)return;active=value;version++;element.hidden=!value;clearTimeout(timer);if(value)load();else{result.replaceChildren();lastLabel=null;state.textContent='불러오는 중…';}}};
}
module.exports={createVisitorSources};
