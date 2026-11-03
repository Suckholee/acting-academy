const {imageURL}=require('./model.cjs');
const {cardTitle}=require('./presentation.cjs');
const el=(tag,text,attrs={})=>{const n=document.createElement(tag);if(text)n.textContent=text;for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
export function cardPreview(card,index,total){
 const title=cardTitle(card),dense=title.length>32||card.body.length>120,box=el('article',null,{class:'editorial-card'+(index===0?' card-cover':'')+(dense?' card-dense':'')}),top=el('div',"ACTOR'S NOTE",{class:'card-eyebrow'});
 top.append(el('span',String(index+1).padStart(2,'0')+' / '+String(total).padStart(2,'0')));
 const photo=el('div',null,{class:'card-photo'});if(card.image)photo.append(el('img',null,{src:imageURL(card.image),alt:card.imageAlt||card.title}));else photo.append(el('span','이미지를 넣어주세요'));
 box.append(top,photo,el('h3',title),el('p',card.body),el('div','김정태 배우아카데미',{class:'card-brand'}));return box;
}
function wrap(ctx,text,width){const lines=[];for(const para of text.split('\n')){let line='';for(const word of para.split(/(\s+)/)){if(ctx.measureText(line+word).width<=width){line+=word;continue;}if(line.trim())lines.push(line.trim());line='';for(const char of word.trimStart()){if(ctx.measureText(line+char).width>width&&line){lines.push(line);line=char;}else line+=char;}}lines.push(line.trim());}return lines;}
function loadImage(url){return new Promise((resolve,reject)=>{const image=new Image(),timer=setTimeout(()=>{image.src='';reject(Error('사진을 불러오지 못했습니다. 이미지를 확인하고 다시 저장해주세요.'));},20000);image.crossOrigin='anonymous';image.onload=()=>{clearTimeout(timer);resolve(image);};image.onerror=()=>{clearTimeout(timer);reject(Error('사진을 불러오지 못했습니다. 이미지를 확인하고 다시 저장해주세요.'));};image.src=imageURL(url);});}
function cover(ctx,img,x,y,w,h){const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight),sw=w/scale,sh=h/scale;ctx.drawImage(img,(img.naturalWidth-sw)/2,(img.naturalHeight-sh)/2,sw,sh,x,y,w,h);}
export async function downloadCard(card,index,total){
 if(!card.image)throw Error('먼저 카드 이미지를 넣어주세요.');
 const title=cardTitle(card),image=await loadImage(card.image);await document.fonts.ready;const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext('2d'),dark=index===0,dense=title.length>32||card.body.length>120;
 ctx.fillStyle=dark?'#14171d':'#f4f0e8';ctx.fillRect(0,0,1080,1350);
 ctx.fillStyle=dark?'#ead5ad':'#876b36';ctx.font='500 24px sans-serif';ctx.fillText("ACTOR'S NOTE",72,90);ctx.textAlign='right';ctx.fillText(String(index+1).padStart(2,'0')+' / '+String(total).padStart(2,'0'),1008,90);ctx.textAlign='left';
 const photoHeight=dense?400:490;cover(ctx,image,72,135,936,photoHeight);
 let font=64,lines;do{ctx.font=`700 ${font}px sans-serif`;lines=wrap(ctx,title,936);if(lines.length<=3)break;font-=4;}while(font>=40);
 ctx.fillStyle=dark?'#ffffff':'#1b2028';let y=135+photoHeight+85;for(const line of lines){ctx.fillText(line,72,y);y+=font*1.3;}
 y+=20;let bodySize=34,bodyLines;do{ctx.font=`400 ${bodySize}px sans-serif`;bodyLines=wrap(ctx,card.body,936);if(y+bodyLines.length*bodySize*1.5<1200)break;bodySize-=2;}while(bodySize>=20);
 if(y+bodyLines.length*bodySize*1.5>=1200)throw Error('카드 문구가 너무 깁니다. 문구를 줄인 뒤 PNG를 저장해주세요.');
 ctx.fillStyle=dark?'#dedfe4':'#4f5560';for(const line of bodyLines){ctx.fillText(line,72,y);y+=bodySize*1.5;}
 ctx.fillStyle=dark?'#ead5ad':'#876b36';ctx.fillRect(72,1230,936,2);ctx.font='500 26px sans-serif';ctx.fillText('김정태 배우아카데미',72,1290);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('이미지를 만들지 못했습니다.');const url=URL.createObjectURL(blob),a=el('a',null,{href:url,download:'kjt-card-'+String(index+1).padStart(2,'0')+'.png'});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
