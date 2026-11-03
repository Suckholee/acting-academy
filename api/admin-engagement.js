const {REFRESH_MS,createAnalyticsFetcher,failurePayload}=require('../src/analytics/upstream.cjs');
const auth=require('./_admin');
const store=require('./_cms-store');
const {EVENT,TAG}=require('./event-application');
const {koreaDay}=require('./admin-visitor-stats');
const {SECTIONS,TIME_EVENTS}=require('../src/analytics/sections.cjs');
const {FORM_PAGES,COLLECTION_ENABLED_AT}=require('../src/analytics/form-measurement.cjs');
const PROJECT='prj_ZZJdL6kTW3dIAZOgbm7S2bllroeY',TEAM='team_1iI5hBBebN7W1DlmCgfKxza0';
const PERIODS={today:1,'7d':7,'30d':30};
function summarize(rows){
  const result=new Map(SECTIONS.map(section=>[section.id,{id:section.id,label:section.label,visitors:0,seconds:0}]));
  for(const row of rows){
    const id=row['eventData/section']??row.eventData?.section??(typeof row.eventData==='string'?row.eventData:null);
    const section=result.get(id),event=row.eventName;
    if(!section||!['section_seen',...Object.keys(TIME_EVENTS)].includes(event)||!Number.isSafeInteger(row.count)||row.count<0||!Number.isSafeInteger(row.visitors)||row.visitors<0)throw Error('invalid_engagement');
    if(event==='section_seen')section.visitors=row.visitors;else section.seconds+=row.count*TIME_EVENTS[event];
  }
  return [...result.values()].filter(section=>section.visitors||section.seconds).map(section=>({...section,averageSeconds:section.visitors?Math.round(section.seconds/section.visitors):null})).sort((a,b)=>(b.averageSeconds??0)-(a.averageSeconds??0)||b.seconds-a.seconds);
}
function createHandler({authorize=auth.requireAdmin,fetcher=fetch,now=()=>new Date(),token=()=>process.env.VERCEL_ANALYTICS_TOKEN,countApplications=route=>store.count(route)}={}){
  fetcher=createAnalyticsFetcher(fetcher,{now});
  const cache=new Map(),pending=new Map();
  async function query(date,period){
    const secret=token();if(!secret)throw Error('not_configured');
    const through=koreaDay(date),since=new Date(new Date(through+'T00:00:00+09:00').getTime()-(PERIODS[period]-1)*86400000).toISOString();
    const params=new URLSearchParams({projectId:PROJECT,teamId:TEAM,since,until:date.toISOString(),limit:'100',filter:"environment eq 'production' and eventName in ('section_seen','section_time_10s','section_time_5s','section_time_1s')"});
    params.append('by','eventName');params.append('by','eventData/section');
    const visitorsFor=async(path,filter,traffic=false)=>{
      const q=new URLSearchParams({projectId:PROJECT,teamId:TEAM,since,until:date.toISOString(),limit:'10',by:'environment',filter});
      const response=await fetcher('https://api.vercel.com/v1/query/web-analytics/'+path+'/aggregate?'+q,{headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw Error('coverage_unavailable');const payload=await response.json();
      if(payload.query?.since!==since||!Array.isArray(payload.data)||payload.data.length>1||payload.data.some(row=>row.environment!=='production'||!Number.isSafeInteger(row.visitors)||row.visitors<0))throw Error('invalid_coverage');
      const row=payload.data[0];
      if(traffic){if(row&&(!Number.isSafeInteger(row.pageviews)||row.pageviews<0))throw Error('invalid_pageviews');return{pageVisitors:row?.visitors||0,pageviews:row?.pageviews||0};}
      return row?.visitors||0;
    };
    const coverageTask=Promise.all([visitorsFor('visits',"environment eq 'production'"),visitorsFor('events',"environment eq 'production' and eventName eq 'section_seen'")]).then(([visitors,trackedVisitors])=>({visitors,trackedVisitors})).catch(()=>null);
    const formPagesTask=Promise.all(FORM_PAGES.map(async({id,label,paths,enabledAt})=>{
      try{return{id,label,enabledAt,...await visitorsFor('visits',"environment eq 'production' and requestPath in ("+paths.map(path=>"'"+path+"'").join(',')+")",true)};}
      catch{return{id,label,enabledAt,pageVisitors:null,pageviews:null};}
    }));
    const countFor=(purpose,event)=>{
      const query=new URLSearchParams({select:'id',purposes:'cs.'+JSON.stringify([purpose]),created_at:'gte.'+since,limit:'1'});query.append('created_at','lt.'+date.toISOString());
      if(event)query.set('courses','cs.'+JSON.stringify([event]));else query.append('purposes','not.cs.'+JSON.stringify([TAG]));
      return Promise.resolve().then(()=>countApplications('/rest/v1/academy_inquiries?'+query)).then(count=>Number.isSafeInteger(count)&&count>=0?count:null).catch(()=>null);
    };
    const applicationsTask=countFor('수강 신청'),eventApplicationsTask=countFor(TAG,EVENT);
    const response=await fetcher('https://api.vercel.com/v1/query/web-analytics/events/aggregate?'+params,{headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw Error('upstream_failed');const data=await response.json();
    if(!Array.isArray(data.data)||data.query?.since!==since)throw Error('invalid_range');
    const sections=summarize(data.data);
    const formPages=(await formPagesTask).map(page=>({...page,measuredVisitors:sections.find(section=>section.id===page.id)?.visitors||0}));
    return{period,sections,formPages,collectionEnabledAt:COLLECTION_ENABLED_AT,coverage:await coverageTask,applications:await applicationsTask,eventApplications:await eventApplicationsTask,from:koreaDay(new Date(since)),through,startedOn:'2026-10-29',updatedAt:date.toISOString()};
  }
  return async(req,res)=>{
    res.setHeader('Cache-Control','private, no-store');if(!await authorize(req,res))return;
    if(req.method!=='GET')return res.status(405).json({error:'지원하지 않는 요청입니다.'});
    const period=new URL(req.url||'/api/admin-engagement','http://localhost').searchParams.get('period')||'today';
    if(!Object.hasOwn(PERIODS,period))return res.status(400).json({error:'조회 기간을 확인해주세요.'});
    const date=now(),day=koreaDay(date),saved=cache.get(period);
    try{
      if(saved?.day===day&&date.getTime()-saved.at<REFRESH_MS)return res.json(saved.data);
      let task=pending.get(period);if(!task||task.day!==day){task={day};const current=task;task.promise=query(date,period).then(data=>{cache.set(period,{day,at:date.getTime(),data});return data;}).finally(()=>{if(pending.get(period)===current)pending.delete(period);});pending.set(period,task);}
      return res.json(await task.promise);
    }catch(error){const failure=failurePayload(error,'체류 시간 통계를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.');if(saved?.day===day)return res.json({...saved.data,stale:true,warning:failure.error,...(failure.retryAt?{retryAt:failure.retryAt}:{})});return res.status(503).json(failure);}
  };
}
module.exports=createHandler();module.exports.createHandler=createHandler;module.exports.summarize=summarize;
