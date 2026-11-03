const {imageURL}=require('./model.cjs');
const ORIGIN='https://www.kactstar.com';
function modifiedAt(article){return article.modifiedAt||article.publishedAt;}
function graph(article){
 const url=ORIGIN+'/journal/'+article.id,qa=article.faq||[],image=article.cards?.filter(c=>c.image).map(c=>new URL(imageURL(c.image),ORIGIN).href)||[];
 const nodes=[{'@type':'Article','@id':url+'#article',url,mainEntityOfPage:url,headline:article.title,description:article.summary,inLanguage:'ko-KR',datePublished:article.publishedAt,dateModified:modifiedAt(article),author:{'@type':'Organization',name:article.author},publisher:{'@type':'Organization',name:'김정태 배우아카데미',url:ORIGIN},...(image.length?{image}:{}),articleBody:[article.question,article.answer,article.body,...(article.sections||[]).flatMap(q=>[q.question,q.answer]),...qa.flatMap(q=>[q.question,q.answer])].filter(Boolean).join('\n\n'),...((article.sources||[]).length?{citation:article.sources.map(s=>s.url)}:{})},{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'홈',item:ORIGIN+'/'},{'@type':'ListItem',position:2,name:'연기 노트',item:ORIGIN+'/journal'},{'@type':'ListItem',position:3,name:article.title,item:url}]}];
 if(qa.length)nodes.push({'@type':'FAQPage','@id':url+'#related-questions',isPartOf:{'@id':url},mainEntity:qa.map(q=>({'@type':'Question',name:q.question,acceptedAnswer:{'@type':'Answer',text:q.answer}}))});
 return {'@context':'https://schema.org','@graph':nodes};
}
function jsonScript(value){return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));}
module.exports={graph,jsonScript,modifiedAt};
