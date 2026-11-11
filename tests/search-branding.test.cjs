const {test} = require('node:test');
const assert = require('node:assert/strict');
const {normalizeSearchBranding, BRAND} = require('../scripts/build-search-branding.cjs');

test('crawler HTML carries one consistent academy name, including split logo text', () => {
  const html = '<html><head><title>김정태 연기아카데미</title><meta name="description" content="김정태연기아카데미 수업"><meta property="og:title" content="홈 | 김정태 연기아카데미"></head><body><span>김정태 <span class="brand-category">연기아카데미</span></span></body></html>';
  const result = normalizeSearchBranding(html, true);
  assert.doesNotMatch(result, /연기아카데미/);
  assert.match(result, /<title>김정태 배우아카데미 \| 마곡 성인·시니어 연기학원<\/title>/);
  const identity = JSON.parse(result.match(/type="application\/ld\+json">(.*?)<\/script>/)[1]);
  for (const entity of identity['@graph']) assert.equal(entity.name, BRAND);
  assert.equal(identity['@graph'][0].url, 'https://www.kactstar.com/');
  const academy = identity['@graph'].find(entity => entity['@type'] === 'EducationalOrganization');
  assert.equal(identity['@graph'][0].publisher['@id'], academy['@id']);
  assert.equal(academy.address.addressLocality, '강서구');
  assert.equal(academy.address.streetAddress, '공항대로 186, 로뎀타워 3층');
  assert.equal(academy.telephone, '+82-2-2666-4528');
  assert.equal(normalizeSearchBranding(result, true), result);
});

test('private pages and legacy redirects retain indexing policies without website schema', () => {
  for (const policy of ['<meta name="robots" content="noindex, nofollow">', '<meta http-equiv="refresh" content="0;url=/trainers">']) {
    const html = `<html><head>${policy}<title>김정태 연기아카데미</title></head></html>`;
    const result = normalizeSearchBranding(html);
    assert.ok(result.includes(policy));
    assert.doesNotMatch(result, /application\/ld\+json|og:site_name/);
    assert.ok(result.includes(BRAND));
  }
});

test('home link previews use the warm academy poster while search identity and other pages keep their own metadata',()=>{
 const {parseHTML}=require('linkedom'),fs=require('node:fs');
 const input='<html><head><title>Old</title><meta name="description" content="서울 마곡의 실제 수업 안내"><meta property="og:image" content="https://example.com/old.png"><meta name="twitter:image" content="https://example.com/old.png"></head><body><h1>수업 안내</h1></body></html>';
 const result=normalizeSearchBranding(input,true),{document:d}=parseHTML(result);const get=k=>d.querySelector(`meta[property="${k}"]`)?.getAttribute('content');
 assert.equal(get('og:title'),'당신의 다음 장면을 함께합니다 · 김정태 배우아카데미');assert.equal(get('og:image'),'https://www.kactstar.com/assets/academy-home-share-v1.png');assert.equal(get('og:image:type'),'image/png');assert.equal(get('og:image:width'),'1734');assert.equal(get('og:image:height'),'907');assert.equal(get('og:url'),'https://www.kactstar.com/');assert.equal(d.querySelector('meta[name=description]').getAttribute('content'),'서울 마곡의 실제 수업 안내');assert.equal(d.querySelector('h1').textContent,'수업 안내');assert.equal(d.querySelectorAll('meta[property="og:image"]').length,1);assert.equal(normalizeSearchBranding(result,true),result);
 const other=normalizeSearchBranding(input,false);assert.ok(other.includes('https://example.com/old.png'));assert.ok(!other.includes('academy-home-share-v1'));
 const home=parseHTML(fs.readFileSync('dist-published/index.html','utf8')).document;assert.equal(home.querySelector('meta[property="og:image"]').getAttribute('content'),get('og:image'));assert.equal(home.querySelector('meta[name="twitter:card"]').getAttribute('content'),'summary_large_image');assert.ok(fs.statSync('dist-published/assets/academy-home-share-v1.png').size>1000);
});
