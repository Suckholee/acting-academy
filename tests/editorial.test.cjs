const {test}=require('node:test'),assert=require('node:assert/strict');
const {createHandler,demoDraft}=require('../api/admin-editorial');
const publicHandler=require('../api/journal').createHandler;
const {memoryRepository,repository}=require('../api/_editorial');
const {content}=require('../src/editorial/model.cjs');
const draft=()=>content({...demoDraft('셀프테이프'),author:'아카데미',course:'',cards:demoDraft('셀프테이프').cards.map(c=>({...c,image:'/assets/course-camera-actors-ai-20261016.jpg',imageAlt:'대본을 읽는 성인 배우',imagePrompt:'대본을 읽는 가상의 성인 배우'}))});
const allow=async()=>true;
function response(){return {code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(data){this.data=data;return this;},end(data){this.html=data;return this;}};}
async function call(handler,body,method='PUT',url='/api/admin-editorial'){const res=response();await handler({url,method,headers:{host:'example.com',origin:'https://example.com'},body},res);return res;}
const input=(record,action='save',changes={})=>({action,id:record?.id,revision:record?.revision,draft:draft(),keywords:'셀프테이프',reviewNotes:['사실 확인'],...changes});
test('generation requires administrator authorization before any AI or storage access',async()=>{
 let called=false;const handler=createHandler({repo:{list(){called=true;}},fetcher(){called=true;},authorize:async(req,res)=>{res.status(401).json({error:'login'});return false;}});
 const r=await call(handler,{action:'generate',keywords:'오디션',consent:true},'POST');assert.equal(r.code,401);assert.equal(called,false);
});
test('draft generation does not publish or save; explicit consent is required',async()=>{
 const repo=memoryRepository(),handler=createHandler({repo,demo:true,authorize:allow});
 assert.equal((await call(handler,{action:'generate',keywords:'오디션'},'POST')).code,400);
 const r=await call(handler,{action:'generate',keywords:'오디션',consent:true},'POST');assert.equal(r.code,200);assert.equal(r.data.draft.cards.length,5);assert.equal((await repo.list(true)).length,0);
});
test('saved drafts and internal notes are unavailable through public listing and direct URL',async()=>{
 const repo=memoryRepository(),admin=createHandler({repo,authorize:allow});const save=await call(admin,input());assert.equal(save.code,201);const id=save.data.record.id;
 assert.deepEqual(await repo.list(false),[]);const page=await call(publicHandler({repo}),null,'GET','/journal/'+id);assert.equal(page.code,404);assert.doesNotMatch(page.html,/셀프테이프|사실 확인/);
});
test('publish requires review, later draft saves preserve the live snapshot, unpublish removes public access',async()=>{
 const repo=memoryRepository(),admin=createHandler({repo,authorize:allow});let record=(await call(admin,input())).data.record;
 assert.equal((await call(admin,input(record,'publish'))).code,400);
 record=(await call(admin,input(record,'publish',{reviewed:true}))).data.record;assert.equal((await repo.get(record.id)).published.title,record.draft.title);
 record=(await call(admin,input(record,'save',{draft:{...draft(),title:'まだ非公開の変更'}}))).data.record;
 assert.notEqual((await repo.get(record.id)).published.title,record.draft.title);
 const list=await call(publicHandler({repo}),null,'GET','/api/journal?format=json');assert.equal(list.data.articles.length,1);assert.doesNotMatch(JSON.stringify(list.data),/review_notes|keywords|まだ非公開/);
 record=(await call(admin,input(record,'unpublish'))).data.record;assert.equal(await repo.get(record.id),null);assert.ok(await repo.get(record.id,true));
});
test('stale revisions cannot overwrite a newer draft or publication',async()=>{
 const repo=memoryRepository(),admin=createHandler({repo,authorize:allow}),r=(await call(admin,input())).data.record;
 assert.equal((await call(admin,input(r))).code,200);assert.equal((await call(admin,input(r,'publish',{reviewed:true}))).code,409);assert.equal(await repo.get(r.id),null);
});
test('published text is escaped and no script or HTML in a draft is executed',async()=>{
 const repo=memoryRepository(),admin=createHandler({repo,authorize:allow});const unsafe={...draft(),title:'<script>alert(1)</script>',body:'<img src=x onerror=alert(1)>\n\n일반 본문을 충분히 작성한 테스트입니다.'};let record=(await call(admin,input(null,'save',{draft:unsafe}))).data.record;
 record=(await call(admin,input(record,'publish',{draft:unsafe,reviewed:true}))).data.record;
 const page=await call(publicHandler({repo}),null,'GET','/journal/'+record.id);assert.equal(page.code,200);assert.match(page.html,/&lt;script&gt;/);assert.doesNotMatch(page.html,/<script>|<img src=x/);
});
test('public repository queries never select private draft columns',async()=>{
 const paths=[],repo=repository(async path=>{paths.push(path);return [];});await repo.list();await repo.get('00000000-0000-4000-8000-000000000000');for(const path of paths){assert.match(path,/select=id,published,published_at/);assert.match(path,/published=not.is.null/);assert.doesNotMatch(path,/select=\*/);}
});
test('live generation sends structured output and rejects incomplete responses without saving',async()=>{
 const names=['OPENAI_API_KEY','OPENAI_MODEL','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','ADMIN_SESSION_SECRET'],old=Object.fromEntries(names.map(n=>[n,process.env[n]]));names.forEach(n=>process.env[n]='test');
 try{let payload;const repo=memoryRepository(),handler=createHandler({repo,authorize:allow,limit:async()=>0,fetcher:async(url,options)=>{payload=JSON.parse(options.body);return {ok:true,json:async()=>({status:'incomplete'})};}});const r=await call(handler,{action:'generate',keywords:'오디션',consent:true},'POST');assert.equal(r.code,503);assert.equal(payload.store,false);assert.equal(payload.text.format.strict,true);assert.equal(payload.text.format.type,'json_schema');assert.equal((await repo.list(true)).length,0);}finally{for(const n of names)if(old[n]===undefined)delete process.env[n];else process.env[n]=old[n];}
});
test('editorial table rejects anonymous access while the service role can persist drafts',async()=>{
 const {PGlite}=require('@electric-sql/pglite'),fs=require('node:fs');const db=new PGlite();try{await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');await db.exec(fs.readFileSync('supabase/migrations/20261101_editorial.sql','utf8'));await db.exec('set role anon;');await assert.rejects(()=>db.query('select * from public.academy_editorial'));await db.exec('reset role; set role service_role;');await db.query('insert into public.academy_editorial(id,draft) values ($1,$2)',['00000000-0000-4000-8000-000000000000',JSON.stringify(draft())]);assert.equal((await db.query('select count(*) from public.academy_editorial')).rows[0].count,1);}finally{await db.close();}
});

test('legacy text-only drafts can be saved, but every published card needs an image and alt description',async()=>{
 const repo=memoryRepository(),admin=createHandler({repo,authorize:allow}),legacy={...draft(),cards:draft().cards.map(({title,body})=>({title,body}))};
 const r=await call(admin,input(null,'save',{draft:legacy}));assert.equal(r.code,201);assert.equal(r.data.record.draft.cards[0].image,'');
 assert.equal((await call(admin,input(r.data.record,'publish',{draft:legacy,reviewed:true}))).code,400);
 const noAlt=draft();noAlt.cards[2].imageAlt='';assert.equal((await call(admin,input(r.data.record,'publish',{draft:noAlt,reviewed:true}))).code,400);
});
test('image metadata survives storage, publication and public rendering; unsafe image URLs are rejected',async()=>{
 const {imageURL}=require('../src/editorial/model.cjs');for(const value of ['javascript:alert(1)','data:image/svg+xml;base64,abc','https://example.com/x.jpg','/assets/../secret.jpg'])assert.throws(()=>imageURL(value));
 const repo=memoryRepository(),admin=createHandler({repo,authorize:allow});let record=(await call(admin,input())).data.record;
 assert.equal(record.draft.cards[0].imagePrompt,draft().cards[0].imagePrompt);record=(await call(admin,input(record,'publish',{reviewed:true}))).data.record;
 const page=await call(publicHandler({repo}),null,'GET','/journal/'+record.id);assert.equal(page.code,200);assert.equal((page.html.match(/class="card-photo"/g)||[]).length,5);assert.match(page.html,/alt="대본을 읽는 성인 배우"/);
});

test('published questions, answers and sources are server-rendered and JSON-LD matches the visible public snapshot',async()=>{
 const {parseHTML}=require('linkedom'),repo=memoryRepository(),admin=createHandler({repo,authorize:allow});
 const article={...draft(),question:'렌즈를 보나요? </script><script>alert(1)</script>',answer:'상대와 장면의 요구사항에 따라 판단하세요.',sources:[{title:'공식 촬영 안내',url:'https://example.com/guide'}]};
 let record=(await call(admin,input(null,'save',{draft:article}))).data.record;record=(await call(admin,input(record,'publish',{draft:article,reviewed:true}))).data.record;
 const modified=record.published.modifiedAt;assert.ok(modified);record=(await call(admin,input(record,'save',{draft:{...article,answer:'공개하지 않은 수정 답변'}}))).data.record;
 const page=await call(publicHandler({repo}),null,'GET','/journal/'+record.id);assert.equal(page.code,200);assert.doesNotMatch(page.html,/<script>alert\(1\)<\/script>/);assert.doesNotMatch(page.html,/공개하지 않은 수정 답변/);
 const {document}=parseHTML(page.html),script=document.querySelector('script[type="application/ld+json"]'),g=JSON.parse(script.textContent)['@graph'],a=g.find(n=>n['@type']==='Article'),faq=g.find(n=>n['@type']==='FAQPage');
 assert.equal(document.querySelector('#answer-question').textContent,article.question);assert.equal(document.querySelector('.journal-direct-answer p:last-child').textContent,article.answer);assert.equal(a.dateModified,modified);assert.equal(a.datePublished,record.published_at);assert.deepEqual(a.citation,['https://example.com/guide']);assert.equal(faq.mainEntity.length,article.faq.length);
 for(const q of faq.mainEntity){assert.ok(document.querySelector('.journal-related').textContent.includes(q.name));assert.ok(document.querySelector('.journal-related').textContent.includes(q.acceptedAnswer.text));}
 for(const link of document.querySelectorAll('.journal-toc a'))assert.ok(document.querySelector(link.getAttribute('href')));
 assert.equal(document.querySelectorAll('.journal-answer-section h2').length,article.sections.length);assert.equal(document.querySelectorAll('script').length,1);
});
test('legacy drafts remain editable but publishing needs a primary answer and supporting questions',async()=>{
 const repo=memoryRepository(),admin=createHandler({repo,authorize:allow}),legacy=draft();delete legacy.question;delete legacy.answer;delete legacy.sections;delete legacy.faq;
 const saved=await call(admin,input(null,'save',{draft:legacy}));assert.equal(saved.code,201);assert.equal((await call(admin,input(saved.data.record,'publish',{draft:legacy,reviewed:true}))).code,400);
 assert.throws(()=>content({...draft(),sources:[{title:'x',url:'javascript:alert(1)'}]}));assert.throws(()=>content({...draft(),sources:[{title:'x',url:'https://name:password@example.com/'}]}));assert.throws(()=>content({...draft(),sections:[{question:'질문',answer:''}]}));
});
test('article sitemap exposes only published URLs and public modification times',async()=>{
 const repo=memoryRepository(),admin=createHandler({repo,authorize:allow}),privateRecord=(await call(admin,input())).data.record;let live=(await call(admin,input())).data.record;
 live=(await call(admin,input(live,'publish',{reviewed:true}))).data.record;const lastmod=live.published.modifiedAt;live=(await call(admin,input(live,'save',{draft:{...draft(),title:'비공개 변경 제목'}}))).data.record;
 let map=await call(publicHandler({repo}),null,'GET','/api/journal?sitemap=1');assert.match(map.headers['Content-Type'],/xml/);assert.ok(map.html.includes(live.id));assert.ok(map.html.includes(lastmod));assert.ok(!map.html.includes(privateRecord.id));assert.ok(!map.html.includes('비공개 변경 제목'));
 await call(admin,input(live,'unpublish'));map=await call(publicHandler({repo}),null,'GET','/api/journal?sitemap=1');assert.ok(!map.html.includes(live.id));
});
test('AI generation receives source references but cannot invent additional source links',async()=>{
 const names=['OPENAI_API_KEY','OPENAI_MODEL','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','ADMIN_SESSION_SECRET'],old=Object.fromEntries(names.map(n=>[n,process.env[n]]));names.forEach(n=>process.env[n]='test');
 try{let payload;const refs=[{title:'공식 자료',url:'https://example.com/official'}],generated={...demoDraft('첫 오디션'),sources:[{title:'invented',url:'https://example.com/invented'}]},repo=memoryRepository();
 const admin=createHandler({repo,authorize:allow,limit:async()=>0,fetcher:async(url,options)=>{payload=JSON.parse(options.body);return {ok:true,json:async()=>({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(generated)}]}]})};}});
 const r=await call(admin,{action:'generate',keywords:'첫 오디션',sources:refs,consent:true},'POST');assert.equal(r.code,200);assert.deepEqual(r.data.draft.sources,refs);assert.deepEqual(JSON.parse(payload.input).sources,refs);assert.ok(payload.text.format.schema.required.includes('question'));assert.ok(payload.text.format.schema.required.includes('faq'));assert.equal((await repo.list(true)).length,0);
 }finally{for(const n of names)if(old[n]===undefined)delete process.env[n];else process.env[n]=old[n];}
});

test('journal sharing has a fixed adult cover while article sharing uses its own image',()=>{
 const {shell,articleDocument}=require('../src/editorial/article.cjs'),{parseHTML}=require('linkedom');
 const listing=parseHTML(shell('연기 노트','','')).document;
 assert.equal(listing.querySelector('[property="og:image"]').content,'https://www.kactstar.com/assets/journal/acting-note-cover-20261103.png');
 assert.equal(listing.querySelector('[property="og:type"]').content,'website');
 const article=parseHTML(articleDocument({...draft(),id:'00000000-0000-4000-8000-000000000000'})).document;
 assert.equal(article.querySelector('[property="og:image"]').content,'https://www.kactstar.com'+draft().cards[0].image);
});
test('general audition notes precede senior notes without hiding either audience',async()=>{
 const rows=['시니어 첫 오디션','연락이 없는 오디션','의상 준비'].map((title,i)=>({id:String(i),published:{...draft(),title},published_at:'2026-11-03'}));
 const handler=publicHandler({repo:{list:async()=>rows}});
 const json=await call(handler,null,'GET','/journal?format=json');
 assert.deepEqual(json.data.articles.map(a=>a.title),['연락이 없는 오디션','의상 준비','시니어 첫 오디션']);
 const html=await call(handler,null,'GET','/journal');
 assert.ok(html.html.indexOf('연락이 없는 오디션')<html.html.indexOf('시니어 첫 오디션'));
});
