'use strict';
const {result,method,parse,hash,get,emailAddr,samePassword,tokenFor,fail}=require('../lib/shared');
exports.handler=async e=>{
 const deny=method(e);if(deny)return deny;
 try{
  const d=parse(e),email=emailAddr(d.email),lookup=await get('email:'+hash(email)),user=lookup?await get('user:'+lookup.id):null;
  if(!user||!samePassword(d.password,user))return result(401,{error:'账号或密码不正确'});
  return result(200,tokenFor(user));
 }catch(err){return fail(err)}
};
