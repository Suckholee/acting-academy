const {sectionDestination,relatedPages}=require('./section-destinations.cjs');
function duration(value){if(value===null)return'—';if(value<60)return value+'초';if(value<3600)return Math.floor(value/60)+'분 '+value%60+'초';return Math.floor(value/3600)+'시간 '+Math.floor(value%3600/60)+'분';}
function createEngagementPanel({fetcher=fetch,initialPeriod='today'}={}){
  const el=(tag,text,className)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node;};
  const element=el('section',null,'kjt-sources-panel kjt-engagement-panel');element.setAttribute('aria-label','구간별 체류 시간');element.hidden=true;
  const heading=el('div',null,'kjt-sources-heading'),refresh=el('button','새로고침');refresh.type='button';refresh.setAttribute('aria-label','체류 시간 새로고침');heading.append(el('h2','구간별 체류 시간'),refresh);
  const state=el('p','불러오는 중…','kjt-sources-state');state.setAttribute('role','status');const result=el('div',null,'kjt-sources-result');
  element.append(heading,el('p','공개 홈페이지의 구간과 신청 페이지 체류 시간을 비교합니다. 구간이 구분되지 않는 공개 화면은 기타 공개 페이지로 묶습니다. 위에서 선택한 기간으로 함께 조회하며 1시간마다 갱신합니다.','kjt-sources-description'),state,result,
    el('p','첫 안내 팝업을 보는 시간은 별도로 집계하고 팝업 뒤의 본문은 세지 않습니다. 다른 탭·그 밖의 열린 팝업·1분 이상 조작이 없는 시간은 제외하며, 재생 중인 소개 영상은 계속 측정합니다. 실제 시선을 판단하는 지표는 아닙니다.','kjt-sources-note'),
    el('p','각 구간의 방문자는 서로 겹칠 수 있어 더해서 전체 방문자와 비교하지 않습니다. 체류 기록 인원은 구간 전체에서 중복 제거한 수치입니다. 도입 전 방문·1초 미만 이탈·차단·집계 지연 등으로 전체 방문과 차이가 날 수 있습니다.','kjt-sources-note'),
    el('p','평균 체류 = 누적 체류 시간 ÷ 체류 측정 인원. 같은 브라우저가 반복 방문하면 횟수·시간이 늘어도 인원은 중복 제거됩니다. 연결 이후 기록만 표시하며, 광고 차단·페이지 종료 등으로 일부 기록이 누락될 수 있습니다.','kjt-sources-note'));
  let active=false,period=['today','7d','30d'].includes(initialPeriod)?initialPeriod:'today',version=0,timer,lastLabel=null;
  function schedule(){clearTimeout(timer);if(active)timer=setTimeout(()=>{if(document.hidden)schedule();else load();},3600000);}
  async function load(){
    if(!active)return;const current=++version;clearTimeout(timer);refresh.disabled=true;state.textContent='체류 시간 통계를 불러오는 중…';
    try{
      const response=await fetcher('/api/admin-engagement?period='+period,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)}),data=await response.json();
      if(current!==version||!active)return;if(!response.ok)throw Error(data.error||'체류 시간 통계를 불러오지 못했습니다.');
      if(!Array.isArray(data.sections)||data.period!==period)throw Error('체류 시간 응답을 확인할 수 없습니다.');
      const updated=new Date(data.updatedAt);
      const updatedLabel=Number.isNaN(updated.getTime())?'':new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(updated)+' 기준 · ';
      result.replaceChildren();state.textContent=(data.stale?'갱신 지연 · 이전 집계 · ':'')+data.from+' ~ '+data.through+' · 한국 시간 · '+updatedLabel+'평균 체류 시간순';
      lastLabel=state.textContent;if(data.collectionEnabledAt){
        const enabled=new Date(data.collectionEnabledAt),day=new Date(enabled.getTime()+9*3600000).toISOString().slice(0,10);
        if(data.from<=day&&day<=data.through)result.append(el('p','10월 29일은 체류 측정 기능을 순차 추가한 부분 수집일입니다. 기본 측정은 15:06, 상담 페이지는 15:26, 무료 특강 페이지는 15:31에 도입됐으며 이전 체류 기록은 포함되지 않습니다.','kjt-sources-note'));
      }
      const coverage=data.coverage;
      if(coverage&&[coverage.visitors,coverage.trackedVisitors].every(n=>Number.isSafeInteger(n)&&n>=0)){
        const matched=el('p',`선택 기간 전체 방문 ${coverage.visitors.toLocaleString('ko-KR')}명 · 체류 기록 ${coverage.trackedVisitors.toLocaleString('ko-KR')}명`,'kjt-coverage');
        matched.setAttribute('aria-label','전체 방문 대비 체류 측정 인원');result.append(matched);
        result.append(el('p',coverage.visitors>=coverage.trackedVisitors?'체류 기록이 없는 방문 '+(coverage.visitors-coverage.trackedVisitors).toLocaleString('ko-KR')+'명. 원인별 인원을 추정하거나 빠진 시간을 임의로 채우지 않습니다.':'두 집계의 반영 시점에 차이가 있습니다. 잠시 후 다시 확인해주세요.','kjt-sources-note'));
      }else result.append(el('p','전체 방문 대비 체류 측정 인원을 불러오지 못했습니다.','kjt-sources-note'));
      const applications=el('div',null,'kjt-application-counts');applications.setAttribute('aria-label','신청 유형별 접수 건수');
      for(const [title,count,href,linkText]of [['수강 상담 신청',data.applications,'/admin/admissions','상담 명단 보기'],['11/7 무료 특강 신청',data.eventApplications,'/admin/event-applications','특강 명단 보기']]){
        const card=el('div',null,'kjt-application-count');card.append(el('span',title),el('strong',Number.isSafeInteger(count)&&count>=0?count.toLocaleString('ko-KR')+'건':'조회 불가'));const link=el('a',linkText);link.href=href;card.append(link);applications.append(card);
      }
      result.append(applications);
      result.append(el('p','선택한 기간에 실제 저장된 온라인 접수 건수입니다. 수강 상담 신청과 11/7 무료 특강 신청은 각각의 명단을 기준으로 별도 집계하며, 페이지 방문자 수와는 다릅니다. 무료 특강 접수는 참석 확정을 뜻하지 않습니다.','kjt-sources-note'));
      if(Array.isArray(data.formPages)&&data.formPages.length){
        result.append(el('h3','신청 페이지 방문 대조'));
        const table=el('table'),head=el('thead'),row=el('tr'),body=el('tbody');table.setAttribute('aria-label','신청 페이지 방문과 체류 측정 비교');
        for(const title of ['신청 페이지','페이지 방문','체류 측정']){const th=el('th',title);th.scope='col';row.append(th);}head.append(row);
        for(const page of data.formPages){
          if(typeof page.label!=='string'||![page.pageVisitors,page.measuredVisitors].every(n=>n===null||Number.isSafeInteger(n)&&n>=0))throw Error('신청 페이지 방문 집계를 확인할 수 없습니다.');
          const tr=el('tr'),name=el('td'),at=new Date(page.enabledAt);name.append(el('strong',page.label));
          if(!Number.isNaN(at.getTime()))name.append(el('small','체류 측정 도입 '+new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(at)));
          tr.append(name,el('td',page.pageVisitors===null?'조회 불가':page.pageVisitors.toLocaleString('ko-KR')+'명'),el('td',page.measuredVisitors===null?'조회 불가':page.measuredVisitors.toLocaleString('ko-KR')+'명'));body.append(tr);
        }
        table.append(head,body);result.append(table,el('p','페이지 방문은 선택 기간 전체, 체류 측정은 해당 코드 도입 이후 화면 노출이 기록된 인원입니다. 첫 측정은 페이지가 보인 뒤 약 1초 후 시작합니다. 집계 반영 지연·측정 전 방문·차단 등을 개별적으로 구별할 수 없어 차이를 전부 특정 원인으로 단정하지 않습니다.','kjt-sources-note'));
      }
      if(!data.sections.length){result.append(el('p','아직 체류 기록이 없습니다. 측정 연결 이후 방문 기록이 쌓이면 여기에 표시됩니다.'));return;}
      result.append(el('p','구간 이름이나 이미지를 누르면 해당 측정 위치가 새 탭으로 열립니다. 이미지는 2026.10.30 화면을 기준으로 한 위치 확인용 미리보기입니다.','kjt-sources-note'));
      const table=el('table',null,'kjt-dwell-table'),head=el('thead'),row=el('tr'),body=el('tbody');table.setAttribute('aria-label','구간별 체류 시간과 측정 위치');
      for(const title of['구간','체류 측정','평균 체류','누적 체류']){const th=el('th',title);th.scope='col';row.append(th);}head.append(row);
      for(const section of data.sections){
        if(typeof section.label!=='string'||![section.visitors,section.seconds].every(n=>Number.isSafeInteger(n)&&n>=0)||section.averageSeconds!==null&&(!Number.isSafeInteger(section.averageSeconds)||section.averageSeconds<0))throw Error('체류 시간 응답을 확인할 수 없습니다.');
        const tr=el('tr'),name=el('td'),destination=sectionDestination(section);
        if(destination){
          const link=el('a',null,'kjt-section-destination');link.href=destination.href;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',section.label+' · 새 탭에서 측정 위치 열기');
          const image=el('img');image.src=destination.image;image.alt='';image.loading='lazy';image.decoding='async';image.width=112;image.height=76;image.addEventListener('error',()=>{image.hidden=true;},{once:true});
          const text=el('span',null,'kjt-section-description');text.append(el('strong',section.label+' ↗'),el('span',destination.href,'kjt-section-path'),el('small',destination.context));link.append(image,text);name.append(link);
        }else{
          name.append(el('strong',section.label));
          if(section.id==='other_public'||section.label==='기타 공개 페이지'){
            name.append(el('small','여러 상세 페이지 합산 · 개별 측정 주소는 구분되지 않습니다.'));
            const details=el('details',null,'kjt-section-related');details.append(el('summary','관련 공개 페이지 보기'));
            const links=el('div');for(const [label,href]of relatedPages){const link=el('a',label+' · '+href);link.href=href;link.target='_blank';link.rel='noopener noreferrer';links.append(link);}details.append(links);name.append(details);
          }else name.append(el('small','측정 위치를 확인할 수 없습니다.'));
        }
        tr.append(name,el('td',section.visitors.toLocaleString('ko-KR')+'명'),el('td',duration(section.averageSeconds)),el('td',duration(section.seconds)));body.append(tr);
      }
      table.append(head,body);result.append(table);
    }catch(error){if(current===version&&active)state.textContent=error.message+(lastLabel?' · 마지막 정상 집계: '+lastLabel:'');}
    finally{if(current===version){refresh.disabled=false;schedule();}}
  }
  refresh.onclick=load;document.addEventListener('visibilitychange',()=>{if(!document.hidden&&active)load();});
  return{element,setActive(value){if(active===value)return;active=value;version++;element.hidden=!value;clearTimeout(timer);if(value)load();else{result.replaceChildren();lastLabel=null;}},setPeriod(value){if(!['today','7d','30d'].includes(value)||period===value)return;period=value;result.replaceChildren();lastLabel=null;if(active)load();}};
}
module.exports={createEngagementPanel,duration};
