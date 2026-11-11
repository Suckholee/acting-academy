const {castFor}=require('./model.cjs');
const {dialogue}=require('./dialogue.cjs');
const {attribution}=require('./license.cjs');
const FONT='"Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif';
const WIDTH=1080,PAD=64,INK='#192027',GOLD='#c3a16b',PAPER='#f7f3eb';
// Preserve every character; only insert visual line breaks. Never shorten the script.
function wrapText(ctx,text,width){
 const lines=[];
 for(const paragraph of String(text).split('\n')){
  if(!paragraph){lines.push('');continue;}
  let line='';
  const chars=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('ko',{granularity:'grapheme'}).segment(paragraph)].map(s=>s.segment):Array.from(paragraph);
  for(const char of chars){
   if(line&&ctx.measureText(line+char).width>width){
    const space=line.lastIndexOf(' ');
    if(space>line.length*.45){lines.push(line.slice(0,space+1));line=line.slice(space+1)+char;}
    else{lines.push(line);line=char;}
   }else line+=char;
  }
  lines.push(line);
 }
 return lines;
}
function cardLayout(ctx,{script,imageWidth,imageHeight,roleIds=[],demo=false,local=false}){
 const photoHeight=Math.round((WIDTH-PAD*2)*imageHeight/imageWidth);
 ctx.font='700 64px '+FONT;const title=wrapText(ctx,script.work,WIDTH-PAD*2);
 ctx.font='400 26px '+FONT;const subtitle=wrapText(ctx,script.title,WIDTH-PAD*2);
 const photoY=160+title.length*82+subtitle.length*40;
 const bodyY=photoY+photoHeight+60,bodyFont=32,lineHeight=54;
 ctx.font='400 '+bodyFont+'px '+FONT;
 const lines=wrapText(ctx,script.script,WIDTH-PAD*2-88);
 const bodyHeight=134+lines.reduce((n,l)=>n+(l?lineHeight:26),0)+50;
 const roles=(script.cardOnly?dialogue(script.script,script.turns).roles:castFor(script)).filter(r=>roleIds.includes(r.id)).map(r=>r.label).join(' · ');
 const label=(script.rights==='brief-quote'?'짧은 인용 · 전체 대본 미등록':'SCENE SCRIPT · 제공 대사')+(roles?'  /  '+roles:'')+(script.languageLabel?' · '+script.languageLabel:'');
 ctx.font='600 22px '+FONT;const labels=wrapText(ctx,label,WIDTH-PAD*2-88);
 const extra=Math.max(0,labels.length-1)*32;
 const footerY=bodyY+bodyHeight+extra+42;
 ctx.font='400 18px '+FONT;const credits=script.license?wrapText(ctx,attribution(script),WIDTH-PAD*2):[];
 return {width:WIDTH,height:footerY+180+credits.length*28,title,subtitle,photoY,photoHeight,bodyY,bodyHeight:bodyHeight+extra,bodyFont,lineHeight,lines,labels,footerY,demo,local,credits};
}
function drawCard(ctx,photo,layout){
 const l=layout,w=l.width;
 ctx.fillStyle=INK;ctx.fillRect(0,0,w,l.height);
 ctx.fillStyle=GOLD;ctx.fillRect(PAD,62,44,4);
 ctx.font='600 22px '+FONT;ctx.fillText('AI AUDITION  /  MY SCENE',PAD+62,74);
 ctx.textAlign='right';ctx.font='400 18px '+FONT;ctx.fillStyle='#d9d6cf';ctx.fillText('김정태 배우아카데미',w-PAD,74);ctx.textAlign='left';
 let y=158;ctx.fillStyle=PAPER;ctx.font='700 64px '+FONT;
 for(const line of l.title){ctx.fillText(line,PAD,y);y+=82;}
 ctx.fillStyle='#c1c5c7';ctx.font='400 26px '+FONT;y+=4;
 for(const line of l.subtitle){ctx.fillText(line,PAD,y);y+=40;}
 // Preserve the entire generated photo and its aspect ratio.
 ctx.drawImage(photo,PAD,l.photoY,w-PAD*2,l.photoHeight);
 // The watermark is rendered into the exported pixels, never just a DOM overlay.
 const photoBottom=l.photoY+l.photoHeight;
 const shade=ctx.createLinearGradient(0,photoBottom-115,0,photoBottom);shade.addColorStop(0,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(0,0,0,.55)');
 ctx.fillStyle=shade;ctx.fillRect(PAD,photoBottom-Math.min(115,l.photoHeight),w-PAD*2,Math.min(115,l.photoHeight));
 ctx.save();ctx.textAlign='right';ctx.font='600 25px '+FONT;ctx.fillStyle='rgba(255,255,255,.82)';ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=5;ctx.fillText('김정태 배우아카데미',w-PAD-26,photoBottom-28);ctx.restore();
 ctx.fillStyle=GOLD;ctx.fillRect(PAD,photoBottom,68,5);
 ctx.fillStyle=PAPER;ctx.fillRect(PAD,l.bodyY,w-PAD*2,l.bodyHeight);
 ctx.fillStyle='#82643b';ctx.font='600 22px '+FONT;y=l.bodyY+55;
 for(const line of l.labels){ctx.fillText(line,PAD+44,y);y+=32;}
 y+=30;
 ctx.fillStyle='#d7c6a9';ctx.fillRect(PAD+44,y-13,3,l.bodyHeight-(y-l.bodyY)-30);
 ctx.fillStyle=INK;ctx.font='400 '+l.bodyFont+'px '+FONT;
 for(const line of l.lines){if(line){ctx.fillText(line,PAD+66,y);y+=l.lineHeight;}else y+=26;}
 ctx.fillStyle=GOLD;ctx.fillRect(PAD,l.footerY,w-PAD*2,1);
 ctx.fillStyle=PAPER;ctx.font='600 28px '+FONT;ctx.fillText('김정태 배우아카데미',PAD,l.footerY+57);
 ctx.fillStyle='#b3b8ba';ctx.font='400 19px '+FONT;ctx.fillText('나의 얼굴, 나의 장면.  ·  kactstar.com',PAD,l.footerY+94);
 ctx.font='400 17px '+FONT;ctx.fillStyle='#9ca2a6';ctx.fillText(l.local?'내 사진으로 만든 대본 연습 카드 · 영화 장면 합성 아님':l.demo?'시연 이미지 · AI 오디션 공유 카드':'AI로 재생성한 연습 이미지 · 실제 출연 사진이 아닙니다.',PAD,l.footerY+139);
 ctx.font='400 18px '+FONT;y=l.footerY+178;for(const line of l.credits){ctx.fillText(line,PAD,y);y+=28;}
}
async function createCard({image,script,roleIds=[],demo=false,local=false}){
 if(document.fonts?.ready)await document.fonts.ready;
 const photo=new Image();photo.src=image;await photo.decode();
 if(!photo.naturalWidth||!photo.naturalHeight)throw Error('사진을 불러오지 못했습니다.');
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)throw Error('이미지 저장을 지원하지 않는 브라우저입니다.');
 const layout=cardLayout(ctx,{script,imageWidth:photo.naturalWidth,imageHeight:photo.naturalHeight,roleIds,demo,local});
 // Keep a single full-length image within mobile canvas limits; never crop long dialogue.
 const scale=Math.min(1,14000/layout.height,Math.sqrt(14000000/(WIDTH*layout.height)));
 canvas.width=Math.floor(WIDTH*scale);canvas.height=Math.floor(layout.height*scale);ctx.scale(scale,scale);
 drawCard(ctx,photo,layout);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('공유 이미지를 만들지 못했습니다. 다시 시도해주세요.')),'image/png'));
 const name=(script.work||'AI오디션').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'-')+'-나의장면-대사지.png';
 return {blob,name,width:canvas.width,height:canvas.height};
}
module.exports={wrapText,cardLayout,drawCard,createCard};
