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
