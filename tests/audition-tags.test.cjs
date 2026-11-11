const {test}=require('node:test'),assert=require('node:assert/strict');
const {builtins}=require('../src/audition/catalog.cjs'),{entry}=require('../src/audition/model.cjs');
const {candidates}=require('../src/audition/recommend-options.cjs'),{facets,filterScenes,searchMatches,parseFilters}=require('../src/audition/scene-tags.cjs');
const {recommend}=require('../api/_audition-recommend');
const all=candidates(builtins);
const free=data=>recommend({data:{includeCardOnly:true,...data},scripts:builtins,limit:()=>assert.fail('no paid quota'),fetcher:()=>assert.fail('no AI request')});
test('100 distinct actual-work excerpts from 12 works have curated facets and survive editing',()=>{
 assert.equal(all.length,100);assert.equal(new Set(all.map(s=>s.work)).size,12);assert.equal(new Set(all.map(s=>s.id)).size,100);assert.equal(new Set(all.map(s=>s.script)).size,100);
 for(const s of all){for(const k of Object.keys(facets))assert.ok(s.sceneTags[k].length,s.id+' '+k);assert.ok(s.keywords.length);const v=entry({...s,reviewed:true});assert.deepEqual(v.sceneTags,s.sceneTags);assert.deepEqual(v.keywords,s.keywords);assert.equal(v.sourceLocator,s.sourceLocator);}
});
test('keyword aliases, role names and AND combinations find genuinely matching scenes',()=>{
 const breakup=filterScenes(all,{situation:'이별',relationship:'연인'});assert.ok(breakup.length>3);assert.ok(new Set(breakup.map(s=>s.work)).size>2);
 assert.ok(filterScenes(all,{query:'회사'}).every(s=>searchMatches(s,'직장')));
 assert.deepEqual(filterScenes(all,{query:'헤어짐'}),filterScenes(all,{query:'이별'}));
 assert.ok(filterScenes(all,{query:'친구 위로'}).length>0);
 assert.ok(filterScenes(all,{query:'Hanuman'}).every(s=>s.turns.some(t=>t.label==='Hanuman')));
 assert.equal(filterScenes(all,{query:'절대로존재하지않는장면키워드'}).length,0);
});
test('situation filters cover matching scenes without repeats and prefer a different work',async()=>{
 const filters={situation:'갈등',relationship:'연인'},matches=filterScenes(all,filters),history=[];assert.ok(new Set(matches.map(s=>s.work)).size>2);
 for(let i=0;i<matches.length;i++){const {recommendation:r}=await free({mode:'situation',filters,recentSceneIds:history});assert.equal(r.candidateCount,matches.length);assert.ok(matches.some(s=>s.id===r.scriptId));assert.ok(!history.includes(r.scriptId));const previous=all.find(s=>s.id===history.at(-1)),remaining=matches.filter(s=>!history.includes(s.id));if(previous&&remaining.some(s=>s.work!==previous.work))assert.notEqual(all.find(s=>s.id===r.scriptId).work,previous.work);history.push(r.scriptId);}
});
test('no matches and malformed filters never silently recommend an unrelated scene',async()=>{
 const {recommendation:r}=await free({mode:'situation',filters:{query:'절대로존재하지않는장면키워드'}});assert.equal(r.scriptId,null);assert.equal(r.candidateCount,0);assert.match(r.reason,/조건/);
 for(const filters of [null,[],{emotion:'bad'},{query:3},{query:'x'.repeat(121)},{notAFilter:'anything'},{}])await assert.rejects(free({mode:'situation',filters}),e=>e.status===400);
 assert.throws(()=>parseFilters(JSON.parse('{"__proto__":"bad"}')));
});
test('invalid scene tag values and unverified reuse names cannot enter the catalog through editing',()=>{
 const s=all.find(s=>s.license);for(const extra of [{sceneTags:{emotion:['injected']}},{keywords:['x'.repeat(61)]},{tags:'not-an-array'}])assert.throws(()=>entry({...s,...extra}));
 const custom=all.find(s=>s.license?.name.includes('제작사'));assert.throws(()=>entry({...custom,license:{...custom.license,evidence:'https://example.com/'}}));
});
