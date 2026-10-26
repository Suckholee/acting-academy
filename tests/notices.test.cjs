const {test}=require('node:test'),assert=require('node:assert/strict');
const registry=require('../content/editor-registry.json');
const {catalog,encode,decode,publicPages}=require('../src/published-editor/collection-model.cjs');
const {valid}=require('../api/site-content');
const moduleDefinition=Object.values(registry.modules).find(m=>m.collectionKind==='notices');
const def=catalog.find(d=>d.kind==='notices');
function item(id,title,visible=true){return {id,template:moduleDefinition.id,visible,category:'',detail:'',values:{'h2-1':title,'p-1':'2026-10-26','p-2':'첫 줄\n둘째 줄'}};}
const wrap=items=>({'/collections/notices-1':encode('notices-1',items)});
test('notices can be created, updated, deleted, and serialized without exposing drafts',()=>{
 const first=item('item-first','새 공지'),draft=item('item-draft','비공개 원고',false);
 const saved=wrap([first,draft]);assert.ok(valid(saved));
 const publicData=publicPages(saved,registry.modules);assert.deepEqual(decode(publicData['/collections/notices-1'],registry.modules,def),[first]);assert.ok(!JSON.stringify(publicData).includes('비공개 원고'));
 const updated={...first,values:{...first.values,'h2-1':'수정한 공지','p-2':'변경된 내용'}};
 assert.ok(valid(wrap([updated,draft])));assert.equal(decode(wrap([updated])['/collections/notices-1'],registry.modules,def)[0].values['h2-1'],'수정한 공지');
 assert.deepEqual(decode(wrap([])['/collections/notices-1'],registry.modules,def),[]);
 assert.deepEqual(decode(saved['/collections/notices-1'],registry.modules,def),[first,draft]);
});
test('published notices require a title, real date and body; template spoofing is rejected',()=>{
 for(const [key,value] of [['h2-1',''],['p-1','2026-02-30'],['p-1','tomorrow'],['p-2','  ']]){
 const broken=item('item-one','제목');broken.values[key]=value;assert.equal(valid(wrap([broken])),false,key);broken.visible=false;assert.equal(valid(wrap([broken])),true);
 }
 assert.equal(valid(wrap([{...item('item-one','제목'),template:'unknown'}])),false);
});
