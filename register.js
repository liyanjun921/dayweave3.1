'use strict';
const {crypto,result,method,parse,hash,get,put,emailAddr,credentials,fail}=require('../lib/shared');
exports.handler=async e=>{
 const deny=method(e);if(deny)return deny;
 try{
  const d=parse(e),email=emailAddr(d.email),inv=String(d.invite||'').trim().toUpperCase();
  if(!/^DW-[A-F0-9]{4}(-[A-F0-9]{4}){7}$/.test(inv))throw Error('邀请码格式不正确');
  if(await get('email:'+hash(email)))return result(409,{error:'此邮箱已注册，请直接登录'});
  const cred=credentials(d.password),inviteKey='invite:'+hash(inv),invitation=await get(inviteKey);
  if(!invitation||invitation.used)return result(403,{error:'邀请码不存在或已经使用'});
  // WARNING: Netlify Blobs does not supply a database transaction here. Sequential signup is supported;
  // simultaneous registration using one code is NOT guaranteed exactly-once. See README.
  await put(inviteKey,{...invitation,used:true,redeemedEmailHash:hash(email),usedAt:new Date().toISOString()});
  const u={id:crypto.randomUUID(),email,role:'member',ver:1,...cred,createdAt:new Date().toISOString()};
  await put('user:'+u.id,u);await put('email:'+hash(email),{id:u.id});
  return result(201,{ok:true});
 }catch(err){return fail(err)}
};
