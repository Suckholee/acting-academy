const REFRESH_MS=60*60*1000;
function createAnalyticsFetcher(fetcher,{now=()=>new Date()}={}){
 let blockedUntil=0,blockedError;
 return async(url,options)=>{
  const at=now().getTime();if(at<blockedUntil)throw blockedError;
  const response=await fetcher(url,options);if(response.ok)return response;
  const error=Error('analytics_upstream_failed');error.status=response.status||503;
  if(error.status===429){
   const reset=Number(response.headers?.get?.('x-ratelimit-reset'))*1000;
   const retry=response.headers?.get?.('retry-after');const delay=retry&&/^\d+$/.test(retry)?at+Number(retry)*1000:Date.parse(retry||'');
   blockedUntil=Math.max(at+60000,Number.isFinite(reset)?reset:0,Number.isFinite(delay)?delay:0);
   error.retryAt=new Date(blockedUntil).toISOString();blockedError=error;
  }
  console.warn('analytics_query_failed',{status:error.status,retryAt:error.retryAt||null});throw error;
 };
}
function failurePayload(error,fallback){
 const retryAt=error?.retryAt;
 if(error?.status===429&&retryAt){const time=new Date(retryAt).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false});return{error:'통계 제공처의 조회 한도로 갱신이 지연됩니다. '+time+' 이후 다시 확인해 주세요.',retryAt};}
 return{error:fallback};
}
module.exports={REFRESH_MS,createAnalyticsFetcher,failurePayload};
