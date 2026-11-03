import {node,button} from './ui.cjs';
import {castFor} from './model.cjs';
import {dialogue} from './dialogue.cjs';
export function createCastUI(host,{preparePhoto,onChange,onError}){
 let script=null,main='A',photos=new Map(),epoch=0,loading=new Set();
 function roles(){return castFor(script||{});}
 function states(){return roles().map(r=>({...r,source:r.id===main?'me':photos.get(r.id)?.data?'friend':'original'}));}
 function render(){host.replaceChildren();if(!script)return;const cast=roles(),names=new Map(dialogue(script.script).roles.map(r=>[r.id,r.label]));host.append(node('h3','장면 속 역할과 사진'),node('p','사진을 넣지 않은 역할은 원래 얼굴을 유지합니다. 작품을 바꾸면 친구 사진은 비워집니다.',{class:'audition-note'}));
  const label=node('label','내 사진을 넣을 역할',{class:'audition-role-field'}),select=node('select',null,{'aria-label':'내 사진을 넣을 역할'});for(const r of cast)select.append(node('option',r.id+' · '+(names.get(r.id)||r.label),{value:r.id}));select.value=main;select.onchange=()=>{if(!cast.some(r=>r.id===select.value))return;main=select.value;photos.delete(main);render();onChange();};label.append(select);host.append(label);
  for(const r of cast){if(r.id===main)continue;const data=photos.get(r.id)||{},slot=node('section',null,{class:'audition-friend','data-role':r.id}),input=node('input',null,{type:'file',accept:'image/jpeg,image/png,image/webp','aria-label':r.id+' 역할 친구 사진'});slot.append(node('strong',r.id+' · '+(names.get(r.id)||r.label)),node('p',data.data?'친구 사진 사용':'원본 얼굴 유지 · 사진은 선택 사항',{class:'audition-note'}));const l=node('label','친구 사진 선택',{class:'audition-role-field'});l.append(input);slot.append(l);
   if(data.data){slot.append(node('img',null,{src:data.data,alt:r.id+' 역할에 사용할 친구 사진'}));const agree=node('input',null,{type:'checkbox','aria-label':r.id+' 역할 친구의 합성·전송 동의 확인'});agree.checked=Boolean(data.consent);const consent=node('label',null,{class:'audition-friend-consent'});consent.append(agree,node('span','이 친구가 얼굴 합성과 OpenAI 전송에 동의했습니다.'));agree.onchange=()=>{data.consent=agree.checked;onChange();};slot.append(consent,button('이 사진 지우고 원본 유지',()=>{photos.delete(r.id);render();onChange();}));}
   input.onchange=async()=>{const file=input.files?.[0];if(!file)return;const version=epoch;loading.add(r.id);onChange();try{const p=await preparePhoto(file,570000);if(version!==epoch)return;photos.set(r.id,{data:p.data,consent:false});render();}catch(e){if(version===epoch)onError(e.message);}finally{if(version===epoch){loading.delete(r.id);onChange();}}};host.append(slot);
  }
 }
 return {choose(s){if(script?.id!==s.id){epoch++;photos.clear();loading.clear();main='A';}script=s;render();},main:()=>main,states,valid:()=>!loading.size&&[...photos].filter(([id])=>id!==main).every(([,p])=>!p.data||p.consent),faces(portrait){return roles().flatMap(r=>{const p=r.id===main?{data:portrait,consent:true}:photos.get(r.id);return p?.data?[{roleId:r.id,portrait:p.data,consent:p.consent,target:r.target}]:[];});},reset(){epoch++;photos.clear();loading.clear();render();}};
}
