const crypto = require('node:crypto');
const {isIP} = require('node:net');
const store = require('./_cms-store');
const COOKIE = 'kjt_admin_session';
const LIFETIME = 8 * 3600000;
function equal(a, b) {
 const x = Buffer.from(String(a)), y = Buffer.from(String(b));
 return x.length === y.length && crypto.timingSafeEqual(x, y);
}
const database = {
 async create(id, expires) {
  await store.request('/rest/v1/academy_admin_sessions', {method:'POST', body:JSON.stringify({id, expires_at:new Date(expires).toISOString()})});
 },
 async active(id) {
  const rows = await store.request('/rest/v1/academy_admin_sessions?id=eq.'+id+'&expires_at=gt.'+encodeURIComponent(new Date().toISOString())+'&select=id');
  return rows.length === 1;
 },
 async revoke(id) { await store.request('/rest/v1/academy_admin_sessions?id=eq.'+id, {method:'DELETE'}); },
 async attempt(bucket) {
  return store.request('/rest/v1/rpc/consume_admin_login_attempt', {method:'POST', body:JSON.stringify({p_bucket:bucket})});
 }
};
function createAuth(security = database) {
 function configured() { return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET?.length >= 32); }
 const hash = value => crypto.createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(value).digest('hex');
 // Bind sessions to the current password as well as the signing secret.
 const signature = value => hash('session-v2:'+hash(process.env.ADMIN_PASSWORD)+':'+value);
 function token(req) {
  if (!configured()) return null;
  const raw = (req.headers.cookie || '').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='));
  if (!raw) return null;
  const value = raw.slice(COOKIE.length+1);
  const match = /^(\d{13})\.([a-f0-9]{32})\.([a-f0-9]{64})$/.exec(value);
  if (!match || Number(match[1]) <= Date.now() || Number(match[1]) > Date.now()+LIFETIME || !equal(match[3], signature(match[1]+'.'+match[2]))) return null;
  return hash('token:'+value);
 }
 async function authenticated(req) { const id = token(req); return id ? security.active(id) : false; }
 function sameOrigin(req) { try { return !req.headers.origin || new URL(req.headers.origin).host === req.headers.host; } catch { return false; } }
 async function requireAdmin(req, res) {
  try {
   if (!await authenticated(req)) { res.status(401).json({error:'관리자 로그인이 필요합니다.'}); return false; }
   if (!sameOrigin(req)) { res.status(403).json({error:'허용되지 않은 요청입니다.'}); return false; }
   return true;
  } catch { res.status(503).json({error:'관리자 인증 저장소에 연결하지 못했습니다.'}); return false; }
 }
 function cookie(res, value, age) { res.setHeader('Set-Cookie', `${COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${process.env.VERCEL || process.env.NODE_ENV === 'production' ? '; Secure' : ''}`); }
 async function session(res) {
  const expires = Date.now()+LIFETIME;
  const value = expires+'.'+crypto.randomBytes(16).toString('hex');
  const signed = value+'.'+signature(value);
  await security.create(hash('token:'+signed), expires);
  cookie(res, signed, LIFETIME/1000);
 }
 async function clear(req, res) { const id = token(req); if (id) await security.revoke(id); cookie(res, '', 0); }
 async function attempt(req) {
  // Vercel overwrites this header. Do not trust arbitrary X-Forwarded-For.
  const ip = process.env.VERCEL ? req.headers['x-vercel-forwarded-for']?.split(',')[0]?.trim() : req.socket?.remoteAddress;
  if (!isIP(ip || '')) throw new Error('trusted_client_address_missing');
  return security.attempt(hash('login-ip:'+ip));
 }
 function body(req) { return typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
 return {configured, authenticated, sameOrigin, requireAdmin, session, clear, attempt, equal, body};
}
module.exports = {...createAuth(), createAuth};
