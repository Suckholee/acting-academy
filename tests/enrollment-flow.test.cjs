const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {parseHTML}=require('linkedom');
function setup(fetcher,search=''){
 const {document}=parseHTML('<html><body><main id="enrollment-root"></main></body></html>');
 vm.runInNewContext(fs.readFileSync('src/enrollment/app.js','utf8'),{document,location:{search},URLSearchParams,require:p=>p.includes('attribution')?{browserSource:()=> 'instagram'}:require('../content/courses.json'),fetch:fetcher});
 for(const[key,value]of [['name','테스트'],['phone','01000000000']]){const input=document.querySelector(`[name=${key}]`);input.value=value;input.oninput();}
 const consent=document.querySelector('[name=consent]');consent.checked=true;consent.onchange();
 return document;
}
const submit=document=>document.querySelector('form').onsubmit({preventDefault(){}});
test('contact-only Instagram application submits directly with consent and no invented answers',async()=>{
 let payload;const document=setup(async(url,options)=>{assert.equal(url,'/api/course-application');payload=JSON.parse(options.body);return{ok:true,json:async()=>({id:'saved'})};},'?source=instagram');
 assert.equal(document.querySelectorAll('input[required]').length,3);assert.equal(document.querySelector('select').hasAttribute('required'),false);
 await submit(document);assert.deepEqual(payload,{name:'테스트',phone:'01000000000',consent:true,source:'instagram',attributionSource:'instagram'});assert(document.querySelector('.done'));
});
test('a selected course is included without requiring purpose or region',async()=>{
 let payload;const document=setup(async(url,options)=>{payload=JSON.parse(options.body);return{ok:true,json:async()=>({id:'saved'})};});
 const select=document.querySelector('select');select.querySelector('[value=camera]').selected=true;select.onchange();
 await submit(document);assert.equal(payload.course,'camera');assert.equal(payload.purpose,undefined);assert.equal(payload.region,undefined);
});
test('a pending request cannot be submitted twice and failure retains contact details for retry',async()=>{
 let finish,calls=0;const document=setup(()=>{calls++;return new Promise(resolve=>{finish=resolve;});});
 const pending=submit(document);await submit(document);assert.equal(calls,1);assert(document.querySelector('button').disabled);
 finish({ok:false,json:async()=>({error:'잠시 후 다시 시도해주세요.'})});await pending;
 assert.equal(document.querySelector('.done'),null);assert.equal(document.querySelector('[name=name]').value,'테스트');assert.equal(document.querySelector('button').disabled,false);assert.match(document.querySelector('[role=status]').textContent,/다시 시도/);
});
test('a response without a saved ID never displays a successful application',async()=>{
 const document=setup(async()=>({ok:true,json:async()=>({})}));await submit(document);assert.equal(document.querySelector('.done'),null);assert.match(document.querySelector('[role=status]').textContent,/접수를 확인하지 못했습니다/);
});
