const {validImage}=require('./model.cjs');const {validVideo}=require('./video-model.cjs');
function validValue(field,value,images=[]){
 if(typeof value!=='string'||value.length>field.maxLength)return false;
 if(field.type==='text')return !/<\/?(?:script|style|iframe|html|body|div|section|img|video)\b/i.test(value);
 if(field.type==='image'&&value.startsWith('attachment:'))return images.some(i=>'attachment:'+i.id===value);
 return field.type==='image'?validImage(value):field.type==='video'?validVideo(value):false;
}
function validateChanges(module,values,changes,images=[],messages=''){
 if(!Array.isArray(changes)||changes.length>module.fields.length)throw Error('변경안 형식이 올바르지 않습니다.');
 const seen=new Set();const allowedMedia=new Set(Object.values(values).filter(v=>typeof v==='string'));
 for(const url of messages.match(/https:\/\/[^\s<>"'）)]+|\/assets\/[^\s<>"'）)]+/g)||[])allowedMedia.add(url);
 return changes.map(change=>{
  if(!change||Object.keys(change).some(k=>!['fieldId','value'].includes(k)))throw Error('허용되지 않은 편집 동작입니다.');
  const field=module.fields.find(f=>f.id===change.fieldId);
  if(!field||seen.has(field.id)||!validValue(field,change.value,images))throw Error('선택 영역의 허용된 항목만 수정할 수 있습니다.');seen.add(field.id);
  if(field.type!=='text'&&!change.value.startsWith('attachment:')&&change.value!==''&&!allowedMedia.has(change.value))throw Error('사진·영상은 관리자가 제공한 주소나 첨부 파일만 사용할 수 있습니다.');
  return {fieldId:field.id,before:values[field.id],after:change.value};
 }).filter(change=>change.before!==change.after);
}
function responseSchema(module){return {type:'object',additionalProperties:false,properties:{status:{type:'string',enum:['proposal','question','unsupported']},message:{type:'string'},changes:{type:'array',items:{type:'object',additionalProperties:false,properties:{fieldId:{type:'string',enum:module.fields.map(f=>f.id)},value:{type:'string'}},required:['fieldId','value']}}},required:['status','message','changes']};}
function demoProposal(module,values,message,history=[],images=[]){
 const all=history.filter(t=>t.role==='user').map(t=>t.text).concat(message).join('\n');
 if(/레이아웃|글꼴|폰트|색상|배경색|HTML|CSS|새.*페이지|카드.*추가|영역.*추가/i.test(message))return {status:'unsupported',message:'기본 틀은 유지합니다. 이 영역의 문구·사진·영상 변경을 요청해주세요.',changes:[]};
 let fields=module.fields.filter(f=>f.type==='text');let changes=[];
 if(module.kind==='review'&&/후기|소감|수업/.test(all)){
  const facts=all.match(/(?:소감|실제 후기|수업 내용|실제 내용)\s*[:：]\s*([^\n]+)/)?.[1];
  if(!facts)return {status:'question',message:'어떤 수업이었고 수강생이 실제로 어떤 소감을 전했나요? 예: “소감: 처음에는 긴장했지만 대본을 함께 읽으며 편해졌어요.” 사진은 후기 카드의 대표 사진으로 사용할 수 있습니다.',changes:[]};
  const body=fields.find(f=>f.id.startsWith('body-'));const title=fields.find(f=>f.id.startsWith('headline-'));
  if(body)changes.push({fieldId:body.id,value:facts});if(title)changes.push({fieldId:title.id,value:facts.slice(0,42)});
 }else{
  const target=/제목/.test(message)?fields.find(f=>/^(headline|h[1-4])-/.test(f.id)):/소개|본문|설명/.test(message)?[...fields].sort((a,b)=>values[b.id].length-values[a.id].length)[0]:fields.find(f=>message.includes(f.label));
  const quoted=message.match(/[“"「]([^”"」]+)[”"」]/)?.[1]||message.match(/(?:문구|제목|소개|본문)(?:를|을)?\s*[:：]\s*(.+)/)?.[1];
  if(target&&quoted)changes.push({fieldId:target.id,value:quoted});
  else if(target&&/짧|줄여|간결/.test(message)){const value=values[target.id];changes.push({fieldId:target.id,value:value.split(/[.!?。]\s*|\n/).filter(Boolean)[0]+(value.includes('.')?'.':'')});}
 }
 const media=module.fields.find(f=>f.type===(/영상/.test(message)?'video':'image'));const url=all.match(/https:\/\/[^\s<>"'）)]+|\/assets\/[^\s<>"'）)]+/)?.[0];
 if(media&&/사진|이미지|영상|후기/.test(all)){if(images.length&&media.type==='image')changes.push({fieldId:media.id,value:'attachment:'+images[0].id});else if(url)changes.push({fieldId:media.id,value:url});}
 return changes.length?{status:'proposal',message:'시연용 변경안입니다. 기본 틀을 유지하고 아래 항목만 변경합니다.',changes}:{status:'question',message:'어느 문구를 어떻게 바꿀지 알려주세요. 예: “제목을 ‘나의 새로운 시작’으로 바꿔줘.” 시연 모드는 제공한 문구와 단순 축약만 처리하며 사진 내용을 해석하지 않습니다.',changes:[]};
}
module.exports={validValue,validateChanges,responseSchema,demoProposal};
