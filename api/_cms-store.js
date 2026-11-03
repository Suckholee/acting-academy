function ready(){return Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY);}
async function request(route,options={}){
 if(!ready())throw new Error('storage_not_configured');
 const response=await fetch(process.env.SUPABASE_URL.replace(/\/$/,'')+route,{...options,headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error('storage_request_failed');
 const text=await response.text();
 return text.trim()?JSON.parse(text):null;
}
async function count(route){
 if(!ready())throw new Error('storage_not_configured');
 const response=await fetch(process.env.SUPABASE_URL.replace(/\/$/,'')+route,{method:'HEAD',headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,Prefer:'count=exact'},signal:AbortSignal.timeout(12000)});
 const total=response.headers.get('content-range')?.match(/\/(\d+)$/)?.[1];
 if(!response.ok||total===undefined||!Number.isSafeInteger(Number(total)))throw new Error('storage_count_failed');
 return Number(total);
}
module.exports={ready,request,count};
