const scenes=require('./scenes.cjs');
const reference='https://blog.naver.com/warmspeech3/222022193751';
// Brief quotations only. The practice notes are original, not excerpts from a film script.
const seeds=[
 ['veteran','베테랑','당황에서 분노로','어이가 없네.','상대의 말이 믿기지 않는 순간. 바로 소리치기보다, 방금 들은 말을 이해하려는 짧은 침묵에서 시작합니다.',['말을 듣고 반응을 잠시 멈춥니다.','상대를 다시 바라보며 확인하려 합니다.','한 줄을 말하고 상대의 반응을 기다립니다.']],
 ['spring','봄날은 간다','붙잡고 싶은 마음','어떻게 사랑이 변하니?','떠나려는 상대에게 던지는 질문. 답을 받아내려는 것인지, 떠나지 말라는 말인지 먼저 정해봅니다.',['상대가 떠날 수 있다는 사실을 받아들입니다.','묻고 싶은 말을 쉽게 꺼내지 못합니다.','질문을 건넨 뒤 상대의 대답을 듣습니다.']],
 ['oldboy','올드보이','의심과 확인','누구냐 넌?','정체를 알 수 없는 상대를 마주한 순간. 두려움과 경계 중 무엇을 감추려는지 정해봅니다.',['상대와 거리를 유지하며 관찰합니다.','확인할 단서를 찾듯 시선을 옮깁니다.','짧게 묻고, 대답을 기다리는 긴장을 유지합니다.']],
 ['lady-vengeance','친절한 금자씨','선을 긋는 순간','너나 잘하세요.','원하지 않는 간섭을 멈추게 하는 한마디. 비꼼보다 관계에서 거리를 정하는 행동으로 접근해봅니다.',['상대의 말을 끝까지 듣습니다.','더 설명하지 않기로 선택합니다.','짧게 말한 뒤 시선을 거두며 장면을 마칩니다.']]
];
const builtins=seeds.map(([id,work,title,script,context,beats])=>({id:'sample-'+id,title,work,author:'영화 대사 짧은 인용',script,context,beats,...scenes['sample-'+id],source:reference,notice:'명대사 한 줄을 인용한 연습 자료입니다. 작품의 대표 장면 사진과 별도 작성한 연습 안내를 함께 제공합니다. 인용 대사의 정확한 순간을 재현한 자료는 아닙니다.',rights:'brief-quote',rightsNote:'짧은 대사 인용과 연기 연습 설명',builtin:true}));
function scriptText(s){return `${s.work} — ${s.title}\n\n${s.context}\n\n[대사]\n${s.script}\n\n[연습 안내]\n${s.beats.map((b,i)=>`${i+1}. ${b}`).join('\n')}\n\n${s.notice}\n출처: ${s.source}\n김정태 배우아카데미 · AI 오디션\n`;}
module.exports={builtins,scriptText};
