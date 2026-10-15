const auth = require('./_admin');
const store = require('./_cms-store');
module.exports = async (req, res) => {
 res.setHeader('Cache-Control', 'no-store');
 if (!['GET','POST','DELETE'].includes(req.method)) return res.status(405).json({error:'지원하지 않는 요청입니다.'});
 if (req.method !== 'GET' && !auth.sameOrigin(req)) return res.status(403).json({error:'허용되지 않은 요청입니다.'});
 let data;
 if (req.method === 'POST') {
  if (!auth.configured()) return res.status(503).json({error:'관리자 인증 설정이 필요합니다.'});
  try { data = auth.body(req); } catch { return res.status(400).json({error:'입력 내용을 확인해주세요.'}); }
  if (typeof data?.password !== 'string' || data.password.length > 256) return res.status(400).json({error:'입력 내용을 확인해주세요.'});
 }
 try {
  if (req.method === 'GET') return res.json({configured:auth.configured(), authenticated:await auth.authenticated(req), storageReady:store.ready()});
  if (req.method === 'DELETE') { await auth.clear(req, res); return res.json({success:true}); }
  const retry = await auth.attempt(req);
  if (!Number.isInteger(retry) || retry < 0) throw new Error('invalid_rate_limit_response');
  if (retry > 0) { res.setHeader('Retry-After', String(retry)); return res.status(429).json({error:'로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.'}); }
  if (!auth.equal(data.password, process.env.ADMIN_PASSWORD)) return res.status(401).json({error:'비밀번호가 올바르지 않습니다.'});
  await auth.session(res);
  return res.json({success:true});
 } catch { return res.status(503).json({error:'관리자 인증 저장소에 연결하지 못했습니다.'}); }
};
