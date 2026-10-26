const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const handler=require('../api/member-config');
function config(){let data;const res={setHeader(){},status(){return this},json(value){data=value;return this}};handler({method:'GET'},res);return data;}
test('published policy links never implicitly enable registration',()=>{
 const keys=['MEMBER_REGISTRATION_OPEN','MEMBER_TERMS_URL','MEMBER_PRIVACY_URL'];const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 try{
 for(const k of keys)delete process.env[k];
 let value=config();assert.equal(value.termsUrl,'/terms');assert.equal(value.privacyUrl,'/privacy');assert.equal(value.policiesReady,true);assert.equal(value.registrationOpen,false);
 process.env.MEMBER_REGISTRATION_OPEN='true';assert.equal(config().registrationOpen,true);
 process.env.MEMBER_TERMS_URL='https://outside.example/terms';value=config();assert.equal(value.policiesReady,false);assert.equal(value.registrationOpen,false);
 }finally{for(const key of keys)if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}
});
test('public policy pages and registration hold links ship with the build',()=>{
 for(const name of ['terms','privacy']){const html=fs.readFileSync('dist-published/'+name+'.html','utf8');assert.match(html,/2026년 10월 26일/);assert.ok(html.includes('href="/terms"'));assert.ok(html.includes('href="/privacy"'));assert.ok(html.includes('현재 신규 회원가입은 준비 중'));assert.ok(html.includes('https://www.kactstar.com/'+name));assert.doesNotMatch(html,/아직 시행하거나 공개하지 않습니다|공개 전 확정 사항/);}
 const signup=fs.readFileSync('src/members/app.js','utf8');assert.match(signup,/function signup\(\)\{rememberReturn\(\);if\(!config.demo&&!config.registrationOpen\)/);assert.match(fs.readFileSync('dist-published/signup.html','utf8'),/href="\/privacy"/);
});
