const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
class OpenDate extends Date {static now(){return Date.parse('2026-10-22T00:00:00Z');}}
function setup(fetch,{advance=true}={}){
 const {document,Event}=parseHTML(fs.readFileSync('published-source/events/kim-jung-tae-20261107.html','utf8'));
 const form=document.querySelector('#event-form');form.reset=()=>{};const elements={};
 for(const n of document.querySelectorAll('input,select,textarea,button,h2,section')){n.focus=()=>{};n.checkValidity=()=>true;n.reportValidity=()=>true;}
 for(const name of ['name','phone','website','gender','ageGroup','experience','question','consent'])elements[name]=form.querySelector('[name="'+name+'"]');
 Object.defineProperty(form,'elements',{value:elements});elements.name.value='테스트 신청';elements.phone.value='01012345678';Object.defineProperty(elements.gender,'value',{value:'응답 안 함'});Object.defineProperty(elements.ageGroup,'value',{value:'30대'});Object.defineProperty(elements.experience,'value',{value:'처음이에요'});elements.question.value='입문 방법';elements.consent.checked=true;
 vm.runInNewContext(fs.readFileSync('published-source/event-application.js','utf8'),{document,fetch,Date:OpenDate,window:{kjtEntrySource:()=>'facebook'}});
 document.querySelector('#event-start').click();if(advance)document.querySelector('#event-next').click();return {document,form,Event};
}
test('survey form sends selected answers and only shows confirmation after server success',async()=>{let payload;const ctx=setup(async(url,options)=>{assert.equal(url,'/api/event-application');payload=JSON.parse(options.body);return {ok:true,json:async()=>({message:'접수 완료'})};});ctx.form.querySelector('input[name=interests]').setAttribute('checked','');ctx.form.dispatchEvent(new ctx.Event('submit',{cancelable:true}));await tick();assert.deepEqual(payload.interests,['취미·자기표현']);assert.equal(payload.ageGroup,'30대');assert.equal(payload.attributionSource,'facebook');assert.equal(payload.question,'입문 방법');assert.equal(ctx.form.hidden,true);assert.equal(ctx.document.querySelector('#event-success').hidden,false);});
test('form does not report success on storage failure and permits retry',async()=>{const ctx=setup(async()=>({ok:false,json:async()=>({error:'저장 실패'})}));ctx.form.querySelector('input[name=interests]').setAttribute('checked','');ctx.form.dispatchEvent(new ctx.Event('submit',{cancelable:true}));await tick();assert.equal(ctx.document.querySelector('#event-status').textContent,'저장 실패');assert.equal(ctx.form.hidden,false);assert.equal(ctx.document.querySelector('#event-success').hidden,true);assert.equal(ctx.form.querySelector('button[type=submit]').disabled,false);});
test('missing interests block submission before network request',async()=>{const ctx=setup(()=>assert.fail());ctx.form.dispatchEvent(new ctx.Event('submit',{cancelable:true}));await tick();assert.match(ctx.document.querySelector('#event-status').textContent,/관심 분야/);});
test('admin survey text is rendered as text instead of markup',async()=>{const {document}=parseHTML(fs.readFileSync('published-source/admin/event-applications.html','utf8'));vm.runInNewContext(fs.readFileSync('published-source/admin-event-applications.js','utf8'),{document,Intl,Date,fetch:async()=>({ok:true,json:async()=>({records:[{name:'테스트',phone:'01012345678',created_at:'2026-10-22T00:00:00Z',survey:{ageGroup:'30대',gender:'응답 안 함',interests:['배우 준비'],experience:'처음이에요',question:'<img src=x onerror=alert(1)>'}}]})})});await tick();const row=document.querySelector('#event-records tr');assert.equal(row.querySelectorAll('td').length,9);assert(row.textContent.includes('<img src=x onerror=alert(1)>'));assert.equal(row.querySelector('img'),null);});

test('application stays in the card and returning to earlier steps preserves entered data',()=>{
 const ctx=setup(()=>assert.fail('navigation must not submit'),{advance:false});
 assert.equal(ctx.document.querySelector('#event-intro').hidden,true);
 assert.equal(ctx.form.hidden,false);
 assert.equal(ctx.document.querySelector('[data-event-step="0"]').hidden,false);
 ctx.form.elements.name.value='보존할 이름';
 ctx.document.querySelector('#event-next').click();
 assert.equal(ctx.document.querySelector('[data-event-step="1"]').hidden,false);
 assert.equal(ctx.form.querySelector('button[type=submit]').hidden,false);
 ctx.document.querySelector('#event-back').click();
 assert.equal(ctx.form.elements.name.value,'보존할 이름');
 assert.equal(ctx.document.querySelector('[data-event-step="0"]').hidden,false);
 ctx.document.querySelector('#event-back').click();
 assert.equal(ctx.document.querySelector('#event-intro').hidden,false);
 assert.equal(ctx.form.hidden,true);
});
test('invalid first-step field prevents advancing and Enter never submits from the first step',async()=>{
 let requests=0;const ctx=setup(()=>{requests++;assert.fail('first step must not submit');},{advance:false});
 let reports=0;ctx.form.elements.phone.checkValidity=()=>false;ctx.form.elements.phone.reportValidity=()=>reports++;
 ctx.document.querySelector('#event-next').click();
 assert.equal(ctx.document.querySelector('[data-event-step="1"]').hidden,true);assert.equal(reports,1);
 ctx.form.elements.phone.checkValidity=()=>true;
 ctx.form.dispatchEvent(new ctx.Event('submit',{cancelable:true}));await tick();
 assert.equal(ctx.document.querySelector('[data-event-step="1"]').hidden,false);assert.equal(requests,0);
});
