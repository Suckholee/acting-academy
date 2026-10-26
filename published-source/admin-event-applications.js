(() => {
  const status=document.querySelector('#admin-event-status'),tbody=document.querySelector('#event-records'),search=document.querySelector('#search'),exportButton=document.querySelector('#export'),login=document.querySelector('#login');
  let records=[];
  const when=value=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
  function render(){
    tbody.replaceChildren();
    const term=search.value.trim().replace(/[ -]/g,'');
    const filtered=records.map((record,index)=>({...record,order:index+1})).filter(r=>r.name.includes(term)||r.phone.includes(term));
    for(const r of filtered){
      const tr=document.createElement('tr'),survey=r.survey||{};
      for(const text of [r.order,r.name,r.phone,survey.ageGroup||'미입력',survey.gender||'미입력',(survey.interests||[]).join(', ')||'미입력']){
        const td=document.createElement('td');
        if(text===r.phone){const a=document.createElement('a');a.href='tel:'+r.phone;a.textContent=r.phone;td.append(a);}else td.textContent=String(text);
        tr.append(td);
      }
      const surveyCell=document.createElement('td'),details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='답변 보기';details.append(summary);
      for(const [label,value] of [['연기 경험',survey.experience||'미입력'],['특강 사전 질문',survey.question||'작성한 질문이 없습니다.']]){const p=document.createElement('p'),strong=document.createElement('strong'),answer=document.createElement('span');strong.textContent=label;answer.textContent=value;p.append(strong,answer);details.append(p);}
      surveyCell.append(details);tr.append(surveyCell);
      for(const text of [when(r.created_at),r.order<=40?'정원 내':'대기']){const td=document.createElement('td');td.textContent=text;tr.append(td);}tbody.append(tr);
    }
    if(!filtered.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=9;td.textContent=records.length?'검색 결과가 없습니다.':'아직 접수된 신청이 없습니다.';tr.append(td);tbody.append(tr);}
    status.textContent=`총 ${records.length}명 접수 · 정원 내 ${Math.min(records.length,40)}명 · 대기 ${Math.max(0,records.length-40)}명`+(term?` · 검색 ${filtered.length}명`:'');
    exportButton.disabled=!records.length;
  }
  async function load(){
    status.textContent='명단을 불러오고 있습니다…';exportButton.disabled=true;
    try{const r=await fetch('/api/admin-event-applications',{credentials:'same-origin',cache:'no-store'}),data=await r.json();if(r.status===401){records=[];tbody.replaceChildren();login.hidden=false;throw Error('관리자 로그인이 필요합니다.');}if(!r.ok)throw Error(data.error||'명단을 불러오지 못했습니다.');records=data.records;login.hidden=true;render();}
    catch(error){records=[];tbody.replaceChildren();status.textContent=error.message;}
  }
  search.addEventListener('input',render);
  document.querySelector('#refresh').addEventListener('click',load);
  document.querySelector('#login-form').addEventListener('submit',async event=>{event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;try{const r=await fetch('/api/admin-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.querySelector('#password').value})});const data=await r.json();if(!r.ok)throw Error(data.error||'로그인하지 못했습니다.');document.querySelector('#password').value='';await load();}catch(error){status.textContent=error.message;}finally{button.disabled=false;}});
  exportButton.addEventListener('click',()=>{
    const cell=value=>'"'+String(value).replace(/^[=+@\-\t\r]/,"'$&").replace(/"/g,'""')+'"';
    const rows=[['접수 순서','이름','연락처','연령대','성별','관심 분야','연기 경험','특강 사전 질문','접수일시','정원 기준'],...records.map((r,i)=>[i+1,r.name,r.phone,r.survey?.ageGroup||'',r.survey?.gender||'',(r.survey?.interests||[]).join(', '),r.survey?.experience||'',r.survey?.question||'',when(r.created_at),i<40?'정원 내':'대기'])];
    const blob=new Blob(['\ufeff'+rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='김정태_무료특강_20261107_신청명단.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  load();
})();
