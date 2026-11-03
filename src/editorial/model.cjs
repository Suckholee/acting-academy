const courses=require('../../content/courses.json');
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function clean(value,max,min=0){if(typeof value!=='string'||value.trim().length<min||value.length>max)throw Error('validation');return value.trim();}
function imageURL(value){
 const url=clean(value||'',1000);if(!url)return '';
 if(/^\/assets\/[a-zA-Z0-9_./-]+\.(?:jpe?g|png|webp)$/.test(url)&&!url.includes('..'))return url;
 try{const parsed=new URL(url);if(parsed.protocol==='https:'&&!parsed.username&&!parsed.password&&!parsed.port&&!parsed.search&&!parsed.hash&&/^[a-z0-9]+\.supabase\.co$/.test(parsed.hostname)&&/^\/storage\/v1\/object\/public\/academy-site-media\/[a-f0-9-]+\.(?:jpe?g|png|webp)$/.test(parsed.pathname))return url;}catch{}
 throw Error('validation');
}

function pairs(value,max=8){if(value===undefined)return [];if(!Array.isArray(value)||value.length>max)throw Error('validation');return value.map(q=>({question:clean(q.question,180,1),answer:clean(q.answer,2200,1)}));}
function sources(value){if(value===undefined)return [];if(!Array.isArray(value)||value.length>8)throw Error('validation');return value.map(s=>{const title=clean(s.title,150,1),url=clean(s.url,1500,1),parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw Error('validation');return {title,url};});}
function content(value){
 if(!value||!Array.isArray(value.cards)||value.cards.length<3||value.cards.length>8)throw Error('validation');
 const course=clean(value.course,60);if(course&&!courses.some(c=>c.id===course))throw Error('validation');
 return {title:clean(value.title,100,1),summary:clean(value.summary,300,1),body:clean(value.body,14000,20),author:clean(value.author,60,1),course,question:clean(value.question||'',180),answer:clean(value.answer||'',600),sections:pairs(value.sections,6),faq:pairs(value.faq,5),sources:sources(value.sources),cards:value.cards.map(c=>({title:clean(c.title,60,1),body:clean(c.body,240,1),image:imageURL(c.image),imageAlt:clean(c.imageAlt||'',300),imagePrompt:clean(c.imagePrompt||'',1200)}))};
}
const schema={type:'object',additionalProperties:false,required:['title','summary','body','question','answer','sections','faq','cards','reviewNotes'],properties:{title:{type:'string'},summary:{type:'string'},body:{type:'string'},question:{type:'string'},answer:{type:'string'},sections:{type:'array',items:{type:'object',additionalProperties:false,required:['question','answer'],properties:{question:{type:'string'},answer:{type:'string'}}}},faq:{type:'array',items:{type:'object',additionalProperties:false,required:['question','answer'],properties:{question:{type:'string'},answer:{type:'string'}}}},cards:{type:'array',items:{type:'object',additionalProperties:false,required:['title','body','imagePrompt','imageAlt'],properties:{title:{type:'string'},body:{type:'string'},imagePrompt:{type:'string'},imageAlt:{type:'string'}}}},reviewNotes:{type:'array',items:{type:'string'}}}};
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
module.exports={UUID,clean,content,schema,escape,imageURL,sources};
