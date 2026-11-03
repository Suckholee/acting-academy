function createVisitorSummary({compact = false, fetcher = fetch} = {}) {
  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  const element = el('section', null, 'kjt-visitor-summary' + (compact ? ' is-compact' : ''));
  element.setAttribute('aria-label', '홈페이지 방문 현황');
  element.hidden = true;
  const counts = [];
  for (const title of ['오늘 방문자', '누적 방문자']) {
    const card = el('div', null, 'kjt-visitor-card');
    const output = el('output', '—');
    output.setAttribute('aria-label', title + ' 수');
    card.append(el('small', title), output, el('small', '명'));
    counts.push(output);
    element.append(card);
  }
  const meta = el('div', null, 'kjt-visitor-meta');
  const state = el('p', '불러오는 중…');
  state.setAttribute('role', 'status');
  const refresh = el('button', '새로고침');
  refresh.type = 'button';
  refresh.setAttribute('aria-label', '방문자 통계 새로고침');
  const help = el('small', '한국 시간 · 2026.10.29부터 집계');
  help.title = '누적은 익명 방문 통계이며 다른 날짜·기기의 재방문이 포함될 수 있습니다. 집계에 수 분 지연이 있을 수 있습니다.';
  const sourcesButton = el('a', '유입 경로');
  sourcesButton.href = '/admin/visitor-sources';
  meta.append(state, refresh, sourcesButton, help);
  element.append(meta);
  let active = false, busy = false, generation = 0, timer = null, lastUpdate = null;
  function schedule() {
    clearTimeout(timer);
    if (active) timer = setTimeout(() => { if (document.hidden) schedule(); else load(); }, 3600000);
  }
  async function load() {
    if (!active || busy) return;
    const version = generation;
    busy = true;
    refresh.disabled = true;
    try {
      const response = await fetcher('/api/admin-visitor-stats', {credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000)});
      const data = await response.json();
      if (version !== generation || !active) return;
      if (!response.ok) throw Error(data.error || '방문 통계를 불러오지 못했습니다.');
      if (![data.todayVisitors, data.totalVisitors].every(n => Number.isSafeInteger(n) && n >= 0)) throw Error('방문 통계 응답을 확인할 수 없습니다.');
      counts[0].textContent = data.todayVisitors.toLocaleString('ko-KR');
      counts[1].textContent = data.totalVisitors.toLocaleString('ko-KR');
      lastUpdate = data.updatedAt;
      const time = new Date(lastUpdate).toLocaleTimeString('ko-KR', {timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false});
      state.textContent = (data.stale?'갱신 지연 · 이전 집계 · ':'')+(data.demo ? '미리보기 예시 · ' : '') + time + ' 기준 · 1시간마다 갱신';
      state.removeAttribute('title');
      element.classList.remove('has-error');
    } catch (error) {
      if (version !== generation || !active) return;
      state.textContent = lastUpdate ? '갱신 지연 · 이전 집계 표시' : '통계 확인 불가';
      state.title = error.message;
      element.classList.add('has-error');
    } finally {
      busy = false;
      refresh.disabled = false;
      if (active) { if (version === generation) schedule(); else load(); }
    }
  }
  refresh.onclick = load;
  document.addEventListener('visibilitychange', () => { if (!document.hidden && active) load(); });
  return {
    element,
    setActive(value) {
      if (active === value) return;
      active = value;
      generation++;
      element.hidden = !active;
      clearTimeout(timer);
      if (active) load();
      else { counts.forEach(n => { n.textContent = '—'; }); lastUpdate = null; state.textContent = '불러오는 중…'; }
    },
  };
}

module.exports = {createVisitorSummary};
