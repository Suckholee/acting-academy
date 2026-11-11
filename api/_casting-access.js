const crypto=require('node:crypto');
const privateCall=c=>c.document.accessMode==='invite';
const hash=code=>crypto.createHash('sha256').update(code).digest('hex');
function equal(a,b){return typeof a==='string'&&typeof b==='string'&&a.length===b.length&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));}
function signature(value){const secret=process.env.ADMIN_SESSION_SECRET;if(!secret||secret.length<32)throw Error('access_secret_missing');return crypto.createHmac('sha256',secret).update('casting-invite:'+value).digest('base64url');}
function clean(c){const document={...c.document};delete document.inviteHash;return {...c,document};}
function allowed(req,c,now=Date.now()){
 if(!privateCall(c))return true;
 if(!c.document.inviteHash)return false;
 try{const name='casting_access_'+c.id;const token=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1);if(!token||token.length>600)return false;const [value,sig,...rest]=token.split('.');if(rest.length||!equal(signature(value),sig))return false;const data=JSON.parse(Buffer.from(value,'base64url'));return data.id===c.id&&data.hash===c.document.inviteHash&&Number.isFinite(data.exp)&&data.exp>now&&data.exp<=now+3600000;}catch{return false;}
}
function publicCall(req,c,now=Date.now()){return allowed(req,c,now)?clean(c):{id:c.id,locked:true,document:{title:'초대 전용 오디션',status:c.document.status}};}
function verify(code,c){return typeof code==='string'&&code.length<=100&&/^[a-f0-9]{32}$/.test(code.trim())&&equal(hash(code.trim()),c.document.inviteHash);}
function cookie(req,c,now=Date.now()){
 const value=Buffer.from(JSON.stringify({id:c.id,hash:c.document.inviteHash,exp:now+3600000})).toString('base64url');
 const local=/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host||'');
 return 'casting_access_'+c.id+'='+value+'.'+signature(value)+'; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600'+(local?'':'; Secure');
}
function generate(){const code=crypto.randomBytes(16).toString('hex');return {code,inviteHash:hash(code)};}
module.exports={privateCall,clean,publicCall,allowed,verify,cookie,generate};
