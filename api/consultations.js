'use strict';
const { randomUUID } = require('node:crypto');
const PURPOSES = new Set(['취미·입문', '배우 준비', '입시·오디션']);
const COURSES = new Set(['연기 베이직', '카메라 연기', '입시·오디션']);
function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return '입력 내용을 확인해주세요.';
  if (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 40) return '이름은 2–40자로 입력해주세요.';
  if (typeof body.phone !== 'string' || !/^01[016789]\d{7,8}$/.test(body.phone.replace(/[ -]/g, ''))) return '휴대전화 번호를 확인해주세요.';
  for (const [field, allowed] of [['purposes', PURPOSES], ['courses', COURSES]]) {
    if (!Array.isArray(body[field]) || !body[field].length || body[field].length > allowed.size || body[field].some(v => !allowed.has(v))) return '교육목적과 희망과목을 선택해주세요.';
  }
  if (body.consent !== true) return '개인정보 수집·이용 동의가 필요합니다.';
  return null;
}
async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({error:'지원하지 않는 요청입니다.'}); }
  if (Number(req.headers['content-length']) > 8192) return res.status(413).json({error:'입력 내용이 너무 깁니다.'});
  const origin=req.headers.origin;
  if (origin) { try { if(new URL(origin).host !== req.headers.host) return res.status(403).json({error:'허용되지 않은 요청입니다.'}); } catch { return res.status(403).json({error:'허용되지 않은 요청입니다.'}); } }
  let body=req.body;
  try { if(typeof body==='string') body=JSON.parse(body); } catch { return res.status(400).json({error:'입력 내용을 확인해주세요.'}); }
  const error=validate(body); if(error) return res.status(400).json({error});
  if(body.website) return res.status(400).json({error:'입력 내용을 확인해주세요.'});
  const endpoint=process.env.CONSULTATION_WEBHOOK_URL;
  if(!endpoint) return res.status(503).json({error:'현재 온라인 상담 접수를 준비하고 있습니다. 아직 신청은 전송되지 않았습니다.'});
  if(!endpoint.startsWith('https://')) return res.status(503).json({error:'상담 접수를 일시적으로 이용할 수 없습니다.'});
  const id=randomUUID();
  try {
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(process.env.CONSULTATION_WEBHOOK_TOKEN?{Authorization:`Bearer ${process.env.CONSULTATION_WEBHOOK_TOKEN}`}:{})},body:JSON.stringify({id,name:body.name.trim(),phone:body.phone.replace(/[ -]/g,''),purposes:[...new Set(body.purposes)],courses:[...new Set(body.courses)],consent:true,submittedAt:new Date().toISOString()}),signal:AbortSignal.timeout(8000),redirect:'error'});
    if(!response.ok) throw new Error('delivery failed');
    return res.status(201).json({id,message:'상담 신청이 접수되었습니다.'});
  } catch { return res.status(502).json({error:'접수 완료를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.'}); }
}
module.exports=handler;
module.exports.validate=validate;
