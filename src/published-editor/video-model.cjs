const MAX_VIDEO_BYTES=100*1024*1024;
function videoSource(value){
 if(typeof value!=='string'||/[\s\\\u0000-\u001f]/.test(value)||value.length>2048)return null;
 if(value==='')return {kind:'empty',src:''};
 let url;try{url=new URL(value,'https://academy.invalid');}catch{return null;}
 const local=value.startsWith('/')&&!value.startsWith('//');
 if(!local&&!/^https:\/\//i.test(value))return null;
 if(!local&&(url.protocol!=='https:'||url.username||url.password))return null;
 if(/\.(mp4|webm)$/i.test(url.pathname)&&(local||url.protocol==='https:'))return {kind:'file',src:local?url.pathname+url.search+url.hash:url.href};
 if(local||url.port)return null;
 let id;
 if(['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(url.hostname)){
  id=url.hostname==='youtu.be'?url.pathname.slice(1):url.pathname==='/watch'?url.searchParams.get('v'):url.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)\/?$/)?.[1];
  if(/^[A-Za-z0-9_-]{11}$/.test(id||''))return {kind:'youtube',src:'https://www.youtube-nocookie.com/embed/'+id};
 }
 if(['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(url.hostname)){
  id=url.pathname.match(/^\/(?:video\/)?(\d+)\/?$/)?.[1];if(id)return {kind:'vimeo',src:'https://player.vimeo.com/video/'+id};
 }
 return null;
}
const validVideo=value=>Boolean(videoSource(value));
function validVideoFile(file={}){if(!file||typeof file!=='object'||Array.isArray(file))return false;const {name,type,size}=file;return typeof name==='string'&&name.length<=255&&Number.isSafeInteger(size)&&size>0&&size<=MAX_VIDEO_BYTES&&((type==='video/mp4'&&/\.mp4$/i.test(name))||(type==='video/webm'&&/\.webm$/i.test(name)));}
module.exports={videoSource,validVideo,validVideoFile,MAX_VIDEO_BYTES};
