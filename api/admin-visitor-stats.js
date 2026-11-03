const {REFRESH_MS,createAnalyticsFetcher,failurePayload}=require('../src/analytics/upstream.cjs');
const auth = require('./_admin');

const PROJECT = 'prj_ZZJdL6kTW3dIAZOgbm7S2bllroeY';
const TEAM = 'team_1iI5hBBebN7W1DlmCgfKxza0';
const STARTED = '2026-10-29';
const CACHE_MS = REFRESH_MS;

function koreaDay(now) {
  return new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
}
function validCount(value) { return Number.isSafeInteger(value) && value >= 0; }

function createHandler({authorize = auth.requireAdmin, fetcher = fetch, now = () => new Date(), token = () => process.env.VERCEL_ANALYTICS_TOKEN} = {}) {
  fetcher=createAnalyticsFetcher(fetcher,{now});
  let cached = null;
  let pending = null;
  async function query(date) {
    const secret = token();
    if (!secret) throw Error('not_configured');
    const headers = {Authorization: 'Bearer ' + secret, 'Content-Type': 'application/json'};
    const today = koreaDay(date);
    const since = new Date(today + 'T00:00:00+09:00').toISOString();
    // One production group preserves distinct visitors across all hours.
    // Unlike the count endpoint, aggregate preserves the Korean midnight bound.
    const dailyParams = new URLSearchParams({projectId: PROJECT, teamId: TEAM,
      by: 'environment', filter: "environment eq 'production'", since, until: date.toISOString()});
    const [dailyResponse, totalResponse] = await Promise.all([
      fetcher('https://api.vercel.com/v1/query/web-analytics/visits/aggregate?' + dailyParams, {
        headers, signal: AbortSignal.timeout(12000),
      }),
      // This endpoint retains cumulative production counts beyond the reporting window.
      fetcher('https://api.vercel.com/v1/query/web-analytics/visits/count?' + new URLSearchParams({projectId: PROJECT, teamId: TEAM}), {
        headers, signal: AbortSignal.timeout(12000),
      }),
    ]);
    if (!dailyResponse.ok || !totalResponse.ok) throw Error('upstream_failed');
    const daily = await dailyResponse.json(), total = await totalResponse.json();
    if (!Array.isArray(daily.data) || daily.query?.since !== since || daily.data.length > 1) throw Error('invalid_daily_range');
    if (daily.data[0] && daily.data[0].environment !== 'production') throw Error('invalid_environment');
    const todayVisitors = daily.data.length ? daily.data[0].visitors : 0;
    const totalVisitors = total.data?.visitors;
    if (!validCount(todayVisitors) || !validCount(totalVisitors)) throw Error('invalid_counts');
    return {todayVisitors, totalVisitors, date: today, timezone: 'Asia/Seoul', startedOn: STARTED, updatedAt: date.toISOString()};
  }
  return async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    if (!await authorize(req, res)) return;
    if (req.method !== 'GET') return res.status(405).json({error: '지원하지 않는 요청입니다.'});
    const date = now(), day = koreaDay(date);
    try {
      if (cached && cached.day === day && date.getTime() - cached.at < CACHE_MS) return res.json(cached.data);
      if (!pending || pending.day !== day) {
        const task = {day};
        task.promise = query(date).then(data => { cached = {day, at: date.getTime(), data}; return data; }).finally(() => { if (pending === task) pending = null; });
        pending = task;
      }
      return res.json(await pending.promise);
    } catch (error) {
      const failure=failurePayload(error,'방문 통계를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.');
      if(cached?.day===day)return res.json({...cached.data,stale:true,warning:failure.error,...(failure.retryAt?{retryAt:failure.retryAt}:{})});
      return res.status(503).json(failure);
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
module.exports.koreaDay = koreaDay;
