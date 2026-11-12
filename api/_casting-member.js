const member=require('./_member');
const {phoneError}=require('../src/members/model.cjs');
async function requireCastingMember(req){
 const user=await member.user(req);
 if(!user||!user.email_confirmed_at)throw Object.assign(Error('로그인 후 오디션에 지원해주세요.'),{status:401});
 const profile=await member.profile(user);
 if(profile.status!=='active')throw Object.assign(Error('현재 이용할 수 없는 계정입니다.'),{status:403});
 if(!profile.consented_at||member.validateProfile(profile)||phoneError(profile.phone))throw Object.assign(Error('내 계정에서 이름·연락처와 필수 동의를 확인해 가입을 완료해주세요.'),{status:403});
 return user;
}
module.exports={requireCastingMember};
