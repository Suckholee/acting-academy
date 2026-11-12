const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
function buildMemberHeader(out){
 const root=path.resolve(__dirname,'..');
 esbuild.buildSync({entryPoints:[path.join(root,'src/members/header.js')],outfile:path.join(out,'member-header.js'),bundle:true,platform:'browser',target:'es2020',minify:true});
 fs.copyFileSync(path.join(root,'src/members/header.css'),path.join(out,'member-header.css'));
 function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory()){if(item.name!=='admin')walk(file);continue;}if(!file.endsWith('.html'))continue;let html=fs.readFileSync(file,'utf8');if(!html.includes('<header')||html.includes('/member-header.js'))continue;html=html.replace('</head>','<link rel="stylesheet" href="/member-header.css"></head>').replace('</body>','<script defer src="/member-header.js"></script></body>');fs.writeFileSync(file,html);}}
 walk(out);
}
module.exports={buildMemberHeader};
