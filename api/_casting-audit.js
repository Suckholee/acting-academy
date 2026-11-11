const db=require('./_cms-store');
async function audit(action,subject,detail={},store=db,actor='admin'){if(!store.ready?.())return false;try{await store.request('/rest/v1/academy_casting_audit',{method:'POST',body:JSON.stringify({action,subject,detail,actor})});return true;}catch{return false;}}
module.exports={audit};
