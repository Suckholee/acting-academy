import {createClient} from '@supabase/supabase-js';
export function getMemberClient(config){
 if(!globalThis.__kjtMemberClient)globalThis.__kjtMemberClient=createClient(config.url,config.key,{auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
 return globalThis.__kjtMemberClient;
}
export async function memberSession(){
 if(!globalThis.__kjtMemberConfig)globalThis.__kjtMemberConfig=fetch('/api/member-config',{credentials:'same-origin'}).then(r=>{if(!r.ok)throw Error('회원 연결 상태를 확인해주세요.');return r.json();}).catch(e=>{delete globalThis.__kjtMemberConfig;throw e;});
 const config=await globalThis.__kjtMemberConfig;
 if(!config.ready)throw Error('회원 연결 상태를 확인해주세요.');
 const client=getMemberClient(config),{data,error}=await client.auth.getSession();if(error)throw error;
 return {client,session:data.session};
}
export async function memberAccessToken(){return (await memberSession()).session?.access_token||null;}
export async function memberAccount(){
 const token=await memberAccessToken();if(!token)return null;
 const response=await fetch('/api/member-account',{headers:{Authorization:'Bearer '+token},credentials:'same-origin'});
 if(response.status===401)return null;
 if(!response.ok)throw Error('회원 정보를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.');
 return response.json();
}
