const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..','dist');
const placements={
 'index.html':[['programs','camera'],['actors-section','jung-tae']],
 'programs.html':[['subpage-banner','camera'],['programs','pyeon']],
 'about.html':[['subpage-banner','jung-tae'],['actors-section','pyeon']],
 'facilities.html':[['subpage-banner','hyung-min']],
 'faq.html':[['subpage-banner','feedback']],
 'reviews.html':[['reviews-banner','im-do-yoon'],['reviews-cta-banner','feedback']],
 'works.html':[['works-banner','camera']],
 'trainers.html':[['faculty-banner','jung-tae']]
};
let count=0;
for(const [file,sections] of Object.entries(placements)){
 const target=path.join(root,file);let html=fs.readFileSync(target,'utf8');
 if(!html.includes('href="/atmosphere.css"'))html=html.replace('</head>','<link rel="stylesheet" href="/atmosphere.css"></head>');
 for(const [section,variant] of sections){
  const pattern=new RegExp(`(<section\\b[^>]*class=")([^"]*\\b${section}\\b[^"]*)(")`,'g');
  html=html.replace(pattern,(_,a,classes,b)=>{count++;return a+classes.replace(/\s*scene-atmosphere(?:-[\w-]+)?/g,'')+` scene-atmosphere scene-atmosphere-${variant}`+b;});
 }
 if(!html.includes('class="scene-atmosphere-credit"'))html=html.replace(/<footer\b/,'<p class="scene-atmosphere-credit">배경의 강의 장면은 강사 프로필을 바탕으로 AI로 제작한 이미지입니다.</p><footer');
 fs.writeFileSync(target,html);
}
console.log(`Applied instructor AI backgrounds to ${count} sections across ${Object.keys(placements).length} pages.`);
