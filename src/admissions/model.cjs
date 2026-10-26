const STAGES=['신청','비대면 상담 진행','대면 상담 진행','확정'];
const normalizeStage=value=>({'신규':'신청','연락 중':'비대면 상담 진행','상담완료':'확정'}[value]||value);
function validate(data){
 if(!data||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(data.id)||!STAGES.includes(data.status)||!Number.isInteger(data.revision)||data.revision<0)return '상담 대상과 저장 버전을 확인해주세요.';
 if(data.counselor!==undefined&&(typeof data.counselor!=='string'||!data.counselor.trim()||data.counselor.trim().length>60))return '담당자는 1~60자로 입력해주세요.';
 if(typeof data.memo!=='string'||data.memo.length>4000)return '메모는 4,000자 이하로 입력해주세요.';
 if(data.startsAt||data.endsAt){const start=Date.parse(data.startsAt),end=Date.parse(data.endsAt);if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>4*60*60*1000)return '상담 시작·종료 시간(최대 4시간)을 확인해주세요.';}else if(data.status==='대면 상담 진행')return '대면 상담 날짜와 시간을 선택해주세요.';
 return null;
}
function validateProfile(data){
 if(!data||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(data.id))return '상담 대상을 확인해주세요.';
 if(typeof data.name!=='string'||data.name.trim().length<2||data.name.trim().length>40)return '이름은 2~40자로 입력해주세요.';
 if(typeof data.phone!=='string'||!/^01[016789]\d{7,8}$/.test(data.phone.replace(/[ -]/g,'')))return '휴대전화 번호를 확인해주세요.';
 for(const field of ['courses','purposes'])if(!Array.isArray(data[field])||!data[field].length||data[field].length>6||data[field].some(v=>typeof v!=='string'||!v.trim()||v.length>120))return '희망 과정과 수강 목적을 확인해주세요.';
 return null;
}
module.exports={STAGES,normalizeStage,validate,validateProfile};
