const {sharedKey,validImage}=require('./model.cjs');
const {validVideo}=require('./video-model.cjs');
const catalog=[
 {page:'/faq',kind:'faq',title:'자주 묻는 질문',selector:'.faq-list details'},
 {page:'/reviews',kind:'reviews',title:'수강후기',selector:'.review-card'},
 {page:'/trainers',kind:'trainers',title:'강사 소개',selector:'.faculty-card'},
 {page:'/programs',kind:'courses',title:'교육과정',selector:'.course'},
 {page:'/works',kind:'works',title:'수강생 작품',selector:'.student-card'},
 {page:'/facilities',kind:'facilities',title:'시설 사진',selector:'.facility-card'},
 {page:'/partners',kind:'partners',title:'파트너 기관',selector:'.partners-simple-item'},
 {page:'/',kind:'videos',title:'홍보 영상',selector:'.video-orbit-card'}
];
const collectionPath=id=>'/collections/'+id;
const indexKey=sharedKey('collection','index');
const recordKey=id=>sharedKey('collection-item',id);
function validRecord(record,module){
 return record&&Object.keys(record).every(k=>['id','template','visible','values','category','detail'].includes(k))&&/^item-[a-z0-9-]{1,80}$/.test(record.id)&&record.template===module.id&&typeof record.visible==='boolean'&&typeof record.category==='string'&&record.category.length<=80&&typeof record.detail==='string'&&(!record.detail||/^\/(?:trainers|courses|works)\/[a-z0-9-]+$/.test(record.detail))&&record.values&&typeof record.values==='object'&&!Array.isArray(record.values)&&Object.keys(record.values).length===module.fields.length&&module.fields.every(f=>typeof record.values[f.id]==='string'&&record.values[f.id].length<=f.maxLength&&(f.type==='text'||f.type==='image'&&validImage(record.values[f.id])||f.type==='video'&&validVideo(record.values[f.id])))&&(!record.visible||module.fields.filter(f=>/^(name|headline|summary|h[1-4])-/.test(f.id)).slice(0,1).every(f=>record.values[f.id].trim().length>0))&&JSON.stringify(record).length<=12000;
}
function encode(id,records){
 if(records.length>100)throw Error('한 목록에 최대 100개까지 등록할 수 있습니다.');
 const keys=records.map(r=>recordKey(r.id));if(new Set(keys).size!==keys.length)throw Error('중복된 콘텐츠 식별자입니다.');
 return [{key:indexKey,type:'text',value:JSON.stringify({version:1,order:keys})},...records.map((r,i)=>({key:keys[i],type:'text',value:JSON.stringify(r)}))];
}
function decode(entries,modules,definition){
 if(!entries)return null;
 const index=entries.find(e=>e.key===indexKey);if(!index)throw Error('콘텐츠 목록 순서를 확인해주세요.');
 const meta=JSON.parse(index.value);if(meta.version!==1||!Array.isArray(meta.order)||meta.order.length>100||new Set(meta.order).size!==meta.order.length||entries.length!==meta.order.length+1)throw Error('콘텐츠 목록 형식이 올바르지 않습니다.');
 return meta.order.map(key=>{const entry=entries.find(e=>e.key===key);if(!entry||entry.type!=='text')throw Error('콘텐츠 항목을 찾을 수 없습니다.');const record=JSON.parse(entry.value);const module=modules[record.template];if(!module||module.page!==definition.page||module.collectionKind!==definition.kind||!validRecord(record,module)||recordKey(record.id)!==key)throw Error('등록된 콘텐츠 틀과 항목만 사용할 수 있습니다.');return record;});
}
function validatePages(pages,modules){try{for(const [page,entries]of Object.entries(pages)){if(!page.startsWith('/collections/'))continue;const match=/^\/collections\/([a-z]+)-(\d+)$/.exec(page);const def=match&&catalog.find(d=>d.kind===match[1]);if(!def||!Number.isSafeInteger(Number(match[2]))||Number(match[2])<1||Number(match[2])>30)return false;decode(entries,modules,def);}return true;}catch{return false;}}
function publicPages(pages,modules){const result=structuredClone(pages);for(const [path,entries]of Object.entries(pages)){if(!path.startsWith('/collections/'))continue;const match=/^\/collections\/([a-z]+)-(\d+)$/.exec(path);const def=match&&catalog.find(d=>d.kind===match[1]);if(!def){delete result[path];continue;}const records=decode(entries,modules,def);for(const record of records.filter(r=>!r.visible)){const module=modules[record.template];const protectedKeys=new Set(module.fields.filter(f=>f.storagePage!=='/shared').flatMap(f=>[f.key,f.legacyKey]));result[module.page]=(result[module.page]||[]).filter(e=>!protectedKeys.has(e.key));}result[path]=encode(match[1]+'-'+match[2],records.filter(r=>r.visible));}return result;}
function collectionHistory(path,value,modules){if(!path.startsWith('/collections/'))return null;const kind=path.split('/').pop().replace(/-\d+$/,'');const title=catalog.find(d=>d.kind===kind)?.title||'콘텐츠';if(value===null)return title+' · 항목 없음';try{const data=JSON.parse(value);if(Array.isArray(data.order))return title+' · 목록 '+data.order.length+'개';const module=modules[data.template];if(!module)return title;return title+' · '+(data.visible?'공개':'비공개')+'\n'+module.fields.map(f=>{const label=f.type==='image'?'사진':f.type==='video'?'영상':/^summary-/.test(f.id)?'질문':/^headline-|^h[1-4]-/.test(f.id)?'제목':/^p-|^body-/.test(f.id)?'내용':f.label;return label+': '+data.values[f.id];}).join('\n');}catch{return title+' · 콘텐츠 내용';}}
module.exports={collectionHistory,publicPages,catalog,collectionPath,indexKey,recordKey,validRecord,encode,decode,validatePages};
