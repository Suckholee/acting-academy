function translationInfo(s){
 const t=s.translation;if(t===undefined)return {};
 if(!s.license||s.language!=='en'||!t||t.sourceScript!==s.script||!Array.isArray(s.turns)||!Array.isArray(t.turns)||t.turns.length!==s.turns.length||t.turns.some((v,i)=>typeof v!=='string'||!v.trim()||v.length>6000||(!/[가-힣]/.test(v)&&/[A-Za-z]/.test(s.turns[i].text))))throw Error('translation');
 return {translation:{sourceScript:t.sourceScript,turns:[...t.turns]}};
}
function practiceScript(s,language='original'){
 if(language!=='ko'||!s.translation)return s;
 try{translationInfo(s);}catch{return s;}
 const turns=s.turns.map((t,i)=>({...t,text:s.translation.turns[i]})),script=turns.map(t=>`${t.speaker}(${t.label}): ${t.text}`).join('\n\n');
 return {...s,script,turns,practiceLanguage:'ko',languageLabel:'한국어 번역 · 영어 원작',author:s.author.replace('외국어 대사(영어)','영어 원문 · 한국어 연습 번역'),notice:'영어 원문을 바탕으로 만든 AI 한국어 번역입니다. 연습을 위한 비공식 번역이며, 원문과 함께 뜻과 말투를 확인할 수 있습니다. 역할·출처·재사용 조건을 유지했습니다.',license:{...s.license,changes:s.license.changes+' Korean practice translation added by 김정태 배우아카데미 (AI-assisted, unofficial).'}};
}
module.exports={translationInfo,practiceScript};
