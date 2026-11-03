const store=require('./_cms-store');
function repository(request=store.request){return {
 async list(admin=false,offset=0,limit=50){return request('/rest/v1/academy_editorial?select='+(admin?'*':'id,published,published_at')+(admin?'':'&published=not.is.null')+'&order='+(admin?'updated_at':'published_at')+'.desc,id.desc&limit='+limit+'&offset='+offset);},
 async get(id,admin=false){return (await request('/rest/v1/academy_editorial?id=eq.'+id+'&select='+(admin?'*':'id,published,published_at')+(admin?'':'&published=not.is.null')))?.[0]||null;},
 async create(record){return (await request('/rest/v1/academy_editorial',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(record)}))?.[0];},
 async update(id,revision,changes){return (await request('/rest/v1/academy_editorial?id=eq.'+id+'&revision=eq.'+revision,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({...changes,revision:revision+1,updated_at:new Date().toISOString()})}))?.[0]||null;}
};}
function memoryRepository(){const rows=new Map();return {
 async list(admin=false,offset=0,limit=50){return [...rows.values()].filter(r=>admin||r.published).sort((a,b)=>(admin?b.updated_at:b.published_at).localeCompare(admin?a.updated_at:a.published_at)).slice(offset,offset+limit).map(r=>structuredClone(admin?r:{id:r.id,published:r.published,published_at:r.published_at}));},
 async get(id,admin=false){const r=rows.get(id);return r&&(admin||r.published)?structuredClone(admin?r:{id:r.id,published:r.published,published_at:r.published_at}):null;},
 async create(record){if(rows.has(record.id))throw Error('duplicate');const now=new Date().toISOString(),r={...structuredClone(record),published:null,published_at:null,created_at:now,updated_at:now,revision:0};rows.set(r.id,r);return structuredClone(r);},
 async update(id,revision,changes){const r=rows.get(id);if(!r||r.revision!==revision)return null;Object.assign(r,structuredClone(changes),{revision:revision+1,updated_at:new Date().toISOString()});return structuredClone(r);}
};}
module.exports={repository,memoryRepository};
