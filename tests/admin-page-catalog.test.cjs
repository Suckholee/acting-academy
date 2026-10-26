const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {primaryPages,detailPages,pageTitle}=require('../src/published-editor/page-catalog.cjs');const {GROUP_SELECTOR}=require('../src/published-editor/model.cjs');
test('admin navigation covers canonical public pages and existing course/trainer/work details',()=>{
 const routes=[...primaryPages,...detailPages.flatMap(g=>g.pages)];assert.equal(new Set(routes.map(([route])=>route)).size,routes.length);
 for(const [route,title]of routes){const file=path.join('dist-published',(route==='/'?'index':route.slice(1))+'.html');assert.equal(fs.existsSync(file),true,file);const html=fs.readFileSync(file,'utf8');assert.match(html,/component-editor\.js/);assert.equal(pageTitle(route),title);}
 const canonical=[];function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,item.name);if(item.isDirectory())walk(full);else if(item.name.endsWith('.html')){const html=fs.readFileSync(full,'utf8');if(!html.includes('http-equiv="refresh"')&&!full.endsWith('materials.html')&&!full.includes(path.sep+'events'+path.sep)&&!full.includes(path.sep+'admin'+path.sep)&&!html.includes('id="enrollment-root"')&&!html.includes('id="admissions-root"'))canonical.push('/'+path.relative('published-source',full).replace(/\.html$/,'').replace(/^index$/,''));}}}walk('published-source');
 for(const route of canonical)assert.ok(routes.some(([value])=>value===route),'Missing management navigation: '+route);
 assert.ok(GROUP_SELECTOR.includes('.video-slot-section'));assert.ok(GROUP_SELECTOR.includes('.partners-simple-item'));
});
