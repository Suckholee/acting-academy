const test=require('node:test');
const assert=require('node:assert/strict');
const store=require('../api/_cms-store');
test('Supabase empty 201 inserts succeed while JSON RPC values remain intact',async()=>{
 const oldFetch=global.fetch,oldUrl=process.env.SUPABASE_URL,oldKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
 try{
  global.fetch=async()=>new Response(null,{status:201});
  assert.equal(await store.request('/rest/v1/academy_admin_sessions',{method:'POST',body:'{}'}),null);
  global.fetch=async()=>new Response('0',{status:200});assert.equal(await store.request('/rest/v1/rpc/consume_admin_login_attempt'),0);
  global.fetch=async()=>new Response('[{"revision":2}]',{status:200});assert.deepEqual(await store.request('/rest/v1/academy_cms'),[{revision:2}]);
  global.fetch=async()=>new Response(null,{status:204});assert.equal(await store.request('/rest/v1/academy_admin_sessions',{method:'DELETE'}),null);
 }finally{global.fetch=oldFetch;if(oldUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=oldKey;}
});
