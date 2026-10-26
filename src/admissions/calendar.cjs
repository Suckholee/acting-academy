const key=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const stamp=value=>Date.parse(value+'T00:00:00+09:00');
const shift=(value,days)=>key(stamp(value)+days*86400000);
function move(value,mode,direction){if(mode!=='month')return shift(value,direction*(mode==='week'?7:1));const [y,m,d]=value.split('-').map(Number),target=new Date(Date.UTC(y,m-1+direction,1)),last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();return `${target.getUTCFullYear()}-${String(target.getUTCMonth()+1).padStart(2,'0')}-${String(Math.min(d,last)).padStart(2,'0')}`;}
function period(value,mode){const weekday=new Date(stamp(value)+9*3600000).getUTCDay();let start=value,end=shift(value,1);if(mode==='week'){start=shift(value,-((weekday+6)%7));end=shift(start,7);}if(mode==='month'){start=value.slice(0,7)+'-01';end=move(start,'month',1);}return {start,end};}
function dates(start,end){const result=[];for(let d=start;d<end;d=shift(d,1))result.push(d);return result;}
function monthDays(value){const p=period(value,'month');return dates(period(p.start,'week').start,period(shift(p.end,-1),'week').end);}
const intersects=(r,start,end)=>Boolean(r.startsAt&&r.endsAt&&Date.parse(r.startsAt)<stamp(end)&&Date.parse(r.endsAt)>stamp(start));
function lanes(records){const ends=[],result=[];for(const record of [...records].sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt))){let lane=ends.findIndex(end=>end<=Date.parse(record.startsAt));if(lane<0)lane=ends.length;ends[lane]=Date.parse(record.endsAt);result.push({record,lane});}return result.map(item=>({...item,total:Math.max(1,ends.length)}));}
module.exports={lanes,key,stamp,shift,move,period,dates,monthDays,intersects};
