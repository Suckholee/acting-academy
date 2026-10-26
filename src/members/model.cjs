function safeReturn(value){if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||/[\u0000-\u0020\\]/.test(value))return '/account';try{const url=new URL(value,'https://academy.invalid');return url.origin==='https://academy.invalid'&&!url.pathname.startsWith('/admin')?url.pathname+url.search+url.hash:'/account';}catch{return '/account';}}
function passwordError(value){return typeof value==='string'&&value.length>=12&&value.length<=128?null:'비밀번호는 12~128자로 입력해주세요. 붙여넣기와 비밀번호 관리자를 사용할 수 있습니다.';}
module.exports={safeReturn,passwordError};

const reservedUsernames=new Set(['admin','administrator','root','support','system','kakao','google','account','signup','login']);
function normalizeUsername(value){return typeof value==='string'?value.trim().toLowerCase():'';}
function usernameError(value){const name=normalizeUsername(value);return /^[a-z][a-z0-9_]{3,19}$/.test(name)&&!reservedUsernames.has(name)?null:'아이디는 영문으로 시작하는 4~20자의 영문·숫자·밑줄로 입력해주세요. 일부 운영용 아이디는 사용할 수 없습니다.';}
function phoneError(value){return typeof value==='string'&&/^01[016789]\d{7,8}$/.test(value.replace(/[ -]/g,''))?null:'휴대전화 번호를 확인해주세요.';}
module.exports.normalizeUsername=normalizeUsername;module.exports.usernameError=usernameError;module.exports.phoneError=phoneError;
