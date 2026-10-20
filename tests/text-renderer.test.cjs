const test=require('node:test'),assert=require('node:assert/strict');const {parseHTML}=require('linkedom');const {renderText}=require('../src/published-editor/text-renderer.cjs');
test('imported default text keeps developer links and line break markup',()=>{
 const {document}=parseHTML('<p>처음이어도,<br>함께해요. <a class="course-button" href="/programs">과정 안내 ↗</a></p>');const node=document.querySelector('p');const field={node,defaultTemplate:node.cloneNode(true),defaultValue:'처음이어도,\n함께해요. 과정 안내 ↗',defaultWhiteSpace:''};const html=node.innerHTML;
 renderText(field,field.defaultValue);assert.equal(node.innerHTML,html);assert.equal(node.querySelector('a').getAttribute('href'),'/programs');assert.ok(node.querySelector('br'));
 renderText(field,'새로운 소개문\n과정 안내 ↗');assert.equal(node.querySelectorAll('a').length,1);assert.equal(node.querySelector('a').getAttribute('href'),'/programs');assert.equal(node.textContent,'새로운 소개문과정 안내 ↗');
 renderText(field,'<script>실행하지 않음</script>');assert.equal(node.querySelector('script'),null);assert.equal(node.querySelector('a').getAttribute('href'),'/programs');
 renderText(field,field.defaultValue);assert.equal(node.innerHTML,html);
});
