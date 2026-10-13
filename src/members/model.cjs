function safeReturn(value){if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||/[\u0000-\u0020\\]/.test(value))return '/account';try{const url=new URL(value,'https://academy.invalid');return url.origin==='https://academy.invalid'&&!url.pathname.startsWith('/admin')?url.pathname+url.search+url.hash:'/account';}catch{return '/account';}}
function passwordError(value){return typeof value==='string'&&value.length>=12&&value.length<=128?null:'비밀번호는 12~128자로 입력해주세요. 붙여넣기와 비밀번호 관리자를 사용할 수 있습니다.';}
module.exports={safeReturn,passwordError};
