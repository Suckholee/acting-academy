// Explicitly injected by the loopback-only demo server; never used by production APIs.
function createStore() {
 const sessions = new Map(), limits = new Map();
 return {
  async create(id, expires) { sessions.set(id, expires); },
  async active(id) { return (sessions.get(id) || 0) > Date.now(); },
  async revoke(id) { sessions.delete(id); },
  async attempt(bucket) {
   const now = Date.now();
   for (const [id, expires] of sessions) if (expires <= now) sessions.delete(id);
   for (const [id, entry] of limits) if (entry.expires <= now) limits.delete(id);
   const keys = ['global', bucket];
   for (const id of keys) if (!limits.has(id)) limits.set(id, {count:0, expires:now+900000});
   let retry = 0;
   for (const id of keys) { const entry = limits.get(id); if (entry.count >= (id === 'global' ? 100 : 5)) retry = Math.max(retry, Math.ceil((entry.expires-now)/1000)); }
   if (retry) return retry;
   for (const id of keys) limits.get(id).count++;
   return 0;
  }
 };
}
module.exports = {createStore};
