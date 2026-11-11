const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {parseHTML}=require('linkedom');
test('public audition sharing metadata is present without JavaScript and uses an accessible dedicated image',()=>{
 const {document:d}=parseHTML(fs.readFileSync('dist-published/ai-audition.html','utf8'));const meta=k=>d.querySelector(`meta[property="${k}"]`)?.getAttribute('content');
 assert.equal(d.querySelectorAll('meta[property="og:title"]').length,1);assert.equal(meta('og:title'),'당신의 연기 들려주세요 · 김정태 배우아카데미');assert.match(meta('og:description'),/한 장면.*목소리.*연기/);assert.equal(meta('og:url'),'https://www.kactstar.com/ai-audition');assert.equal(meta('og:image'),'https://www.kactstar.com/assets/ai-audition-concept-romcom.png');assert.equal(meta('og:image:width'),'1734');assert.equal(meta('og:image:height'),'907');assert.equal(d.querySelector('meta[name="twitter:card"]').getAttribute('content'),'summary_large_image');assert.ok(fs.statSync('dist-published/assets/ai-audition-concept-romcom.png').size>1000);
 const {document:a}=parseHTML(fs.readFileSync('dist-published/admin/audition.html','utf8'));assert.equal(a.querySelector('meta[property="og:image"]'),null);assert.match(a.querySelector('meta[name=robots]').getAttribute('content'),/noindex/);
});
