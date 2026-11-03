const {builtins}=require('./catalog.cjs');
const {selection}=require('./model.cjs');
// Curated geometry of the supplied stills, relative to the displayed image.
// Overrides with a different photograph/face box are excluded until curated.
const profiles={
 'sample-veteran':{direction:'front',tilt:'level',framing:'medium',clarity:3},
 'sample-spring':{direction:'right',tilt:'down',framing:'medium',clarity:2},
 'sample-oldboy':{direction:'front',tilt:'level',framing:'close',clarity:4},
 'sample-lady-vengeance':{direction:'right',tilt:'level',framing:'medium',clarity:2},
 'sample-extreme-job':{direction:'left',tilt:'down',framing:'close',clarity:3},
 'sample-masquerade':{direction:'front',tilt:'level',framing:'close',clarity:5},
 'sample-parasite':{direction:'right',tilt:'level',framing:'far',clarity:0},
 'sample-sunny':{direction:'right',tilt:'down',framing:'close',clarity:3},
 'sample-ode-to-my-father':{direction:'right',tilt:'level',framing:'medium',clarity:3},
 'sample-roaring-currents':{direction:'right',tilt:'down',framing:'close',clarity:1}
};
function parseObservation(v){if(!v||!['single','multiple','none','unclear'].includes(v.face)||!['front','left','right','unknown'].includes(v.direction)||!['level','up','down','unknown'].includes(v.tilt)||!['close','medium','far','unknown'].includes(v.framing))throw Error('observation');let faceBox=null;try{if(v.face==='single')faceBox=selection(v.faceBox);}catch{}return {face:faceBox||v.face!=='single'?v.face:'unclear',direction:v.direction,tilt:v.tilt,framing:v.framing,faceBox};}
function pick(scripts,raw){const v=parseObservation(raw);if(v.face!=='single'||v.direction==='unknown')return {scriptId:null,reason:v.face==='multiple'?'여러 얼굴이 보여 한 장면을 고르기 어렵습니다. 혼자 나온 사진으로 다시 추천받거나, 아래에서 직접 작품을 선택해주세요.':'얼굴 방향을 확인하기 어렵습니다. 밝은 곳에서 얼굴이 잘 보이게 찍거나, 아래에서 직접 작품을 선택해주세요.'};
 const candidates=scripts.flatMap(s=>{const p=profiles[s.id],b=builtins.find(b=>b.id===s.id);if(!p||!b||s.image!==b.image||JSON.stringify(s.target)!==JSON.stringify(b.target))return [];const score=(p.direction===v.direction?18:p.direction==='front'||v.direction==='front'?4:-10)+(p.tilt===v.tilt?4:0)+(p.framing===v.framing?2:0)+p.clarity;return [{s,p,score}];}).sort((a,b)=>b.score-a.score);
 if(!candidates.length)return {scriptId:null,reason:'지금은 추천할 장면이 준비되지 않았습니다. 아래에서 직접 작품을 선택해주세요.'};
 const {s,p}=candidates[0],direction={front:'정면',left:'화면 왼쪽을 향한',right:'화면 오른쪽을 향한'};
 const reason=p.direction===v.direction?'사진과 비슷한 '+direction[p.direction]+' 얼굴 방향을 가진 장면입니다.':'사진과 얼굴 방향 차이가 비교적 적은 장면을 골랐습니다.';
 return {scriptId:s.id,reason:reason+(p.clarity>=3?' 얼굴도 비교적 크게 보여 합성을 시작하기 좋습니다.':' 선택 전에 장면 속 얼굴 방향을 확인해주세요.')};
}
module.exports={profiles,parseObservation,pick};
