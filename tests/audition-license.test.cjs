const {test}=require('node:test'),assert=require('node:assert/strict');
const scenes=require('../src/audition/licensed-scenes.json');
const {entry}=require('../src/audition/model.cjs'),{scriptText}=require('../src/audition/catalog.cjs');
const {licenseInfo}=require('../src/audition/license.cjs');
test('all licensed imports retain original dialogue and redistribution metadata through admin validation',()=>{
 assert.equal(scenes.length,97);assert.equal(new Set(scenes.map(s=>s.id)).size,97);
 for(const s of scenes){const saved=entry(s);assert.equal(saved.script,s.script);assert.deepEqual(saved.turns,s.turns);assert.deepEqual(saved.license,s.license);assert.equal(saved.languageLabel,'외국어 대사 · 영어');assert.equal(saved.cardOnly,true);assert.equal(saved.image,'');const txt=scriptText(saved);assert.ok(txt.includes(s.license.attribution));assert.ok(txt.includes(s.license.url));assert.ok(txt.includes(s.source));}
});
test('unsupported, mismatched or missing reuse permissions cannot enable text-only recommendations',()=>{
 const s=scenes[0];for(const license of [{...s.license,name:'CC BY-NC 3.0'},{...s.license,name:'toString'},{...s.license,url:'https://example.org/'},{...s.license,attribution:''},{...s.license,evidence:'http://example.org/'}])assert.throws(()=>licenseInfo({...s,license}));
 assert.throws(()=>entry({...s,license:undefined}));assert.throws(()=>entry({...s,image:'/unverified-film-still.jpg'}));
});
