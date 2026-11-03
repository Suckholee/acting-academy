const {articleDocument}=require('./article.cjs');
const {content}=require('./model.cjs');
function previewDocument(record){
 const draft=content(record.draft);
 return articleDocument({...draft,id:record.id||'',publishedAt:record.published_at||null,modifiedAt:record.updated_at||record.published_at||null},{preview:true});
}
function createPublicationPreview(record,{document:doc=globalThis.document,onEdit,large=false}={}){
 const el=(tag,text,attrs={})=>{const n=doc.createElement(tag);if(text)n.textContent=text;for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
 const section=el('section',null,{class:'editorial-publication-preview','aria-label':'실제 발행 화면'});
 const heading=el('div',null,{class:'editorial-editor-heading'});heading.append(el('h2','발행 화면 미리보기'),el('span',record.published?'게시 전 수정 초안':'비공개 초안',{class:'editorial-badge'}));section.append(heading);
 section.append(el('p','홈페이지에 게시될 때의 글과 카드뉴스를 그대로 확인합니다. 미리보기는 공개되지 않습니다.',{class:'editorial-muted'}));
 const toolbar=el('div',null,{class:'editorial-preview-toolbar'}),devices=el('div',null,{class:'editorial-preview-devices','aria-label':'화면 크기'});
 const stage=el('div',null,{class:'editorial-publication-stage','data-viewport':'desktop'});
 const frame=el('iframe',null,{title:'발행 화면 미리보기',class:'editorial-publication-frame',sandbox:'allow-same-origin allow-popups allow-popups-to-escape-sandbox',referrerpolicy:'no-referrer'});
 frame.addEventListener('load',()=>{
  const page=frame.contentDocument;
  if(!page)return;
  // srcdoc otherwise resolves fragment links against the editor URL.
  for(const anchor of page.querySelectorAll('a[href^="#"]'))anchor.addEventListener('click',event=>{
   const id=anchor.getAttribute('href').slice(1),target=page.getElementById(id);
   if(target){event.preventDefault();target.scrollIntoView({block:'start'});}
  });
 });
 frame.srcdoc=previewDocument(record);stage.append(frame);
 const pc=el('button','PC',{type:'button','aria-pressed':'true'}),mobile=el('button','휴대폰',{type:'button','aria-pressed':'false'});
 function viewport(phone){stage.setAttribute('data-viewport',phone?'mobile':'desktop');pc.setAttribute('aria-pressed',String(!phone));mobile.setAttribute('aria-pressed',String(phone));}
 pc.onclick=()=>viewport(false);mobile.onclick=()=>viewport(true);devices.append(pc,mobile);toolbar.append(devices);
 const actions=el('div',null,{class:'editorial-actions'});
 if(!large){
  const expand=el('button','크게 보기',{type:'button'});
  expand.onclick=()=>{
   const dialog=el('dialog',null,{class:'editorial-preview-dialog','aria-label':'발행 화면 크게 보기'});
   const close=el('button','미리보기 닫기',{type:'button',class:'editorial-dialog-close'});
   close.onclick=()=>dialog.close();
   dialog.append(close,createPublicationPreview(record,{document:doc,large:true}));
   dialog.addEventListener('close',()=>{dialog.remove();expand.focus();},{once:true});
   doc.body.append(dialog);dialog.showModal();
  };actions.append(expand);
 }
 if(onEdit){const edit=el('button','내용 편집',{type:'button',class:'editorial-primary'});edit.onclick=onEdit;actions.append(edit);}
 if(record.published&&record.id)actions.append(el('a','게시 중인 글 보기 ↗',{href:'/journal/'+record.id,target:'_blank',rel:'noopener',class:'editorial-live-link'}));
 toolbar.append(actions);section.append(toolbar,stage);
 return section;
}
module.exports={previewDocument,createPublicationPreview};
