function mountDashboard({root,profile,verified,overview,profileSection,auditionArea,identityPanel,passwordPanel,withdraw,recovery,welcome}){
 const doc=root.ownerDocument;
 function el(tag,text,attrs={}){const n=doc.createElement(tag);if(text)n.textContent=text;for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;}
 const paths={overview:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',auditions:'M8 4H5v17h14V4h-3 M9 2h6v4H9z M8 11h8 M8 16h5',profile:'M20 21v-2a7 7 0 0 0-14 0v2 M13 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',security:'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6z M8 12l3 3 5-6'};
 function icon(key){const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');for(const [k,v]of Object.entries({viewBox:'0 0 24 24',width:'20',height:'20',fill:'none',stroke:'currentColor','stroke-width':'1.6','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(k,v);const p=doc.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',paths[key]);svg.append(p);return svg;}
 const sidebar=el('aside',null,{class:'dashboard-sidebar'}),identity=el('div',null,{class:'dashboard-identity'}),avatar=el('span',null,{class:'dashboard-avatar','aria-hidden':'true'}),memberName=el('strong'),identityText=el('div');
 identityText.append(memberName,el('span','아카데미 회원'));identity.append(avatar,identityText);sidebar.append(identity,el('p','MY ACADEMY',{class:'dashboard-nav-label'}));
 const nav=el('nav',null,{'aria-label':'내 계정 메뉴',class:'dashboard-nav'}),buttons=new Map(),panels=new Map();
 const workspace=el('div',null,{class:'dashboard-workspace'}),heading=el('header',null,{class:'dashboard-heading'}),headingCopy=el('div'),eyebrow=el('p','MY ACCOUNT',{class:'account-eyebrow'}),title=el('h1',null,{tabindex:'-1'}),description=el('p');
 headingCopy.append(eyebrow,title,description);heading.append(headingCopy,el('a','오디션 둘러보기 ↗',{href:'/auditions',class:'dashboard-browse'}));workspace.append(heading);
 const options=[['overview','대시보드','오디션 지원 현황과 계정 정보를 한눈에 확인하세요.'],['auditions','오디션 신청 내역','제출한 지원서를 확인하고 접수 정보를 관리하세요.'],['profile','내 정보','이름과 연락처를 확인하고 수정하세요.'],['security','로그인 및 보안','로그인 방법과 비밀번호를 관리하세요.']];
 for(const [key,label]of options){const b=el('button',null,{type:'button','data-section':key,'aria-controls':'dashboard-'+key});b.append(icon(key),el('span',label));b.onclick=()=>select(key,true);nav.append(b);buttons.set(key,b);const panel=el('section',null,{id:'dashboard-'+key,class:'dashboard-panel','aria-label':label});panels.set(key,panel);workspace.append(panel);}
 sidebar.append(nav,el('a','← 홈페이지로 돌아가기',{href:'/',class:'dashboard-home'}));
 const home=panels.get('overview');
 if(welcome)home.append(el('p','가입이 완료되었습니다. 아카데미에 오신 것을 환영합니다.',{class:'dashboard-welcome',role:'status'}));
 const stats=el('div',null,{class:'dashboard-stats'});
 function stat(label,value,detail){const card=el('article',null,{class:'dashboard-stat'}),number=el('strong',value),note=el('span',detail);card.append(el('p',label),number,note);stats.append(card);return {number,note};}
 const applied=stat('신청한 오디션','—','접수한 지원서'),latest=stat('최근 접수일','—','내 지원 기록');stat('계정 상태',verified?'인증 완료':'인증 필요','이메일 계정');home.append(stats);
 const grid=el('div',null,{class:'dashboard-grid'}),recent=el('section',null,{class:'dashboard-card dashboard-recent'}),recentHead=el('div',null,{class:'dashboard-card-heading'}),all=el('button','전체 보기 →',{type:'button',class:'dashboard-text-button'});all.onclick=()=>select('auditions',true);recentHead.append(el('h2','최근 오디션 신청'),all);recent.append(recentHead);
 const recentList=el('div',null,{class:'dashboard-recent-list','aria-live':'polite'});recent.append(recentList);grid.append(recent);
 const side=el('div',null,{class:'dashboard-side-cards'}),profileCard=el('section',null,{class:'dashboard-card'}),edit=el('button','정보 수정 →',{type:'button',class:'dashboard-text-button'}),profileHead=el('div',null,{class:'dashboard-card-heading'});edit.onclick=()=>select('profile',true);profileHead.append(el('h2','내 정보'),edit);const summary=el('dl',null,{class:'dashboard-profile-summary'});profileCard.append(profileHead,summary);
 const guide=el('section',null,{class:'dashboard-card dashboard-guide'});guide.append(el('span','NEXT AUDITION',{class:'account-eyebrow'}),el('h2','다음 배역을 만나보세요'),el('p','모집 중인 공고를 살펴보고 나에게 맞는 오디션에 지원하세요.'),el('a','모집 공고 보기 ↗',{href:'/auditions'}));side.append(profileCard,guide);grid.append(side);home.append(grid);
 panels.get('auditions').append(auditionArea);panels.get('profile').append(overview,profileSection);
 panels.get('security').append(identityPanel.section,passwordPanel.section,withdraw);identityPanel.section.open=true;
 root.replaceChildren(sidebar,workspace);root.classList.add('account-dashboard');
 let selected;
 function select(key,update=false){if(!panels.has(key))key='overview';const changed=selected!==key;selected=key;for(const [id,panel]of panels)panel.hidden=id!==key;for(const [id,b]of buttons){if(id===key)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}const entry=options.find(o=>o[0]===key);title.textContent=key==='overview'?(profile.name||'회원')+'님, 안녕하세요':entry[1];description.textContent=entry[2];if(update){history.pushState(null,'',location.pathname+location.search+(key==='overview'?'':'#'+key));title.focus({preventScroll:true});if(workspace.getBoundingClientRect().top<0)workspace.scrollIntoView({block:'start',behavior:'smooth'});}if(changed&&workspace.animate&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)panels.get(key).animate([{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'ease-out'});}
 function updateProfile(value){profile={...profile,...value};memberName.textContent=profile.name||'회원';avatar.textContent=Array.from(profile.name||'회')[0];summary.replaceChildren();for(const [label,value]of [['이름',profile.name],['이메일',profile.email],['연락처',profile.phone]])summary.append(el('dt',label),el('dd',value||'—'));if(selected==='overview')title.textContent=(profile.name||'회원')+'님, 안녕하세요';}
 const date=value=>new Date(value).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit'});
 function updateApplications({applications=[],hasMore=false,loading=false,error=''}){
  recentList.replaceChildren();
  if(error){applied.number.textContent=latest.number.textContent='—';recentList.append(el('p',error,{class:'dashboard-empty'}));return;}
  if(loading&&!applications.length){recentList.append(el('p','신청 내역을 불러오고 있습니다…',{class:'dashboard-empty'}));return;}
  applied.number.textContent=applications.length+(hasMore?'+':'')+'건';latest.number.textContent=applications.length?date(applications[0].submittedAt):'아직 없음';latest.note.textContent=applications.length?'가장 최근 지원서 접수일':'첫 오디션에 지원해보세요';
  if(!applications.length){const empty=el('div',null,{class:'dashboard-empty'});empty.append(icon('auditions'),el('h3','첫 오디션을 기다리고 있어요'),el('p','지원서를 제출하면 이곳에서 신청 내역을 확인할 수 있습니다.'),el('a','모집 중인 오디션 보기',{href:'/auditions',class:'dashboard-browse'}));recentList.append(empty);return;}
  for(const a of applications.slice(0,3)){const item=el('article',null,{class:'dashboard-recent-item'}),top=el('div',null,{class:'dashboard-recent-meta'});top.append(el('span',a.status,{class:'member-badge'}),el('time',date(a.submittedAt)+' 접수',{datetime:a.submittedAt}));item.append(top,el('h3',a.title),el('p',a.roles.join(' · ')||'지원 배역 미지정'));if(a.viewUrl)item.append(el('a',a.canEdit?'지원서 확인 · 수정 →':'제출한 지원서 보기 →',{href:a.viewUrl}));recentList.append(item);}
 }
 updateProfile(profile);updateApplications({loading:true});select(recovery?'security':location.hash.slice(1));window.addEventListener('popstate',()=>select(location.hash.slice(1)));window.addEventListener('hashchange',()=>select(location.hash.slice(1)));
 return {updateApplications,updateProfile};
}
module.exports={mountDashboard};
