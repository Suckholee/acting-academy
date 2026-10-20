// Templates come only from the developer-authored page DOM, never from AI input.
function renderText(field,value){
 const node=field.node;
 if(field.defaultTemplate&&value===field.defaultValue){
  node.replaceChildren(...[...field.defaultTemplate.childNodes].map(child=>child.cloneNode(true)));
  node.style.whiteSpace=field.defaultWhiteSpace||'';
  return;
 }
 const links=[...(field.defaultTemplate||node).querySelectorAll('a')].map(link=>link.cloneNode(true));
 let text=value;
 for(const link of links){const label=link.textContent.trim();if(label&&text.trimEnd().endsWith(label))text=text.trimEnd().slice(0,-label.length).trimEnd();}
 node.replaceChildren(node.ownerDocument.createTextNode(text),...links);
 node.style.whiteSpace='pre-line';
}
module.exports={renderText};
