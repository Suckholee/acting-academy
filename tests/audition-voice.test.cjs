const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {parseHTML}=require('linkedom'),esbuild=require('esbuild');
const bundle=esbuild.buildSync({entryPoints:['src/audition/voice-video.js'],bundle:true,platform:'browser',format:'iife',globalName:'Voice',write:false}).outputFiles[0].text;
const tick=()=>new Promise(setImmediate);
async function setup(options={}){
 const {document,window}=parseHTML('<html><body></body></html>');let now=0,id=0,requests=0;const timers=new Map(),tracks=[],instances=[],revoked=[],downloads=[],captures=[];
 function track(kind){const t={kind,readyState:'live',stop(){this.readyState='ended';},addEventListener(){}};tracks.push(t);return t;}
 class Stream{constructor(items){this.items=items;}getTracks(){return this.items;}getAudioTracks(){return this.items.filter(t=>t.kind==='audio');}getVideoTracks(){return this.items.filter(t=>t.kind==='video');}}
 const makeMic=()=>new Stream([track('audio')]);
 class Recorder{static isTypeSupported(type){return !options.unsupported&&type.startsWith(options.webm?'video/webm':'video/mp4');}constructor(stream,config){this.stream=stream;this.mimeType=config.mimeType;this.state='inactive';instances.push(this);}start(){if(options.failStart)throw Error('start failure');this.state='recording';}stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable?.({data:new Blob(['test-encoded-video'],{type:this.mimeType})});this.onstop?.();});}}
 const create=document.createElement.bind(document);document.createElement=tag=>{const el=create(tag);if(tag==='canvas'){el.getContext=()=>({drawImage(){}});el.captureStream=()=>{captures.push({width:el.width,height:el.height});return new Stream([track('video')]);};}if(tag==='video'){el.pause=()=>{};el.load=()=>{};}return el;};
 const click=window.HTMLElement.prototype.click;window.HTMLElement.prototype.click=function(){if(this.tagName==='A')downloads.push(this.getAttribute('download'));else click.call(this);};
 const navigator={mediaDevices:{getUserMedia:async c=>{requests++;assert.equal(c.video,false);return options.request?options.request(makeMic):makeMic();}},share:options.share,canShare:options.canShare};
 const context={document,window,navigator,MediaRecorder:Recorder,MediaStream:Stream,Image:class{naturalWidth=1080;naturalHeight=2705;async decode(){}},performance:{now:()=>now},Blob,File,URL:{createObjectURL:()=>`blob:test-${++id}`,revokeObjectURL:u=>revoked.push(u)},setInterval:fn=>{timers.set(++id,fn);return id;},clearInterval:i=>timers.delete(i),setTimeout:()=>0,console};
 vm.runInNewContext(bundle,context);const voice=context.Voice.createVoiceVideo();document.body.append(voice.element);await voice.setCard({url:'blob:card',name:'장면.png'});
 const button=cls=>document.querySelector('.audition-voice-'+cls),status=()=>document.querySelector('[role=status]').textContent;
 return {voice,document,window,tracks,instances,timers,revoked,downloads,captures,navigator,status,button,requests:()=>requests,advance:async ms=>{now+=ms;for(const f of [...timers.values()])f();await tick();},record:async()=>{button('start').click();await tick();}};
}
test('microphone waits for explicit click; full card video has both tracks, saves MP4 and clears resources',async()=>{
 const a=await setup();assert.equal(a.requests(),0);assert.equal(a.button('start').disabled,false);await a.record();assert.equal(a.requests(),1);assert.equal(a.instances[0].stream.getAudioTracks().length,1);assert.equal(a.instances[0].stream.getVideoTracks().length,1);assert.equal(a.captures[0].height,1920);assert.equal(a.captures[0].width%2,0);
 await a.advance(3000);a.button('stop').click();await tick();assert.ok(a.tracks.every(t=>t.readyState==='ended'));assert.equal(a.timers.size,0);assert.equal(a.button('save').hidden,false);assert.equal(a.document.querySelector('video').hidden,false);a.button('save').click();assert.equal(a.downloads[0],'장면-연기영상.mp4');a.voice.dispose();assert.equal(a.revoked.length,1);assert.equal(a.document.querySelector('video').getAttribute('src'),null);
});
test('cancel while permission is pending stops a late microphone without producing a clip',async()=>{
 let resolve;const a=await setup({request:make=>new Promise(r=>{resolve=()=>r(make());})});await a.record();a.button('stop').click();resolve();await tick();assert.ok(a.tracks.every(t=>t.readyState==='ended'));assert.equal(a.instances.length,0);assert.equal(a.button('save').hidden,true);assert.equal(a.button('start').disabled,false);a.voice.dispose();
});
test('automatic two-minute stop shuts down microphone and retains the finished video',async()=>{
 const a=await setup();await a.record();await a.advance(120000);assert.match(a.status(),/2분 녹음을 마쳤습니다/);assert.equal(a.button('save').hidden,false);assert.ok(a.tracks.every(t=>t.readyState==='ended'));assert.equal(a.timers.size,0);a.voice.dispose();
});
test('switching away from page stops capture and marks why the video ended',async()=>{
 const a=await setup();await a.record();await a.advance(2000);Object.defineProperty(a.document,'visibilityState',{value:'hidden'});a.document.dispatchEvent(new a.window.Event('visibilitychange'));await tick();assert.ok(a.tracks.every(t=>t.readyState==='ended'));assert.match(a.status(),/화면을 벗어나/);a.voice.dispose();
});
test('permission denial and encoder start errors clean up and permit retry',async()=>{
 for(const options of [{request:async()=>{throw Object.assign(Error(),{name:'NotAllowedError'});}},{failStart:true}]){const a=await setup(options);await a.record();assert.equal(a.button('start').disabled,false);assert.equal(a.button('save').hidden,true);assert.ok(a.tracks.every(t=>t.readyState==='ended'));assert.equal(a.timers.size,0);a.voice.dispose();}
});
test('disposing during capture releases all tracks and ignores recorder callbacks',async()=>{
 const a=await setup();await a.record();a.voice.dispose();await tick();assert.ok(a.tracks.every(t=>t.readyState==='ended'));assert.equal(a.timers.size,0);assert.equal(a.document.querySelector('video').hidden,true);
});
test('native share cancellation preserves video; unsupported sharing downloads the correct WebM extension',async()=>{
 let shared;const a=await setup({share:async value=>{shared=value;throw Object.assign(Error(),{name:'AbortError'});},canShare:()=>true});await a.record();await a.advance(3000);a.button('stop').click();await tick();a.button('share').click();await tick();assert.equal(shared.files[0].name,'장면-연기영상.mp4');assert.match(a.status(),/공유를 취소/);assert.equal(a.button('save').hidden,false);assert.equal(a.button('share').disabled,false);a.voice.dispose();
 const b=await setup({webm:true});await b.record();await b.advance(3000);b.button('stop').click();await tick();b.button('share').click();assert.equal(b.downloads[0],'장면-연기영상.webm');b.voice.dispose();
});
test('unsupported browsers disable recording; sub-second recordings cannot be exported',async()=>{
 const a=await setup({unsupported:true});assert.equal(a.button('start').disabled,true);assert.equal(a.requests(),0);assert.match(a.status(),/지원하지/);a.voice.dispose();
 const b=await setup();await b.record();b.button('stop').click();await tick();assert.equal(b.button('save').hidden,true);assert.match(b.status(),/1초 이상/);b.voice.dispose();
});
test('leaving the result view stops microphone capture and keeps the completed clip available',async()=>{
 const a=await setup();await a.record();await a.advance(2000);a.voice.pause();await tick();assert.ok(a.tracks.every(t=>t.readyState==='ended'));assert.equal(a.button('save').hidden,false);assert.equal(a.timers.size,0);a.voice.dispose();
});
