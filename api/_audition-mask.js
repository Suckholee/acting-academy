const zlib=require('node:zlib');
function dimensions(image){const b=image.bytes;if(image.mime!=='image/jpeg'||b[0]!==255||b[1]!==216)throw Error('scene_dimensions');let p=2;while(p<b.length-9){if(b[p++]!==255)continue;let marker=b[p++];while(marker===255)marker=b[p++];if(marker===217||marker===218)break;if(marker===0||marker===1||(marker>=208&&marker<=215))continue;const length=b.readUInt16BE(p);if(length<2||p+length>b.length)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){const h=b.readUInt16BE(p+3),w=b.readUInt16BE(p+5);if(w<96||h<96||w>2048||h>2048||w*h>3000000)throw Error('scene_dimensions');return {w,h};}p+=length;}throw Error('scene_dimensions');}
function chunk(type,data){const t=Buffer.from(type),body=Buffer.concat([t,data]);let crc=0xffffffff;for(const v of body){crc^=v;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}const b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length);body.copy(b,4);b.writeUInt32BE((crc^0xffffffff)>>>0,b.length-4);return b;}
// Give the model room to reconstruct hair, jaw and neck in the scene's light.
// A soft outer boundary is guidance; the generated image is never cropped afterward.
function makeMask({w,h},boxes,protectedBoxes=[]){
 const stride=w*4+1,pixels=Buffer.alloc(stride*h,255);
 for(let row=0;row<h;row++){
  pixels[row*stride]=0;
  for(let col=0;col<w;col++){
   const x=(col+.5)/w,y=(row+.5)/h;
   // Protect an unassigned face and a small margin even if expanded regions overlap.
   if(protectedBoxes.some(b=>x>=b.x-b.w*.08&&x<=b.x+b.w*1.08&&y>=b.y-b.h*.08&&y<=b.y+b.h*1.08))continue;
   let alpha=255;
   for(const b of boxes){
    const dx=Math.max(b.x-x,0,x-b.x-b.w)/(b.w*.2);
    const dy=y<b.y?(b.y-y)/(b.h*.25):Math.max(0,y-b.y-b.h)/(b.h*.4);
    const distance=Math.hypot(dx,dy);
    const edge=Math.max(0,Math.min(1,(distance-.8)/.2));
    alpha=Math.min(alpha,Math.round(255*edge*edge*(3-2*edge)));
   }
   pixels[row*stride+1+col*4+3]=alpha;
  }
 }
 const header=Buffer.alloc(13);header.writeUInt32BE(w);header.writeUInt32BE(h,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);
}
module.exports={dimensions,makeMask};
