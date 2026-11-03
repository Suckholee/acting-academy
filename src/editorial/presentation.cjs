function cardTitle(card){
 const title=String(card.title||'');
 return title.replace(/^(?:웹툰|webtoon)\s*[·:：\-–—]\s*/i,'').trim()||title;
}
module.exports={cardTitle};
