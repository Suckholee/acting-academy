function readImage(value,maxBytes=2*1024*1024){
 const match=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(value||'');if(!match)return null;
 const bytes=Buffer.from(match[2],'base64');if(bytes.length>maxBytes)return null;
 const valid=match[1]==='jpeg'?bytes[0]===255&&bytes[1]===216:match[1]==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
 return valid?{bytes,mime:'image/'+match[1],ext:match[1]==='jpeg'?'jpg':match[1]}:null;
}
module.exports={readImage};
