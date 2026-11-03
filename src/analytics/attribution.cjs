const {PLATFORMS}=require('./source-model.cjs');
const SOURCES=['naver','google','instagram','facebook','kakao','daum','youtube','other','direct','unknown'];
const KEY='kjt-entry-source-v1',TTL=30*60*1000;
function normalizeSource(value){return SOURCES.includes(value)?value:'unknown';}
function classifyEntry(href,referrer){
  try{
    const url=new URL(href),hint=(url.searchParams.get('utm_source')||url.searchParams.get('source')||'').toLowerCase();
    const aliases={ig:'instagram',fb:'facebook',meta:'facebook',yt:'youtube'};
    if(SOURCES.includes(aliases[hint]||hint)&&!['direct','unknown'].includes(hint))return aliases[hint]||hint;
    if(!referrer)return 'direct';
    const host=new URL(referrer).hostname.toLowerCase();
    const platform=PLATFORMS.find(p=>p.domains.some(domain=>host===domain||host.endsWith('.'+domain)));
    return platform?.key==='internal'?'unknown':platform?.key||'other';
  }catch{return 'unknown';}
}
function entrySource({href,referrer='',storage,now=Date.now()}={}){
  try{
    const saved=JSON.parse(storage?.getItem(KEY)||'null');
    if(saved&&SOURCES.includes(saved.source)&&Number.isFinite(saved.expiresAt)&&saved.expiresAt>now&&saved.expiresAt<=now+TTL){
      try{storage?.setItem(KEY,JSON.stringify({source:saved.source,expiresAt:now+TTL}));}catch{}return saved.source;
    }
  }catch{}
  const source=classifyEntry(href,referrer);
  try{storage?.setItem(KEY,JSON.stringify({source,expiresAt:now+TTL}));}catch{}
  return source;
}
function browserSource(){
  const href=typeof location!=='undefined'?location.href:typeof window!=='undefined'?window.location?.href:'';
  const referrer=typeof document!=='undefined'?document.referrer:'';let storage;
  try{storage=typeof sessionStorage!=='undefined'?sessionStorage:window.sessionStorage;}catch{}
  return entrySource({href,referrer,storage});
}
module.exports={SOURCES,normalizeSource,classifyEntry,entrySource,browserSource};
