const {selection}=require('./model.cjs');
const preferences={auto:'사진에 어울리는 장면',restrained:'담담하고 절제된 연기',expressive:'표현이 크고 변화가 있는 연기',dialogue:'상대와 주고받는 대화'};
function candidates(scripts,includeCardOnly=true){return scripts.filter(s=>{try{return (includeCardOnly||!s.cardOnly)&& s.rights!=='brief-quote'&&s.script.trim().length>=120&&(s.cardOnly&&require('./license.cjs').licenseInfo(s).cardOnly||s.image&&selection(s.target));}catch{return false;}});}
function recommendationPool(scripts,recent=[]){
 const all=candidates(scripts),ids=new Set(all.map(s=>s.id)),history=recent.filter(id=>ids.has(id));
 let seen=new Set();for(const id of history){if(seen.size===all.length)seen.clear();seen.add(id);}
 const unseen=all.filter(s=>!seen.has(s.id));
 // Once all scenes were seen, begin another round without immediately repeating the last one.
 const pool=unseen.length?unseen:all.filter(s=>s.id!==history.at(-1));const lastWork=all.find(s=>s.id===history.at(-1))?.work;const otherWorks=pool.filter(s=>s.work!==lastWork);return {all,available:otherWorks.length?otherWorks:pool,cycleRestarted:!unseen.length&&all.length>1};
}
module.exports={preferences,candidates,recommendationPool};
