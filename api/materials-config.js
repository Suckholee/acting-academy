'use strict';
module.exports=(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
 // Only publishable keys or legacy anon JWTs may reach the browser.
 let safe=typeof key==='string'&&key.startsWith('sb_publishable_');
 if(key&&!safe){try{safe=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role==='anon'}catch{safe=false}}
 if(!url||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||!safe)return res.status(200).json({ready:false});
 return res.status(200).json({ready:true,url,key});
};
