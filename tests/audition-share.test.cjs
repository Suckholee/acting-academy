const {test}=require('node:test'),assert=require('node:assert/strict');
const {wrapText,cardLayout,drawCard}=require('../src/audition/share-card.cjs');
const provided=require('../src/audition/provided.cjs');
const ctx={font:'',measureText:s=>({width:Array.from(s).length*32})};
test('Korean, emoji, long unbroken words and original spaces survive wrapping without omission',()=>{
 for(const text of ['가나다라마바사 👩‍🎤 우리 장면입니다.','A'.repeat(300),'첫 줄\n\n마지막 대사','  앞뒤 공백  ']){
  const lines=wrapText(ctx,text,160);assert.equal(lines.join('').replace(/\n/g,''),text.replace(/\n/g,''));
  for(const line of lines)assert.ok(ctx.measureText(line).width<=160||Array.from(line).length<=4);
 }
});
test('every supplied script is laid out in full; long scripts grow the single image',()=>{
 for(const script of [...provided,{...provided[0],script:'아주 긴 대사 '.repeat(600)}]){
  const l=cardLayout(ctx,{script,imageWidth:1280,imageHeight:720,roleIds:['A']});
  assert.equal(l.lines.join(''),script.script.replace(/\n/g,''));
  assert.ok(l.footerY>l.bodyY+l.bodyHeight);assert.ok(l.height>l.footerY+139);
  assert.equal(l.photoHeight,536);assert.match(l.labels.join(''),/제공 대사/);
 }
 const short=cardLayout(ctx,{script:provided[0],imageWidth:1280,imageHeight:720});
 const long=cardLayout(ctx,{script:provided[1],imageWidth:1280,imageHeight:720});assert.ok(long.height>short.height);
});
test('drawn output includes an uncropped photo, image watermark and academy footer within the canvas',()=>{
 const text=[],draws=[],fills=[];const c={...ctx,fillRect:(...v)=>fills.push(v),fillText:(...v)=>text.push(v),drawImage:(...v)=>draws.push(v),save(){},restore(){},createLinearGradient:()=>({addColorStop(){}})};
 const l=cardLayout(c,{script:provided[0],imageWidth:1280,imageHeight:720});drawCard(c,{},l);
 assert.equal(draws.length,1);assert.equal(draws[0].length,5);
 const marks=text.filter(t=>t[0]==='김정태 배우아카데미');assert.equal(marks.length,3);
 assert.ok(marks.some(t=>t[2]>l.photoY&&t[2]<l.photoY+l.photoHeight));assert.ok(marks.some(t=>t[2]>l.footerY));
 assert.ok(text.every(t=>t[1]>=0&&t[1]<=l.width&&t[2]>=0&&t[2]<l.height));
 assert.ok(fills.every(r=>r[1]+r[3]<=l.height));
});
