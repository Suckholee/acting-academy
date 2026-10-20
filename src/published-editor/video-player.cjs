const {videoSource}=require('./video-model.cjs');
function renderVideo(frame,value){
 const source=videoSource(value);if(!source)return;
 const existing=frame.querySelector(':scope > .kjt-video-player');if(existing){existing.pause?.();existing.remove();}
 const image=frame.querySelector(':scope > img');const overlay=frame.querySelector(':scope > .video-slot-overlay');
 const active=source.kind!=='empty';if(image)image.hidden=active;if(overlay)overlay.hidden=active;
 frame.dataset.videoSource=value;frame.classList.toggle('kjt-has-video',active);
 if(!active){frame.setAttribute('role','img');return;}
 frame.removeAttribute('role');frame.removeAttribute('aria-label');
 const player=document.createElement(source.kind==='file'?'video':'iframe');player.className='kjt-video-player';
 if(source.kind==='file'){
  player.controls=true;player.playsInline=true;player.preload='metadata';if(image)player.poster=image.getAttribute('src');
  const error=document.createElement('p');error.textContent='이 브라우저에서 영상을 재생할 수 없습니다.';player.append(error);
 }else{
  player.title='아카데미 소개 영상';player.loading='lazy';player.referrerPolicy='strict-origin-when-cross-origin';player.allow='fullscreen; picture-in-picture';player.allowFullscreen=true;
 }
 player.src=source.src;frame.append(player);
}
module.exports={renderVideo};
