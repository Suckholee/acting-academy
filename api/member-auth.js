const crypto=require('node:crypto'),{isIP}=require('node:net');
const {createClient}=require('@supabase/supabase-js');
const store=require('./_cms-store'),admin=require('./_admin'),member=require('./_member');
const {passwordError,phoneError}=require('../src/members/model.cjs');
async function consume(req,action){
 const ip=process.env.VERCEL?req.headers['x-vercel-forwarded-for']?.split(',')[0]?.trim():req.socket?.remoteAddress;
 if(!isIP(ip||'')||!process.env.ADMIN_SESSION_SECRET)throw Error('limit_unavailable');
 const bucket=crypto.createHmac('sha256',process.env.ADMIN_SESSION_SECRET).update('member-auth:'+action+':'+ip).digest('hex');
 return store.request('/rest/v1/rpc/consume_member_auth_attempt',{method:'POST',body:JSON.stringify({p_bucket:bucket})});
}
function registrationOpen(){return process.env.MEMBER_REGISTRATION_OPEN==='true'&&[process.env.MEMBER_TERMS_URL||'/terms',process.env.MEMBER_PRIVACY_URL||'/privacy'].every(v=>/^\/(?!\/)[a-z0-9/_.-]+$/.test(v));}
function createHandler({identity=member,limit=consume,clientFactory=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),open=registrationOpen}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'지원하지 않는 요청입니다.'});
  if(!admin.sameOrigin(req))return res.status(403).json({error:'허용되지 않은 요청입니다.'});
  let body;try{body=admin.body(req);}catch{return res.status(400).json({error:'입력 내용을 확인해주세요.'});}
  if(body?.action!=='signup')return res.status(400).json({error:'이메일로 로그인하거나 가입해주세요.'});
  if(body.mode!=='email'||body.username)return res.status(400).json({error:'이메일 주소를 계정으로 사용해주세요.'});
  if(body.action==='signup'&&!open())return res.status(403).json({error:'회원가입은 아직 시작하지 않았습니다.'});
  try{
   const retry=await limit(req,body.action);if(retry){res.setHeader('Retry-After',String(retry));return res.status(429).json({error:'시도가 많습니다. 잠시 후 다시 시도해주세요.'});}
   if(body.action==='signup'){
    if(identity.validateProfile({name:body.name,phone:body.phone})||phoneError(body.phone)||passwordError(body.password)||body.consent!==true||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email||''))return res.status(400).json({error:'이름·이메일·연락처·비밀번호와 동의를 확인해주세요.'});
    const {error}=await clientFactory().auth.signUp({email:body.email.trim().toLowerCase(),password:body.password,options:{emailRedirectTo:'https://www.kactstar.com/account',data:{name:body.name.trim(),phone:body.phone.replace(/[ -]/g,''),member_consent:true}}});
    if(error)return res.status(400).json({error:'가입 요청을 처리하지 못했습니다. 입력 내용을 확인하고 잠시 후 다시 시도해주세요.'});
    return res.json({sent:true});
   }
  }catch{return res.status(503).json({error:'인증 서비스를 확인해주세요. 잠시 후 다시 시도해주세요.'});}
 };
}
module.exports=createHandler();module.exports.createHandler=createHandler;
