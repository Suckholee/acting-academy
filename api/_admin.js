const crypto=require('node:crypto');
const COOKIE='kjt_admin_session';
function configured(){return Boolean(process.env.ADMIN_PASSWORD&&process.env.ADMIN_SESSION_SECRET?.length>=32);}
function hash(value){return crypto.createHmac('sha256',process.env.ADMIN_SESSION_SECRET).update(value).digest('hex');}
function equal(a,b){const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y);}
function authenticated(req){
 if(!configured())return false;
 const raw=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='));
 if(!raw)return false;
 const value=raw.slice(COOKIE.length+1),[expires,nonce,signature]=value.split('.');
 return /^\d+$/.test(expires)&&Number(expires)>Date.now()&&nonce?.length===32&&Boolean(signature)&&equal(signature,hash(expires+'.'+nonce));
}
function sameOrigin(req){try{return !req.headers.origin||new URL(req.headers.origin).host===req.headers.host;}catch{return false;}}
function requireAdmin(req,res){if(!authenticated(req)){res.status(401).json({error:'관리자 로그인이 필요합니다.'});return false;}if(!sameOrigin(req)){res.status(403).json({error:'허용되지 않은 요청입니다.'});return false;}return true;}
function session(res){const value=String(Date.now()+8*3600000)+'.'+crypto.randomBytes(16).toString('hex');res.setHeader('Set-Cookie',`${COOKIE}=${value}.${hash(value)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.VERCEL?'; Secure':''}`);}
function clear(res){res.setHeader('Set-Cookie',`${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${process.env.VERCEL?'; Secure':''}`);}
function body(req){return typeof req.body==='string'?JSON.parse(req.body):req.body;}
module.exports={configured,authenticated,sameOrigin,requireAdmin,session,clear,equal,body};
