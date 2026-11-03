const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('src/audition/ui.cjs','utf8');
function ui(fetch){const context={module:{exports:{}},fetch};vm.runInNewContext(source,context);return context.module.exports;}
test('a dropped network request produces Korean recovery guidance and never automatically repeats a paid request',async()=>{let calls=0;const request=ui(async()=>{calls++;throw new TypeError('Failed to fetch');}).request;await assert.rejects(request('/api/ai-audition',{portrait:'private-photo'}),e=>e.code==='network'&&/같은 사진/.test(e.message)&&!/Failed to fetch/.test(e.message));assert.equal(calls,1);});
test('aborts and explicit provider errors preserve their own handling',async()=>{const abort=Object.assign(Error(),{name:'AbortError'});await assert.rejects(ui(async()=>{throw abort;}).request('/api/ai-audition',{}),e=>e===abort);await assert.rejects(ui(async()=>({ok:false,json:async()=>({error:'현재 생성 요청이 많습니다.'})})).request('/api/ai-audition',{}),e=>e.message==='현재 생성 요청이 많습니다.');});

test('Retry-After survives as structured cooldown metadata',async()=>{await assert.rejects(ui(async()=>({ok:false,status:429,headers:{get:()=> '93'},json:async()=>({error:'한도 도달'})})).request('/api/ai-audition',{}),e=>e.status===429&&e.retryAfter===93);});
