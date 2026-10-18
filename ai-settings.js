'use strict';
const {result,parse,identity,get,put,encrypt,aiEndpoint,fail}=require('../lib/shared');
exports.handler=async e=>{
 if(!['GET','POST'].includes(e.httpMethod))return result(405,{error:'Method not allowed'});
 try{const u=await identity(e),saved=await get('ai:'+u.id);
  if(e.httpMethod==='GET')return result(200,{base:saved?.base||'',model:saved?.model||'',configured:!!saved?.keyCipher});
  const d=parse(e),base=String(d.base||'').trim().slice(0,500),model=String(d.model||'').trim().slice(0,120),key=String(d.key||'');
  aiEndpoint(base);if(!model)throw Error('模型名称不能为空');if(key.length>4096)throw Error('Key too long');
  if(!key&&!saved?.keyCipher)throw Error('首次连接需要填写 API Key');
  await put('ai:'+u.id,{base,model,keyCipher:key?encrypt(key):saved.keyCipher});return result(200,{ok:true});
 }catch(err){return fail(err)}
};
