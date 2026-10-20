const test=require('node:test'),assert=require('node:assert/strict');
const {plan}=require('../scripts/migrate-local-content.cjs');
const registry=require('../content/editor-registry.json');
test('local import preserves saved server values, reuses legacy fields, and fills registered defaults once',()=>{
 const fields=Object.values(registry.modules).flatMap(m=>m.fields),field=fields.find(f=>f.storagePage==='/reviews'&&f.id==='headline-1');
 const current={[field.storagePage]:[{key:field.key,type:field.type,value:'이미 운영에 저장된 제목'}]};
 const snapshot={pages:{[field.storagePage]:[{key:field.legacyKey,type:field.type,value:'오래된 로컬 제목'}]}};
 const result=plan(current,snapshot);
 assert.equal(result.pages[field.storagePage].find(e=>e.key===field.key).value,'이미 운영에 저장된 제목');
 assert.equal(current[field.storagePage].length,1);
 const identities=Object.entries(result.pages).flatMap(([page,entries])=>entries.map(e=>page+':'+e.key));
 assert.equal(identities.length,new Set(identities).size);
 assert.equal(identities.length,new Set(fields.map(f=>f.storagePage+':'+f.key)).size);
 const legacy=plan({[field.storagePage]:[{key:field.legacyKey,type:field.type,value:'기존 로컬 수정'}]});
 assert.equal(legacy.pages[field.storagePage].find(e=>e.key===field.key).value,'기존 로컬 수정');
 assert.deepEqual([...result.media.keys()].sort(),[...new Set(fields.filter(f=>['image','video'].includes(f.type)&&f.defaultValue.startsWith('/assets/')).map(f=>f.defaultValue))].sort());
});
test('subsequent editor saves retain imported defaults and legacy aliases in the database',()=>{
 const {shouldPersistEntry}=require('../src/published-editor/model.cjs');
 const entry={key:'cms-100',type:'text',value:'기본 제목'};
 assert.equal(shouldPersistEntry(entry,'기본 제목',[]),false);
 assert.equal(shouldPersistEntry(entry,'다른 제목',[]),true);
 assert.equal(shouldPersistEntry(entry,'기본 제목',[entry]),true);
 assert.equal(shouldPersistEntry(entry,'기본 제목',[{key:'cms-10',type:'text',value:'기본 제목'}],new Map([['cms-10','cms-100']])),true);
 assert.equal(shouldPersistEntry(entry,'기본 제목',[{...entry,type:'image'}]),false);
});
