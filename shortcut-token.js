'use strict';
const {crypto,result,method,identity,hash,get,put,del,fail}=require('../lib/shared');
exports.handler=async e=>{
 const deny=method(e);if(deny)return deny;
 try{const u=await identity(e),old=await get('bridge-owner:'+u.id);
  if(old?.hash)await del('bridge:'+old.hash);
  const token='dw_'+crypto.randomBytes(32).toString('base64url'),fingerprint=hash(token);
  await put('bridge:'+fingerprint,{userId:u.id});await put('bridge-owner:'+u.id,{hash:fingerprint});
  return result(201,{token,notice:'新令牌会替换旧令牌，请只保存到自己的 iOS 快捷指令中。'});
 }catch(err){return fail(err)}
};
