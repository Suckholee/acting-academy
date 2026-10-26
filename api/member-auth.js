const crypto=require('node:crypto'),{isIP}=require('node:net');
const {createClient}=require('@supabase/supabase-js');
const store=require('./_cms-store'),admin=require('./_admin'),member=require('./_member');
const {normalizeUsername,usernameError,passwordError,phoneError}=require('../src/members/model.cjs');
const failure='아이디·비밀번호 또는 이메일 인증 상태를 확인해주세요.';
async function consume(req,action){
 const ip=process.env.VERCEL?req.headers['x-vercel-forwarded-for']?.split(',')[0]?.trim():req.socket?.remoteAddress;
 if(!isIP(ip||'')||!process.env.ADMIN_SESSION_SECRET)throw Error('limit_unavailable');
 const bucket=crypto.createHmac('sha256',process.env.ADMIN_SESSION_SECRET).update('member-auth:'+action+':'+ip).digest('hex');
 return store.request('/rest/v1/rpc/consume_member_auth_attempt',{method:'POST',body:JSON.stringify({p_bucket:bucket})});
}
function registrationOpen(){return process.env.MEMBER_REGISTRATION_OPEN==='true'&&[process.env.MEMBER_TERMS_URL||'/terms',process.env.MEMBER_PRIVACY_URL||'/privacy'].every(v=>/^\/(?!\/)[a-z0-9/_.-]+$/.test(v));}
function createHandler({database=store,identity=member,limit=consume,clientFactory=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),open=registrationOpen}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'지원하지 않는 요청입니다.'});
  if(!admin.sameOrigin(req))return res.status(403).json({error:'허용되지 않은 요청입니다.'});
  let body;try{body=admin.body(req);}catch{return res.status(400).json({error:'입력 내용을 확인해주세요.'});}
  if(!['signup','username-login','claim-username'].includes(body?.action))return res.status(400).json({error:'요청을 확인해주세요.'});
  if(body.action==='signup'&&!open())return res.status(403).json({error:'회원가입은 아직 시작하지 않았습니다.'});
  try{
   const retry=await limit(req,body.action);if(retry){res.setHeader('Retry-After',String(retry));return res.status(429).json({error:'시도가 많습니다. 잠시 후 다시 시도해주세요.'});}
   const username=normalizeUsername(body.username);
   if(body.action==='signup'){
    if(!['email','username'].includes(body.mode)||identity.validateProfile({name:body.name,phone:body.phone})||phoneError(body.phone)||passwordError(body.password)||body.consent!==true||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email||'')||(body.mode==='username'&&usernameError(username)))return res.status(400).json({error:'이름·아이디·이메일·연락처·비밀번호와 동의를 확인해주세요.'});
    const {error}=await clientFactory().auth.signUp({email:body.email.trim().toLowerCase(),password:body.password,options:{emailRedirectTo:'https://www.kactstar.com/account',data:{name:body.name.trim(),phone:body.phone.replace(/[ -]/g,''),member_consent:true,requested_username:body.mode==='username'?username:null}}});
    if(error)return res.status(400).json({error:'가입 요청을 처리하지 못했습니다. 입력 내용을 확인하고 잠시 후 다시 시도해주세요.'});
    return res.json({sent:true});
   }
   if(body.action==='claim-username'){
    const user=await identity.user(req);if(!user?.email_confirmed_at)return res.status(401).json({error:'이메일 인증 후 로그인해주세요.'});
    const profile=await identity.profile(user);if(profile.status!=='active')return res.status(403).json({error:'현재 이용할 수 없는 계정입니다.'});
    if(usernameError(username))return res.status(400).json({error:usernameError(username)});
    const owned=await database.request('/rest/v1/academy_member_usernames?user_id=eq.'+user.id+'&select=username');
    if(owned[0])return owned[0].username===username?res.json({username}):res.status(409).json({error:'이미 등록된 아이디는 변경할 수 없습니다.'});
    try{await database.request('/rest/v1/academy_member_usernames',{method:'POST',body:JSON.stringify({username,user_id:user.id})});}catch{return res.status(409).json({error:'아이디를 등록하지 못했습니다. 다른 아이디를 선택하거나 내 계정에서 확인해주세요.'});}
    return res.json({username});
   }
   if(usernameError(username)||typeof body.password!=='string'||body.password.length>128)return res.status(401).json({error:failure});
   const rows=await database.request('/rest/v1/academy_member_usernames?username=eq.'+username+'&select=user_id');
   const profiles=rows[0]?await database.request('/rest/v1/academy_members?user_id=eq.'+rows[0].user_id+'&select=email,status'):[];
   // Always verify a password, including unknown IDs, without exposing email addresses.
   const email=profiles[0]?.email||crypto.randomBytes(16).toString('hex')+'@invalid.example';
   const {data,error}=await clientFactory().auth.signInWithPassword({email,password:body.password});
   if(error||!rows[0]||profiles[0]?.status!=='active'||data.user?.id!==rows[0].user_id||!data.user?.email_confirmed_at||!data.session)return res.status(401).json({error:failure});
   return res.json({access_token:data.session.access_token,refresh_token:data.session.refresh_token});
  }catch{return res.status(503).json({error:'인증 서비스를 확인해주세요. 잠시 후 다시 시도해주세요.'});}
 };
}
module.exports=createHandler();module.exports.createHandler=createHandler;
