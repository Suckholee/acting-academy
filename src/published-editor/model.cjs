const GROUP_SELECTOR='.hero,.course,.faculty-card,.mentor-card,.profile-hero,.profile-section,.facility-card,.tuition-info,.faq-list details,.intro,#location-info,.closing,.course-page-hero,.course-overview,.curriculum,.course-notes';
function validImage(value){return typeof value==='string'&&(/^(https:\/\/[^\s]+|\/(?!\/)[^\s]*)$/.test(value));}
function normalizePage(path){return path.replace(/\.html$/,'').replace(/\/$/,'')||'/';}
function sharedKey(identity,slot){let hash=2166136261;for(const c of identity+":"+slot){hash=Math.imul(hash^c.charCodeAt(0),16777619);}return `cms-${hash>>>0}`;}
module.exports={sharedKey,GROUP_SELECTOR,validImage,normalizePage};
