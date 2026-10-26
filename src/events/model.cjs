const genders=['여성','남성','기타','응답 안 함'];
const ageGroups=['10대 이하','20대','30대','40대','50대','60대 이상'];
const interests=['취미·자기표현','배우 준비','카메라·영상 연기','무대 연기','오디션','시니어 연기·모델','기타'];
const experiences=['처음이에요','취미로 배운 적 있어요','전문 교육을 받고 있어요','배우·공연 활동 경험이 있어요'];
function validateSurvey(body){
 if(!genders.includes(body.gender))return '성별을 선택해주세요. 응답 안 함도 선택할 수 있습니다.';
 if(!ageGroups.includes(body.ageGroup))return '연령대를 선택해주세요.';
 if(!Array.isArray(body.interests)||body.interests.length<1||body.interests.length>interests.length||new Set(body.interests).size!==body.interests.length||body.interests.some(v=>!interests.includes(v)))return '관심 분야를 한 가지 이상 선택해주세요.';
 if(!experiences.includes(body.experience))return '연기 경험을 선택해주세요.';
 if(body.question!==undefined&&(typeof body.question!=='string'||body.question.length>500))return '특강 사전 질문은 500자 이내로 입력해주세요.';
 return null;
}
module.exports={genders,ageGroups,interests,experiences,validateSurvey};
