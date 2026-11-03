(() => {
  const form = document.querySelector('#event-form');
  const intro = document.querySelector('#event-intro');
  const start = document.querySelector('#event-start');
  const status = document.querySelector('#event-status');
  const button = form.querySelector('button[type=submit]');
  const next = document.querySelector('#event-next');
  const back = document.querySelector('#event-back');
  const title = document.querySelector('#event-step-title');
  const progress = document.querySelector('#event-progress');
  const steps = [...form.querySelectorAll('[data-event-step]')];
  let step = 0;
  let busy = false;
  const focus = element => element.focus({preventScroll:true});
  const showStep = index => {
    step = index;
    steps.forEach((panel, i) => panel.hidden = i !== step);
    next.hidden = step !== 0;
    button.hidden = step !== 1;
    back.textContent = step === 0 ? '← 특강 안내' : '← 이전';
    title.textContent = step === 0 ? '참석 안내를 보내드릴게요.' : '어떤 연기에 관심 있으세요?';
    progress.textContent = `신청 ${step + 1} / 2`;
    status.textContent = '';
    focus(title);
    window.scrollTo?.(0, 0);
  };
  const validStep = index => {
    for (const field of steps[index].querySelectorAll('input,select,textarea')) {
      if (!field.checkValidity()) {
        if (step !== index) showStep(index);
        field.reportValidity(); focus(field); return false;
      }
    }
    return true;
  };
  if (Date.now() >= Date.parse('2026-11-07T14:00:00+09:00')) {
    start.textContent = '이번 무료특강 신청이 종료되었습니다.';
    start.disabled = true;
    button.disabled = true;
    return;
  }
  start.addEventListener('click', () => {
    intro.hidden = true;
    form.hidden = false;
    showStep(0);
  });
  back.addEventListener('click', () => {
    if (busy) return;
    if (step === 1) showStep(0);
    else { form.hidden = true; intro.hidden = false; focus(start); window.scrollTo?.(0, 0); }
  });
  next.addEventListener('click', () => {
    if (!busy && validStep(0)) showStep(1);
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    if (step === 0) { next.click(); return; }
    if (!validStep(0)) return;
    if (!validStep(1)) return;
    const interests = [...form.querySelectorAll('input[name=interests]:checked')].map(input => input.value);
    if (!interests.length) {
      status.textContent = '관심 분야를 한 가지 이상 선택해주세요.';
      focus(form.querySelector('input[name=interests]'));
      return;
    }
    busy = true; button.disabled = true; back.disabled = true;
    status.textContent = '신청을 접수하고 있습니다…';
    try {
      const response = await fetch('/api/event-application', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:form.elements.name.value.trim(),phone:form.elements.phone.value,consent:form.elements.consent.checked,website:form.elements.website.value,gender:form.elements.gender.value,ageGroup:form.elements.ageGroup.value,interests,experience:form.elements.experience.value,question:form.elements.question.value.trim(),attributionSource:window.kjtEntrySource?.()||'unknown'})});
      const data = await response.json();
      if (!response.ok) throw Error(data.error || '접수를 확인하지 못했습니다.');
      form.reset(); form.hidden = true;
      document.querySelector('#event-success-message').textContent = data.message;
      const success = document.querySelector('#event-success'); success.hidden = false; focus(success);
    } catch (error) {
      status.textContent = error.message || '연결을 확인하고 다시 시도해주세요.';
      busy = false; button.disabled = false; back.disabled = false;
    }
  });
})();
