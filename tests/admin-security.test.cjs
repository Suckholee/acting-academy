const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const {PGlite} = require('@electric-sql/pglite');
const auth = require('../api/_admin');
const store = require('../api/_cms-store');
const handler = require('../api/admin-auth');
function response() { return {code:200, headers:{}, setHeader(k,v){this.headers[k]=v;}, status(n){this.code=n;return this;}, json(v){this.data=v;return this;}}; }
const cookie = res => res.headers['Set-Cookie'].split(';')[0];
test('shared database enforces login limits, session revocation and fail-closed admin APIs', async () => {
 const db = new PGlite();
 const beforeRequest = store.request;
 const env = Object.fromEntries(['ADMIN_PASSWORD','ADMIN_SESSION_SECRET','VERCEL'].map(k=>[k,process.env[k]]));
 process.env.ADMIN_PASSWORD = 'test password only';
 process.env.ADMIN_SESSION_SECRET = 'a'.repeat(32);
 delete process.env.VERCEL;
 try {
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
  await db.exec(fs.readFileSync('supabase/migrations/20261014_admin_sessions.sql','utf8'));
  await db.exec('set role anon;');
  for (const query of ['select * from public.academy_admin_sessions','select * from public.academy_admin_login_limits',"select public.consume_admin_login_attempt('"+'a'.repeat(64)+"')"]) await assert.rejects(db.exec(query));
  await db.exec('reset role;set role authenticated;');
  await assert.rejects(db.exec('select * from public.academy_admin_sessions'));
  await assert.rejects(db.exec("select public.consume_admin_login_attempt('"+'a'.repeat(64)+"')"));
  await db.exec('reset role;set role service_role;');
  store.request = async (route, options={}) => {
   const data = options.body ? JSON.parse(options.body) : null;
   if (route === '/rest/v1/rpc/consume_admin_login_attempt') return (await db.query('select public.consume_admin_login_attempt($1) as retry',[data.p_bucket])).rows[0].retry;
   if (route === '/rest/v1/academy_admin_sessions' && options.method === 'POST') { await db.query('insert into public.academy_admin_sessions(id,expires_at) values($1,$2)',[data.id,data.expires_at]); return null; }
   const url = new URL(route,'https://test.invalid');
   if (url.pathname !== '/rest/v1/academy_admin_sessions') throw Error('unexpected route');
   const id = url.searchParams.get('id').slice(3);
   if (options.method === 'DELETE') { await db.query('delete from public.academy_admin_sessions where id=$1',[id]); return null; }
   return (await db.query('select id from public.academy_admin_sessions where id=$1 and expires_at > $2',[id,url.searchParams.get('expires_at').slice(3)])).rows;
  };
  const call = async (method, password, session='', ip='127.0.0.1', headers={}) => { const res=response(); await handler({method, headers:{host:'localhost',cookie:session,...headers}, socket:{remoteAddress:ip}, body:{password}},res); return res; };
  const login = await call('POST',process.env.ADMIN_PASSWORD);
  assert.equal(login.code,200);
  const savedCookie = cookie(login);
  assert.equal(await auth.authenticated({headers:{cookie:savedCookie}}),true);
  // A separate auth instance sees the same DB-backed session, as serverless instances do.
  assert.equal(await auth.createAuth().authenticated({headers:{cookie:savedCookie}}),true);
  const id = (await db.query('select id from public.academy_admin_sessions')).rows[0].id;
  assert.equal(savedCookie.includes(id),false);
  assert.equal((await call('DELETE',null,savedCookie)).code,200);
  assert.equal(await auth.authenticated({headers:{cookie:savedCookie}}),false);
  assert.equal((await call('GET',null,savedCookie)).data.authenticated,false);
  const second = cookie(await call('POST',process.env.ADMIN_PASSWORD));
  process.env.ADMIN_PASSWORD='changed password';
  assert.equal(await auth.authenticated({headers:{cookie:second}}),false);
  process.env.ADMIN_PASSWORD=env.ADMIN_PASSWORD || 'test password only';
  // An old stateless signed token must not become a valid v2 session.
  const oldValue=(Date.now()+3600000)+'.'+'b'.repeat(32);
  const oldSignature=crypto.createHmac('sha256',process.env.ADMIN_SESSION_SECRET).update(oldValue).digest('hex');
  assert.equal(await auth.authenticated({headers:{cookie:'kjt_admin_session='+oldValue+'.'+oldSignature}}),false);
  await db.exec('delete from public.academy_admin_login_limits;');
  for (let i=0;i<5;i++) assert.equal((await call('POST','wrong')).code,401);
  const blocked=await call('POST',process.env.ADMIN_PASSWORD,'','127.0.0.1',{'x-forwarded-for':'203.0.113.100'});
  assert.equal(blocked.code,429);
  assert.ok(Number(blocked.headers['Retry-After'])>0);
  assert.equal(blocked.headers['Set-Cookie'],undefined);
  assert.equal((await call('POST','wrong','','127.0.0.2')).code,401);
  await db.exec("update public.academy_admin_login_limits set expires_at=now()-interval '1 second';");
  assert.equal((await call('POST',process.env.ADMIN_PASSWORD)).code,200);
  await db.exec('delete from public.academy_admin_login_limits;');
  const attempts=await Promise.all(Array.from({length:8},()=>call('POST','wrong')));
  assert.equal(attempts.filter(r=>r.code===401).length,5);
  assert.equal(attempts.filter(r=>r.code===429).length,3);
  await db.exec("update public.academy_admin_login_limits set attempts=100 where bucket='global';");
  assert.equal((await call('POST','wrong','','127.0.0.3')).code,429);
  await db.exec('delete from public.academy_admin_login_limits;');
  process.env.VERCEL='1';
  const secure = await call('POST',process.env.ADMIN_PASSWORD,'','10.0.0.1',{'x-vercel-forwarded-for':'203.0.113.1'});
  assert.equal(secure.code,200);
  assert.ok(secure.headers['Set-Cookie'].includes('; Secure'));
  assert.equal((await call('POST',process.env.ADMIN_PASSWORD)).code,503);
  delete process.env.VERCEL;
  const live=cookie(secure);
  assert.equal((await call('DELETE',null,live,'127.0.0.1',{origin:'https://evil.test'})).code,403);
  assert.equal(await auth.authenticated({headers:{cookie:live}}),true);
  store.request=async()=>{throw Error('offline');};
  assert.equal((await call('POST',process.env.ADMIN_PASSWORD)).code,503);
  assert.equal((await call('GET',null,live)).code,503);
  assert.equal((await call('DELETE',null,live)).code,503);
  for (const name of ['site-content','admin-members','admin-inquiries','admin-upload']) {
   const r=response(); await require('../api/'+name)({method:'PUT',headers:{cookie:live},url:'/api/'+name},r); assert.equal(r.code,503,name);
  }
 } finally {
  store.request=beforeRequest;
  for (const [k,v] of Object.entries(env)) if (v===undefined) delete process.env[k]; else process.env[k]=v;
  await db.close();
 }
});
