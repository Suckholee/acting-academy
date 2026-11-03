const auth = require('./_admin');
const store = require('./_cms-store');
const {EVENT, TAG} = require('./event-application');
function createHandler({database = store, requireAdmin = (...args) => auth.requireAdmin(...args)} = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    if (!await requireAdmin(req, res)) return;
    if (!['GET', 'DELETE', 'PATCH'].includes(req.method)) { res.setHeader('Allow', 'GET, DELETE, PATCH'); return res.status(405).json({error: '지원하지 않는 요청입니다.'}); }
    const eventFilter = 'purposes=cs.' + encodeURIComponent(JSON.stringify([TAG])) + '&courses=cs.' + encodeURIComponent(JSON.stringify([EVENT]));
    if (req.method === 'PATCH') {
      let data; try { data = auth.body(req); } catch { return res.status(400).json({error: '메모 내용을 확인해주세요.'}); }
      if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(data?.id || '') || typeof data.note !== 'string' || data.note.length > 2000 || typeof data.previousNote !== 'string') return res.status(400).json({error: '메모는 2,000자 이내로 입력해주세요.'});
      try {
        const route = '/rest/v1/academy_inquiries?select=id,memo&id=eq.' + data.id + '&' + eventFilter;
        const rows = await database.request(route + '&limit=1');
        if (!rows?.length) return res.status(404).json({error: '신청자를 찾을 수 없습니다.'});
        const old = rows[0].memo;
        let memo = {};
        try { memo = JSON.parse(old || '{}'); } catch { return res.status(409).json({error: '기존 신청 정보를 확인해야 합니다. 관리자에게 문의해주세요.'}); }
        if (!memo || typeof memo !== 'object' || Array.isArray(memo)) return res.status(409).json({error: '기존 신청 정보를 확인해야 합니다.'});
        if ((memo.adminNote || '') !== data.previousNote) return res.status(409).json({error: '다른 관리자가 메모를 수정했습니다. 작성한 내용을 복사한 뒤 새로고침해주세요.'});
        const note = data.note.trim();
        const saved = await database.request(route + '&memo=' + (old == null ? 'is.null' : 'eq.' + encodeURIComponent(JSON.stringify(old))), {method: 'PATCH', headers: {Prefer: 'return=representation'}, body: JSON.stringify({memo: JSON.stringify({...memo, adminNote: note})})});
        if (!saved?.length) return res.status(409).json({error: '신청 정보가 변경되었습니다. 작성한 내용을 복사한 뒤 새로고침해주세요.'});
        return res.json({id: data.id, adminNote: note});
      } catch { return res.status(503).json({error: '메모를 저장하지 못했습니다. 다시 시도해주세요.'}); }
    }
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
      return res.json({event: EVENT, capacity: 40, records: records.map(record => { let survey = {}, adminNote = ''; try { const parsed = JSON.parse(record.memo || '{}'); adminNote = typeof parsed.adminNote === 'string' ? parsed.adminNote : ''; if(parsed.eventId === 'kim-jung-tae-20261107') survey = {gender:parsed.gender || '',ageGroup:parsed.ageGroup || '',interests:Array.isArray(parsed.interests) ? parsed.interests : [],experience:parsed.experience || '',question:parsed.question || ''}; } catch {} const {memo, ...basic} = record; return {...basic, survey, adminNote}; })});
    } catch { return res.status(503).json({error: '특강 신청 명단을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'}); }
  };
}
module.exports = createHandler();
module.exports.createHandler = createHandler;
