const licences={
 'CC BY 1.0':'https://creativecommons.org/licenses/by/1.0/',
 '저작자표시·동일조건 (제작사 허락)':'https://thecosmonaut.org/creative-commons/',
 'CC BY 2.5':'https://creativecommons.org/licenses/by/2.5/',
 'CC BY 3.0':'https://creativecommons.org/licenses/by/3.0/',
 'CC BY-SA 3.0':'https://creativecommons.org/licenses/by-sa/3.0/'
};
function licenseInfo(s){
 if(!s.license)return {};
 const l=s.license;
 if(!Object.hasOwn(licences,l.name)||licences[l.name]!==l.url||!['attribution','changes','evidence'].every(k=>typeof l[k]==='string'&&l[k].length>0&&l[k].length<=1500))throw Error('license');
 if(l.name==='저작자표시·동일조건 (제작사 허락)'&&l.evidence!==l.url)throw Error('license');
 const u=new URL(l.evidence);if(u.protocol!=='https:'||u.username||u.password)throw Error('license');
 if(s.language!=='en'||s.cardOnly!==true||s.image)throw Error('license');
 return {license:{name:l.name,url:l.url,attribution:l.attribution,changes:l.changes,evidence:l.evidence},language:'en',languageLabel:'외국어 대사 · 영어',cardOnly:true};
}
function attribution(s){if(!s.license)return '';const l=s.license;return `대본: ${l.attribution}\n${l.name} · ${l.url}\n원문: ${s.source}\n변경: ${l.changes}\n대본 발췌의 출처·이용 조건을 유지해주세요.${/SA|동일조건/.test(l.name)?" 이 대사를 각색하거나 연기하여 공개할 때도 해당 동일조건변경허락을 따라주세요.":""}`;}
module.exports={licenseInfo,attribution};
