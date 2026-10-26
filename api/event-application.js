const crypto = require('node:crypto');
const {isIP} = require('node:net');
const auth = require('./_admin');
const database = require('./_cms-store');
const EVENT = '11/7 김정태 무료특강';
const TAG = '무료특강 신청';
const {validateSurvey} = require('../src/events/model.cjs');
function validate(body) {
  if (!body || typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 40) return '이름을 2~40자로 입력해주세요.';
  if (typeof body.phone !== 'string' || !/^01[016789]\d{7,8}$/.test(body.phone.replace(/[ -]/g, ''))) return '휴대전화 번호를 확인해주세요.';
  if (body.consent !== true) return '개인정보 수집·이용에 동의해주세요.';
  if (body.website) return '입력 내용을 확인해주세요.';
  return validateSurvey(body);
}
function createHandler({store = database, limit, now = () => Date.now()} = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({error: '지원하지 않는 요청입니다.'}); }
    if (!auth.sameOrigin(req)) return res.status(403).json({error: '허용되지 않은 요청입니다.'});
    let body; try { body = auth.body(req); } catch { return res.status(400).json({error: '입력 내용을 확인해주세요.'}); }
    if (Buffer.byteLength(JSON.stringify(body) || '') > 4096) return res.status(413).json({error: '입력 내용이 너무 깁니다.'});
    const error = validate(body); if (error) return res.status(400).json({error});
    if (now() >= Date.parse('2026-11-07T14:00:00+09:00')) return res.status(410).json({error: '이번 무료특강 신청이 종료되었습니다.'});
    if (!store.ready() || !process.env.ADMIN_SESSION_SECRET) return res.status(503).json({error: '온라인 접수를 준비 중입니다. 아직 접수되지 않았습니다. 02-2666-4528로 문의해주세요.'});
    try {
      const ip = process.env.VERCEL ? req.headers['x-vercel-forwarded-for']?.split(',')[0]?.trim() : req.socket?.remoteAddress;
      if (!limit && !isIP(ip || '')) throw Error('ip_unavailable');
      const bucket = crypto.createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update('event-application:' + ip).digest('hex');
      const retry = limit ? await limit(req) : await store.request('/rest/v1/rpc/consume_academy_ai_attempt', {method: 'POST', body: JSON.stringify({p_bucket: bucket})});
      if (!Number.isInteger(retry) || retry < 0) throw Error('limit_unavailable');
      if (retry) { res.setHeader('Retry-After', String(retry)); return res.status(429).json({error: '잠시 후 다시 신청해주세요.'}); }
      const phone = body.phone.replace(/[ -]/g, '');
      const match = 'courses=cs.' + encodeURIComponent(JSON.stringify([EVENT]));
      const existing = await store.request('/rest/v1/academy_inquiries?select=id&phone=eq.' + phone + '&' + match + '&limit=1');
      if (existing?.length) return res.status(200).json({message: '해당 연락처로 신청이 접수되어 있습니다. 참석 확정은 접수순으로 개별 안내드립니다.'});
      const record = {id: crypto.randomUUID(), name: body.name.trim(), phone, purposes: [TAG], courses: [EVENT], consent: true, status: '신규', memo: JSON.stringify({eventId:'kim-jung-tae-20261107',gender:body.gender,ageGroup:body.ageGroup,interests:body.interests,experience:body.experience,question:(body.question||'').trim()})};
      const rows = await store.request('/rest/v1/academy_inquiries', {method: 'POST', headers: {Prefer: 'return=representation'}, body: JSON.stringify(record)});
      if (!rows?.[0]?.id) throw Error('not_confirmed');
      return res.status(201).json({message: '무료특강 신청이 접수되었습니다. 참석 확정은 접수순으로 개별 안내드립니다.'});
    } catch { return res.status(503).json({error: '접수를 확인하지 못했습니다. 잠시 후 다시 시도하거나 02-2666-4528로 문의해주세요.'}); }
  };
}
module.exports = createHandler();
module.exports.createHandler = createHandler;
module.exports.validate = validate;
module.exports.EVENT = EVENT;
module.exports.TAG = TAG;
