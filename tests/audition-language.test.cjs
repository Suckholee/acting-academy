const {test}=require('node:test'),assert=require('node:assert/strict');
const {builtins,scriptText}=require('../src/audition/catalog.cjs'),{practiceScript,translationInfo}=require('../src/audition/practice-language.cjs'),{entry}=require('../src/audition/model.cjs');
test('all 97 foreign excerpts have complete aligned Korean translations and retain their originals',()=>{
 const scenes=builtins.filter(s=>s.license);assert.equal(scenes.length,97);
 for(const s of scenes){const before=JSON.stringify(s),ko=practiceScript(s,'ko');assert.equal(ko.practiceLanguage,'ko',s.id);assert.equal(ko.turns.length,s.turns.length);for(let i=0;i<s.turns.length;i++){assert.equal(ko.turns[i].speaker,s.turns[i].speaker);assert.equal(ko.turns[i].label,s.turns[i].label);if(/[A-Za-z]/.test(s.turns[i].text))assert.match(ko.turns[i].text,/[가-힣]/);}assert.equal(practiceScript(s),s);assert.equal(JSON.stringify(s),before);assert.equal(ko.source,s.source);assert.match(ko.license.changes,/translation/);assert.deepEqual(entry(s).translation,s.translation);const txt=scriptText(ko);assert.ok(txt.includes(ko.turns[0].text));assert.ok(txt.includes(s.license.url));assert.match(ko.notice,/비공식 번역/);}
});
test('stale, incomplete and malformed translations cannot replace a changed original',()=>{
 const s=builtins.find(s=>s.translation);for(const t of [{...s.translation,sourceScript:'changed'},{...s.translation,turns:[]},{...s.translation,turns:s.translation.turns.map(()=>null)}]){assert.throws(()=>translationInfo({...s,translation:t}));assert.equal(practiceScript({...s,translation:t},'ko').script,s.script);}
 const local=builtins.find(s=>!s.license);assert.equal(practiceScript(local,'ko'),local);
});
