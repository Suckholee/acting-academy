const {REFRESH_MS,createAnalyticsFetcher,failurePayload}=require('../src/analytics/upstream.cjs');
const auth = require('./_admin');
const {PLATFORMS,platformFilter}=require('../src/analytics/source-model.cjs');
const {koreaDay} = require('./admin-visitor-stats');
const PROJECT = 'prj_ZZJdL6kTW3dIAZOgbm7S2bllroeY';
const TEAM = 'team_1iI5hBBebN7W1DlmCgfKxza0';
const PERIODS = {today:1, '7d':7, '30d':30};

function createHandler({authorize=auth.requireAdmin, fetcher=fetch, now=()=>new Date(), token=()=>process.env.VERCEL_ANALYTICS_TOKEN}={}) {
  fetcher=createAnalyticsFetcher(fetcher,{now});
  const cache = new Map(), pending = new Map();
  async function query(date, period) {
    const secret = token();
    if (!secret) throw Error('not_configured');
    const day = koreaDay(date), midnight = new Date(day + 'T00:00:00+09:00').getTime();
    const since = new Date(midnight - (PERIODS[period]-1)*86400000).toISOString();
    async function aggregate(by,filter) {
      const params=new URLSearchParams({projectId:PROJECT,teamId:TEAM,by,filter,since,until:date.toISOString(),limit:'20'});
      const response=await fetcher('https://api.vercel.com/v1/query/web-analytics/visits/aggregate?'+params,{headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw Error('upstream_failed');
      const data=await response.json();
      if(!Array.isArray(data.data)||data.query?.since!==since)throw Error('invalid_range');
      for(const row of data.data)if(!Number.isSafeInteger(row?.visitors)||row.visitors<0||!Number.isSafeInteger(row.pageviews)||row.pageviews<0)throw Error('invalid_counts');
      return data.data;
    }
    const production="environment eq 'production'";
    // Query each platform as a single production group so one visitor who used
    // two Facebook hostnames is counted once. The remaining query excludes all
    // known platforms, including addresses outside its top-20 hostname results.
    const groups=await Promise.all(PLATFORMS.map(async platform=>{
      const rows=await aggregate('environment',production+' and '+platformFilter(platform));
      if(rows.length>1||rows[0]&&rows[0].environment!=='production')throw Error('invalid_group');
      if(!rows.length||!rows[0].visitors&&!rows[0].pageviews)return null;
      return {hostname:platform.domains[0],visitors:rows[0].visitors,pageviews:rows[0].pageviews,grouped:true};
    }));
    const remaining=await aggregate('referrerHostname',production+' and not ('+PLATFORMS.map(platformFilter).join(' or ')+')');
    const other=remaining.map(row=>{
      const hostname=row.referrerHostname??'';
      if(typeof hostname!=='string'||hostname.length>253||!/^[a-zA-Z0-9._-]*$/.test(hostname))throw Error('invalid_sources');
      return {hostname,visitors:row.visitors,pageviews:row.pageviews,grouped:false};
    });
    const sources=[...groups.filter(Boolean),...other].sort((a,b)=>b.visitors-a.visitors||b.pageviews-a.pageviews);
    return {period, sources, from:koreaDay(new Date(since)), through:day, timezone:'Asia/Seoul', updatedAt:date.toISOString()};
  }
  return async (req,res) => {
    res.setHeader('Cache-Control','private, no-store');
    if (!await authorize(req,res)) return;
    if (req.method !== 'GET') return res.status(405).json({error:'지원하지 않는 요청입니다.'});
    const period = new URL(req.url || '/api/admin-visitor-sources','http://localhost').searchParams.get('period') || 'today';
    if (!Object.hasOwn(PERIODS,period)) return res.status(400).json({error:'조회 기간을 확인해주세요.'});
    const date = now(), day = koreaDay(date), saved = cache.get(period);
    try {
      if (saved?.day === day && date.getTime()-saved.at < REFRESH_MS) return res.json(saved.data);
      let task = pending.get(period);
      if (!task || task.day !== day) {
        task = {day};
        const current = task;
        task.promise = query(date,period).then(data=>{cache.set(period,{day,at:date.getTime(),data});return data;})
          .finally(()=>{if(pending.get(period)===current)pending.delete(period);});
        pending.set(period,task);
      }
      return res.json(await task.promise);
    } catch (error) { const failure=failurePayload(error,'유입 경로를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.');if(saved?.day===day)return res.json({...saved.data,stale:true,warning:failure.error,...(failure.retryAt?{retryAt:failure.retryAt}:{})});return res.status(503).json(failure); }
  };
}
module.exports = createHandler();
module.exports.createHandler = createHandler;
