function contentDiff(current={},target={}){
 const result=[];
 for(const page of new Set([...Object.keys(current),...Object.keys(target)])){
  const before=new Map((current[page]||[]).map(e=>[e.key,e]));
  const after=new Map((target[page]||[]).map(e=>[e.key,e]));
  for(const key of new Set([...before.keys(),...after.keys()])){
   const a=before.get(key),b=after.get(key);
   if(a?.value===b?.value&&a?.type===b?.type)continue;
   result.push({page,key,type:b?.type||a?.type,before:a?.value??null,after:b?.value??null});
  }
 }
 return result;
}
module.exports={contentDiff};
