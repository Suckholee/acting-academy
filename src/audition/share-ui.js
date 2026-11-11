import {shareCaption} from './share-copy.cjs';
import {node,button,download} from './ui.cjs';
import {createCard} from './share-card.cjs';
import {createVoiceVideo} from './voice-video.js';
export function createShareCard(options){
 const host=node('section',null,{class:'audition-share','aria-label':'사진과 대사가 담긴 공유 이미지'});
 const status=node('p','사진과 대사를 한 장으로 디자인하고 있습니다…',{class:'audition-note',role:'status','aria-live':'polite'});
 const preview=node('img',null,{class:'audition-share-preview',hidden:'',alt:options.script.work+' · 사진과 대사지, 김정태 배우아카데미 워터마크가 담긴 공유 카드'});
 let disposed=false,card=null,file=null,url=null,sharing=false,mode='image',recordingBusy=false;
 const tabs=node('div',null,{class:'audition-output-modes',role:'group','aria-label':'저장할 카드 종류'});
 const imageTab=button('이미지 카드',()=>selectMode('image')),videoTab=button('목소리 영상',()=>selectMode('video'));tabs.append(imageTab,videoTab);
 const imagePanel=node('section',null,{class:'audition-image-panel','aria-label':'이미지 카드 저장'});
 const save=button('이미지 저장',()=>{if(card&&!disposed){download(card.blob,card.name);status.textContent='한 장의 PNG 이미지로 저장했습니다. 사진 앱이나 메신저에 첨부해 공유하세요.';}},'audition-share-save');save.disabled=true;
 const share=button('이미지 공유',async()=>{
  if(!file||disposed||sharing)return;sharing=true;share.disabled=true;
  try{await navigator.share({files:[file],title:options.script.work+' · 나의 장면',text:shareCaption('image')});if(!disposed)status.textContent='공유 창으로 이미지를 전달했습니다.';}
  catch(error){if(!disposed)status.textContent=error.name==='AbortError'?'공유를 취소했습니다. 이미지는 그대로 있습니다.':'이 기기에서 공유 창을 열지 못했습니다. 이미지 저장 후 직접 첨부해주세요.';}
  finally{sharing=false;if(!disposed)share.disabled=false;}
 },'audition-share-native');share.hidden=true;
 const retry=button('카드 준비 다시 시도',()=>prepare(),'audition-share-retry');retry.hidden=true;
 const actions=node('div',null,{class:'audition-actions audition-share-actions'});actions.append(save,share);
 imagePanel.append(node('h3','사진과 대사를 한 장으로'),node('p','학원 워터마크가 담긴 이미지를 저장하거나 공유하세요.',{class:'audition-note'}),actions);
 const voice=createVoiceVideo({onState:state=>{recordingBusy=state.busy;imageTab.disabled=videoTab.disabled=recordingBusy;}});
 const tools=node('div',null,{class:'audition-output-tools'}),workspace=node('div',null,{class:'audition-output-workspace'});tools.append(imagePanel,voice.element,status,retry);workspace.append(preview,tools);
 host.append(node('p','저장할 형식을 선택하세요. 목소리를 더하면 연기 영상이 됩니다.',{class:'audition-share-intro'}),tabs,workspace);
 function selectMode(value){if(recordingBusy||disposed)return;mode=value;imageTab.setAttribute('aria-pressed',String(mode==='image'));videoTab.setAttribute('aria-pressed',String(mode==='video'));imagePanel.hidden=mode!=='image';voice.element.hidden=mode!=='video';if(mode!=='video')voice.pause();host.dataset.mode=mode;}
 selectMode('image');
 async function prepare(){
  retry.hidden=true;save.disabled=true;status.textContent='사진과 대사를 한 장으로 디자인하고 있습니다…';
  try{
   const result=await createCard(options);if(disposed)return;card=result;
   if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(card.blob);preview.src=url;preview.hidden=false;save.disabled=false;
   voice.setCard({url,name:card.name});
   status.textContent='사진·대사·김정태 배우아카데미 워터마크가 모두 담겼습니다.';
   try{file=new File([card.blob],card.name,{type:'image/png'});share.hidden=!(navigator.share&&navigator.canShare?.({files:[file]}));}catch{file=null;share.hidden=true;}
  }catch{if(!disposed){status.textContent='카드를 준비하지 못했습니다. 다시 시도해주세요. 사진만 저장하는 기능은 아래에서 이용할 수 있습니다.';retry.hidden=false;}}
 }
 prepare();
 return {element:host,pause(){voice.pause();},dispose(){disposed=true;voice.dispose();card=null;file=null;if(url)URL.revokeObjectURL(url);preview.removeAttribute('src');}};
}
