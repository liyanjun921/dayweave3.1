'use strict';
const {crypto,result,method,parse,get,put,emailAddr,credentials,fail}=require('../lib/shared');
exports.handler=async e=>{
 const deny=method(e);if(deny)return deny;
 try{
  const body=parse(e);const setup=process.env.DAYWEAVE_SETUP_CODE||'';if(setup.length<24)throw Error('站长需先在 Netlify 配置至少 24 位的 DAYWEAVE_SETUP_CODE');
  const given=String(body.setupCode||'');const x=Buffer.from(setup),y=Buffer.from(given);if(x.length!==y.length||!crypto.timingSafeEqual(x,y))throw Error('初始化口令不正确');
  if(await get('system:admin'))return result(409,{error:'站长账号已经创建；请直接登录。'});
  const email=emailAddr(body.email),password=body.password;
  if(await get('email:'+require('../lib/shared').hash(email)))throw Error('邮箱已被使用');
  const user={id:crypto.randomUUID(),email,role:'admin',ver:1,...credentials(password),createdAt:new Date().toISOString()};
  await put('user:'+user.id,user);await put('email:'+require('../lib/shared').hash(email),{id:user.id});await put('system:admin',{id:user.id,createdAt:user.createdAt});
  return result(201,{ok:true,notice:'管理员账号已创建；请使用邮箱密码登录。建议从 Netlify 移除 DAYWEAVE_SETUP_CODE 环境变量。'});
 }catch(err){return fail(err)}
};
