'use strict';
const {result,parse,identity,get,put,fail}=require('../lib/shared');
exports.handler=async e=>{
 if(!['GET','POST'].includes(e.httpMethod))return result(405,{error:'Method not allowed'});
 try{const u=await identity(e),k='bridge-inbox:'+u.id,items=await get(k)||[];
  if(e.httpMethod==='GET')return result(200,{items});
  const ack=new Set((parse(e).ids||[]).map(String));await put(k,items.filter(x=>!ack.has(x.id)));return result(200,{ok:true});
 }catch(err){return fail(err)}
};
