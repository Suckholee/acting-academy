const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('src/published-editor/editor.js','utf8');
const boot=source.slice(source.lastIndexOf('(async()=>'),source.indexOf('\nrenderMode();',source.lastIndexOf('(async()=>')));
for(const [label,entry,authenticated,expected] of [
 ['signed-in visitor stays on public homepage',false,true,false],
 ['authenticated explicit entry opens editor',true,true,true],
 ['unauthenticated explicit entry stays logged out',true,false,false]
])test(label,async()=>{
 const calls=[];let applied=false;
 const context={adminEntry:entry,admin:false,pages:{},revision:0,ready:false,request:async url=>{calls.push(url);return url==='/api/admin-auth'?{authenticated}:{pages:{'/':[]},revision:2,ready:true};},applyContent:()=>{applied=true;},renderMode(){},message(){}};
 await vm.runInNewContext(boot,context);
 assert.equal(context.admin,expected);assert.equal(applied,true);
 assert.equal(calls.includes('/api/admin-auth'),entry);
});
