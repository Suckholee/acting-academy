const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {parseHTML}=require('linkedom'),esbuild=require('esbuild');
const {builtins}=require('../src/audition/catalog.cjs'),{entry,selection}=require('../src/audition/model.cjs');
const bundle=esbuild.buildSync({entryPoints:['src/audition/app.js'],bundle:true,platform:'browser',format:'iife',write:false}).outputFiles[0].text;
const jpeg='data:image/jpeg;base64,/9j/4AAQ',png='data:image/png;base64,iVBORw0KGgo=';
const tick=()=>new Promise(setImmediate);
async function app(scripts=builtins,postError=null){
 const {document,window}=parseHTML('<html><body><main id="audition-app"></main></body></html>');const navigator={onLine:true};let images=0;const masks=[],calls=[];
 const create=document.createElement.bind(document);document.createElement=tag=>{const e=create(tag);if(tag==='canvas'){e.getContext=()=>({fillRect(){},drawImage(){},clearRect(...v){masks.push(v);}});e.toDataURL=type=>type==='image/png'?png:jpeg;}return e;};
 window.HTMLElement.prototype.scrollIntoView=function(){};
 class Image{constructor(){this.naturalWidth=1344;this.naturalHeight=756;}async decode(){images++;}}
 const fetch=async(url,options={})=>{calls.push({url,options});if(options.method==='POST'&&postError)throw postError;if(url==='/api/ai-audition'){return {ok:true,json:async()=>options.method==='POST'?{image:jpeg,script:scripts.find(s=>s.id===JSON.parse(options.body).scriptId),scriptText:'test'}:{scripts,ready:true}};}return {ok:true,blob:async()=>new Blob(['scene'],{type:'image/jpeg'})};};
 vm.runInNewContext(bundle,{document,window,navigator,fetch,Image,URL,Blob,Uint8Array,atob,AbortController,console,structuredClone,setTimeout,clearTimeout});await tick();await tick();
 const input=document.querySelector('input[type=file]'),checks=[...document.querySelectorAll('input[type=checkbox]')],submit=document.querySelector('button[type=submit]'),form=document.querySelector('form');
 async function portrait(){Object.defineProperty(input,'files',{value:[new Blob(['portrait'],{type:'image/jpeg'})],configurable:true});await input.onchange();}
 return {document,window,navigator,calls,masks,checks,submit,form,portrait,tick,choose:async i=>{document.querySelectorAll('.audition-choice')[i].click();await tick();await tick();}};
}
test('each default work ships a local film still, validated target and visible source metadata',()=>{
 for(const s of builtins){assert.ok(fs.statSync(path.join('published-source',s.image)).size>40000);assert.deepEqual(selection(s.target),s.target);assert.ok(s.imageSource.startsWith('https://'));assert.ok(s.targetLabel);assert.deepEqual(entry({...s,reviewed:true}).target,s.target);assert.throws(()=>entry({...s,reviewed:true,target:{x:.95,y:0,w:.1,h:.2}}));}
});
test('one portrait plus work selection produces the preset mask without a scene upload or manual positioning',async()=>{
 const a=await app();assert.equal(a.document.querySelectorAll('input[type=file]').length,1);assert.equal(a.document.querySelectorAll('input[type=range]').length,0);assert.equal(a.submit.disabled,true);
 await a.portrait();for(const c of a.checks){c.checked=true;c.onchange();}assert.equal(a.submit.disabled,false);
 await a.choose(2);assert.equal(a.submit.disabled,false);assert.match(a.document.querySelector('.audition-stage').textContent,/오대수/);
 await a.form.onsubmit({preventDefault(){}});const post=a.calls.find(c=>c.options.method==='POST'),body=JSON.parse(post.options.body);assert.equal(body.scriptId,builtins[2].id);assert.deepEqual(body.box,builtins[2].target);assert.equal(body.portrait,jpeg);assert.equal(body.scene,jpeg);assert.equal(body.mask,png);assert.deepEqual(a.masks[0],[544,97,263,285]);assert.equal(a.document.querySelector('.audition-results').hidden,false);
 a.document.querySelector('.audition-clear').click();assert.equal(a.submit.disabled,true);assert.equal(a.document.querySelector('.audition-results').hidden,true);assert.equal(a.document.querySelector('.audition-scene-wrap img').hidden,false);assert.equal(a.checks[0].checked,false);
});
test('a missing target never falls back to the centre or enables a paid generation',async()=>{
 const a=await app([{...builtins[0],target:null}]);await a.portrait();for(const c of a.checks){c.checked=true;c.onchange();}assert.equal(a.submit.disabled,true);assert.equal(a.calls.filter(c=>c.options.method==='POST').length,0);assert.match(a.document.querySelector('.audition-stage').textContent,/준비 중/);
});

test('offline connections cannot start a composite and reconnection preserves the photo and consents',async()=>{const a=await app();await a.portrait();for(const c of a.checks){c.checked=true;c.onchange();}a.navigator.onLine=false;a.window.dispatchEvent(new a.window.Event('offline'));assert.equal(a.submit.disabled,true);assert.match(a.document.querySelector('.audition-status').textContent,/인터넷 연결/);a.navigator.onLine=true;a.window.dispatchEvent(new a.window.Event('online'));assert.equal(a.submit.disabled,false);assert.equal(a.document.querySelector('.audition-portrait-preview').src,jpeg);assert.ok(a.checks.every(c=>c.checked));assert.equal(a.calls.filter(c=>c.options.method==='POST').length,0);});
test('a failed transfer keeps the current portrait and work ready for a deliberate retry',async()=>{const a=await app(builtins,new TypeError('Failed to fetch'));await a.portrait();for(const c of a.checks){c.checked=true;c.onchange();}await a.form.onsubmit({preventDefault(){}});assert.match(a.document.querySelector('.audition-status').textContent,/같은 사진/);assert.equal(a.submit.disabled,false);assert.equal(a.document.querySelector('.audition-portrait-preview').src,jpeg);assert.ok(a.checks.every(c=>c.checked));assert.equal(a.calls.filter(c=>c.options.method==='POST').length,1);});
