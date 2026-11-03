import {node,button} from './ui.cjs';

// No camera request is made until the visitor presses the open button.
export function createCamera(host,{onPhoto,onState=()=>{},onError=()=>{},
 requestStream=constraints=>navigator.mediaDevices.getUserMedia(constraints),
 supported=()=>typeof navigator!=='undefined'&&Boolean(navigator.mediaDevices?.getUserMedia)}={}){
 let stream=null,opened=false,pending=false,capturing=false,disabled=false,epoch=0;
 const openButton=button('카메라로 촬영',open,'audition-camera-open');
 const panel=node('section',null,{class:'audition-camera',hidden:'','aria-label':'카메라 미리보기'});
 const video=node('video',null,{autoplay:'',muted:'',playsinline:'','aria-label':'내 카메라 영상'});video.muted=true;
 const note=node('p','카메라 사용을 허용한 뒤 얼굴이 잘 보이도록 맞춰주세요.',{class:'audition-note',role:'status','aria-live':'polite'});
 const actions=node('div',null,{class:'audition-actions'}),shutter=button('사진 찍기',capture,'audition-camera-shutter'),cancel=button('카메라 닫기',()=>close());
 actions.append(shutter,cancel);panel.append(video,note,actions);host.append(openButton,panel);
 function refresh(){openButton.disabled=disabled||pending||capturing||Boolean(stream);shutter.disabled=disabled||pending||capturing||!stream||video.readyState<2||video.videoWidth<96||video.videoHeight<96;cancel.disabled=false;}
 function stop(s){s?.getTracks().forEach(t=>t.stop());}
 function close(focus=true){++epoch;opened=false;pending=false;capturing=false;const old=stream;stream=null;stop(old);video.pause?.();video.srcObject=null;panel.hidden=true;refresh();onState();if(focus)openButton.focus();}
 function failure(error){const text=error?.name==='NotAllowedError'||error?.name==='SecurityError'?'카메라 사용이 차단되어 있습니다. 크롬 주소창의 사이트 설정에서 카메라를 허용한 뒤 다시 시도해주세요. 저장된 사진도 선택할 수 있습니다.':error?.name==='NotFoundError'||error?.name==='OverconstrainedError'?'연결된 카메라를 찾지 못했습니다. 카메라를 연결하거나 저장된 사진을 선택해주세요.':error?.name==='NotReadableError'?'카메라를 열지 못했습니다. 다른 앱에서 카메라를 사용 중인지 확인하거나 저장된 사진을 선택해주세요.':error?.message==='unsupported'?'이 브라우저에서는 카메라를 열 수 없습니다. 크롬에서 이 페이지를 열거나 저장된 사진을 선택해주세요.':'카메라 연결을 완료하지 못했습니다. 다시 시도하거나 저장된 사진을 선택해주세요.';note.textContent=text;note.classList.add('is-error');onError(text);}
 async function open(){if(disabled||pending||capturing||stream)return;const current=++epoch;opened=true;pending=true;panel.hidden=false;note.classList.remove('is-error');note.textContent='카메라 사용 허용을 기다리고 있습니다. 촬영할 때까지 영상은 전송되지 않습니다.';refresh();onState();
  try{if(!supported())throw Error('unsupported');const incoming=await requestStream({audio:false,video:{facingMode:{ideal:'user'},width:{ideal:1280},height:{ideal:1280}}});
   if(current!==epoch||!opened||disabled){stop(incoming);return;}stream=incoming;video.srcObject=incoming;
   for(const t of stream.getVideoTracks())t.addEventListener('ended',()=>{if(current!==epoch)return;close(false);onError('카메라 연결이 끊겼습니다. 카메라를 다시 열어주세요.');},{once:true});
   await video.play();if(current!==epoch)return;note.textContent='얼굴 전체가 보이도록 맞춘 뒤 사진 찍기를 눌러주세요. 촬영하면 카메라는 자동으로 꺼집니다.';
  }catch(error){if(current!==epoch)return;stop(stream);stream=null;video.pause?.();video.srcObject=null;failure(error);}
  finally{if(current===epoch){pending=false;refresh();onState();}}
 }
 async function capture(){if(shutter.disabled)return;const current=epoch;capturing=true;refresh();
  try{const canvas=document.createElement('canvas'),scale=Math.min(1,1280/Math.max(video.videoWidth,video.videoHeight));canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);const ctx=canvas.getContext('2d');
   // The saved selfie matches the mirrored preview.
   ctx.translate(canvas.width,0);ctx.scale(-1,1);ctx.drawImage(video,0,0,canvas.width,canvas.height);
   const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('snapshot')),'image/jpeg',.9));if(current!==epoch)return;
   close(false);await onPhoto(blob);openButton.focus();
  }catch{if(current!==epoch)return;note.textContent='사진을 찍지 못했습니다. 카메라 영상이 보이면 다시 눌러주세요.';onError(note.textContent);}
  finally{if(current===epoch){capturing=false;refresh();onState();}}
 }
 video.addEventListener('loadeddata',refresh);video.addEventListener('resize',refresh);
 window.addEventListener('pagehide',()=>close(false));
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&opened)close(false);});
 refresh();
 return {close,isOpen:()=>opened,setDisabled(value){disabled=Boolean(value);refresh();}};
}
