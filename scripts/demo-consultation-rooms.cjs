// Only used by the loopback demo server. Real customer data belongs in the protected database.
const fs=require('node:fs/promises'),path=require('node:path');
function createStore(file=path.resolve(__dirname,'../output/consultation-demo/rooms.json')){
 let serial=Promise.resolve();
 async function read(){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT')return [];throw error;}}
 async function mutate(fn){const operation=serial.catch(()=>{}).then(async()=>{const records=await read();const value=fn(records);if(value){await fs.mkdir(path.dirname(file),{recursive:true});const temp=file+'.tmp';await fs.writeFile(temp,JSON.stringify(records,null,2),{mode:0o600});await fs.rename(temp,file);}return value;});serial=operation;return operation;}
 return {demo:true,async list(offset){await serial.catch(()=>{});return(await read()).sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(offset,offset+50).map(({annotations,journal,special,...summary})=>summary);},async get(id){await serial.catch(()=>{});return(await read()).find(r=>r.id===id);},async create(record){return mutate(records=>{records.push(record);return record;});},async update(id,revision,fields){return mutate(records=>{const record=records.find(r=>r.id===id&&r.revision===revision);if(!record)return;Object.assign(record,fields,{revision:revision+1,updated_at:new Date().toISOString()});return record;});}};
}
module.exports={createStore};
