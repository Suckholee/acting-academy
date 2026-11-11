const SHARE_URL='https://www.kactstar.com/ai-audition?share=romcom-v5';
function shareCaption(kind='image'){return (kind==='video'?'내가 해본 한 장면이야. 너 버전도 궁금해.':'내가 고른 장면이야. 너라면 어떻게 할 것 같아?')+'\n'+SHARE_URL;}
module.exports={SHARE_URL,shareCaption};
