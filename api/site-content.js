const auth=require('./_admin');const store=require('./_cms-store');
const {validImage}=require('../src/published-editor/model.cjs');
const {validVideo}=require('../src/published-editor/video-model.cjs');
const {validatePages,publicPages}=require('../src/published-editor/collection-model.cjs');const registry=require('../content/editor-registry.json');
const PAGE=/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/;
function valid(data){return data&&typeof data==='object'&&!Array.isArray(data)&&Object.keys(data).length<=60&&Object.entries(data).every(([page,entries])=>PAGE.test(page)&&Array.isArray(entries)&&entries.length<=500&&entries.every(e=>e&&typeof e.key==='string'&&/^cms-\d+$/.test(e.key)&&['text','image','video'].includes(e.type)&&typeof e.value==='string'&&e.value.length<=12000&&(e.type!=='image'||validImage(e.value))&&(e.type!=='video'||validVideo(e.value))))&&validatePages(data,registry.modules);}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method==='GET'){
  if(!store.ready())return res.json({ready:false,pages:{},revision:0});
  try{const rows=await store.request('/rest/v1/academy_cms?key=eq.pages&select=value,revision');const pages=rows[0]?.value||{};const authenticated=await auth.authenticated(req);return res.json({ready:true,pages:authenticated?pages:publicPages(pages,registry.modules),revision:rows[0]?.revision||0});}catch{return res.status(503).json({error:'콘텐츠 저장소를 확인해주세요.'});}
 }
 if(!await auth.requireAdmin(req,res))return;
 if(req.method!=='PUT')return res.status(405).json({error:'지원하지 않는 요청입니다.'});
 try{const data=auth.body(req);if(!valid(data?.pages)||!Number.isInteger(data.revision)||data.revision<0)return res.status(400).json({error:'콘텐츠 형식을 확인해주세요.'});
  const result=await store.request('/rest/v1/rpc/save_academy_content_with_history',{method:'POST',body:JSON.stringify({new_value:data.pages,expected_revision:data.revision})});
  if(result===null)return res.status(409).json({error:'다른 곳에서 변경되었습니다. 새로고침 후 다시 수정해주세요.'});
  return res.json({success:true,revision:result});
 }catch{return res.status(503).json({error:'저장하지 못했습니다. 서버 연결을 확인해주세요.'});}
};
module.exports.valid=valid;
