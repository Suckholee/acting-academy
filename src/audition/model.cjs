const {imageURL,clean}=require('../editorial/model.cjs');
const ID=/^[a-z0-9][a-z0-9-]{2,70}$/;
function entry(v){
 if(!v||!ID.test(v.id)||!['permission','owned','public-domain','brief-quote','user-provided'].includes(v.rights)||v.reviewed!==true)throw Error('validation');
 if(v.rights==='brief-quote'&&!require('./catalog.cjs').builtins.some(s=>s.rights==='brief-quote'&&s.id===v.id&&s.script===v.script))throw Error('validation');
 const source=clean(v.source,1500,1),url=new URL(source);if(url.protocol!=='https:'||url.username||url.password)throw Error('validation');
 const image=imageURL(v.image||'');
 const turns=v.turns?readingTurns(v.script,v.turns):undefined;const imageFrame=v.imageFrame?frame(v.imageFrame):undefined;
 const target=image?selection(v.target):null;
 const cast=v.cast?castMembers(v.cast):undefined;if(cast&&(!image||JSON.stringify(cast[0].target)!==JSON.stringify(target)))throw Error('cast');
 let imageSource='';if(v.imageSource){imageSource=clean(v.imageSource,1500,1);const u=new URL(imageSource);if(u.protocol!=='https:'||u.username||u.password)throw Error('validation');}
 if(!Array.isArray(v.beats)||v.beats.length!==3)throw Error('validation');
 return {id:v.id,title:clean(v.title,80,1),work:clean(v.work,100,1),author:clean(v.author,120,1),context:clean(v.context,1200,1),script:clean(v.script,6000,1),...(turns?{turns}:{}),...(imageFrame?{imageFrame}:{}),beats:v.beats.map(b=>clean(b,600,1)),image,target,...(cast?{cast}:{}),targetLabel:clean(v.targetLabel||'',80),imageSource,imageCredit:clean(v.imageCredit||'',200),source,notice:clean(v.notice,500,1),rights:v.rights,rightsNote:clean(v.rightsNote,400,1),reviewed:true,builtin:false};
}
function selection(v){if(!v||!['x','y','w','h'].every(k=>Number.isFinite(v[k]))||v.x<0||v.y<0||v.w<.03||v.h<.03||v.w>.8||v.h>.8||v.x+v.w>1.001||v.y+v.h>1.001)throw Error('selection');return {x:v.x,y:v.y,w:v.w,h:v.h};}
function castMembers(v){if(!Array.isArray(v)||v.length<1||v.length>3||v[0].id!=='A'||new Set(v.map(r=>r.id)).size!==v.length)throw Error('cast');return v.map(r=>{if(!['A','B','C'].includes(r.id))throw Error('cast');return {id:r.id,label:clean(r.label,80,1),target:selection(r.target)};});}
function castFor(s){try{return s.cast?castMembers(s.cast):[{id:'A',label:s.targetLabel||'주인공',target:selection(s.target)}];}catch{return [];}}
function readingTurns(script,rows){if(!Array.isArray(rows)||!rows.length||rows.length>100)throw Error('turns');let at=0;return rows.map(r=>{if(r.speaker!==null&&!['A','B','C'].includes(r.speaker))throw Error('turns');const text=clean(r.text,6000,1),start=String(script).indexOf(text,at);if(start<0)throw Error('turns');at=start+text.length;return {speaker:r.speaker,label:clean(r.label||'',80),text};});}
function frame(v){if(!v||!['x','y','w','h'].every(k=>Number.isFinite(v[k]))||v.x<0||v.y<0||v.w<.03||v.h<.03||v.x+v.w>1.001||v.y+v.h>1.001)throw Error('frame');return {x:v.x,y:v.y,w:v.w,h:v.h};}
module.exports={ID,entry,selection,castMembers,castFor,readingTurns,frame};
