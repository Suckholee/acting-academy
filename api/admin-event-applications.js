const auth = require('./_admin');
const store = require('./_cms-store');
const {EVENT, TAG} = require('./event-application');
function createHandler({database = store, requireAdmin = (...args) => auth.requireAdmin(...args)} = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    if (!await requireAdmin(req, res)) return;
    if (!['GET', 'DELETE'].includes(req.method)) { res.setHeader('Allow', 'GET, DELETE'); return res.status(405).json({error: '지원하지 않는 요청입니다.'}); }
    const eventFilter = 'purposes=cs.' + encodeURIComponent(JSON.stringify([TAG])) + '&courses=cs.' + encodeURIComponent(JSON.stringify([EVENT]));
    if (req.method === 'DELETE') {
      let data; try { data = auth.body(req); } catch { return res.status(400).json({error: '삭제할 신청자를 확인해주세요.'}); }
      if (typeof data?.id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(data.id)) return res.status(400).json({error: '삭제할 신청자를 확인해주세요.'});
      try {
        const deleted = await database.request('/rest/v1/academy_inquiries?select=id&id=eq.' + data.id + '&' + eventFilter, {method: 'DELETE', headers: {Prefer: 'return=representation'}});
        if (!deleted?.length) return res.status(404).json({error: '신청자를 찾을 수 없습니다. 새로고침 후 확인해주세요.'});
        return res.json({id: deleted[0].id});
      } catch { return res.status(503).json({error: '신청자를 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.'}); }
    }
    try {
      const records = await database.request('/rest/v1/academy_inquiries?select=id,name,phone,created_at,memo&' + eventFilter + '&order=created_at.asc,id.asc&limit=1000');
      return res.json({event: EVENT, capacity: 40, records: records.map(record => { let survey = {}; try { const parsed = JSON.parse(record.memo || '{}'); if(parsed.eventId === 'kim-jung-tae-20261107') survey = {gender:parsed.gender || '',ageGroup:parsed.ageGroup || '',interests:Array.isArray(parsed.interests) ? parsed.interests : [],experience:parsed.experience || '',question:parsed.question || ''}; } catch {} const {memo, ...basic} = record; return {...basic, survey}; })});
    } catch { return res.status(503).json({error: '특강 신청 명단을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'}); }
  };
}
module.exports = createHandler();
module.exports.createHandler = createHandler;
