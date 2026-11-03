const {createVisitorSummary} = require('./admin-summary.cjs');
const summary = createVisitorSummary();
const main = document.querySelector('main') || document.querySelector('#admissions-root') || document.body;
main.before(summary.element);
let checking = false, authenticated = false;
async function check() {
  if (checking || document.hidden) return;
  checking = true;
  try {
    const response = await fetch('/api/admin-auth', {credentials: 'same-origin', cache: 'no-store'});
    const data = await response.json();
    authenticated = response.ok && data.authenticated === true;
    summary.setActive(authenticated);
  } catch { authenticated = false; summary.setActive(false); }
  finally { checking = false; }
}
// Login completion updates each page's content independently.
new MutationObserver(() => { if (!authenticated) check(); }).observe(main, {childList: true, subtree: true});
document.addEventListener('visibilitychange', check);
setInterval(check, 60000);
check();
