const {test}=require('node:test');const assert=require('node:assert/strict');const {Readable}=require('node:stream');
const {videoSource,validVideo,validVideoFile}=require('../src/published-editor/video-model.cjs');const content=require('../api/site-content');const auth=require('../api/_admin');const upload=require('../api/admin-video-upload');
const res=()=>({code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(v){this.data=v;return this;},end(v){this.bytes=v;}});
test('video sources only accept files and normalized trusted player URLs',()=>{
 for(const value of ['', '/assets/movie.mp4','https://media.example/test.webm?token=123','https://youtu.be/abcdefghijk','https://www.youtube.com/watch?v=abcdefghijk','https://www.youtube.com/shorts/abcdefghijk','https://vimeo.com/123456'])assert.equal(validVideo(value),true,value);
 assert.equal(videoSource('https://youtu.be/abcdefghijk').src,'https://www.youtube-nocookie.com/embed/abcdefghijk');
 for(const value of ['javascript:alert(1)','data:video/mp4,xx','//evil.test/movie.mp4','movie.mp4','https://user:password@evil.test/video.mp4','https://youtube.com.evil.test/watch?v=abcdefghijk','https://example.com/page','https://youtube.com/watch?v=bad','/assets/movie.mp4\\x'])assert.equal(validVideo(value),false,value);
 assert.equal(content.valid({'/shared':[{key:'cms-1',type:'video',value:'https://youtu.be/abcdefghijk'}]}),true);
 assert.equal(content.valid({'/shared':[{key:'cms-1',type:'video',value:'javascript:alert(1)'}]}),false);
 assert.equal(validVideoFile(null),false);assert.equal(validVideoFile([]),false);assert.equal(validVideoFile({name:'test.mp4',type:'video/mp4',size:100*1024*1024}),true);assert.equal(validVideoFile({name:'test.mp4',type:'video/mp4',size:100*1024*1024+1}),false);assert.equal(validVideoFile({name:'test.html',type:'video/mp4',size:100}),false);
});
test('signed video uploads are administrator-only and issue a fresh fixed destination',async()=>{
 const old=auth.requireAdmin;let signed;
 const client={from(bucket){assert.equal(bucket,'academy-site-videos');return {async createSignedUploadUrl(path,opts){signed=path;assert.deepEqual(opts,{upsert:false});return {data:{signedUrl:'https://storage.example/signed'},error:null};},getPublicUrl(path){assert.equal(path,signed);return {data:{publicUrl:'https://storage.example/'+path}};}};}};
 const handler=upload.createHandler({client});
 try{auth.requireAdmin=async(req,res)=>{res.status(401).json({error:'auth'});return false;};let response=res();await handler({method:'POST',body:{}},response);assert.equal(response.code,401);
 auth.requireAdmin=async()=>true;response=res();await handler({method:'POST',body:{name:'x.html',type:'text/html',size:10}},response);assert.equal(response.code,400);
 response=res();await handler({method:'POST',body:{name:'movie.mp4',type:'video/mp4',size:1000}},response);assert.equal(response.code,200);assert.match(signed,/^[a-f0-9-]{36}\.mp4$/);assert.equal(response.data.signedUrl,'https://storage.example/signed');assert.ok(!JSON.stringify(response.data).includes('service_role'));
 }finally{auth.requireAdmin=old;}
});
test('local video upload checks file bytes and supports byte-range playback',async()=>{
 const old=auth.requireAdmin;auth.requireAdmin=async()=>true;
 try{const demo=require('../scripts/demo-video.cjs').createDemo();let response=res();const bad=Readable.from([Buffer.from('not a video')]);bad.method='POST';bad.headers={'content-type':'video/mp4'};await demo.upload(bad,response);assert.equal(response.code,400);
 const bytes=Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftypisom'),Buffer.alloc(100)]);const req=Readable.from([bytes]);req.method='POST';req.headers={'content-type':'video/mp4'};response=res();await demo.upload(req,response);assert.equal(response.data.demo,true);const url=response.data.url;
 response=res();assert.equal(demo.serve({headers:{range:'bytes=0-11'}},response,url),true);assert.equal(response.statusCode,206);assert.equal(response.bytes.length,12);assert.equal(response.headers['Content-Type'],'video/mp4');
 response=res();demo.serve({headers:{range:'bytes=9999-'}},response,url);assert.equal(response.statusCode,416);
 }finally{auth.requireAdmin=old;}
});
