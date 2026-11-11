const facets={
 situation:{label:'상황',values:['일상','만남','재회','이별','갈등','협상','위기','도전','직장','여행','회상','선택']},
 emotion:{label:'감정',values:['기쁨','기대','호기심','경이','담담함','걱정','불안','공포','경계','의심','당혹','짜증','분노','조급함','슬픔','외로움','그리움','실망','후회','결의']},
 relationship:{label:'관계',values:['가족','연인','친구','동료','상하관계','낯선사람','대립관계','자신']},
 objective:{label:'연기 목적',values:['설득','거절','사과','위로','고백','추궁','보호','부탁','경고','통보','명령','제안','안내','환대','선언','질문','격려','수습','반박','붙잡기','보고']}
};
const aliases={헤어짐:'이별',헤어지다:'이별',작별:'이별',이별하다:'이별',회사:'직장',업무:'직장',일터:'직장',부모님:'가족',부모:'가족',엄마:'가족',아빠:'가족',부부:'연인',애인:'연인',우정:'친구',직장동료:'동료',상사:'상하관계',부하:'상하관계',싸움:'갈등',다툼:'갈등',언쟁:'갈등',화남:'분노',슬픈:'슬픔',외로운:'외로움',미안함:'사과',용서:'사과',응원:'격려',달래기:'위로',요청:'부탁',납득:'설득',재난:'위기',여정:'여행',옛날:'회상',혼자:'자신',솔로:'독백'};
function normalized(value){let s=String(value||'').normalize('NFKC').toLowerCase();for(const k of Object.keys(aliases).sort((a,b)=>b.length-a.length))s=s.replaceAll(k,aliases[k]);return s;}
function searchMatches(scene,query){const tokens=normalized(query).trim().split(/\s+/).filter(Boolean),text=normalized([scene.work,scene.title,scene.context,scene.author,...(scene.tags||[]),...Object.values(scene.sceneTags||{}).flat(),...(scene.keywords||[]),...(scene.turns||[]).map(t=>t.label)].join(' '));return tokens.every(t=>text.includes(t));}
function tagMetadata(v){
 const out={};
 for(const key of ['tags','keywords'])if(v[key]!==undefined){if(!Array.isArray(v[key])||v[key].length>24||v[key].some(t=>typeof t!=='string'||!t.trim()||t.length>60))throw Error('tags');out[key]=[...new Set(v[key].map(t=>t.trim()))];}
 if(v.sceneTags!==undefined){if(!v.sceneTags||typeof v.sceneTags!=='object'||Array.isArray(v.sceneTags)||Object.keys(v.sceneTags).some(k=>!Object.hasOwn(facets,k)))throw Error('tags');out.sceneTags={};for(const [k,f]of Object.entries(facets)){const values=v.sceneTags[k]||[];if(!Array.isArray(values)||values.length>4||values.some(t=>!f.values.includes(t)))throw Error('tags');out.sceneTags[k]=[...new Set(values)];}out.tags=[...new Set([...Object.values(out.sceneTags).flat(),...(out.tags||[])])];}
 for(const key of ['sourceLocator','visualScene'])if(v[key]!==undefined){if(typeof v[key]!=='string'||v[key].length>1500)throw Error('tags');out[key]=v[key];}
 return out;
}
function parseFilters(value={}){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!Object.hasOwn(facets,k)&&k!=='query'))throw Error('filters');const result={};for(const [key,f]of Object.entries(facets)){const v=value[key]??'';if(typeof v!=='string'||(v&&!f.values.includes(v)))throw Error('filters');if(v)result[key]=v;}if(value.query!==undefined&&(typeof value.query!=='string'||value.query.length>120))throw Error('filters');if(value.query?.trim())result.query=value.query.trim();return result;}
function filterScenes(scenes,filters={}){const f=parseFilters(filters);return scenes.filter(s=>Object.entries(f).every(([k,v])=>k==='query'?searchMatches(s,v):(s.sceneTags?.[k]||[]).includes(v)));}
module.exports={facets,aliases,searchMatches,tagMetadata,parseFilters,filterScenes};
