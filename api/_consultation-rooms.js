const crypto = require('node:crypto');
const {PEN_WIDTHS,MARKER_WIDTHS}=require('../src/consultation/pen-tools.cjs');
const fs = require('node:fs/promises');
const path = require('node:path');
const database = require('./_cms-store');
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const VERSION = /^[a-f0-9]{16}$/;
const JOURNAL_KEYS = ['goals','summary','recommendation','followup','memo'];
const SELECT = 'id,name,phone,source,interest,counselor,status,created_at,updated_at,guide_version,page_ids,revision';
const production = {
 async list(offset) {return database.request(`/rest/v1/academy_consultation_rooms?select=${SELECT}&order=created_at.desc,id.desc&limit=50&offset=${offset}`);},
 async get(id) {return (await database.request('/rest/v1/academy_consultation_rooms?id=eq.'+id+'&select=*'))[0];},
 async create(record) {return (await database.request('/rest/v1/academy_consultation_rooms',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(record)}))[0];},
 async update(id, revision, fields) {return (await database.request(`/rest/v1/academy_consultation_rooms?id=eq.${id}&revision=eq.${revision}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({...fields,revision:revision+1,updated_at:new Date().toISOString()})}))[0];}
};
function clean(value,max,required=false){if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw Error('validation');return value.trim();}
function strokes(value){
 if(!Array.isArray(value)||value.length>400)throw Error('validation');
 let points=0;
 return value.map(stroke=>{
  if(!stroke||!/^#[a-fA-F0-9]{6}$/.test(stroke.color)||(stroke.tool!==undefined&&!['pen','highlighter'].includes(stroke.tool))||!(stroke.tool==='highlighter'?MARKER_WIDTHS:PEN_WIDTHS).includes(stroke.width)||!Array.isArray(stroke.points)||!stroke.points.length||stroke.points.length>2500)throw Error('validation');
  points+=stroke.points.length;if(points>30000)throw Error('validation');
  const normalized=stroke.points.map(p=>{if(!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)||n<0||n>1))throw Error('validation');return p;});
  return {color:stroke.color,width:stroke.width,points:normalized,...(stroke.tool==='highlighter'?{tool:'highlighter'}:{})};
 });
}
function createHandler({directory,store=production}){
 return async(req,res)=>{
  const params=new URL(req.url,'http://localhost').searchParams,id=params.get('id');
  if(id!==null&&!UUID.test(id))return res.status(400).json({error:'상담방 주소를 확인해주세요.'});
  try{
   if(req.method==='GET'){
    if(id){const record=await store.get(id);return record?res.json({record,demo:!!store.demo}):res.status(404).json({error:'상담방을 찾을 수 없습니다.'});}
    const offset=Number(params.get('offset')||0);if(!Number.isInteger(offset)||offset<0||offset>100000)return res.status(400).json({error:'목록 주소를 확인해주세요.'});
    return res.json({records:await store.list(offset),offset,demo:!!store.demo});
   }
   if(!['POST','PATCH'].includes(req.method))return res.status(405).json({error:'지원하지 않는 요청입니다.'});
   let data;try{data=typeof req.body==='string'?JSON.parse(req.body):req.body;if(!data||Buffer.byteLength(JSON.stringify(data))>1100000)throw Error();}catch{return res.status(400).json({error:'입력 내용과 필기 분량을 확인해주세요.'});}
   if(req.method==='POST'){
    let record;
    try{
     const name=clean(data.name,80,true),phone=clean(data.phone,40,true),source=clean(data.source,120,true),interest=clean(data.interest,120),counselor=clean(data.counselor,80),special=clean(data.special,2000);
     if(!/^[+\d()\s-]{7,40}$/.test(phone)||phone.replace(/\D/g,'').length<7||!VERSION.test(data.guide_version))throw Error('validation');
     let manifest;try{manifest=JSON.parse(await fs.readFile(path.join(directory,'versions',data.guide_version,'manifest.json'),'utf8'));}catch{return res.status(409).json({error:'배정할 자료가 변경되었습니다. 목록을 새로고침해주세요.'});}
     if(!Array.isArray(data.page_ids)||!data.page_ids.length||data.page_ids.length>manifest.pages.length||data.page_ids.some(p=>!Number.isInteger(p)||p<1||p>manifest.pages.length)||new Set(data.page_ids).size!==data.page_ids.length)throw Error('validation');
     const stamp=new Date().toISOString();record={id:crypto.randomUUID(),name,phone,source,interest,counselor,special,guide_version:data.guide_version,page_ids:[...data.page_ids].sort((a,b)=>a-b),status:'ready',annotations:{},journal:{},last_page:Math.min(...data.page_ids),revision:0,created_at:stamp,updated_at:stamp};
    }catch{return res.status(400).json({error:'이름·전화번호·방문 경로와 배정할 자료를 확인해주세요.'});}
    const saved=await store.create(record);return res.status(201).json({record:saved,demo:!!store.demo});
   }
   if(!id||!Number.isSafeInteger(data.revision)||data.revision<0)return res.status(400).json({error:'상담방과 저장 버전을 확인해주세요.'});
   const current=await store.get(id);if(!current)return res.status(404).json({error:'상담방을 찾을 수 없습니다.'});
   if(current.revision!==data.revision)return res.status(409).json({error:'다른 창에서 이 상담이 수정되었습니다. 작성 내용을 복사해 둔 뒤 다시 열어주세요.'});
   let fields;
   try{
    if(data.action==='guide'){
     if(!VERSION.test(data.version))throw Error('validation');
     const target=JSON.parse(await fs.readFile(path.join(directory,'versions',data.version,'manifest.json'),'utf8'));
     if(target.version!==data.version||current.page_ids.some(page=>page>target.pages.length))throw Error('validation');
     const numeric=entries=>Object.fromEntries(Object.entries(entries||{}).filter(([key])=>/^[1-9]\d?$/.test(key)));
     const previous={...(current.annotations?._guides||{})},restored=numeric(previous[data.version]);
     if(data.version!==current.guide_version)previous[current.guide_version]=numeric(current.annotations);
     delete previous[data.version];
     const common=Object.fromEntries(Object.entries(current.annotations||{}).filter(([key])=>!/^[1-9]\d?$/.test(key)));
     fields={guide_version:data.version,annotations:data.version===current.guide_version?current.annotations:{...common,...restored,_guides:previous}};
    }else if(data.action==='journal_ink'){
     fields={annotations:{...current.annotations,_journal:strokes(data.strokes)}};
    }else if(data.action==='ink'){
     if(!current.page_ids.includes(data.page))throw Error('validation');
     fields={annotations:{...current.annotations,[String(data.page)]:strokes(data.strokes)}};
    }else if(data.action==='journal'){
     if(!data.journal||typeof data.journal!=='object'||Array.isArray(data.journal)||Object.keys(data.journal).some(k=>!JOURNAL_KEYS.includes(k)))throw Error('validation');
     fields={journal:Object.fromEntries(JOURNAL_KEYS.map(key=>[key,clean(data.journal[key]||'',key==='memo'?8000:4000)]))};
    }else if(data.action==='progress'){
     if(!['ready','in_progress','completed'].includes(data.status)||!current.page_ids.includes(data.last_page)||(data.status==='completed'&&!current.journal?.summary?.trim()))throw Error('validation');
     fields={status:data.status,last_page:data.last_page};
    }else throw Error('validation');
   }catch{return res.status(400).json({error:'저장할 상담 내용과 필기 분량을 확인해주세요.'});}
   const record=await store.update(id,data.revision,fields);
   return record?res.json({record,demo:!!store.demo}):res.status(409).json({error:'다른 창에서 이 상담이 수정되었습니다. 작성 내용을 복사해 둔 뒤 다시 열어주세요.'});
  }catch{return res.status(503).json({error:'상담방 저장소에 연결하지 못했습니다. 작성 중인 내용은 이 화면에 유지됩니다.'});}
 };
}
module.exports={createHandler,production,JOURNAL_KEYS};
