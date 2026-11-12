// Retry only temporary failures. The same receipt/body is retained for idempotent submission.
const temporary=e=>e.status===0||[408,425,429,500,502,503,504].includes(e.status)||['TypeError','TimeoutError','AbortError'].includes(e.name);
async function retry(operation,{onRetry=()=>{},sleep=ms=>new Promise(r=>setTimeout(r,ms)),random=Math.random,now=Date.now,maxAttempts=8,maxElapsedMs=120000}={}){
 const start=now();
 for(let attempt=0;;attempt++)try{return await operation();}catch(e){
  const after=Number(e.retryAfter)||0;
  const delay=Math.max(after*1000,Math.round(Math.min(20000,1000*2**attempt)*(.75+random()*.5)));
  if(!temporary(e)||attempt+1>=maxAttempts||after>30||now()-start+delay>=maxElapsedMs)throw e;
  onRetry({attempt:attempt+1,delay,status:e.status});await sleep(delay);
 }
}
async function request(body,{onRetry,getToken,fetcher=(...args)=>fetch(...args)}={}){
 const encoded=JSON.stringify(body);
 return retry(async()=>{
  const token=getToken?await getToken():null;
  const response=await fetcher('/api/casting',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:encoded,signal:AbortSignal.timeout(30000)});
  let result;try{result=await response.json();}catch{throw Object.assign(Error('응답을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.'),{status:response.status>=500?response.status:502});}
  if(!response.ok)throw Object.assign(Error(result.error||'요청을 처리하지 못했습니다.'),{status:response.status,retryAfter:response.headers.get('Retry-After')});return result;
 },{onRetry});
}
async function uploadWithRetry(operation,options){let uncertain=false;return retry(async()=>{try{return await operation();}catch(e){
 // A lost upload response may leave the object stored. Final submission still verifies its size/type.
 if(uncertain&&e.duplicate)return;
 if(e.status===0||e.status>=500||['TypeError','TimeoutError','AbortError'].includes(e.name))uncertain=true;
 throw e;
} },options);}
module.exports={retry,request,uploadWithRetry};
