const crypto=require('node:crypto'),store=require('./_cms-store');
const LIMITS={perWindow:10,windowSeconds:600};
function createLimiter({request=(...a)=>store.request(...a),secret=()=>process.env.ADMIN_SESSION_SECRET}={}){
 return async (req,visitor)=>{
  const key=secret();if(!/^[a-f0-9]{64}$/.test(visitor||'')||!key)throw Error('rate_limit_unavailable');
  // Each signed anonymous visitor has an independent allowance, including on
  // shared networks. The database also enforces its shared daily cap.
  const bucket=crypto.createHmac('sha256',key).update('audition:'+visitor).digest('hex');
  return request('/rest/v1/rpc/consume_academy_ai_attempt',{method:'POST',body:JSON.stringify({p_bucket:bucket})});
 };
}
module.exports={consume:createLimiter(),createLimiter,LIMITS};
