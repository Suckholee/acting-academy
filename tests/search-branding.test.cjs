const {test} = require('node:test');
const assert = require('node:assert/strict');
const {normalizeSearchBranding, BRAND} = require('../scripts/build-search-branding.cjs');

test('crawler HTML carries one consistent academy name, including split logo text', () => {
  const html = '<html><head><title>김정태 연기아카데미</title><meta name="description" content="김정태연기아카데미 수업"><meta property="og:title" content="홈 | 김정태 연기아카데미"></head><body><span>김정태 <span class="brand-category">연기아카데미</span></span></body></html>';
  const result = normalizeSearchBranding(html, true);
  assert.doesNotMatch(result, /연기아카데미/);
  assert.match(result, /<title>김정태 배우아카데미 \| KIM JUNG TAE ACTING ACADEMY<\/title>/);
  const identity = JSON.parse(result.match(/type="application\/ld\+json">(.*?)<\/script>/)[1]);
  for (const entity of identity['@graph']) assert.equal(entity.name, BRAND);
  assert.equal(identity['@graph'][0].url, 'https://www.kactstar.com/');
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
