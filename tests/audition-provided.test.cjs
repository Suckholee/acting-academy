const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const provided=require('../src/audition/provided.cjs'),{builtins,scriptText}=require('../src/audition/catalog.cjs'),{entry,readingTurns,frame}=require('../src/audition/model.cjs'),{dialogue}=require('../src/audition/dialogue.cjs'),{catalog}=require('../api/_audition'),{candidates,selectScene}=require('../api/_audition-recommend');
test('provided screenshots become three full excerpts without invented continuations or loss of cross-image text',()=>{
 assert.equal(provided.length,3);for(const s of provided){assert.equal(s.rights,'user-provided');assert.ok(s.script.length>120);assert.ok(scriptText(s).includes(s.script));assert.deepEqual(entry({...s,reviewed:true}).turns,s.turns);assert.ok(dialogue(s.script,s.turns).roles.length);assert.doesNotMatch(s.notice,/창작 대본/);}
 assert.match(provided[0].script,/덥네요 떨어져서 이야기 하죠/);assert.match(provided[0].script,/도박이래 할머니가$/);
 assert.match(provided[1].script,/제 마음도 같아요/);assert.match(provided[1].script,/오전 9시12분/);assert.match(provided[1].script,/제가 기다릴 게요!$/);assert.doesNotMatch(provided[1].script,/정유미|이번주 아내/);
 assert.match(provided[2].script,/유리한 기억만남겨/);assert.match(provided[2].script,/그게 무슨말이야/);assert.match(provided[2].script,/어영부영 계속 나랑 그러고 있었을 걸\?$/);
 assert.equal(dialogue(provided[0].script,provided[0].turns).type,'독백');assert.equal(dialogue(provided[1].script,provided[1].turns).type,'1:1 대화');assert.equal(dialogue(provided[2].script,provided[2].turns).type,'1:1 대화');
});
test('speaker aids cannot add words outside the provided source; frame and original text survive admin validation',()=>{
 const s=provided[0];assert.deepEqual(entry({...s,reviewed:true}).imageFrame,s.imageFrame);assert.throws(()=>readingTurns(s.script,[{speaker:'A',label:'달미',text:'원문에 없는 새 대사'}]));assert.throws(()=>readingTurns(s.script,[{speaker:'D',label:'달미',text:s.turns[0].text}]));assert.throws(()=>frame({x:.5,y:0,w:1,h:1}));
});
test('registered excerpts are first and appearance-based recommendations can never select an empty quote template',()=>{
 assert.deepEqual(catalog([]).slice(0,3).map(s=>s.id),provided.map(s=>s.id));assert.equal(candidates(builtins).length,100);const observation={face:'single',direction:'front',tilt:'level',framing:'close',faceBox:{x:.2,y:.2,w:.3,h:.4},expression:'neutral',styling:'formal',choice:provided[0].id};const r=selectScene(builtins,observation);assert.equal(r.scriptId,provided[0].id);assert.match(r.reason,/表情|표정/);assert.match(r.reason,/옷차림/);assert.doesNotMatch(r.reason,/정면 얼굴 방향/);
 assert.equal(selectScene(builtins,{...observation,choice:provided[2].id}).scriptId,provided[2].id);assert.throws(()=>selectScene(builtins,{...observation,choice:'sample-masquerade'}));assert.equal(selectScene(builtins,{...observation,face:'multiple'}).scriptId,null);
});
test('source image framing crops the actual top still without redrawing it',async()=>{
 const esbuild=require('esbuild'),bundle=esbuild.buildSync({entryPoints:['src/audition/photo.cjs'],bundle:true,platform:'browser',format:'cjs',write:false}).outputFiles[0].text,draws=[],module={exports:{}};class Photo{constructor(){this.naturalWidth=560;this.naturalHeight=1260;}async decode(){}}
 vm.runInNewContext(bundle,{module,exports:module.exports,Image:Photo,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},document:{createElement:()=>({getContext:()=>({fillRect(){},drawImage(...v){draws.push(v);}}),toDataURL:()=> 'data:image/jpeg;base64,/9j/4AAQ'})}});const result=await module.exports.preparePhoto({size:1000,type:'image/jpeg'},1199000,provided[0].imageFrame);assert.equal(result.width,560);assert.equal(result.height,315);assert.deepEqual(draws[0].slice(1),[0,0,560,315,0,0,560,315]);
});
