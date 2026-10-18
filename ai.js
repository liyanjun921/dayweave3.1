'use strict';
const {result,method,parse,identity,get,decrypt,aiEndpoint,fail}=require('../lib/shared');
exports.handler=async e=>{
 const deny=method(e);if(deny)return deny;
 try{const u=await identity(e),d=parse(e);if(!Array.isArray(d.messages)||!d.messages.length||d.messages.length>32)throw Error('消息条数不正确');
 const messages=d.messages.map(x=>({role:x.role,content:x.content}));
 if(messages.some(x=>!['system','user','assistant'].includes(x.role)||typeof x.content!=='string'||x.content.length>35000)||JSON.stringify(messages).length>65000)throw Error('消息过长');
 const cfg=await get('ai:'+u.id);if(!cfg?.keyCipher)throw Error('请先配置自己的模型 API');
 const endpoint=aiEndpoint(cfg.base),key=decrypt(cfg.keyCipher),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);
 let response;try{response=await fetch(endpoint,{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:cfg.model,messages,max_tokens:Math.min(3500,Math.max(32,Number(d.maxTokens)||1600)),temperature:d.json?.35:.72,...(d.json?{response_format:{type:'json_object'}}:{})}),signal:controller.signal})}finally{clearTimeout(timer)}
 const raw=(await response.text()).slice(0,45000);let data={};try{data=JSON.parse(raw)}catch{}
 if(!response.ok)throw Error('模型服务返回 '+response.status+': '+String(data?.error?.message||'检查模型配置').slice(0,160));
 const msg=data?.choices?.[0]?.message?.content,content=typeof msg==='string'?msg:Array.isArray(msg)?msg.map(x=>x.text||'').join(''):'';
 if(!content)throw Error('没有收到模型回复');return result(200,{content});
 }catch(err){return fail(err.name==='AbortError'?new Error('模型请求超时'):err)}
};
