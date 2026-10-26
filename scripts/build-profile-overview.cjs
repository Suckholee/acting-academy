const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const list=rows=>`<ul class="profile-credit-list">${rows.map(name=>`<li><strong>${esc(name)}</strong></li>`).join('')}</ul>`;
function credits(rows){
 const years=[...new Set(rows.map(r=>String(r[0])))].sort((a,b)=>parseInt(b)-parseInt(a));
 return years.map(year=>`<div class="hyung-min-year-group"><h3>${esc(year)}</h3>${list(rows.filter(r=>String(r[0])===year).map(r=>r[1]))}</div>`).join('');
}
for(const slug of ['kim-jung-tae','pyeon-bo-seung','kim-hyung-min','im-do-yoon']){
 const file=path.join(root,'dist/trainers',slug+'.html');
 let html=fs.readFileSync(file,'utf8');
 const data=JSON.parse(fs.readFileSync(path.join(root,'content',slug+'.json'),'utf8'));
 const dated=['pyeon-bo-seung','kim-hyung-min'].includes(slug);
 const categories=[['film','영화',dated?credits(data.films.map(r=>[r[0],r[1]])):list(data.films.map(r=>slug==='im-do-yoon'?r[1]:r[0]))],['drama','드라마',dated?credits(data.dramas.map(r=>[r[0],r[2]])):list(data.dramas.map(r=>r[0]))]];
 if(data.stage?.length)categories.push(['stage','뮤지컬·연극',credits(data.stage)]);
 if(data.commercials?.length)categories.push(['commercial','광고',list(data.commercials)]);
 if(data.modeling?.length)categories.push(['model','모델',list(data.modeling)]);
 const tabs=categories.map(([id,label],i)=>`<button type="button" role="tab" id="work-tab-${id}" aria-controls="work-panel-${id}" aria-selected="${i===0}" tabindex="${i===0?0:-1}">${label}</button>`).join('');
 const panels=categories.map(([id,label,content],i)=>`<div class="work-panel" role="tabpanel" id="work-panel-${id}" aria-labelledby="work-tab-${id}" tabindex="0"${i?' hidden':''}><div class="work-panel-viewport"><div class="work-panel-content">${content}</div></div><button type="button" class="work-more" hidden>더보기 ↗</button></div>`).join('');
 const section=`<section id="works" class="profile-section work-browser faculty-reveal" data-work-browser><div><p class="faculty-kicker">02 / SELECTED WORKS</p><h2>작품활동</h2></div><div class="work-browser-shell"><div class="work-category-tabs" role="tablist" aria-label="작품활동 분야">${tabs}</div>${panels}</div></section>`;
 html=html.replace(/<section id="film"[\s\S]*?<\/section>/,section);
 for(const id of ['drama','stage','commercial'])html=html.replace(new RegExp(`<section id="${id}"[\\s\\S]*?<\\/section>`),'');
 html=html.replace(/<a href="#film">영화<\/a><a href="#drama">드라마<\/a>/,'<a href="#works">작품활동</a>').replace(/<a href="#stage">[^<]*<\/a>|<a href="#commercial">[^<]*<\/a>/g,'');
 html=html.replace('04 / CAREER NOTE','03 / CAREER NOTE');
 if(slug==='pyeon-bo-seung'){
  const notes=html.match(/<section id="notes"[\s\S]*?<\/section>/)?.[0];
  if(notes){
   const items=[...notes.matchAll(/<li>[\s\S]*?<\/li>/g)].map(m=>m[0]).join('');
   html=html.replace(notes,'').replace(/<a href="#notes">[^<]*<\/a>/,'');
   html=html.replace(/(<section id="career"[\s\S]*?)(<\/div><\/section>)/,`$1<h3 class="hyung-min-group-title">기타사항</h3><ul class="profile-credit-list">${items}</ul>$2`);
  }
 }


 html=html.replace(/<div class="profile-heading([^"]*)">([\s\S]*?)<\/div><\/div><\/section>/, (match,classes,content)=>{
  content=content.replace(/<a class="button gold"[^>]*>[\s\S]*?<\/a>/g,'')
   .replace(/<p class="hyung-min-title">[\s\S]*?<\/p>/g,'')
   .replace(/<p class="faculty-kicker">[\s\S]*?<\/p>/g,'')
   .replace(/(<h1>[\s\S]*?<\/h1>)(<h2>[\s\S]*?<\/h2>)/,'<div class="profile-identity">$1$2</div>');
  // Education and coaching details are already presented directly below.
  if(slug!=='kim-jung-tae')content=content.replace(/<p class="profile-description">[\s\S]*?<\/p>/g,'');
  return `<div class="profile-heading${classes}">${content}</div></div></section>`;
 });

 html=html.replace(/<section id="photos"[\s\S]*?<\/section>/g,'').replace(/<a href="#photos">[^<]*<\/a>/g,'');
 fs.writeFileSync(file,html);
}
console.log('Built accessible category tabs for instructor work credits.');
