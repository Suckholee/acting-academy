// Dry-run by default. Production credentials stay in the environment.
const {repository,bucket}=require('../api/_casting');
const db=require('../api/_cms-store');
const {uuid}=require('../src/casting/model.cjs');
async function maintain({apply=false,now=Date.now(),store=db,storage=bucket(),repo=repository(store)}={}){
 const listRows=async filter=>{const all=[];for(let offset=0;;offset+=500){const rows=await store.request('/rest/v1/academy_casting_applications?select=id,profile,expires_at&order=id&limit=500&offset='+offset+filter);all.push(...rows);if(rows.length<500)return all;}};
 const all=await listRows(''),references=new Set(all.map(a=>a.profile.path)),expired=all.filter(a=>Date.parse(a.expires_at)<=now),orphans=[];
 const listFiles=async prefix=>{const all=[];for(let offset=0;;offset+=100){const {data,error}=await storage.list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}});if(error)throw Error('storage_list_failed');all.push(...data);if(data.length<100)return all;}};
 for(const dir of await listFiles('')){if(!uuid(dir.name))continue;for(const file of await listFiles(dir.name)){const path=dir.name+'/'+file.name;if(file.id&&!references.has(path)&&Date.parse(file.created_at)<=now-3*86400000)orphans.push(path);}}
 if(apply){for(const a of expired){const {error}=await storage.remove([a.profile.path]);if(error)throw Error('profile_delete_failed');await repo.removeApplication(a.id);}for(const path of orphans){const {error}=await storage.remove([path]);if(error)throw Error('orphan_delete_failed');}await store.request('/rest/v1/academy_casting_limits?expires_at=lt.'+encodeURIComponent(new Date(now).toISOString()),{method:'DELETE'});}
 return {mode:apply?'applied':'dry-run',expiredApplications:expired.length,orphanedProfiles:orphans.length};
}
if(require.main===module)maintain({apply:process.argv.includes('--apply')}).then(r=>console.log(JSON.stringify(r))).catch(()=>{console.error('자료 정리를 완료하지 못했습니다. 저장소 연결과 접근 권한을 확인해주세요.');process.exitCode=1;});
module.exports={maintain};
