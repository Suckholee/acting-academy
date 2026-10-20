const test=require('node:test'),assert=require('node:assert/strict');
const {parseHTML}=require('linkedom');const {renderImage}=require('../src/published-editor/image-renderer.cjs');
test('failed cloud poster uses local default without changing configured content',()=>{
 const {document}=parseHTML('<div class="video-slot-frame"><img src="/assets/default.png" loading="lazy"></div>');
 const node=document.querySelector('img');const field={node,defaultValue:'/assets/default.png'};
 renderImage(field,'https://example.com/photo.png');assert.equal(node.loading,'eager');
 node.onerror();assert.equal(node.getAttribute('src'),'/assets/default.png');assert.equal(node.dataset.cmsImageSource,'https://example.com/photo.png');assert.equal(node.onerror,null);
 renderImage(field,'https://example.com/replacement.png');assert.equal(node.getAttribute('src'),'https://example.com/replacement.png');assert.equal(typeof node.onerror,'function');
});
