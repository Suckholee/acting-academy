(()=>{
 const section=document.querySelector('.class-planner');if(!section)return;
 const courses=JSON.parse(section.querySelector('#planner-course-data').textContent);
 const form=section.querySelector('form'),fields=form.elements;
 const put=(selector,value)=>{section.querySelector(selector).textContent=value;};
 const money=value=>new Intl.NumberFormat('ko-KR').format(value)+'원';
 function update(){
  const course=courses.find(c=>c.id===fields.course.value),months=Number(fields.months.value);
  const quoteOnly=course.id==='premium'||fields.lesson.value==='private';
  const base=400000*months,discount=months===3?base*.1:0;
  put('.planner-course',course.title+' · '+months+'개월');
  put('.planner-description',course.intro);
  put('.planner-price',quoteOnly?'별도 상담':money(base-discount));
  put('.planner-calculation',quoteOnly?'프리미엄 과정과 개인 레슨은 수업 구성에 따라 별도로 안내합니다.':`월 400,000원 × ${months}개월${discount?` − 10% 할인 ${money(discount)}`:''}`);
  const selected=[...section.querySelectorAll('[data-slot][aria-pressed="true"]')].map(b=>b.dataset.slot);
  put('.planner-selected',selected.length?'희망 시간: '+selected.join(' / '):'희망 시간: 아직 선택하지 않았어요.');
  section.querySelector('.planner-detail').href='/courses/'+course.id;
 }
 form.addEventListener('submit',e=>e.preventDefault());
 fields.goal.addEventListener('change',()=>{fields.course.value=fields.goal.value;update();});
 form.addEventListener('change',update);
 section.querySelectorAll('[data-slot]').forEach(button=>button.addEventListener('click',()=>{button.setAttribute('aria-pressed',String(button.getAttribute('aria-pressed')!=='true'));update();}));
 section.querySelector('.planner-clear').addEventListener('click',()=>{section.querySelectorAll('[data-slot]').forEach(b=>b.setAttribute('aria-pressed','false'));update();});
 update();
})();
