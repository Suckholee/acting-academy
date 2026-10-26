const auth = require('./_admin');
const store = require('./_cms-store');
const {EVENT, TAG} = require('./event-application');
function createHandler({database = store, requireAdmin = (...args) => auth.requireAdmin(...args)} = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    if (!await requireAdmin(req, res)) return;
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({error: '지원하지 않는 요청입니다.'}); }
    try {
      const records = await database.request('/rest/v1/academy_inquiries?select=id,name,phone,created_at,memo&purposes=cs.' + encodeURIComponent(JSON.stringify([TAG])) + '&courses=cs.' + encodeURIComponent(JSON.stringify([EVENT])) + '&order=created_at.asc,id.asc&limit=1000');
      return res.json({event: EVENT, capacity: 40, records: records.map(record => { let survey = {}; try { const parsed = JSON.parse(record.memo || '{}'); if(parsed.eventId === 'kim-jung-tae-20261107') survey = {gender:parsed.gender || '',ageGroup:parsed.ageGroup || '',interests:Array.isArray(parsed.interests) ? parsed.interests : [],experience:parsed.experience || '',question:parsed.question || ''}; } catch {} const {memo, ...basic} = record; return {...basic, survey}; })});
    } catch { return res.status(503).json({error: '특강 신청 명단을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'}); }
  };
}
module.exports = createHandler();
module.exports.createHandler = createHandler;
