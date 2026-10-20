// Keep the configured source separate from a temporary display fallback.
function renderImage(field,value){
 const node=field.node;
 node.dataset.cmsImageSource=value;
 if(node.closest('.video-slot-frame'))node.loading='eager';
 node.onerror=()=>{
  const fallback=field.defaultValue||field.value;
  if(fallback&&fallback!==node.getAttribute('src')){node.onerror=null;node.setAttribute('src',fallback);}
 };
 node.setAttribute('src',value);
}
module.exports={renderImage};
