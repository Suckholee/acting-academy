const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {parseHTML}=require('linkedom');
const model=require('../src/members/model.cjs');
async function screen(page,providers,registrationOpen=true){
 const {document}=parseHTML(`<html><body><section id="member-app" data-page="${page}"></section></body></html>`);
 const calls=[],storage=new Map();
 const context={document,require:()=>model,URLSearchParams,location:{origin:'https://www.kactstar.com',pathname:'/'+page,search:'',hash:'',assign(){}},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),signInWithOAuth:async args=>{calls.push(args);return {error:null};}}}),fetch:async()=>({ok:true,json:async()=>({ready:true,url:'https://project.supabase.co',key:'publishable-test',providers,registrationOpen,policiesReady:true,termsUrl:'/terms',privacyUrl:'/privacy'})})};
 vm.runInNewContext(fs.readFileSync('src/members/app.js','utf8').replace("import {createClient} from '@supabase/supabase-js';",''),context);
 await new Promise(resolve=>setImmediate(resolve));
 return {document,calls};
}
test('Google and Kakao start the matching provider flow and return to the academy account page',async()=>{
 const {document,calls}=await screen('signup',['google','kakao']);
 for(const provider of ['google','kakao']){
  const button=document.querySelector('.member-'+provider);
  assert.ok(button);assert.equal(button.disabled,false);
  await button.onclick();
  assert.equal(calls.at(-1).provider,provider);
  assert.equal(calls.at(-1).options.redirectTo,'https://www.kactstar.com/account');
  assert.equal(calls.at(-1).options.scopes,undefined);
 }
 assert.equal(document.querySelectorAll('.member-methods').length,0);
 assert.equal(document.querySelectorAll('input[type="email"]').length,1);
 assert.doesNotMatch(document.body.textContent,/아이디 가입|아이디 로그인|새 아이디/);
});
test('unconnected social providers are visibly unavailable without blocking configured providers',async()=>{
 const {document}=await screen('login',['google']);
 assert.equal(document.querySelector('.member-google').disabled,false);
 const kakao=document.querySelector('.member-kakao');
 assert.equal(kakao.disabled,true);assert.match(kakao.textContent,/준비 중/);assert.match(kakao.title,/카카오/);
 assert.ok(document.querySelector('input[type="email"]'));
 assert.equal(document.querySelectorAll('.member-methods').length,0);
 assert.doesNotMatch(document.body.textContent,/아이디/);
});
test('closed registration does not expose a signup form or live social signup buttons',async()=>{
 const {document}=await screen('signup',['google','kakao'],false);
 assert.match(document.body.textContent,/회원가입 준비 중/);
 assert.equal(document.querySelectorAll('form,.member-social').length,0);
});
