import {shareCaption} from './share-copy.cjs';
import {node,button,download} from './ui.cjs';
export const MAX_SECONDS=120;
const MAX_BYTES=45_000_000;
export function mimeFor(Recorder){
 return ['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp8,opus','video/webm'].find(type=>Recorder?.isTypeSupported?.(type))||'';
}

// Capture the existing card and microphone locally. No upload or transcription.
export function createVoiceVideo({onState=()=>{},requestStream=c=>navigator.mediaDevices.getUserMedia(c),Recorder=typeof MediaRecorder==='undefined'?null:MediaRecorder}={}){
 const host=node('section',null,{class:'audition-voice','aria-label':'연기 영상 카드'});
 const note=node('p','사진·대사·학원 워터마크에 내 목소리를 담습니다. 카메라는 켜지지 않으며, 녹음은 서버에 보내지 않습니다. 최대 2분까지 녹음할 수 있습니다.',{class:'audition-note'});
 const status=node('p','공유 이미지가 준비되면 녹음할 수 있습니다.',{role:'status','aria-live':'polite',class:'audition-voice-status'});
 const clock=node('strong','00:00 / 02:00',{class:'audition-voice-clock','aria-label':'녹음 시간'});
 const player=node('video',null,{controls:'',playsinline:'',hidden:'',preload:'metadata',class:'audition-voice-player','aria-label':'연기 영상 카드 미리보기'});
 let disposed=false,photo=null,card=null,phase='idle',epoch=0,mic=null,videoStream=null,recorder=null,timer=null,drawTimer=null,started=0,blob=null,file=null,clipURL=null,sharing=false,saved=false,stopReason='';
 const start=button('내 목소리 녹음 시작',record,'audition-voice-start');
 const stop=button('녹음 끝내기',()=>finish(),'audition-voice-stop');
 const save=button('영상 저장',saveVideo,'audition-voice-save');
 const share=button('영상 공유',shareVideo,'audition-voice-share');
 const erase=button('녹음 지우기',reset,'audition-voice-clear');
 const actions=node('div',null,{class:'audition-actions'});actions.append(start,stop,save,share,erase);
 const controls=node('div',null,{class:'audition-voice-controls'});controls.append(clock,actions);
 host.append(node('p','MY SCENE · MY VOICE',{class:'audition-step'}),node('h3','연기 영상 카드'),note,controls,status,player,node('p','녹음 후 영상을 기기에 저장해주세요. 새로고침하거나 장면을 바꾸면 저장하지 않은 녹음이 사라집니다.',{class:'audition-note'}));
 const videoType=mimeFor(Recorder);
 const supported=Boolean(videoType&&navigator.mediaDevices?.getUserMedia&&typeof MediaStream!=='undefined'&&document.createElement('canvas').captureStream);
 function busy(){return ['requesting','recording','stopping'].includes(phase);}
 function refresh(){
  start.disabled=!supported||!photo||disposed||busy()||sharing;
  start.textContent=blob?'다시 녹음하기':'내 목소리 녹음 시작';
  stop.hidden=!['requesting','recording'].includes(phase);stop.textContent=phase==='requesting'?'녹음 취소':'녹음 끝내기';
  save.hidden=share.hidden=erase.hidden=!blob;save.disabled=erase.disabled=busy()||sharing;share.disabled=busy()||sharing;
  host.dataset.recording=String(phase==='recording');onState({busy:busy()||sharing});
 }
 function filename(){return (card?.name||'나의장면.png').replace(/\.png$/i,'')+'-연기영상.'+(blob?.type.includes('mp4')?'mp4':'webm');}
 function release(){
  clearInterval(timer);clearInterval(drawTimer);timer=drawTimer=null;
  mic?.getTracks().forEach(t=>t.stop());videoStream?.getTracks().forEach(t=>t.stop());mic=videoStream=null;
 }
 function clearClip(){
  player.pause?.();player.removeAttribute('src');player.load?.();player.hidden=true;
  if(clipURL)URL.revokeObjectURL(clipURL);clipURL=null;blob=file=null;saved=false;
 }
 function reset(){
  ++epoch;const previous=recorder;recorder=null;
  if(previous&&previous.state!=='inactive')try{previous.stop();}catch{}
  release();clearClip();phase='idle';clock.textContent='00:00 / 02:00';status.textContent='녹음을 지웠습니다. 다시 녹음할 수 있습니다.';refresh();
 }
 function finish(reason=''){
  if(phase==='requesting'){reset();return;}if(phase!=='recording')return;
  stopReason=reason;phase='stopping';status.textContent='연기 영상 카드를 정리하고 있습니다…';clearInterval(timer);
  // Stop microphone capture immediately, including when the page goes into the background.
  mic?.getTracks().forEach(t=>t.stop());
  try{if(recorder?.state!=='inactive')recorder.stop();}catch{reset();status.textContent='녹음을 완료하지 못했습니다. 다시 시도해주세요.';}refresh();
 }
 function saveVideo(){if(!blob||disposed)return;download(blob,filename());saved=true;status.textContent='영상 파일 저장을 요청했습니다. 다운로드한 파일을 확인한 뒤 메신저나 SNS에 첨부해주세요.';}
 async function shareVideo(){
  if(!blob||disposed||sharing)return;
  if(!file||!navigator.share||!navigator.canShare?.({files:[file]})){saveVideo();return;}
  const current=epoch;sharing=true;player.pause?.();refresh();
  try{await navigator.share({files:[file],title:'나의 연기 영상 카드 · 김정태 배우아카데미',text:shareCaption('video')});if(current===epoch&&!disposed){saved=true;status.textContent='공유 창으로 연기 영상 카드를 전달했습니다.';}}
  catch(e){if(current===epoch&&!disposed)status.textContent=e.name==='AbortError'?'공유를 취소했습니다. 녹음은 그대로 있습니다.':'공유 창을 열지 못했습니다. 영상 저장 후 직접 첨부해주세요.';}
  finally{sharing=false;if(!disposed)refresh();}
 }
 async function record(){
  if(start.disabled)return;
  const current=++epoch;phase='requesting';player.pause?.();status.textContent='마이크 사용 허용을 기다리고 있습니다. 카메라는 켜지지 않습니다.';refresh();
  try{
   const incoming=await requestStream({audio:{echoCancellation:true,noiseSuppression:true},video:false});
   if(disposed||current!==epoch){incoming.getTracks().forEach(t=>t.stop());return;}mic=incoming;
   if(!mic.getAudioTracks().some(t=>t.readyState==='live'))throw Error('No microphone');
   const canvas=document.createElement('canvas'),scale=Math.min(1,1080/photo.naturalWidth,1920/photo.naturalHeight);
   canvas.width=Math.max(2,Math.floor(photo.naturalWidth*scale/2)*2);canvas.height=Math.max(2,Math.floor(photo.naturalHeight*scale/2)*2);
   const ctx=canvas.getContext('2d'),draw=()=>ctx.drawImage(photo,0,0,canvas.width,canvas.height);draw();videoStream=canvas.captureStream(10);
   const mixed=new MediaStream([...videoStream.getVideoTracks(),...mic.getAudioTracks()]);
   const active=new Recorder(mixed,{mimeType:videoType,videoBitsPerSecond:1800000,audioBitsPerSecond:96000});recorder=active;
   const chunks=[];let total=0;stopReason='';
   active.ondataavailable=e=>{if(current!==epoch||disposed)return;if(e.data?.size){total+=e.data.size;chunks.push(e.data);if(total>MAX_BYTES)finish('파일 크기 제한으로 녹음을 마쳤습니다. ');}};
   active.onerror=()=>{if(current!==epoch||disposed)return;reset();status.textContent='녹음을 완료하지 못했습니다. 마이크 연결을 확인하고 다시 시도해주세요.';};
   active.onstop=()=>{
    if(current!==epoch||disposed)return;
    const seconds=(performance.now()-started)/1000;release();recorder=null;phase='idle';
    if(seconds<1||!chunks.length){status.textContent='1초 이상 대사를 녹음한 뒤 끝내주세요.';refresh();return;}
    blob=new Blob(chunks,{type:active.mimeType||videoType});clipURL=URL.createObjectURL(blob);player.src=clipURL;player.hidden=false;phase='ready';
    try{file=new File([blob],filename(),{type:blob.type});}catch{file=null;}
    status.textContent=stopReason+'재생 버튼으로 확인한 뒤 저장하거나 공유하세요. '+(blob.type.includes('mp4')?'MP4 영상으로 저장됩니다.':'WebM 영상으로 저장됩니다. 공유할 앱에서 재생 가능한지 확인해주세요.');refresh();
   };
   for(const t of mic.getAudioTracks())t.addEventListener('ended',()=>{if(current===epoch)finish('마이크 연결이 종료되어 녹음을 마쳤습니다. ');},{once:true});
   started=performance.now();active.start(1000);clearClip();phase='recording';clock.textContent='00:00 / 02:00';
   drawTimer=setInterval(draw,100);
   timer=setInterval(()=>{const elapsed=Math.min(MAX_SECONDS,Math.floor((performance.now()-started)/1000));clock.textContent=String(Math.floor(elapsed/60)).padStart(2,'0')+':'+String(elapsed%60).padStart(2,'0')+' / 02:00';if(elapsed>=MAX_SECONDS)finish('2분 녹음을 마쳤습니다. ');},200);
   status.textContent='녹음 중입니다. 아래 카드의 대사를 읽고 녹음 끝내기를 눌러주세요.';refresh();
  }catch(e){
   if(current!==epoch||disposed)return;
   ++epoch;const failed=recorder;recorder=null;if(failed&&failed.state!=='inactive')try{failed.stop();}catch{}release();phase=blob?'ready':'idle';
   status.textContent=e.name==='NotAllowedError'?'마이크 사용이 허용되지 않았습니다. 사이트의 마이크 권한을 확인해주세요.':'녹음을 시작하지 못했습니다. 마이크 연결과 브라우저 지원을 확인해주세요.';refresh();
  }
 }
 const hide=()=>{if(phase==='recording')finish('화면을 벗어나 녹음을 마쳤습니다. ');else if(phase==='requesting')reset();};
 const visibility=()=>{if(document.visibilityState==='hidden')hide();};
 const unload=e=>{if(busy()||(blob&&!saved)){e.preventDefault();e.returnValue='';}};
 window.addEventListener('pagehide',hide);window.addEventListener('beforeunload',unload);document.addEventListener('visibilitychange',visibility);
 if(!supported)status.textContent='이 브라우저는 연기 영상 녹음을 지원하지 않습니다. 다른 최신 브라우저에서 이용하거나 공유 이미지를 저장해주세요.';refresh();
 return {element:host,pause(){player.pause?.();hide();},async setCard(value){card=value;const img=new Image();img.src=value.url;try{await img.decode();if(disposed||card!==value)return;photo=img;if(supported)status.textContent='녹음 시작을 누르면 마이크만 켜집니다. 녹음·영상 만들기에는 추가 AI 비용이 없습니다.';refresh();}catch{status.textContent='카드 이미지를 준비하지 못했습니다. 공유 이미지 다시 만들기를 이용해주세요.';}},dispose(){disposed=true;reset();window.removeEventListener('pagehide',hide);window.removeEventListener('beforeunload',unload);document.removeEventListener('visibilitychange',visibility);}};
}
