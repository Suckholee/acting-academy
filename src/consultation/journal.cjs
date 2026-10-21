const {attachInk}=require('./ink.cjs');
const {createPenTools,strokeOpacity}=require('./pen-tools.cjs');
const pendingAudio=new Map();
const FIELDS=[['goals','수강 목표·현재 경험'],['summary','상담 핵심 내용'],['recommendation','추천 과정·수강 계획'],['followup','후속 연락·다음 약속'],['memo','추가 확인 사항']];
function renderInk(strokes,background){
 return new Promise(async(resolve,reject)=>{try{
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=1024;const ctx=canvas.getContext('2d');ctx.fillStyle='#fbf8ef';ctx.fillRect(0,0,768,1024);
  if(background){const image=new Image();image.src=background;await image.decode();ctx.drawImage(image,0,0,768,1024);}
  for(const stroke of strokes){ctx.beginPath();ctx.globalAlpha=strokeOpacity(stroke);ctx.strokeStyle=stroke.color;ctx.lineWidth=stroke.width;ctx.lineCap='round';ctx.lineJoin='round';stroke.points.forEach((p,i)=>i?ctx.lineTo(p[0]*768,p[1]*1024):ctx.moveTo(p[0]*768,p[1]*1024));ctx.stroke();}
  resolve(canvas.toDataURL('image/jpeg',.8));
 }catch(error){reject(error);}});
}
function openJournal({room,dialog,el,button,field,queue,saveAll,updateRoomBadge,current,getPage}){
 const d=dialog(room.name+' · 상담 기록');d.classList.add('handwritten-journal');
 const intro=el('p','상담 중에는 펜으로 적거나 녹음하세요. 끝난 뒤 정리를 누르면 상담 보고서 초안이 만들어집니다.',{class:'journal-intro'}),state=el('p','',{role:'status',class:'journal-state'});
 const tools=el('nav',null,{class:'journal-pen-tools','aria-label':'상담 메모 필기 도구'}),sheet=el('div',null,{class:'journal-paper','aria-label':'손글씨 상담 메모'});
 sheet.append(el('span','상담 메모',{class:'journal-paper-title'}));
 let recorder=null,stream=null,timer=null,seconds=0,working=false,uploading=false,draft=false;
 const penTools=createPenTools({container:tools,el,button,onUndo:()=>noteInk.undo()});
 const noteInk=attachInk(sheet,{enabled:()=>!working&&!uploading,mode:penTools.mode,color:penTools.color,width:penTools.width,tool:penTools.tool,onChange:strokes=>{room.annotations._journal=strokes;queue('journal_ink',{action:'journal_ink',strokes});}});noteInk.set(room.annotations?._journal||[]);
 const audioSection=el('section',null,{class:'journal-audio'}),audioHeading=el('h3','녹음'),audioList=el('div',null,{class:'journal-recordings'}),consentLabel=el('label',null,{class:'journal-consent'}),recordConsent=el('input',null,{type:'checkbox'});consentLabel.append(recordConsent,document.createTextNode('상담 참여자에게 녹음과 AI 정리 이용을 안내하고 동의를 받았습니다.'));
 const record=button('● 녹음 시작',async()=>{
  if(recorder?.state==='recording'){recorder.stop();return;}
  if(pendingAudio.has(room.id)){state.textContent='저장 대기 중인 녹음을 먼저 저장해주세요.';return;}
  if(!recordConsent.checked){state.textContent='참여자에게 녹음 이용을 안내한 뒤 체크해주세요.';return;}
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){state.textContent='이 브라우저에서는 직접 녹음을 지원하지 않습니다. 녹음 파일을 첨부해주세요.';return;}
  if((room.annotations._recordings||[]).length>=20){state.textContent='상담방당 녹음은 20개까지 보관할 수 있습니다.';return;}
  record.disabled=true;file.disabled=true;
  try{
   stream=await navigator.mediaDevices.getUserMedia({audio:true});const type=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>MediaRecorder.isTypeSupported(t));
   recorder=new MediaRecorder(stream,{...(type?{mimeType:type}:{}),audioBitsPerSecond:64000});const chunks=[];seconds=0;
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   recorder.onstop=async()=>{clearInterval(timer);stream.getTracks().forEach(t=>t.stop());record.textContent='● 녹음 시작';record.classList.remove('recording');const blob=new Blob(chunks,{type:recorder.mimeType});recorder=null;file.disabled=false;if(blob.size){pendingAudio.set(room.id,{blob,consent:true});drawRecordings();await uploadPending();}};
   recorder.onerror=()=>{state.textContent='녹음이 중단되었습니다. 저장된 분량을 확인해주세요.';if(recorder?.state==='recording')recorder.stop();};
   recorder.start(1000);record.disabled=false;record.textContent='■ 녹음 종료 · 00:00';record.classList.add('recording');state.textContent='녹음 중입니다. 10분마다 종료 후 저장해주세요.';
   timer=setInterval(()=>{seconds++;record.textContent='■ 녹음 종료 · '+String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');if(seconds>=600&&recorder?.state==='recording')recorder.stop();},1000);
  }catch{record.disabled=false;file.disabled=false;stream?.getTracks().forEach(t=>t.stop());state.textContent='마이크를 사용할 수 없습니다. 브라우저의 마이크 권한을 확인해주세요.';}
 });
 const fileLabel=el('label','녹음 파일 첨부',{class:'journal-file'}),file=el('input',null,{type:'file',accept:'audio/*,video/webm'});fileLabel.append(file);file.onchange=async()=>{if(recorder||uploading){state.textContent='진행 중인 녹음을 먼저 종료해주세요.';file.value='';return;}if(!recordConsent.checked){state.textContent='녹음 이용 동의를 먼저 확인해주세요.';file.value='';return;}const blob=file.files[0];if(!blob)return;if(pendingAudio.has(room.id)){state.textContent='저장 대기 중인 녹음을 먼저 저장해주세요.';return;}if(blob.size>20*1024*1024){state.textContent='녹음 파일은 20MB 이하로 첨부해주세요.';return;}pendingAudio.set(room.id,{blob,consent:true});drawRecordings();await uploadPending();file.value='';};
 const call=async(action,extra={})=>{await saveAll();return(await fetch('/api/admin-consultation-notes',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({roomId:room.id,revision:room.revision,action,...extra})})).json().then(data=>{if(data.error)throw new Error(data.error);return data;});};
 const acceptRecord=data=>{room.revision=data.record.revision;room.updated_at=data.record.updated_at;room.annotations=data.record.annotations;};
 async function uploadPending(){
  if(uploading||!pendingAudio.has(room.id))return;noteInk.cancel();uploading=true;record.disabled=true;file.disabled=true;organize.disabled=true;
  const pending=pendingAudio.get(room.id);
  try{state.textContent='녹음 원본을 저장하고 있습니다…';if(!pending.path){const signed=await call('upload',{type:pending.blob.type,size:pending.blob.size});const response=await fetch(signed.signedUrl,{method:'PUT',headers:{'Content-Type':pending.blob.type,'x-upsert':'false'},body:pending.blob});if(!response.ok)throw new Error('녹음 업로드에 실패했습니다. 다시 저장해주세요.');pending.path=signed.path;}
   acceptRecord(await call('attach',{path:pending.path}));pendingAudio.delete(room.id);state.textContent='녹음 원본을 저장했습니다.';drawRecordings();
  }catch(e){state.textContent=e.message+' 이 창에서 녹음을 다시 저장할 수 있습니다.';drawRecordings();}finally{uploading=false;record.disabled=false;file.disabled=false;organize.disabled=false;}
 }
 function drawRecordings(){
  audioList.querySelectorAll('audio').forEach(a=>{a.pause();if(a.dataset.localUrl)URL.revokeObjectURL(a.dataset.localUrl);});audioList.replaceChildren();for(const[i,r]of(room.annotations._recordings||[]).entries()){
   const row=el('div',null,{class:'journal-recording'}),audio=el('audio',null,{controls:'',preload:'none'}),play=button('녹음 '+(i+1)+' 재생',async()=>{try{const data=await call('play',{recordingId:r.id});audio.src=data.url;audio.hidden=false;await audio.play();}catch(e){state.textContent=e.message;}});audio.hidden=true;row.append(play,el('small',r.transcript?'전사 완료':'정리할 때 전사합니다'),audio);
   if(r.transcript){const details=el('details'),text=el('p',r.transcript,{class:'journal-transcript'});details.append(el('summary','녹음 전사 보기'),text);row.append(details);}audioList.append(row);
  }
  const pending=pendingAudio.get(room.id);if(pending){const row=el('div',null,{class:'journal-recording'}),audio=el('audio',null,{controls:''});audio.src=URL.createObjectURL(pending.blob);audio.dataset.localUrl=audio.src;row.append(el('span','저장 대기 중인 녹음'),audio,button('녹음 다시 저장',uploadPending),el('a','원본 내려받기',{href:audio.src,download:'상담녹음.'+(pending.blob.type.includes('mp4')?'m4a':'webm')}),button('대기 녹음 삭제',()=>{pendingAudio.delete(room.id);drawRecordings();state.textContent='저장 대기 녹음을 삭제했습니다.';}));audioList.append(row);}
 }
 audioSection.append(audioHeading,consentLabel,record,fileLabel,audioList);
 const aiLabel=el('label',null,{class:'journal-consent'}),aiConsent=el('input',null,{type:'checkbox'});aiLabel.append(aiConsent,document.createTextNode('필기와 녹음을 AI에 전송해 보고서 초안을 만듭니다.'));
 const reportDetails=el('details',null,{class:'journal-report'}),reportSummary=el('summary','상담 보고서'),reportForm=el('div'),inputs={};
 reportDetails.append(reportSummary,el('p','원본과 대조해 확인한 뒤 저장하세요. 직접 수정할 수 있습니다.',{class:'journal-intro'}),reportForm);
 for(const[key,label]of FIELDS){inputs[key]=field(reportForm,label,key,room.journal?.[key]||'',{area:true,max:key==='memo'?8000:4000});inputs[key].oninput=()=>{if(!draft){room.journal=Object.fromEntries(FIELDS.map(([k])=>[k,inputs[k].value]));queue('journal',{action:'journal',journal:{...room.journal}});}};}
 const apply=button('확인한 보고서 저장',async()=>{try{room.journal=Object.fromEntries(FIELDS.map(([k])=>[k,inputs[k].value]));queue('journal',{action:'journal',journal:{...room.journal}});await saveAll();draft=false;reportSummary.textContent='상담 보고서';state.textContent='상담 보고서를 저장했습니다.';}catch(e){state.textContent=e.message;}},{class:'primary'});reportDetails.append(apply,button('초안 취소',()=>{if(!draft)return;for(const[key]of FIELDS)inputs[key].value=room.journal?.[key]||'';draft=false;reportSummary.textContent='상담 보고서';state.textContent='초안을 취소했습니다. 기존 보고서와 원본은 유지됩니다.';}));if(Object.values(room.journal||{}).some(Boolean))reportDetails.open=true;
 const organize=button('정리 · 상담 보고서 만들기',async()=>{
  if(recorder||uploading){state.textContent='녹음을 종료하고 원본 저장이 끝난 뒤 정리해주세요.';return;}
  if(pendingAudio.has(room.id)){state.textContent='저장 대기 중인 녹음을 먼저 저장해주세요.';return;}
  if(!aiConsent.checked){state.textContent='AI 처리 안내를 확인하고 체크해주세요.';return;}
  if(draft){state.textContent='현재 초안을 검토하고 저장한 뒤 다시 정리해주세요.';reportDetails.open=true;return;}
  working=true;organize.disabled=true;record.disabled=true;file.disabled=true;apply.disabled=true;for(const input of Object.values(inputs))input.disabled=true;
  try{
   noteInk.cancel();await saveAll();
   for(const[i,r]of(room.annotations._recordings||[]).entries())if(!r.transcript){state.textContent='녹음 '+(i+1)+'을 읽고 있습니다…';acceptRecord(await call('transcribe',{recordingId:r.id,consent:true}));}
   state.textContent='필기와 녹음을 상담 보고서로 정리하고 있습니다…';const images=[];
   if(room.annotations._journal?.length)images.push({label:'상담 메모',data:await renderInk(room.annotations._journal)});
   for(const page of room.page_ids)if(room.annotations[String(page)]?.length)images.push({label:'자료 '+page+' 필기',data:await renderInk(room.annotations[String(page)],await getPage(page))});
   const data=await call('report',{images,consent:true});for(const[key]of FIELDS)inputs[key].value=data.report[key];draft=true;reportDetails.open=true;reportSummary.textContent='상담 보고서 · 검토 전 초안';state.textContent='정리가 끝났습니다. 원본과 대조하고 확인한 보고서 저장을 눌러주세요.';drawRecordings();reportDetails.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(e){state.textContent=e.message;}finally{working=false;organize.disabled=false;record.disabled=false;file.disabled=false;apply.disabled=false;for(const input of Object.values(inputs))input.disabled=false;}
 },{class:'primary'});
 const actions=el('div',null,{class:'journal-actions'}),save=button('필기 저장',async()=>{try{await saveAll();state.textContent='상담 메모를 저장했습니다.';}catch(e){state.textContent=e.message;}}),complete=button('상담 완료',async()=>{if(recorder||uploading||pendingAudio.has(room.id)){state.textContent='녹음 원본을 먼저 저장해주세요.';return;}if(draft){state.textContent='보고서 초안을 먼저 확인하고 저장해주세요.';return;}if(!room.journal?.summary?.trim()){state.textContent='정리 버튼으로 보고서를 만든 뒤 저장해주세요.';return;}queue('progress',{action:'progress',status:'completed',last_page:current()});try{await saveAll();room.status='completed';updateRoomBadge();state.textContent='상담 기록을 저장하고 완료했습니다.';}catch(e){state.textContent=e.message;}});
 actions.append(save,organize,complete);d.append(intro,tools,sheet,audioSection,aiLabel,state,reportDetails,actions);drawRecordings();
 const close=()=>{if(recorder||uploading||working||pendingAudio.has(room.id)){state.textContent='진행 중인 녹음이나 정리를 마친 뒤 닫아주세요.';return;}if(draft){state.textContent='작성된 초안을 확인하고 저장한 뒤 닫아주세요.';return;}d.close();};
 d.querySelector('header button').onclick=close;d.addEventListener('cancel',e=>{e.preventDefault();close();});
 const preventUnload=e=>{if(recorder||uploading||working||draft||pendingAudio.has(room.id)){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',preventUnload);
 d.addEventListener('close',()=>{noteInk.cancel();clearInterval(timer);stream?.getTracks().forEach(t=>t.stop());d.querySelectorAll('audio').forEach(a=>{a.pause();if(a.dataset.localUrl)URL.revokeObjectURL(a.dataset.localUrl);});window.removeEventListener('beforeunload',preventUnload);},{once:true});
 d.showModal();
}
module.exports={openJournal,renderInk};
