const fs=require('node:fs'),path=require('node:path');const {parseHTML}=require('linkedom');const {scan}=require('../src/published-editor/scan.cjs');const {sharedKey}=require('../src/published-editor/model.cjs');const {primaryPages,detailPages}=require('../src/published-editor/page-catalog.cjs');
const {catalog}=require('../src/published-editor/collection-model.cjs');
const roleClasses=['notice-card','review-card','review-home-card','profile-hero','profile-section','course','course-page-hero','curriculum','course-overview','course-notes','video-orbit-card','video-slot-section','faculty-card','mentor-card','student-card','facility-card','tuition-info','partners-simple-item','partners-simple-category','hero','intro'];
function buildRegistry(source,curricula){
 const modules={};
 for(const [page]of [...primaryPages,...detailPages.flatMap(g=>g.pages)]){
  const {document}=parseHTML(fs.readFileSync(path.join(source,(page==='/'?'index':page.slice(1))+'.html'),'utf8'));const {groups}=scan(document,page,curricula);const counts={};
  for(const group of groups){
   const e=group.element;const role=e.id||roleClasses.find(c=>e.classList.contains(c))||(e.matches('.faq-list details')?'faq-item':e.classList[0]||e.tagName.toLowerCase());
   const entity=e.getAttribute('data-category')||e.querySelector('a[href^="/trainers/"],a[href^="/courses/"],a[href^="/works/"]')?.getAttribute('href')?.split('/').pop();
   const token=[role,entity].filter(Boolean).join('.').replace(/[^a-z0-9.-]/g,'-');const sequence=counts[token]=(counts[token]||0)+1;
   const id=(page==='/'?'home':page.slice(1).replaceAll('/','.'))+'.'+token+'.'+sequence;const slots={};
   const fields=group.fields.map(f=>{const tag=f.node.tagName?.toLowerCase()||'text';const base=f.type!=='text'?f.type:f.label==='강사 이름'?'name':f.label==='강사 직함'?'role':f.node.classList.contains('review-headline')?'headline':f.node.classList.contains('review-body')?'body':tag;const n=slots[base]=(slots[base]||0)+1;const fieldId=base+'-'+n;return {id:fieldId,key:f.sharedId||sharedKey(id,fieldId),legacyKey:f.key,storagePage:f.sharedId?'/shared':page,type:f.type,label:f.label,defaultValue:f.value,maxLength:f.type==='text'?12000:2048};});
   modules[id]={id,legacyId:group.legacyId,page,title:group.title,kind:e.matches('.review-card,.review-home-card')?'review':'content',collectionKind:catalog.find(d=>d.page===page&&e.matches(d.selector))?.kind||null,fields};
  }
 }
 return {version:1,modules};
}
module.exports={buildRegistry};
