const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {parseHTML}=require('linkedom'),esbuild=require('esbuild');
const {builtins}=require('../src/audition/catalog.cjs'),{entry,selection}=require('../src/audition/model.cjs');
const bundle=esbuild.buildSync({entryPoints:['src/audition/app.js'],bundle:true,platform:'browser',format:'iife',write:false}).outputFiles[0].text;
const jpeg='data:image/jpeg;base64,/9j/4AAQ',png='data:image/png;base64,iVBORw0KGgo=';
const tick=()=>new Promise(setImmediate);
async function app(scripts=builtins,postError=null,postResponse=null,recommendResponse=null,initialSelection=true){
 const {document,window}=parseHTML('<html><body><main id="audition-app"></main></body></html>');const navigator={onLine:true},clock={now:0,intervals:new Map()};let timerId=0;class ClockDate extends Date{static now(){return clock.now;}}let images=0;const masks=[],calls=[],draws=[],downloads=[],textDraws=[];const generated='data:image/jpeg;base64,/9j/4AAQAA==';
 const create=document.createElement.bind(document);document.createElement=tag=>{const e=create(tag);if(tag==='canvas'){e.getContext=()=>({font:'',measureText:v=>({width:Array.from(v).length*17}),fillRect(){},fillText(...v){textDraws.push(v);},scale(){},save(){},restore(){},createLinearGradient:()=>({addColorStop(){}}),drawImage(...v){draws.push(v);},clearRect(...v){masks.push(v);}});e.toBlob=fn=>fn(new Blob(['card-png'],{type:'image/png'}));e.toDataURL=type=>type==='image/png'?png:jpeg;}return e;};
 window.HTMLElement.prototype.scrollIntoView=function(){};
 const click=window.HTMLElement.prototype.click;window.HTMLElement.prototype.click=function(){if(this.tagName==='A'&&this.getAttribute('download'))downloads.push({name:this.getAttribute('download'),href:this.href});else click.call(this);};
 const localURL={createObjectURL:blob=>{downloads.push({blob});return 'blob:test';},revokeObjectURL(){}};
 class Image{constructor(){this.naturalWidth=1344;this.naturalHeight=756;}async decode(){images++;}}
 const fetch=async(url,options={})=>{calls.push({url,options});if(options.method==='POST'&&JSON.parse(options.body).action==='recommend')return recommendResponse?await recommendResponse(JSON.parse(options.body)):{ok:true,json:async()=>({recommendation:{scriptId:scripts[0]?.id,reason:'사진과 비슷한 방향의 장면입니다.'}})};if(options.method==='POST'&&postResponse)return postResponse;if(options.method==='POST'&&postError)throw postError;if(url==='/api/ai-audition'&&options.method==='POST'){const action=JSON.parse(options.body).action;if(action)return {ok:true,json:async()=>action==='prepare'?{state:'ready',permit:'test-permit',ticket:'test-ticket'}:{cancelled:true}};}if(url==='/api/ai-audition'){return {ok:true,json:async()=>options.method==='POST'?{image:generated,script:scripts.find(s=>s.id===JSON.parse(options.body).scriptId),scriptText:'test'}:{scripts,ready:true}};}return {ok:true,blob:async()=>new Blob(['scene'],{type:'image/jpeg'})};};
 vm.runInNewContext(bundle,{document,window,navigator,fetch,Image,URL:localURL,Blob,File,DOMException,crypto,Uint8Array,atob,AbortController,console,structuredClone,setTimeout,clearTimeout,Date:ClockDate,setInterval:fn=>{clock.intervals.set(++timerId,fn);return timerId;},clearInterval:id=>clock.intervals.delete(id)});await tick();await tick();
 if(initialSelection){document.querySelector('.audition-choice')?.click();await tick();await tick();}
 const input=document.querySelector('input[type=file]'),checks=[...document.querySelectorAll('.audition-consents input[type=checkbox]')],submit=document.querySelector('button[type=submit]'),form=document.querySelector('form');
 async function portrait(){document.querySelector('[data-mode=photo]').click();Object.defineProperty(input,'files',{value:[new Blob(['portrait'],{type:'image/jpeg'})],configurable:true});await input.onchange();}
 return {document,window,navigator,calls,masks,draws,downloads,textDraws,generated,checks,submit,form,portrait,tick,recommendPhoto:async()=>{document.querySelector('.audition-flow-next').click();await tick();await tick();await tick();},submitScene:async()=>{const next=document.querySelector('.audition-flow-next');if(!next.hidden){next.click();await tick();await tick();await tick();}return form.onsubmit({preventDefault(){}});},advance:async seconds=>{clock.now+=seconds*1000;for(const fn of [...clock.intervals.values()])fn();await tick();},choose:async i=>{if(scripts[i]?.cardOnly){const scope=document.querySelector('.audition-catalog-scope input');scope.checked=true;scope.onchange();}document.querySelectorAll('.audition-flow button')[1].click();document.querySelectorAll('.audition-choice')[i].click();await tick();await tick();}};
}
test('each default work ships a local film still, validated target and visible source metadata',()=>{
 for(const s of builtins.filter(s=>!s.cardOnly)){assert.ok(fs.statSync(path.join('published-source',s.image)).size>5000);assert.deepEqual(selection(s.target),s.target);assert.ok(s.imageSource.startsWith('https://'));assert.ok(s.targetLabel);assert.deepEqual(entry({...s,reviewed:true}).target,s.target);assert.throws(()=>entry({...s,reviewed:true,target:{x:.95,y:0,w:.1,h:.2}}));}
});
test('one portrait uses a registered role without client masks or manual positioning',async()=>{
 const a=await app();assert.equal(a.document.querySelectorAll('input[type=file]').length,3);assert.equal(a.document.querySelectorAll('input[type=range]').length,0);assert.equal(a.submit.disabled,true);
 await a.portrait();for(const c of a.checks){c.checked=true;c.onchange();}await a.recommendPhoto();await tick();await tick();await tick();assert.equal(a.submit.disabled,false);
 await a.choose(2);assert.equal(a.submit.disabled,false);assert.match(a.document.querySelector('.audition-stage').textContent,/오대수/);
 await a.submitScene();const post=a.calls.find(c=>c.options.method==='POST'&&JSON.parse(c.options.body).scene&&!JSON.parse(c.options.body).action),body=JSON.parse(post.options.body);assert.equal(body.scriptId,builtins[2].id);assert.deepEqual(body.faces,[{roleId:'A',portrait:jpeg,consent:true}]);assert.equal(body.scene,jpeg);assert.equal(body.mask,undefined);assert.equal(body.box,undefined);assert.equal(a.masks.length,0);assert.equal(a.document.querySelector('.audition-results').hidden,false);
 a.document.querySelector('.audition-clear').click();assert.equal(a.submit.disabled,true);assert.equal(a.document.querySelector('.audition-results').hidden,true);assert.equal(a.document.querySelector('.audition-scene-wrap img').hidden,false);assert.equal(a.checks[0].checked,false);
});
test('a missing target never falls back to the centre or enables a paid generation',async()=>{
 const a=await app([{...builtins[0],target:null}]);await a.portrait();for(const c of a.checks){c.checked=true;c.onchange();}await a.recommendPhoto();await tick();await tick();await tick();assert.equal(a.submit.disabled,true);assert.equal(a.calls.filter(c=>c.options.method==='POST'&&JSON.parse(c.options.body).action!=='recommend').length,0);assert.match(a.document.querySelector('.audition-stage').textContent,/준비 중/);
});

test('offline connections cannot start a composite and reconnection preserves the photo and consents',async()=>{const a=await app();await a.portrait();for(const c of a.checks){c.checked=true;c.onchange();}await a.recommendPhoto();await tick();await tick();await tick();a.navigator.onLine=false;a.window.dispatchEvent(new a.window.Event('offline'));assert.equal(a.submit.disabled,true);assert.match(a.document.querySelector('.audition-status').textContent,/인터넷 연결/);a.navigator.onLine=true;a.window.dispatchEvent(new a.window.Event('online'));assert.equal(a.submit.disabled,false);assert.equal(a.document.querySelector('.audition-portrait-preview').src,jpeg);assert.ok(a.checks.every(c=>c.checked));assert.equal(a.calls.filter(c=>c.options.method==='POST'&&JSON.parse(c.options.body).action!=='recommend').length,0);});
test('a failed transfer keeps the current portrait and work ready for a deliberate retry',async()=>{const a=await app(builtins,new TypeError('Failed to fetch'));await a.portrait();for(const c of a.checks){c.checked=true;c.onchange();}await a.recommendPhoto();await tick();await tick();await tick();await a.submitScene();assert.match(a.document.querySelector('.audition-status').textContent,/같은 사진/);assert.equal(a.submit.disabled,false);assert.equal(a.document.querySelector('.audition-portrait-preview').src,jpeg);assert.ok(a.checks.every(c=>c.checked));assert.equal(a.calls.filter(c=>c.options.method==='POST'&&JSON.parse(c.options.body).action!=='recommend').length,1);});

test('rate limiting counts down without repeat requests, preserves the portrait across work selection, then unlocks',async()=>{const a=await app(builtins,null,{ok:false,status:429,json:async()=>({error:'생성 요청 한도',retryAfter:62})});await a.portrait();for(const c of a.checks){c.checked=true;c.onchange();}await a.recommendPhoto();await tick();await tick();await tick();await a.submitScene();assert.equal(a.submit.disabled,true);assert.match(a.submit.textContent,/1분 02초/);assert.match(a.document.querySelector('.audition-status').textContent,/사진은 그대로/);await a.choose(2);assert.equal(a.submit.disabled,true);assert.equal(a.document.querySelector('.audition-portrait-preview').src,jpeg);await a.submitScene();assert.equal(a.calls.filter(c=>c.options.method==='POST'&&JSON.parse(c.options.body).action!=='recommend').length,1);await a.advance(63);assert.equal(a.submit.disabled,false);assert.ok(a.checks.every(c=>c.checked));assert.equal(a.calls.filter(c=>c.options.method==='POST'&&JSON.parse(c.options.body).action!=='recommend').length,1);});

test('a queued visitor can cancel while keeping their portrait and no photo is transmitted',async()=>{const a=await app(builtins,null,{ok:true,status:200,json:async()=>({state:'queued',ticket:'test-ticket',position:4,retryAfter:3})});await a.portrait();for(const c of a.checks){c.checked=true;c.onchange();}await a.recommendPhoto();await tick();await tick();await tick();const pending=a.submitScene();await a.tick();await a.tick();const cancel=a.document.querySelector('.audition-cancel-request');assert.equal(cancel.hidden,false);assert.match(a.submit.textContent,/4번째/);cancel.click();await pending;assert.equal(a.submit.disabled,false);assert.equal(a.document.querySelector('.audition-portrait-preview').src,jpeg);assert.equal(a.calls.filter(c=>c.options.method==='POST'&&JSON.parse(c.options.body).scene&&!JSON.parse(c.options.body).action).length,0);});

test('recommendation waits for both consents, selects one scene, and remains optional',async()=>{
 const a=await app();await a.portrait();assert.equal(a.calls.filter(c=>c.options.method==='POST').length,0);
 a.checks[0].checked=true;a.checks[0].onchange();await tick();assert.equal(a.calls.filter(c=>c.options.method==='POST').length,0);
 a.checks[1].checked=true;a.checks[1].onchange();await a.recommendPhoto();await tick();await tick();await tick();
 assert.equal(a.calls.filter(c=>c.options.method==='POST'&&JSON.parse(c.options.body).action==='recommend').length,1);
 assert.match(a.document.querySelector('.audition-recommend').textContent,/사진과 비슷한 방향/);assert.equal(a.document.querySelector('[data-recommended=true]').dataset.id,builtins[0].id);
 await a.choose(9);assert.equal(a.document.querySelector('.audition-choice[aria-pressed=true]').dataset.id,builtins[9].id);assert.equal(a.submit.disabled,false);
 a.checks[1].checked=false;a.checks[1].onchange();assert.equal(a.document.querySelector('[data-recommended=true]'),null);assert.equal(a.submit.disabled,true);
});
test('a late recommendation never overrides a newer manual scene choice or a cleared photo',async()=>{
 let resolve;const a=await app(builtins,null,null,()=>new Promise(r=>{resolve=r;}));await a.portrait();for(const c of a.checks){c.checked=true;c.onchange();}await a.recommendPhoto();await a.choose(8);
 resolve({ok:true,json:async()=>({recommendation:{scriptId:builtins[5].id,reason:'정면 장면'}})});await tick();await tick();
 assert.equal(a.document.querySelector('.audition-choice[aria-pressed=true]').dataset.id,builtins[8].id);assert.match(a.document.querySelector('.audition-recommend').textContent,/정면 장면/);
 a.document.querySelector('.audition-recommend-retry').click();await tick();a.document.querySelector('.audition-clear').click();resolve({ok:true,json:async()=>({recommendation:{scriptId:builtins[5].id,reason:'늦은 응답'}})});await tick();await tick();assert.doesNotMatch(a.document.querySelector('.audition-recommend').textContent,/늦은 응답/);assert.equal(a.submit.disabled,true);
});
test('recommendation failure leaves the uploaded portrait available for manual generation',async()=>{
 const a=await app(builtins,null,null,async()=>({ok:false,status:503,json:async()=>({error:'추천을 불러오지 못했습니다.'})}));await a.portrait();for(const c of a.checks){c.checked=true;c.onchange();}await a.recommendPhoto();await tick();await tick();assert.match(a.document.querySelector('.audition-recommend').textContent,/불러오지/);await a.choose(7);assert.equal(a.submit.disabled,false);await a.submitScene();assert.equal(a.document.querySelector('.audition-results').hidden,false);
});

test('friend references are optional; each needs consent and omitted roles never enter the generation request',async()=>{
 const a=await app();await a.portrait();for(const c of a.checks){c.checked=true;c.onchange();}await a.recommendPhoto();await tick();await tick();await tick();
 const friend=a.document.querySelector('.audition-friend[data-role=B] input[type=file]');Object.defineProperty(friend,'files',{value:[new Blob(['friend'],{type:'image/jpeg'})]});await friend.onchange();assert.equal(a.submit.disabled,true);
 const agree=a.document.querySelector('.audition-friend[data-role=B] input[type=checkbox]');agree.checked=true;agree.onchange();assert.equal(a.submit.disabled,false);
 await a.submitScene();const request=a.calls.find(c=>c.options.method==='POST'&&JSON.parse(c.options.body).faces),body=JSON.parse(request.options.body);assert.deepEqual(body.faces.map(f=>f.roleId),['A','B']);assert.ok(body.faces.every(f=>f.consent));assert.equal(body.portrait,undefined);assert.equal(body.mask,undefined);assert.equal(a.document.querySelector('.audition-results').hidden,false);
 a.document.querySelector('.audition-clear').click();assert.equal(a.document.querySelectorAll('.audition-friend img').length,0);assert.equal(a.submit.disabled,true);
});
test('changing works clears friend references and a selected B role uses only the main portrait at B',async()=>{
 const a=await app();await a.portrait();for(const c of a.checks){c.checked=true;c.onchange();}await a.recommendPhoto();await tick();await tick();await tick();const friend=a.document.querySelector('.audition-friend[data-role=B] input[type=file]');Object.defineProperty(friend,'files',{value:[new Blob(['friend'],{type:'image/jpeg'})]});await friend.onchange();
 await a.choose(2);assert.equal(a.document.querySelectorAll('.audition-friend img').length,0);const select=a.document.querySelector('.audition-cast select');Object.defineProperty(select,'value',{value:'B',configurable:true});select.onchange();assert.equal(a.submit.disabled,false);assert.match(a.document.querySelector('.audition-stage>p[role=status]').textContent,/B 역할/);
 await a.submitScene();const post=a.calls.find(c=>c.options.method==='POST'&&JSON.parse(c.options.body).scene),body=JSON.parse(post.options.body);assert.deepEqual(body.faces,[{roleId:'B',portrait:jpeg,consent:true}]);assert.equal(body.portrait,undefined);assert.equal(body.box,undefined);
});
test('a supplied full scene keeps its original speaker turns and supports reading-role highlighting',async()=>{
 const sample={...builtins[1],rights:'permission',script:'A(진행자): 시작해도 될까요?\nB(참가자): 네, 준비됐어요.\nA(진행자): 천천히 말씀해주세요.\nB(참가자): 제 이야기를 끝까지 들어주세요.'},mono={...builtins[5],rights:'permission',script:'A(발표자): 오늘은 제 이야기를 끝까지 전해보겠습니다.'};const a=await app([sample,mono]);assert.equal(a.document.querySelectorAll('.audition-dialogue-line').length,4);const role=a.document.querySelector('.audition-practice-roles [data-role=B]');role.click();assert.equal(a.document.querySelectorAll('.audition-dialogue-line.is-mine').length,2);assert.match(a.document.querySelector('.audition-practice-meta').textContent,/1:1 대화/);await a.choose(1);assert.match(a.document.querySelector('.audition-practice-meta').textContent,/독백/);assert.equal(a.document.querySelectorAll('.audition-friend').length,0);
});
test('the full generated image is displayed and downloaded unchanged, without canvas patches',async()=>{
 const a=await app();await a.portrait();for(const c of a.checks){c.checked=true;c.onchange();}await a.recommendPhoto();await tick();await tick();await tick();
 const before=a.draws.length;await a.submitScene();
 assert.equal(a.document.querySelector('.audition-result-image').src,a.generated);assert.ok(a.draws.slice(before).every(args=>args.length===5&&args[0].src===a.generated));
 assert.match(a.document.querySelector('.audition-results').textContent,/세부 모습도 원본과 조금 달라질/);
 a.downloads.length=0;[...a.document.querySelectorAll('.audition-results button')].find(b=>b.textContent==='AI 사진 내려받기').click();
 const saved=a.downloads.find(d=>d.blob);assert.equal(saved.blob.type,'image/jpeg');assert.deepEqual(Buffer.from(await saved.blob.arrayBuffer()),Buffer.from(a.generated.split(',')[1],'base64'));assert.match(a.downloads.find(d=>d.name).name,/\.jpg$/);
});
test('format filters use registered scripts, while reference-only films show their missing-original status',async()=>{const a=await app(builtins.filter(s=>s.rights==='brief-quote'));assert.equal(a.document.querySelector('.audition-formats').hidden,true);assert.match(a.document.querySelector('.audition-practice-meta').textContent,/전체 원문 대본 미등록/);assert.equal(a.document.querySelectorAll('.audition-dialogue-line').length,0);const save=[...a.document.querySelectorAll('.audition-actions button')].find(b=>b.textContent==='장면 원문 대본 미등록');assert.equal(save.disabled,true);
 const b=await app([builtins[0],{...builtins[5],rights:'permission',script:'A(지원자): 준비한 이야기를 시작하겠습니다.'}]);const buttons=[...b.document.querySelectorAll('.audition-formats button')];buttons.find(b=>b.textContent==='독백').click();assert.equal([...b.document.querySelectorAll('.audition-choice')].filter(b=>!b.hidden).length,1);buttons.find(b=>b.textContent==='전체').click();assert.equal([...b.document.querySelectorAll('.audition-choice')].filter(b=>!b.hidden).length,2);});
test('provided full excerpts are immediately visible and their original full text is available for download',async()=>{const provided=require('../src/audition/provided.cjs');const a=await app(provided);assert.match(a.document.querySelector('.audition-dialogue').textContent,/보시다시피 저 잘 살았어요/);assert.doesNotMatch(a.document.querySelector('.audition-practice').textContent,/원문 대본 미등록/);assert.equal(a.document.querySelector('.audition-transcript pre').textContent,provided[0].script);const save=[...a.document.querySelectorAll('.audition-actions button')].find(b=>b.textContent==='대사지 내려받기');assert.equal(save.disabled,false);await a.choose(1);assert.match(a.document.querySelector('.audition-dialogue').textContent,/오늘 오전 9시12분/);assert.match(a.document.querySelector('.audition-dialogue').textContent,/제가 기다릴 게요!/);await a.choose(2);assert.equal(a.document.querySelectorAll('.audition-friend input[type=file]').length,1);assert.match(a.document.querySelector('.audition-dialogue').textContent,/어영부영 계속/);});

test('a complete watermarked PNG card is prepared and saved without opening print or uploading again',async()=>{
 const a=await app();await a.portrait();for(const c of a.checks){c.checked=true;c.onchange();}await a.recommendPhoto();await tick();await tick();await tick();
 await a.submitScene();await tick();await tick();
 const save=a.document.querySelector('.audition-share-save');assert.equal(save.disabled,false);assert.equal(a.document.querySelector('.audition-share-preview').hidden,false);
 assert.ok(a.textDraws.filter(d=>d[0]==='김정태 배우아카데미').length>=3);
 const requests=a.calls.length;a.downloads.length=0;save.click();assert.equal(a.calls.length,requests);
 assert.equal(a.downloads.find(d=>d.blob).blob.type,'image/png');assert.match(a.downloads.find(d=>d.name).name,/나의장면-대사지\.png$/);
 assert.equal(a.document.querySelector('.audition-share-native').hidden,true);
 assert.equal([...a.document.querySelectorAll('.audition-results button')].some(b=>b.textContent.includes('인쇄')),false);
 a.document.querySelector('.audition-clear').click();assert.equal(a.document.querySelector('.audition-share-preview'),null);
});
test('native sharing uses the prepared file immediately; cancellation keeps the card and sends no API request',async()=>{
 const a=await app();let shares=0;a.navigator.canShare=({files})=>files.length===1&&files[0].type==='image/png';a.navigator.share=async({files,text})=>{assert.match(text,/내가 고른 장면/);assert.match(text,/https:\/\/www.kactstar.com\/ai-audition\?share=romcom-v5/);shares++;assert.match(files[0].name,/\.png$/);throw new DOMException('cancelled','AbortError');};
 await a.portrait();for(const c of a.checks){c.checked=true;c.onchange();}await a.recommendPhoto();await tick();await tick();await tick();await a.submitScene();await tick();await tick();
 const share=a.document.querySelector('.audition-share-native');assert.equal(share.hidden,false);const requests=a.calls.length;share.click();assert.equal(shares,1);await tick();
 assert.equal(share.disabled,false);assert.match(a.document.querySelector('.audition-output-tools>[role=status]').textContent,/공유를 취소/);assert.equal(a.calls.length,requests);assert.equal(a.document.querySelector('.audition-share-preview').hidden,false);
});
test('PNG export failure can be retried locally without regenerating a paid image',async()=>{
 const a=await app();const create=a.document.createElement.bind(a.document);let fail=true;a.document.createElement=tag=>{const e=create(tag);if(tag==='canvas')e.toBlob=fn=>fn(fail?null:new Blob(['card'],{type:'image/png'}));return e;};
 await a.portrait();for(const c of a.checks){c.checked=true;c.onchange();}await a.recommendPhoto();await tick();await tick();await tick();await a.submitScene();await tick();await tick();
 assert.equal(a.document.querySelector('.audition-share-save').disabled,true);const retry=a.document.querySelector('.audition-share-retry');assert.equal(retry.hidden,false);const requests=a.calls.length;
 fail=false;retry.click();await tick();await tick();assert.equal(a.document.querySelector('.audition-share-save').disabled,false);assert.equal(a.calls.length,requests);
});

test('steps keep one primary action visible, prevent Enter from generating on photo step, and separate output formats',async()=>{
 const a=await app();const next=a.document.querySelector('.audition-flow-next'),stage=a.document.querySelector('.audition-stage');assert.equal(a.document.querySelector('#audition-app').dataset.step,'1');assert.equal(stage.hidden,true);assert.equal(a.submit.hidden,true);assert.equal(next.disabled,true);
 await a.portrait();for(const c of a.checks){c.checked=true;c.onchange();}await a.recommendPhoto();await tick();await tick();await tick();a.document.querySelectorAll('.audition-flow button')[0].click();const before=a.calls.filter(c=>c.options.method==='POST'&&!JSON.parse(c.options.body).action).length;
 await a.form.onsubmit({preventDefault(){}});await tick();await tick();await tick();assert.equal(a.document.querySelector('#audition-app').dataset.step,'2');assert.equal(stage.hidden,false);assert.equal(next.hidden,true);assert.equal(a.submit.hidden,false);assert.equal(a.calls.filter(c=>c.options.method==='POST'&&!JSON.parse(c.options.body).action).length,before);
 await a.submitScene();await tick();await tick();assert.equal(a.document.querySelector('#audition-app').dataset.step,'3');assert.equal(a.document.querySelector('.audition-grid').hidden,true);assert.equal(a.document.querySelector('.audition-flow-footer').hidden,true);assert.equal(a.document.querySelector('.audition-voice').hidden,true);assert.equal(a.document.querySelector('.audition-image-panel').hidden,false);
 a.document.querySelectorAll('.audition-output-modes button')[1].click();assert.equal(a.document.querySelector('.audition-image-panel').hidden,true);assert.equal(a.document.querySelector('.audition-voice').hidden,false);a.document.querySelectorAll('.audition-output-modes button')[0].click();assert.equal(a.document.querySelector('.audition-voice').hidden,true);
 a.document.querySelector('.audition-result-edit').click();assert.equal(a.document.querySelector('#audition-app').dataset.step,'2');assert.equal(a.document.querySelector('.audition-results').hidden,true);a.document.querySelectorAll('.audition-flow button')[2].click();assert.equal(a.document.querySelector('#audition-app').dataset.step,'3');a.document.querySelector('.audition-clear').click();assert.equal(a.document.querySelector('#audition-app').dataset.step,'1');
});
test('entry has three explicit modes and no preselected scene; random sends no photo or consent',async()=>{
 const a=await app(builtins,null,null,null,false);assert.equal(a.document.querySelectorAll('.audition-recommend-modes button').length,3);assert.equal(a.document.querySelector('.audition-choice[aria-pressed=true]'),null);assert.equal(a.document.querySelector('.audition-flow-next').disabled,true);
 a.document.querySelector('[data-mode=random]').click();assert.equal(a.document.querySelector('.audition-flow-next').disabled,false);assert.equal(a.calls.filter(c=>c.options.method==='POST').length,0);await a.recommendPhoto();
 const request=JSON.parse(a.calls.find(c=>c.options.method==='POST').options.body);assert.equal(request.mode,'random');assert.equal(request.portrait,undefined);assert.equal(request.consent,undefined);assert.equal(a.document.querySelector('#audition-app').dataset.step,'2');assert.equal(a.submit.disabled,true);assert.equal(a.document.querySelector('.audition-portrait-step').hidden,false);
});
test('another scene request carries recent results; choosing a situation sends its tag filters without a photo',async()=>{
 const a=await app(builtins,null,null,b=>({ok:true,json:async()=>({recommendation:{scriptId:b.recentSceneIds?.length?builtins[1].id:builtins[0].id,reason:'test'}})}),false);
 a.document.querySelector('[data-mode=random]').click();await a.recommendPhoto();a.document.querySelector('.audition-recommend-retry').click();await tick();await tick();const posts=a.calls.filter(c=>c.options.method==='POST').map(c=>JSON.parse(c.options.body));assert.deepEqual(posts[1].recentSceneIds,[builtins[0].id]);
 a.document.querySelectorAll('.audition-flow button')[0].click();a.document.querySelector('[data-mode=situation]').click();const select=a.document.querySelector('[aria-label="추천 상황"]');Object.defineProperty(select,'value',{value:'갈등',configurable:true});select.onchange();await a.recommendPhoto();const last=JSON.parse(a.calls.filter(c=>c.options.method==='POST').at(-1).options.body);assert.equal(last.mode,'situation');assert.equal(last.filters.situation,select.value);assert.equal(last.portrait,undefined);
});

test('licensed foreign dialogue creates a credited portrait card locally without AI consent or POST',async()=>{
 const a=await app(builtins,null,null,null,false);await a.portrait();await a.choose(builtins.findIndex(s=>s.id==='licensed-valkaama-18'));
 a.checks[0].checked=true;a.checks[0].onchange();assert.equal(Boolean(a.checks[1].checked),false);assert.equal(a.submit.disabled,false);assert.match(a.submit.textContent,/대본 연습/);
 assert.match(a.document.querySelector('.audition-script').textContent,/외국어 대사 · 영어/);assert.match(a.document.querySelector('.audition-script').textContent,/Linda/);
 await a.form.onsubmit({preventDefault(){}});await tick();await tick();assert.equal(a.document.querySelector('.audition-results').hidden,false);
 assert.equal(a.calls.filter(c=>c.options.method==='POST').length,0);
 const pixels=a.textDraws.map(r=>r[0]).join('');assert.match(pixels,/CC BY-SA 3.0/);assert.match(pixels,/Tim Baumann/);assert.match(pixels,/creativecommons.org/);assert.match(pixels,/외국어 대사/);assert.match(pixels,/영화 장면 합성 아님/);
 a.document.querySelector('.audition-clear').click();assert.equal(a.document.querySelector('.audition-scene-wrap img').hasAttribute('src'),false);assert.equal(a.document.querySelector('.audition-results').hidden,true);
});
test('catalog searches supporting roles and language filters combine with dialogue format',async()=>{
 const a=await app(builtins,null,null,null,false);const scope=a.document.querySelector('.audition-catalog-scope input');scope.checked=true;scope.onchange();const q=a.document.querySelector('.audition-catalog-tools [type=search]');q.value='Kristina';q.oninput();const visible=[...a.document.querySelectorAll('.audition-choice')].filter(b=>!b.hidden);assert.equal(visible.length,1);assert.equal(visible[0].dataset.id,'licensed-valkaama-45');
});
test('practice language changes dialogue, comparison, TXT and locally rendered card without a translation request',async()=>{
 const a=await app(builtins,null,null,null,false);await a.portrait();const index=builtins.findIndex(s=>s.id==='licensed-tos-apology');await a.choose(index);const s=builtins[index],ko=require('../src/audition/practice-language.cjs').practiceScript(s,'ko');
 const languageButtons=()=>[...a.document.querySelectorAll('.audition-language-switch button')];assert.equal(languageButtons().length,2);languageButtons()[1].click();assert.equal(languageButtons()[1].getAttribute('aria-pressed'),'true');assert.ok(a.document.querySelector('.audition-dialogue').textContent.includes(ko.turns[0].text));assert.ok(a.document.querySelector('.audition-translation-compare').textContent.includes(s.turns[0].text));
 const save=[...a.document.querySelectorAll('.audition-script button')].find(b=>b.textContent==='대사지 내려받기');save.click();const txt=await a.downloads.filter(d=>d.blob?.type?.includes('text/plain')).at(-1).blob.text();assert.ok(txt.includes(ko.turns[0].text));
 a.checks[0].checked=true;a.checks[0].onchange();await a.form.onsubmit({preventDefault(){}});await tick();await tick();assert.ok(a.textDraws.some(([text])=>text.includes('한국어 번역')));assert.equal(a.calls.filter(c=>c.options.method==='POST').length,0);
 a.document.querySelector('.audition-result-edit').click();languageButtons()[0].click();assert.ok(a.document.querySelector('.audition-dialogue').textContent.includes(s.turns[0].text));
});

test('default mobile flow keeps local cards out and requires an explicit composite before results',async()=>{
 const a=await app(builtins,null,null,null,false);
 const visible=[...a.document.querySelectorAll('.audition-choice')].filter(b=>!b.hidden);
 assert.ok(visible.length);assert.ok(visible.every(b=>!builtins.find(s=>s.id===b.dataset.id).cardOnly));
 a.document.querySelector('[data-mode=random]').click();await a.recommendPhoto();
 const rec=JSON.parse(a.calls.find(c=>c.options.method==='POST').options.body);assert.equal(rec.includeCardOnly,false);
 assert.equal(a.document.querySelector('#audition-app').dataset.step,'2');assert.equal(a.document.querySelector('.audition-results').hidden,true);
 assert.match(a.document.querySelector('.audition-stage>.audition-step').textContent,/합성 전/);assert.match(a.submit.textContent,/내 얼굴 합성/);
 await a.portrait();for(const c of a.checks){c.checked=true;c.onchange();}await a.submitScene();await tick();
 assert.equal(a.document.querySelector('#audition-app').dataset.step,'3');
 assert.equal(a.document.querySelector('.audition-results>.audition-result-image').src,a.generated);
 assert.ok(a.calls.some(c=>c.options.method==='POST'&&JSON.parse(c.options.body).faces));
});
test('opting out of script-only cards clears the old card and closes its script on composite selection',async()=>{
 const a=await app();await a.portrait();await a.choose(builtins.findIndex(s=>s.cardOnly));
 assert.equal(a.document.querySelector('.audition-script-details').open,true);
 await a.choose(0);assert.equal(a.document.querySelector('.audition-script-details').open,false);
 await a.choose(builtins.findIndex(s=>s.cardOnly));const scope=a.document.querySelector('.audition-catalog-scope input');scope.checked=false;scope.onchange();
 assert.equal(a.submit.disabled,true);assert.equal(a.document.querySelector('.audition-scene-wrap img').hasAttribute('src'),false);
 assert.equal(a.document.querySelector('.audition-results').hidden,true);
});
