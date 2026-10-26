const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {buildSearchReadiness} = require('../scripts/build-search-readiness.cjs');

test('sitemap excludes unpublished student samples and private pages while real course and trainer pages stay discoverable', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'academy-search-'));
  try {
    const routes = ['/works/actor-1', '/works/actor-2', '/courses/camera', '/trainers/kim-hyung-min', '/admin/members', '/reviews'];
    for (const route of routes) {
      fs.mkdirSync(path.dirname(path.join(dir, route)), {recursive: true});
      const content = route === '/works/actor-1' ? '작품명 · 배역 · 참여 내용은 실제 자료 확인 후 교체합니다.' : '실제 안내';
      const policy = route === '/admin/members' ? '<meta name="robots" content="noindex, nofollow">' : '';
      fs.writeFileSync(path.join(dir, route + '.html'), `<html><head>${policy}<meta name="description" content="합격 인터뷰"><meta property="og:description" content="합격 인터뷰"></head><body>${content}</body></html>`);
    }
    fs.writeFileSync(path.join(dir, 'sitemap.xml'), `<urlset>${routes.map(route => `<url><loc>https://www.kactstar.com${route}</loc><lastmod>2026-10-15</lastmod></url>`).join('')}</urlset>`);
    buildSearchReadiness(dir);
    const sitemap = fs.readFileSync(path.join(dir, 'sitemap.xml'), 'utf8');
    assert.doesNotMatch(sitemap, /actor-1|admin\/members/);
    for (const route of ['/works/actor-2', '/courses/camera', '/trainers/kim-hyung-min', '/reviews']) assert.ok(sitemap.includes(route));
    const pending = fs.readFileSync(path.join(dir, 'works/actor-1.html'), 'utf8');
    assert.match(pending, /noindex, follow/);
    const reviews = fs.readFileSync(path.join(dir, 'reviews.html'), 'utf8');
    assert.doesNotMatch(reviews, /합격 인터뷰/);
    assert.match(reviews, /실제 후기가 등록되기 전/);
    assert.equal(buildSearchReadiness(dir).changed.length, 0, 'rebuild is idempotent');
    fs.writeFileSync(path.join(dir, 'works/actor-1.html'), pending.replace('작품명 · 배역 · 참여 내용은 실제 자료 확인 후 교체합니다.', '확인된 실제 작품 자료'));
    buildSearchReadiness(dir);
    assert.doesNotMatch(fs.readFileSync(path.join(dir, 'works/actor-1.html'), 'utf8'), /noindex/);
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
});
