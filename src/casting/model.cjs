const MAX_FILE = 10 * 1024 * 1024;
const TYPES = {
 pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
 xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};
const PHOTO_TYPES={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
const PHOTO_SLOTS=['main','upper','full'];
function validPhoto(f){const ext=typeof f?.name==='string'&&f.name.split('.').pop().toLowerCase();return Boolean(PHOTO_TYPES[ext]&&f.type===PHOTO_TYPES[ext]&&f.name.length<=180&&Number.isInteger(f.size)&&f.size>0&&f.size<=MAX_FILE);}
const STATUSES = ['접수', '검토 중', '연락 예정', '심사 완료'];
const SEED = {
 title: '《악인의 방식》(가제) 공개 오디션', status: 'draft', actingVideoSeconds: 60,
 description: '김정태 배우아카데미 × 스토리나인 제작 숏폼드라마 《악인의 방식》(가제)의 배우를 모집합니다.\n성인 지원자 대상이며 연기 경력은 무관합니다.\n배우 프로필, 자기소개 영상 약 30초, 자유연기 영상 1분 이내를 제출해 주세요. 영상은 담당자가 열람 가능한 링크로 제출해 주세요.\n1차 오디션: 2026년 11월 28일~12월 2일 / 촬영: 2027년 3월 예정',
 location: '김정태 배우아카데미 · 서울 강서구 마곡동',
 opensAt: '2026-11-12T00:00:00+09:00', closesAt: '2026-11-21T00:00:00+09:00',
 roles: ['현옥 (40대 여성)', '독사 (40~50대 남성)', '여주 (30대 여성)', '희나 (40대 여성)', '가희 (30대 후반 여성)', '휴대폰 대리점 사장 (30대 남성)', '불량 청소년 (성인 지원자)', '스미모토 (50~60대 남성)', '배역 미지정'],
 dates: ['2026-11-28', '2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02'],
 filming: '2027년 3월 예정', organizer: '주식회사 스토리나인', retention: '지원서 제출일로부터 1년간 보관 후 파기'
};
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
function text(value, min, max) { return typeof value === 'string' && value.trim().length >= min && value.length <= max; }
function list(value, max) { return Array.isArray(value) && value.length > 0 && value.length <= max && new Set(value).size === value.length && value.every(v => text(v, 1, 100)); }
function validateCampaign(c) {
 if (!c || !text(c.title, 2, 120) || !text(c.description, 1, 12000) || !text(c.location, 1, 200) || !text(c.organizer, 1, 120) || !text(c.filming, 1, 200)) return '공고명·소개·장소·주최·촬영 일정을 입력해주세요.';
 if(c.accessMode!==undefined&&!['public','invite'].includes(c.accessMode))return '공고 접근 범위를 확인해주세요.';
 if(c.retentionDays!==undefined&&![30,90,180,365].includes(c.retentionDays))return '보관 기간을 확인해주세요.';
 if(c.autoDelete!==undefined&&typeof c.autoDelete!=='boolean')return '자동 파기 설정을 확인해주세요.';
 if(c.actingVideoSeconds!==undefined&&![60,120].includes(c.actingVideoSeconds))return '자유연기 영상 길이를 확인해주세요.';
 if(c.posterUrl && !safeUrl(c.posterUrl)) return '공고 포스터의 전체 주소를 확인해주세요.';
 if(c.category && !text(c.category,1,30)) return '작품 종류를 확인해주세요.';
 if (!['draft', 'published', 'closed'].includes(c.status)) return '공개 상태를 확인해주세요.';
 if (!Number.isFinite(Date.parse(c.opensAt)) || !Number.isFinite(Date.parse(c.closesAt)) || Date.parse(c.closesAt) <= Date.parse(c.opensAt)) return '접수 종료는 시작보다 늦어야 합니다.';
 if (!list(c.roles, 30) || !list(c.dates, 30) || c.dates.some(d => !/^\d{4}-\d{2}-\d{2}$/.test(d) || !Number.isFinite(Date.parse(d)) || new Date(d).toISOString().slice(0,10) !== d)) return '배역과 오디션 날짜를 중복 없이 입력해주세요.';
 if(c.roleDetails!==undefined){if(!c.roleDetails||typeof c.roleDetails!=='object'||Array.isArray(c.roleDetails)||Object.keys(c.roleDetails).length>30)return '배역 정보를 확인해주세요.';for(const [name,v]of Object.entries(c.roleDetails)){if(!c.roles.includes(name)||!v||!text(v.description||'',0,2000)||!text(v.question||'',0,500)||(v.sidesUrl&&!safeUrl(v.sidesUrl)))return '배역 설명·추가 질문·대본 주소를 확인해주세요.';}}
 return null;
}
function cleanCampaign(c) { return Object.fromEntries(['actingVideoSeconds','accessMode','inviteHash','retentionDays','autoDelete','roleDetails','posterUrl','category','title', 'description', 'location', 'organizer', 'filming', 'opensAt', 'closesAt', 'roles', 'dates', 'status'].map(k => [k, typeof c[k] === 'string' ? c[k].trim() : c[k]]).concat([['retention',c.retentionDays&&c.retentionDays!==365?'지원서 제출일로부터 '+c.retentionDays+'일간 보관 후 파기':SEED.retention]])); }
function phase(c, now = Date.now()) { return c.status !== 'published' ? (c.status === 'draft' ? '비공개 초안' : '접수 마감') : now < Date.parse(c.opensAt) ? '접수 예정' : now >= Date.parse(c.closesAt) ? '접수 마감' : '접수 중'; }
function validFile(f) { const ext = typeof f?.name === 'string' && f.name.split('.').pop().toLowerCase(); return Boolean(ext && TYPES[ext] && f.name.length <= 180 && Number.isInteger(f.size) && f.size > 0 && f.size <= MAX_FILE && (!f.type || f.type === TYPES[ext] || f.type === 'application/octet-stream')); }
function fileType(f) { return TYPES[f.name.split('.').pop().toLowerCase()]; }
function safeUrl(value) { try { const u = new URL(value); return value.length <= 2000 && ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password; } catch { return false; } }
function validateApplication(a, c, now = Date.now()) {
 if (!a || !text(a.name, 2, 40)) return '성명을 2~40자로 입력해주세요.';
 const year = Number(new Date(now).toLocaleDateString('en-CA', {timeZone:'Asia/Seoul'}).slice(0,4));
 if (!/^\d{4}$/.test(String(a.birthYear)) || +a.birthYear < 1900 || +a.birthYear > year) return '출생연도를 네 자리 숫자로 입력해주세요.';
 if (!['남성', '여성', '기타'].includes(a.gender)) return '성별을 선택해주세요.';
 if (typeof a.phone !== 'string' || !/^01[016789]\d{7,8}$/.test(a.phone.replace(/[ -]/g,''))) return '휴대전화 번호를 확인해주세요.';
 if (!text(a.email || '', 0, 200) || (a.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email))) return '이메일 주소를 확인해주세요.';
 if (!text(a.region, 1, 100)) return '거주 지역을 시·군·구까지 입력해주세요.';
 if (!list(a.roles, 30) || a.roles.some(r => !c.roles.includes(r))) return '지원 배역을 선택해주세요.';
 if (!['있음','없음'].includes(a.otherRoles)) return '다른 배역 제안 의향을 선택해주세요.';
 if (!text(a.agency || '',0,500) || !text(a.experience,1,4000) || !text(a.skills || '',0,2000) || !text(a.notes || '',0,2000)) return '경력을 입력하고 각 항목의 글자 수를 확인해주세요.';
 if (!safeUrl(a.introUrl) || !safeUrl(a.actingUrl)) return '자기소개·자유연기 영상의 전체 링크를 입력해주세요.';
 if (!list(a.dates,32) || a.dates.some(d => ![...c.dates,'전 일정 가능','별도 협의 필요'].includes(d))) return '오디션 참석 가능일을 선택해주세요.';
 if (a.dates.length > 1 && a.dates.some(d => ['전 일정 가능','별도 협의 필요'].includes(d))) return '전 일정 가능·별도 협의는 다른 날짜와 함께 선택할 수 없습니다.';
 if (!['가능','일정 협의 필요','어려움'].includes(a.filmingAvailability)) return '촬영 참여 가능 여부를 선택해주세요.';
 if (a.adult !== true || a.consent !== true) return '성인 확인과 개인정보 수집·이용 동의가 필요합니다.';
 for(const role of a.roles){const question=c.roleDetails?.[role]?.question;if(question&&!text(a.roleAnswers?.[role],1,500))return role+' 추가 질문에 500자 이내로 답변해주세요.';}
 if(a.roleAnswers!==undefined&&(!a.roleAnswers||typeof a.roleAnswers!=='object'||Array.isArray(a.roleAnswers)||Object.keys(a.roleAnswers).length>30||Object.values(a.roleAnswers).some(v=>!text(v,0,500))))return '배역별 답변을 확인해주세요.';
 if (a.website) return '입력 내용을 확인해주세요.';
 return null;
}
function cleanApplication(a) { const keys = ['roleAnswers','name','birthYear','gender','phone','email','region','roles','otherRoles','agency','experience','skills','introUrl','actingUrl','dates','filmingAvailability','notes','adult','consent','aiConsent','consultationConsent']; const result=Object.fromEntries(keys.map(k => [k,typeof a[k] === 'string' ? a[k].trim() : a[k]]));result.aiConsent=a.aiConsent===true;result.consultationConsent=a.consultationConsent===true;result.phone=result.phone.replace(/[ -]/g,'');return result; }
function actingVideoLength(c){return c?.actingVideoSeconds===60?'1분 이내':'2분 이내';}
module.exports = {actingVideoLength,PHOTO_TYPES,PHOTO_SLOTS,validPhoto,MAX_FILE,TYPES,STATUSES,SEED,uuid,validateCampaign,cleanCampaign,phase,validFile,fileType,safeUrl,validateApplication,cleanApplication};
