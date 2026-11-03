const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const esbuild = require('esbuild');
const {isPublicVisit, sanitizeVisit} = require('../src/analytics/policy.cjs');
const {buildVisitorAnalytics} = require('../scripts/build-visitor-analytics.cjs');

test('counts public production visits while excluding private, editing, and preview traffic', () => {
  for (const route of ['/', '/courses/camera', '/apply', '/events/kim-jung-tae-20261107', '/privacy']) {
    assert.equal(isPublicVisit('https://www.kactstar.com' + route), true, route);
  }
  for (const route of ['/admin', '/admin/members', '/admin.html', '/materials', '/login', '/signup', '/account', '/reset-password', '/auth/callback', '/api/site-content', '/?admin=1', '/?admin=0', '/?preview=1', '/%61dmin/members', '/account.html']) {
    assert.equal(isPublicVisit('https://www.kactstar.com' + route), false, route);
  }
  for (const url of ['http://localhost:4174/', 'https://scene-academy.vercel.app/', 'https://example.com/', 'https://www.kactstar.com:444/', 'invalid']) {
    assert.equal(isPublicVisit(url), false, url);
  }
});

test('removes query values and fragments without changing the browser address', () => {
  const event = {type: 'pageview', url: 'https://www.kactstar.com/apply?phone=01012345678&token=secret#private'};
  assert.deepEqual(sanitizeVisit(event), {type: 'pageview', url: 'https://www.kactstar.com/apply'});
  assert.match(event.url, /token=secret/);
  assert.equal(sanitizeVisit({type: 'pageview', url: 'https://www.kactstar.com/admin/admissions'}), null);
  assert.deepEqual(sanitizeVisit({type: 'event', url: 'https://www.kactstar.com/?token=secret'}), {type:'event',url:'https://www.kactstar.com/'});
  assert.deepEqual(sanitizeVisit({type:'event',url:'https://www.kactstar.com/apply?phone=private#private'}),{type:'event',url:'https://www.kactstar.com/apply'});
  assert.deepEqual(sanitizeVisit({type:'event',url:'https://www.kactstar.com/events/kim-jung-tae-20261107?phone=private#private'}),{type:'event',url:'https://www.kactstar.com/events/kim-jung-tae-20261107'});
  assert.deepEqual(sanitizeVisit({type:'event',url:'https://www.kactstar.com/privacy'}),{type:'event',url:'https://www.kactstar.com/privacy'});
});

test('all public HTML, including event applications, receives one loader; private pages receive none', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'academy-visitors-'));
  try {
    const routes = ['index', 'courses/camera', 'events/kim-jung-tae-20261107', 'admin/members', 'login', 'materials'];
    for (const route of routes) {
      const file = path.join(directory, route + '.html');
      fs.mkdirSync(path.dirname(file), {recursive: true});
      fs.writeFileSync(file, '<html><head></head><body></body></html>');
    }
    assert.equal(buildVisitorAnalytics(directory), 3);
    assert.equal(buildVisitorAnalytics(directory), 0);
    for (const [index, route] of routes.entries()) {
      const html = fs.readFileSync(path.join(directory, route + '.html'), 'utf8');
      assert.equal(html.includes('/visitor-analytics.js'), index < 3, route);
    }
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});

test('browser loader starts only on public production pages and configures the privacy filter before loading', () => {
  const code = esbuild.buildSync({entryPoints:[path.join(__dirname, '../src/analytics/visitors.js')],bundle:true,platform:'browser',write:false}).outputFiles[0].text;
  function run(url, embedded = false) {
    const scripts = [];
    const window = {location: {href: url}};
    window.self = window;
    window.top = embedded ? {} : window;
    const document = {head: {querySelector: () => null, appendChild: script => scripts.push(script)}, createElement: () => ({dataset: {}})};
    vm.runInNewContext(code, {window, document, URL, console});
    return {window, scripts};
  }
  const publicPage = run('https://www.kactstar.com/?utm_source=naver');
  assert.equal(publicPage.scripts.length, 1);
  assert.equal(publicPage.scripts[0].src, '/_vercel/insights/script.js');
  const [command, filter] = publicPage.window.vaq[0];
  assert.equal(command, 'beforeSend');
  assert.equal(filter({type:'pageview',url:'https://www.kactstar.com/?token=secret'}).url, 'https://www.kactstar.com/');
  publicPage.window.location.href = 'https://www.kactstar.com/?admin=1';
  assert.equal(filter({type:'pageview',url:'https://www.kactstar.com/'}), null);
  for (const url of ['http://127.0.0.1:4174/', 'https://scene-academy.vercel.app/', 'https://www.kactstar.com/?admin=1', 'https://www.kactstar.com/account']) {
    assert.equal(run(url).scripts.length, 0, url);
  }
  assert.equal(run('https://www.kactstar.com/', true).scripts.length, 0);
});
