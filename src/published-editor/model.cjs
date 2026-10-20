const GROUP_SELECTOR='.leadership-message,.leadership-values article,.hero,.course,.faculty-card,.mentor-card,.profile-hero,.profile-section,.facility-card,.tuition-info,.faq-list details,.intro,#location-info,.closing,.course-page-hero,.course-overview,.curriculum,.course-notes,main > section,.review-card,.review-home-card,.student-card,.journey-panel,.video-orbit-card,.instructor-team article,.video-slot-section,.head-source-section,.partners-simple-category,.partners-simple-item,.profile-hero-grid';
function validImage(value){return typeof value==='string'&&(/^(https:\/\/[^\s]+|\/(?!\/)[^\s]*)$/.test(value));}
function normalizePage(path){return path.replace(/\.html$/,'').replace(/\/$/,'')||'/';}
function sharedKey(identity,slot){let hash=2166136261;for(const c of identity+":"+slot){hash=Math.imul(hash^c.charCodeAt(0),16777619);}return `cms-${hash>>>0}`;}
function shouldPersistEntry(entry,originalValue,savedEntries=[],aliases=new Map()){return entry.value!==originalValue||savedEntries.some(saved=>saved.type===entry.type&&(saved.key===entry.key||aliases.get(saved.key)===entry.key));}
module.exports={shouldPersistEntry,sharedKey,GROUP_SELECTOR,validImage,normalizePage};
