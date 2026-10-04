const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const cards=[...document.querySelectorAll('.faculty-card')];
const filters=[...document.querySelectorAll('[data-filter]')];
function filterFaculty(category,updateHistory=false){
 const selected=filters.some(b=>b.dataset.filter===category)?category:'all';
 filters.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===selected)));
 let visible=0;cards.forEach(card=>{card.hidden=selected!=='all'&&card.dataset.category!==selected;card.classList.remove('is-entering');if(!card.hidden){card.style.setProperty('--card-delay',`${visible*90}ms`);visible++;}});
 requestAnimationFrame(()=>cards.filter(c=>!c.hidden).forEach(c=>c.classList.add('is-entering')));
 document.querySelector('.faculty-count').textContent=`${String(visible).padStart(2,'0')} ${visible===1?'COACH':'COACHES'}`;
 if(updateHistory){const url=new URL(location.href);if(selected==='all')url.searchParams.delete('category');else url.searchParams.set('category',selected);history.pushState(null,'',url);}
}
if(filters.length){filters.forEach(b=>b.addEventListener('click',()=>filterFaculty(b.dataset.filter,true)));const restore=()=>filterFaculty(new URLSearchParams(location.search).get('category')||'all');addEventListener('popstate',restore);restore();}
if('IntersectionObserver' in window){document.body.classList.add('faculty-motion');const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.08});document.querySelectorAll('.faculty-reveal').forEach(el=>observer.observe(el));}
