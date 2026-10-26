(() => {
  const form = document.querySelector('#event-form');
  const status = document.querySelector('#event-status');
  const button = form.querySelector('button[type=submit]');
  let busy = false;
  if (Date.now() >= Date.parse('2026-11-07T14:00:00+09:00')) {
    status.textContent = '이번 무료특강 신청이 종료되었습니다.';
    button.disabled = true;
    return;
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    if (!form.reportValidity()) return;
    const interests=[...form.querySelectorAll('input[name=interests]:checked')].map(input=>input.value);
    if(!interests.length){status.textContent='관심 분야를 한 가지 이상 선택해주세요.';form.querySelector('input[name=interests]').focus();return;}
    busy = true; button.disabled = true; status.textContent = '신청을 접수하고 있습니다…';
    try {
      const response = await fetch('/api/event-application', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:form.elements.name.value.trim(),phone:form.elements.phone.value,consent:form.elements.consent.checked,website:form.elements.website.value,gender:form.elements.gender.value,ageGroup:form.elements.ageGroup.value,interests,experience:form.elements.experience.value,question:form.elements.question.value.trim()})});
      const data = await response.json();
      if (!response.ok) throw Error(data.error || '접수를 확인하지 못했습니다.');
      form.reset(); form.hidden = true;
      document.querySelector('#event-success-message').textContent = data.message;
      const success = document.querySelector('#event-success'); success.hidden = false; success.focus();
    } catch (error) { status.textContent = error.message || '연결을 확인하고 다시 시도해주세요.'; busy = false; button.disabled = false; }
  });
})();
