const PLATFORMS = [
  {key:'naver',name:'네이버',domains:['naver.com','naver.me']},
  {key:'google',name:'구글',domains:['google.com','google.co.kr','google.co.jp','google.co.uk']},
  {key:'instagram',name:'인스타그램',domains:['instagram.com']},
  {key:'facebook',name:'페이스북',domains:['facebook.com','fb.com','fb.me']},
  {key:'kakao',name:'카카오',domains:['kakao.com']},
  {key:'daum',name:'다음',domains:['daum.net']},
  {key:'youtube',name:'유튜브',domains:['youtube.com','youtu.be']},
  {key:'internal',name:'홈페이지 내부 이동',domains:['kactstar.com']},
];
function sourceName(hostname) {
  if (!hostname) return '직접 방문·확인 불가';
  if (['others','other','__others','__other'].includes(hostname.toLowerCase())) return '기타 경로';
  const host=hostname.toLowerCase();
  return PLATFORMS.find(p=>p.domains.some(domain=>host===domain||host.endsWith('.'+domain)))?.name || hostname;
}
function platformFilter(platform) { return '('+platform.domains.map(domain=>`referrerHostname eq '${domain}' or endswith(referrerHostname, '.${domain}')`).join(' or ')+')'; }
module.exports={sourceName,PLATFORMS,platformFilter};
