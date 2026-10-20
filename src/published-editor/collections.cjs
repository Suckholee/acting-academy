const {catalog,collectionPath,encode,decode,validRecord}=require('./collection-model.cjs');
const {validImage}=require('./model.cjs');const {validVideo}=require('./video-model.cjs');
const {renderText}=require('./text-renderer.cjs');
const make=(tag,text,attrs={})=>{const n=document.createElement(tag);if(text)n.textContent=text;for(const [key,value]of Object.entries(attrs))n.setAttribute(key,value);return n;};
const pathOf=(root,node)=>{const path=[];while(node!==root){if(!node.parentElement)return null;path.unshift([...node.parentElement.children].indexOf(node));node=node.parentElement;}return path;};
const atPath=(root,path)=>path?.reduce((node,index)=>node?.children[index],root);
function createCollections({page,groups,registry,request,fieldValue,setField,panel,showPanel,changed,mode,pending,videoControl}){
 const states=[];let selected=null;
 for(const def of catalog.filter(d=>d.page===page)){
  const matches=groups.filter(g=>g.element.matches(def.selector)&&g.module);const parents=[...new Set(matches.map(g=>g.element.parentElement))];
  parents.forEach((parent,index)=>{
   const local=matches.filter(g=>g.element.parentElement===parent);const id=def.kind+'-'+(index+1);const marker=document.createComment('managed-'+id);parent.insertBefore(marker,local[0].element);
   const templates=new Map(local.map(group=>[group.module.id,{group,html:group.element.cloneNode(true),paths:new Map(group.fields.map(f=>[f.id,pathOf(group.element,f.node)]))}]));
   const sectionTitle=parent.closest('.partners-simple-category')?.querySelector('h2,h3')?.textContent;
   const state={...def,title:sectionTitle?def.title+' · '+sectionTitle:def.title,id,parent,marker,templates,base:local,records:[],nodes:[],persisted:false,touched:false};
   const bar=make('button',def.title+' 목록 관리',{type:'button',class:'kjt-collection-manage'});bar.onclick=e=>{e.preventDefault();e.stopPropagation();openList(state);};if(def.kind==='videos')parent.before(bar);else parent.insertBefore(bar,marker);state.bar=bar;states.push(state);
  });
 }
 function defaults(state){return state.base.map((group,index)=>({id:'item-base-'+group.legacyId,template:group.module.id,visible:true,values:Object.fromEntries(group.fields.map(f=>[f.id,fieldValue(f)])),category:group.element.dataset.category||'',detail:group.element.querySelector('a[href^="/trainers/"],a[href^="/courses/"],a[href^="/works/"]')?.getAttribute('href')||''}));}
 function label(state,record){const module=registry.modules[record.template];const named=module.fields.find(f=>/^name-|^headline-|^h[1-4]-|^summary-/.test(f.id));return (record.values[named?.id]||Object.values(record.values).find(v=>v&& !v.startsWith('/')&&!v.startsWith('https:'))||module.title).replace(/\s+/g,' ').slice(0,64);}
 function changedState(state){state.touched=true;render(state);changed(state.title+' 목록을 변경했습니다. 상단에서 홈페이지에 저장해주세요.');}
 function render(state){
  for(const node of [...state.nodes,...state.base.map(g=>g.element)])node.remove();state.nodes=[];
  let anchor=state.marker;
  for(const record of state.records){
   const template=state.templates.get(record.template);if(!template)continue;
   const base=state.base.find(g=>'item-base-'+g.legacyId===record.id);
   const node=base?base.element:template.html.cloneNode(true);
   node.querySelectorAll('.kjt-component-edit,.kjt-collection-item-tools').forEach(n=>n.remove());
   if(!base){node.removeAttribute('id');node.classList.add('is-visible');node.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));node.querySelectorAll('.reveal,.faculty-reveal').forEach(n=>n.classList.add('is-visible'));}
   node.dataset.collection=state.id;node.dataset.item=record.id;node.dataset.category=record.category;node.classList.add('kjt-collection-item');node.classList.toggle('kjt-collection-unpublished',!record.visible);
   for(const field of template.group.fields){const target=atPath(node,template.paths.get(field.id));if(!target)continue;const value=record.values[field.id];if(value===undefined)continue;
    target.removeAttribute('contenteditable');target.classList.remove('kjt-direct-text');
    if(field.type==='text'){renderText({...field,node:target},value);target.dataset.collectionField=field.id;}
    else{setField({...field,node:target},value);target.dataset.collectionMedia=field.id;}
   }
   for(const link of node.querySelectorAll('a[href^="/trainers/"],a[href^="/courses/"],a[href^="/works/"]')){if(record.detail)link.setAttribute('href',record.detail);else link.removeAttribute('href');}
   const tools=make('div',null,{class:'kjt-collection-item-tools'});tools.append(make('span',state.title+' · '+label(state,record)),make('span',record.visible?'공개':'비공개'));
   const edit=make('button','이 콘텐츠 관리',{type:'button'});edit.onclick=e=>{e.preventDefault();e.stopPropagation();openItem(state,record);};tools.append(edit);node.append(tools);
   anchor.after(node);anchor=node;state.nodes.push(node);
  }
  state.parent.dispatchEvent(new CustomEvent('kjt-collection-change',{bubbles:true}));
  state.bar.textContent=state.title+' 목록 관리 · '+state.records.length+'개';renderMode();applyFilter(state);
 }
 function applyFilter(state){
  const buttons=page==='/reviews'?'.reviews-filters button':page==='/trainers'?'.faculty-filters button':page==='/works'?'.works-filters button':page==='/programs'?'[data-filter]':null;
  const active=buttons&&document.querySelector(buttons+'[aria-pressed="true"]');const filter=active?.dataset.filter||active?.dataset.category||'all';
  state.nodes.forEach(node=>{const record=state.records.find(r=>r.id===node.dataset.item);const visible=((mode().admin&&mode().editing&&!mode().preview)||record.visible)&&(filter==='all'||!filter||record.category.includes(filter));node.hidden=!visible;node.style.display=visible?'':'none';});
  const badge=page==='/reviews'&&document.querySelector('.reviews-total-badge');if(badge)badge.textContent=String(state.nodes.filter(n=>!n.hidden).length).padStart(2,'0')+' REVIEWS';
 }
 function renderMode(){const enabled=mode().admin&&mode().editing&&!mode().preview;for(const state of states){state.bar.hidden=!enabled;for(const node of state.nodes){const record=state.records.find(r=>r.id===node.dataset.item);node.querySelector('.kjt-collection-item-tools').hidden=!enabled;node.classList.toggle('kjt-collection-selected',selected?.id===record.id&&enabled);node.classList.toggle('kjt-collection-admin',enabled);node.hidden=!record.visible&&!enabled;node.querySelectorAll('[data-collection-field]').forEach(field=>{if(enabled){field.setAttribute('contenteditable','plaintext-only');field.setAttribute('spellcheck','false');field.title='이 문구를 직접 수정합니다';}else{field.removeAttribute('contenteditable');field.removeAttribute('title');}});applyFilter(state);}}}
 function highlight(state,record=null){selected=record;document.querySelectorAll('.kjt-collection-range').forEach(n=>n.classList.remove('kjt-collection-range'));if(record){state.nodes.find(n=>n.dataset.item===record.id)?.classList.add('kjt-collection-range');}else{state.nodes.forEach(n=>n.classList.add('kjt-collection-range'));}renderMode();(record?state.nodes.find(n=>n.dataset.item===record.id):state.nodes[0])?.scrollIntoView?.({behavior:'smooth',block:'start'});}
 function openList(state){
  if(!showPanel(state.title+' 목록 관리'))return;highlight(state);
  panel.append(make('p','선택 범위: '+state.title+' 목록 전체',{class:'kjt-scope-description'}),make('p','등록·수정·순서 변경·공개 여부를 관리합니다. 변경사항은 화면 확인 후 상단에서 저장하세요.'));
  const add=make('button','새 '+state.title+' 등록',{type:'button',class:'kjt-collection-add'});add.onclick=()=>{if(state.records.length>=100){changed('한 목록에 최대 100개까지 등록할 수 있습니다.');return;}const template=state.base[0].module;const record={id:'item-'+crypto.randomUUID(),template:template.id,visible:false,category:state.base[0].element.dataset.category||'',detail:'',values:Object.fromEntries(template.fields.map(f=>[f.id,f.type==='text'?'':f.defaultValue]))};openItem(state,record,true);};panel.append(add);
  const list=make('div',null,{class:'kjt-content-list'});panel.append(list);
  for(const [index,record]of state.records.entries()){
   const row=make('article',null,{class:'kjt-content-row'});row.append(make('strong',label(state,record)),make('small',record.visible?'공개 중':'비공개'));
   const edit=make('button','내용 수정',{type:'button'});edit.onclick=()=>openItem(state,record);const toggle=make('button',record.visible?'비공개로 전환':'공개로 전환',{type:'button'});toggle.onclick=()=>{record.visible=!record.visible;changedState(state);openList(state);};
   const up=make('button','위로',{type:'button','aria-label':label(state,record)+' 위로'}),down=make('button','아래로',{type:'button','aria-label':label(state,record)+' 아래로'});up.disabled=index===0;down.disabled=index===state.records.length-1;
   function move(offset){[state.records[index],state.records[index+offset]]=[state.records[index+offset],state.records[index]];changedState(state);openList(state);}up.onclick=()=>move(-1);down.onclick=()=>move(1);
   const remove=make('button','삭제',{type:'button'});remove.onclick=()=>{if(!confirm('“'+label(state,record)+'” 항목을 목록에서 삭제할까요? 저장 후에도 저장 이력으로 복원할 수 있습니다.'))return;state.records=state.records.filter(r=>r.id!==record.id);changedState(state);openList(state);};row.append(edit,toggle,up,down,remove);list.append(row);
  }
  if(!state.records.length)list.append(make('p','아직 콘텐츠가 없습니다. 새 항목을 등록해주세요.'));
 }
 function openItem(state,record,isNew=false,focusedField=null){
  if(!showPanel((isNew?'새 ':'')+state.title+' 콘텐츠 관리'))return;highlight(state,record);
  const back=make('button','← 목록 전체 관리',{type:'button'});back.onclick=()=>openList(state);panel.append(back,make('p','선택 범위: '+(isNew?'새 항목':label(state,record))+' 한 개',{class:'kjt-scope-description'}));
  const template=state.templates.get(record.template),module=registry.modules[record.template],form=make('form',null,{class:'kjt-content-form'}),inputs=new Map();let versionActive=true;
  const active=()=>panel.contains(form)&&versionActive;
  const categories=[...new Set(state.base.map(g=>g.element.dataset.category||''))];let category=null;
  if(categories.some(Boolean)){const label=make('label','콘텐츠 분류',{class:'kjt-editor-field'});category=make('select',null,{'aria-label':'콘텐츠 분류'});for(const value of categories){const button=[...document.querySelectorAll('[data-filter],[data-category]')].find(n=>n.tagName==='BUTTON'&&(n.dataset.filter===value||n.dataset.category===value));category.append(make('option',button?.textContent||value||'기본 분류',{value}));}category.value=record.category;label.append(category);form.append(label);}
  const visibility=make('label','이 목록에서 공개',{class:'kjt-editor-field'});const visible=make('input',null,{type:'checkbox'});visible.checked=record.visible;visibility.append(visible);form.append(visibility);
  for(const field of [...module.fields].sort((a,b)=>(a.type==='video'?-1:0)-(b.type==='video'?-1:0))){
   if(field.type==='video'&&videoControl){const source=template.group.fields.find(f=>f.id===field.id);const control=videoControl({...source,node:source.node.cloneNode(true)});control.input.value=record.values[field.id];inputs.set(field.id,control.input);form.append(control.wrap);continue;}
   const heading=field.type==='image'?'사진':field.type==='video'?'영상 링크':field.id.startsWith('summary-')?'질문':field.id.startsWith('headline-')||/^h[1-4]-/.test(field.id)?'제목':field.id.startsWith('body-')?'후기 본문':field.id.startsWith('p-')?'설명 / 답변':module.kind==='review'?({'span-1':'카드 상단 표기','span-2':'분야 표기','span-3':'작성자 / 출처','span-4':'하단 보조 표기'}[field.id]||field.label):field.label;
   const label=make('label',heading,{class:'kjt-editor-field'}),input=make(field.type==='text'?'textarea':'input',null,{'aria-label':heading+' · '+field.id,maxlength:String(field.maxLength)});input.value=record.values[field.id];if(field.type==='text')input.rows=3;inputs.set(field.id,input);label.append(input);
   if(field.type==='image'){
    const preview=make('img',null,{src:input.value,alt:'선택한 콘텐츠 사진',class:'kjt-field-image'}),file=make('input',null,{type:'file',accept:'image/jpeg,image/png,image/webp','aria-label':'콘텐츠 사진 첨부'});label.prepend(preview);label.append(file);input.onchange=()=>{if(validImage(input.value))preview.src=input.value;};
    file.onchange=async()=>{const selected=file.files[0];if(!selected)return;if(selected.size>2097152){note.textContent='사진은 2MB 이하로 선택해주세요.';return;}file.disabled=true;try{const image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(selected);});const result=await request('/api/admin-upload',{method:'POST',body:JSON.stringify({image})});if(!active())return;input.value=result.url;preview.src=result.url;pending(true);note.textContent='사진을 업로드했습니다. 콘텐츠에 적용한 뒤 저장해주세요.';}catch(e){note.textContent=e.message;}finally{file.disabled=false;}};
   }
   form.append(label);
  }
  const detailPaths=[...new Set(state.base.map(g=>g.element.querySelector('a[href^="/trainers/"],a[href^="/courses/"],a[href^="/works/"]')?.getAttribute('href')).filter(Boolean))];let detail=null;
  if(detailPaths.length){const label=make('label','상세 페이지 연결',{class:'kjt-editor-field'});detail=make('select');detail.append(make('option','연결하지 않음',{value:''}));for(const route of detailPaths)detail.append(make('option',(state.base.find(g=>g.element.querySelector('a[href="'+route+'"]'))?.title||'상세 페이지'),{value:route}));detail.value=record.detail;label.append(detail);form.append(label);}
  const note=make('p','기본 디자인 안에서 이 콘텐츠만 변경합니다. 화면 적용 후 상단 저장을 눌러주세요.',{role:'status'});const submit=make('button',isNew?'목록에 추가':'이 콘텐츠에 적용',{type:'submit'});form.append(note,submit);form.oninput=()=>pending(true);
  function apply(values){const next={...record,values,visible:visible.checked,category:category?.value||record.category,detail:detail?.value||record.detail};if(!validRecord(next,module)){note.textContent='문구 길이와 사진·영상 주소를 확인해주세요.';return false;}Object.assign(record,next);const baseGroup=state.base.find(g=>'item-base-'+g.legacyId===record.id);if(baseGroup)for(const field of baseGroup.fields)if(field.sharedId)setField(field,values[field.id]);if(isNew){state.records.push(record);isNew=false;submit.textContent='이 콘텐츠에 적용';}pending(false);changedState(state);highlight(state,record);note.textContent='화면에 적용했습니다. 홈페이지에 저장을 누르면 최종 반영됩니다.';return true;}
  form.onsubmit=e=>{e.preventDefault();apply(Object.fromEntries([...inputs].map(([id,input])=>[id,input.value])));};panel.append(form);
  const tabs=make('div',null,{class:'kjt-edit-tabs'}),manual=make('button','콘텐츠 편집',{type:'button','aria-pressed':'true'}),ai=make('button','AI에게 요청',{type:'button','aria-pressed':'false'});
  const chat=require('./inline-chat.cjs').createChat({module,request,active,values:()=>Object.fromEntries([...inputs].map(([id,input])=>[id,input.value])),apply:changes=>{if(changes.some(c=>inputs.get(c.fieldId)?.value!==c.before))return false;for(const c of changes)inputs.get(c.fieldId).value=c.after;return apply(Object.fromEntries([...inputs].map(([id,input])=>[id,input.value])));}});chat.hidden=true;tabs.append(manual,ai);panel.insertBefore(tabs,form);panel.append(chat);
  manual.onclick=()=>{form.hidden=false;chat.hidden=true;manual.setAttribute('aria-pressed','true');ai.setAttribute('aria-pressed','false');};ai.onclick=()=>{form.hidden=true;chat.hidden=false;manual.setAttribute('aria-pressed','false');ai.setAttribute('aria-pressed','true');};
  if(focusedField)inputs.get(focusedField)?.focus();
 }
 document.addEventListener('click',e=>{
  if(!mode().admin||mode().preview||!mode().editing)return;
  const node=e.target.closest('[data-collection][data-item]');if(!node||e.target.closest('.kjt-collection-item-tools'))return;
  const state=states.find(s=>s.id===node.dataset.collection),record=state?.records.find(r=>r.id===node.dataset.item);if(!record)return;
  if(e.target.closest('[data-collection-field]')){highlight(state,record);changed('선택: '+state.title+' 한 개의 문구 · 글자를 직접 수정할 수 있습니다.',false);return;}
  e.preventDefault();e.stopImmediatePropagation();openItem(state,record,false,e.target.closest('[data-collection-media]')?.dataset.collectionMedia);
 },true);
 document.addEventListener('input',e=>{const field=e.target.closest('[data-collection-field]');if(!field||!mode().admin||mode().preview||!mode().editing)return;const node=field.closest('[data-collection]'),state=states.find(s=>s.id===node?.dataset.collection),record=state?.records.find(r=>r.id===node.dataset.item);if(!record)return;const value=field.innerText||field.textContent;const next={...record,values:{...record.values,[field.dataset.collectionField]:value}};if(!validRecord(next,registry.modules[record.template]))return;record.values=next.values;state.touched=true;changed('선택한 문구를 수정하고 있습니다. 완료 후 홈페이지에 저장하세요.');});
 document.addEventListener('focusin',e=>{const field=e.target.closest('[data-collection-field]');if(field)field.dataset.beforeText=field.innerText||field.textContent;});
 document.addEventListener('focusout',e=>{const field=e.target.closest('[data-collection-field]');if(!field||!mode().admin||mode().preview)return;const node=field.closest('[data-collection]'),state=states.find(s=>s.id===node?.dataset.collection),record=state?.records.find(r=>r.id===node.dataset.item);if(!record)return;const value=field.innerText||field.textContent;if(value===field.dataset.beforeText)return;const next={...record,values:{...record.values,[field.dataset.collectionField]:value}};if(!validRecord(next,registry.modules[record.template])){field.textContent=record.values[field.dataset.collectionField];changed('문구 길이를 확인해주세요.',false);return;}Object.assign(record,next);state.touched=true;changed('선택한 콘텐츠의 문구를 수정했습니다. 홈페이지에 저장해주세요.');});
 document.addEventListener('click',e=>{if(e.target.closest('.reviews-filters button,.faculty-filters button,.works-filters button,[data-filter]'))queueMicrotask(()=>states.forEach(applyFilter));});
 return {
  hydrate(pages){for(const state of states){state.persisted=Boolean(pages[collectionPath(state.id)]);try{state.records=decode(pages[collectionPath(state.id)],registry.modules,state)||defaults(state);}catch{state.records=defaults(state);}for(const record of state.records){const group=state.base.find(g=>'item-base-'+g.legacyId===record.id);if(group)for(const field of group.fields){const shared=(pages['/shared']||[]).find(e=>e.key===field.sharedId);if(shared)record.values[field.id]=shared.value;}}state.touched=false;render(state);}},
  entries(){return Object.fromEntries(states.filter(s=>s.touched||s.persisted).map(s=>[collectionPath(s.id),encode(s.id,s.records)]));},
  renderMode,
  clearSelection(){selected=null;document.querySelectorAll('.kjt-collection-range').forEach(n=>n.classList.remove('kjt-collection-range'));},
  owns(group){return states.some(s=>s.base.includes(group));},
  open(group){const state=states.find(s=>s.base.includes(group));if(!state)return false;const record=state.records.find(r=>r.id==='item-base-'+group.legacyId);if(record)openItem(state,record);else openList(state);return true;},
  appendRail(rail){for(const state of states){const b=make('button',state.title+' 목록 관리',{type:'button',class:'kjt-rail-collection'});b.onclick=()=>openList(state);rail.append(b);}}
 };
}
module.exports={createCollections};
