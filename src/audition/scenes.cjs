// Public film stills. Source attribution is not a claim of a reuse licence.
// Target rectangles refer to the original aspect ratio and exclude other actors.
module.exports={
 'sample-veteran':{image:'/assets/audition-scenes/veteran.jpg',target:{x:.318,y:.09,w:.104,h:.208},targetLabel:'조태오',imageCredit:'CJ ENM · 베테랑 작품 사진',imageSource:'https://www.cjenm.com/ko/featured-contents/베테랑/'},
 'sample-spring':{image:'/assets/audition-scenes/spring.jpg',target:{x:.39,y:.04,w:.095,h:.20},targetLabel:'상우',imageCredit:'한국영상자료원 · 봄날은 간다 작품 소개',imageSource:'https://www.koreafilm.or.kr/movie/PM_007085'},
 'sample-oldboy':{image:'/assets/audition-scenes/oldboy.jpg',target:{x:.425,y:.135,w:.205,h:.395},targetLabel:'오대수',imageCredit:'KINO Rotterdam · 올드보이 상영 자료',imageSource:'https://kinorotterdam.nl/films/oldboy/'},
 'sample-lady-vengeance':{image:'/assets/audition-scenes/lady-vengeance.jpg',target:{x:.128,y:.165,w:.147,h:.30},targetLabel:'금자',imageCredit:'CJ ENM · 친절한 금자씨 작품 사진',imageSource:'https://www.cjenm.com/ko/featured-contents/친절한-금자씨/'},
 "sample-extreme-job":{"image":"/assets/audition-scenes/extreme-job.jpg","target":{"x":0.425,"y":0.18,"w":0.205,"h":0.53},"targetLabel":"고반장","imageCredit":"CJ ENM · 극한직업 작품 사진","imageSource":"https://www.cjenm.com/ko/featured-contents/%EA%B7%B9%ED%95%9C%EC%A7%81%EC%97%85/"},
 "sample-masquerade":{"image":"/assets/audition-scenes/masquerade.jpg","target":{"x":0.515,"y":0.095,"w":0.24,"h":0.54},"targetLabel":"하선","imageCredit":"CJ ENM · 광해, 왕이 된 남자 작품 사진","imageSource":"https://www.cjenm.com/ko/featured-contents/%EA%B4%91%ED%95%B4-%EC%99%95%EC%9D%B4-%EB%90%9C-%EB%82%A8%EC%9E%90/"},
 "sample-parasite":{"image":"/assets/audition-scenes/parasite.jpg","target":{"x":0.41,"y":0.285,"w":0.047,"h":0.13},"targetLabel":"기우","imageCredit":"CJ ENM · 기생충 작품 사진","imageSource":"https://www.cjenm.com/ko/featured-contents/%EA%B8%B0%EC%83%9D%EC%B6%A9/"},
 "sample-sunny":{"image":"/assets/audition-scenes/sunny.jpg","target":{"x":0.323,"y":0.24,"w":0.172,"h":0.355},"targetLabel":"어린 춘화","imageCredit":"CJ ENM · 써니 작품 사진","imageSource":"https://www.cjenm.com/ko/featured-contents/%EC%8D%A8%EB%8B%88/"},
 "sample-ode-to-my-father":{"image":"/assets/audition-scenes/ode-to-my-father.jpg","target":{"x":0.355,"y":0.105,"w":0.12,"h":0.28},"targetLabel":"덕수","imageCredit":"CJ ENM · 국제시장 작품 사진","imageSource":"https://www.cjenm.com/ko/featured-contents/%EA%B5%AD%EC%A0%9C%EC%8B%9C%EC%9E%A5/"},
 "sample-roaring-currents":{"image":"/assets/audition-scenes/roaring-currents.jpg","target":{"x":0.52,"y":0.37,"w":0.32,"h":0.46},"targetLabel":"이순신","imageCredit":"CJ ENM · 명량 작품 사진","imageSource":"https://www.cjenm.com/ko/featured-contents/%EB%AA%85%EB%9F%89/"}
};

// Additional visible people; omitted references retain their original faces.
const extra={
 'sample-veteran':[{id:'B',label:'가운데 인물',target:{x:.445,y:.055,w:.115,h:.235}},{id:'C',label:'오른쪽 세 번째 인물',target:{x:.652,y:.13,w:.11,h:.22}}],
 'sample-spring':[{id:'B',label:'오른쪽 인물',target:{x:.48,y:.15,w:.092,h:.20}}],
 'sample-oldboy':[{id:'B',label:'오른쪽 인물',target:{x:.71,y:.39,w:.145,h:.25}}],
 'sample-lady-vengeance':[{id:'B',label:'오른쪽 인물',target:{x:.80,y:.14,w:.13,h:.30}}],
 'sample-extreme-job':[{id:'B',label:'뒤쪽 인물',target:{x:.325,y:.24,w:.095,h:.28}}],
 'sample-parasite':[{id:'B',label:'왼쪽 인물',target:{x:.365,y:.28,w:.045,h:.12}}],
 'sample-sunny':[{id:'B',label:'오른쪽 앞 인물',target:{x:.60,y:.35,w:.15,h:.25}}]
};
for(const [id,scene]of Object.entries(module.exports))scene.cast=[{id:'A',label:scene.targetLabel,target:scene.target},...(extra[id]||[])];
