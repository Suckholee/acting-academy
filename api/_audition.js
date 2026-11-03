const store=require('./_cms-store');
const {builtins}=require('../src/audition/catalog.cjs');
const KEY='audition-public-scripts';
function repository(request=store.request){return {
 async load(){const r=(await request('/rest/v1/academy_cms?key=eq.'+KEY+'&select=value,revision'))?.[0];return {records:r?.value?.records||[],revision:r?.revision||0,exists:Boolean(r)};},
 async save(records,revision){const value={records};if(revision===0){return (await request('/rest/v1/academy_cms',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({key:KEY,value,revision:1})}))?.[0]||null;}return (await request('/rest/v1/academy_cms?key=eq.'+KEY+'&revision=eq.'+revision,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({value,revision:revision+1,updated_at:new Date().toISOString()})}))?.[0]||null;}
};}
function memoryRepository(){let records=[],revision=0;return {load:async()=>({records:structuredClone(records),revision,exists:revision>0}),save:async(next,expected)=>{if(expected!==revision)return null;records=structuredClone(next);return {value:{records},revision:++revision};}};}
function catalog(records){const overrides=new Map(records.map(r=>[r.id,r]));return [...builtins.map(s=>overrides.get(s.id)||s),...records.filter(r=>!builtins.some(s=>s.id===r.id))];}
module.exports={repository,memoryRepository,catalog};
