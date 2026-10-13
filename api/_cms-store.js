function ready(){return Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY);}
async function request(route,options={}){
 if(!ready())throw new Error('storage_not_configured');
 const response=await fetch(process.env.SUPABASE_URL.replace(/\/$/,'')+route,{...options,headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error('storage_request_failed');
 return response.status===204?null:response.json();
}
module.exports={ready,request};
