'use strict';
const {crypto,result,hash,get,put,adminIdentity,fail}=require('../lib/shared');
exports.handler=async e=>{
 if(!['GET','POST'].includes(e.httpMethod))return result(405,{error:'Method not allowed'});
 try{const u=await adminIdentity(e);if(e.httpMethod==='GET')return result(200,{admin:true});
 const code='DW-'+(crypto.randomBytes(16).toString('hex').toUpperCase().match(/.{4}/g)||[]).join('-');
 await put('invite:'+hash(code),{createdAt:new Date().toISOString(),by:u.id,used:false});return result(201,{code});
 }catch(err){return fail(err)}
};
