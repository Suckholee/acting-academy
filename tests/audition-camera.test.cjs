const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {parseHTML}=require('linkedom'),esbuild=require('esbuild');
const bundle=esbuild.buildSync({entryPoints:['src/audition/camera.js'],bundle:true,platform:'browser',format:'cjs',write:false}).outputFiles[0].text;
const tick=()=>new Promise(setImmediate);
function fixture(requestStream){
 const {document,window}=parseHTML('<html><body><div id="camera"></div></body></html>'),draw=[],photos=[],errors=[];let stops=0,requested=0,ended;
 window.HTMLElement.prototype.focus=function(){};
 const stream={getTracks:()=>[{stop(){stops++;}}],getVideoTracks:()=>[{addEventListener(event,fn){ended=fn;}}]},create=document.createElement.bind(document);
 document.createElement=tag=>{const e=create(tag);if(tag==='video'){e.videoWidth=1920;e.videoHeight=1080;e.readyState=2;e.play=async()=>{};e.pause=()=>{};}if(tag==='canvas'){e.getContext=()=>({translate(...v){draw.push(['translate',...v]);},scale(...v){draw.push(['scale',...v]);},drawImage(video,x,y,w,h){draw.push(['frame',w,h]);}});e.toBlob=cb=>cb(new Blob(['jpeg'],{type:'image/jpeg'}));}return e;};
 const context={document,window,Blob,module:{exports:{}}};vm.runInNewContext(bundle,context);const camera=context.module.exports.createCamera(document.querySelector('#camera'),{onPhoto:async b=>photos.push(b),onError:t=>errors.push(t),supported:()=>true,requestStream:async c=>{requested++;assert.equal(c.audio,false);assert.equal(c.video.facingMode.ideal,'user');return requestStream?requestStream(c,stream):stream;}});
 const open=document.querySelector('.audition-camera-open'),shutter=document.querySelector('.audition-camera-shutter'),video=document.querySelector('video');
 return {document,window,camera,open,shutter,video,photos,errors,draw,get stops(){return stops;},get requested(){return requested;},disconnect:()=>ended(),async start(){open.click();await tick();},async capture(){shutter.click();await tick();}};
}
test('camera starts only after a visitor action, captures a bounded mirrored JPEG and releases every track',async()=>{
 const f=fixture();assert.equal(f.requested,0);await f.start();assert.equal(f.camera.isOpen(),true);assert.equal(f.shutter.disabled,false);await f.capture();assert.equal(f.photos.length,1);assert.equal(f.photos[0].type,'image/jpeg');assert.deepEqual(f.draw,[['translate',1280,0],['scale',-1,1],['frame',1280,720]]);assert.equal(f.stops,1);assert.equal(f.video.srcObject,null);assert.equal(f.camera.isOpen(),false);
});
test('closing or hiding the tab cancels camera requests and stops a stream that arrives late',async()=>{
 let resolve;const f=fixture(()=>new Promise(r=>resolve=r));f.open.click();assert.equal(f.camera.isOpen(),true);f.camera.close(false);let stopped=0;resolve({getTracks:()=>[{stop(){stopped++;}}]});await tick();assert.equal(stopped,1);assert.equal(f.video.srcObject,null);assert.equal(f.photos.length,0);
 const g=fixture();await g.start();Object.defineProperty(g.document,'visibilityState',{value:'hidden'});g.document.dispatchEvent(new g.window.Event('visibilitychange'));assert.equal(g.stops,1);assert.equal(g.camera.isOpen(),false);
});
test('permission rejection remains retryable and an unavailable frame cannot be captured',async()=>{
 let attempt=0;const f=fixture((c,s)=>{if(!attempt++)throw Object.assign(Error(),{name:'NotAllowedError'});return s;});await f.start();assert.match(f.errors[0],/사이트 설정/);assert.equal(f.open.disabled,false);await f.start();f.video.readyState=0;f.video.dispatchEvent(new f.window.Event('loadeddata'));assert.equal(f.shutter.disabled,true);f.video.readyState=2;f.video.dispatchEvent(new f.window.Event('loadeddata'));assert.equal(f.shutter.disabled,false);f.disconnect();assert.equal(f.camera.isOpen(),false);assert.match(f.errors.at(-1),/연결이 끊겼/);
});
