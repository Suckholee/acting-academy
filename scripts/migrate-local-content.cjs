// Explicit one-time import of registered public content; never imports demo users/inquiries.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const registry=require('../content/editor-registry.json');
const {valid}=require('../api/site-content');
const root=path.resolve(__dirname,'..'),source=path.join(root,'published-source');
function plan(current,snapshot={pages:{}}){
 const result=structuredClone(current),media=new Map();let count=0;
 for(const module of Object.values(registry.modules))for(const field of module.fields){
  const entries=result[field.storagePage]||(result[field.storagePage]=[]);
  let entry=entries.find(e=>e.key===field.key);if(entry)continue;
  const legacy=entries.find(e=>e.key===field.legacyKey);
  const saved=(snapshot.pages[field.storagePage]||[]).find(e=>e.key===field.key||e.key===field.legacyKey);
  const value=legacy?.value??saved?.value??field.defaultValue;
  entry={key:field.key,type:field.type,value};entries.push(entry);count++;
 }
 for(const entries of Object.values(result))for(const entry of entries){
  if(!['image','video'].includes(entry.type)||!entry.value.startsWith('/assets/'))continue;
  const file=path.resolve(source,'.'+entry.value);
  if(!file.startsWith(source+path.sep)||!fs.existsSync(file))throw Error('Missing registered media: '+entry.value);
  media.set(entry.value,{file,type:entry.type,size:fs.statSync(file).size});
 }
 if(!valid(result))throw Error('Import content failed CMS validation');
 return {pages:result,media,count};
}
async function main(){
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)throw Error('Supabase server configuration required');
 async function request(route,options={}){
  const response=await fetch(base.replace(/\/$/,'')+route,{...options,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(90000)});
  const body=await response.text();if(!response.ok)throw Error('Supabase request failed '+response.status+' '+route.split('?')[0]);
  return body?JSON.parse(body):null;
 }
 const rows=await request('/rest/v1/academy_cms?key=eq.pages&select=value,revision');if(rows.length!==1)throw Error('Expected one existing CMS row');
 const current=rows[0],snapshotArg=process.argv.find(x=>x.startsWith('--snapshot='));
 const snapshot=snapshotArg?JSON.parse(fs.readFileSync(snapshotArg.slice(11),'utf8')):{pages:{}};
 const prepared=plan(current.value,snapshot);
 console.log(JSON.stringify({existingRevision:current.revision,addedFields:prepared.count,pages:Object.keys(prepared.pages).length,media:prepared.media.size,bytes:[...prepared.media.values()].reduce((sum,m)=>sum+m.size,0)}));
 if(!process.argv.includes('--apply')){console.log('Dry run only. Use --apply to upload and save.');return;}
 const out=path.join(root,'output/migration');fs.mkdirSync(out,{recursive:true});
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 fs.writeFileSync(path.join(out,'before-'+stamp+'.json'),JSON.stringify(current,null,2),{mode:0o600});
 const rewritten=new Map(),queue=[...prepared.media];let completed=0;
 async function worker(){while(queue.length){const [local,item]=queue.shift();
  const bytes=fs.readFileSync(item.file),ext=path.extname(item.file).toLowerCase();
  const mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.svg':'image/svg+xml','.mp4':'video/mp4','.webm':'video/webm'}[ext];
  if(!mime)throw Error('Unsupported registered media extension '+ext);
  const bucket=item.type==='video'?'academy-site-videos':'academy-site-media';
  if(bytes.length>(item.type==='video'?104857600:5242880))throw Error('Media exceeds bucket size limit: '+local);
  const name='local-import/'+crypto.createHash('sha256').update(bytes).digest('hex')+ext;
  const existing=await fetch(base+'/storage/v1/object/info/'+bucket+'/'+name,{headers:{apikey:key,Authorization:'Bearer '+key},signal:AbortSignal.timeout(20000)});
  if(!existing.ok){if(existing.status!==400&&existing.status!==404)throw Error('Cannot check media destination '+existing.status);
   await request('/storage/v1/object/'+bucket+'/'+name,{method:'POST',headers:{'Content-Type':mime,'x-upsert':'false'},body:bytes});
  }
  const url=base+'/storage/v1/object/public/'+bucket+'/'+name;
  const check=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(30000)});if(!check.ok)throw Error('Uploaded media verification failed: '+local);
  if(Number(check.headers.get('content-length'))!==bytes.length){const download=await fetch(url,{signal:AbortSignal.timeout(90000)});const verifiedBytes=Buffer.from(await download.arrayBuffer());if(!download.ok||!verifiedBytes.equals(bytes))throw Error('Uploaded media bytes differ: '+local);}
  rewritten.set(local,url);console.log('Verified media '+(++completed)+'/'+prepared.media.size);
 }}
 await Promise.all([worker(),worker(),worker()]);
 for(const entries of Object.values(prepared.pages))for(const entry of entries)if(rewritten.has(entry.value))entry.value=rewritten.get(entry.value);
 if(!valid(prepared.pages))throw Error('Uploaded content failed CMS validation');
 const revision=await request('/rest/v1/rpc/save_academy_content_with_history',{method:'POST',body:JSON.stringify({new_value:prepared.pages,expected_revision:current.revision})});
 if(revision===null)throw Error('Another editor saved during import. No CMS overwrite performed; retry after review.');
 const verified=await request('/rest/v1/academy_cms?key=eq.pages&select=value,revision');
 if(verified[0].revision!==revision||JSON.stringify(Object.keys(verified[0].value).sort())!==JSON.stringify(Object.keys(prepared.pages).sort()))throw Error('Imported revision verification failed');
 for(const [page,entries]of Object.entries(prepared.pages))for(const entry of entries){const remote=verified[0].value[page].find(e=>e.key===entry.key);if(!remote||remote.type!==entry.type||remote.value!==entry.value)throw Error('Field verification failed '+page+' '+entry.key);}
 fs.writeFileSync(path.join(out,'result-'+stamp+'.json'),JSON.stringify({revision,pages:prepared.pages,media:Object.fromEntries(rewritten)},null,2),{mode:0o600});
 console.log('Imported and verified revision '+revision+'; prior revision '+current.revision+' retained in content history.');
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={plan};
