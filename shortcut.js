'use strict';
const {crypto,result,method,parse,hash,get,put,fail}=require('../lib/shared');
exports.handler=async e=>{
 const deny=method(e);if(deny)return deny;
 try{const token=String(e.headers?.authorization||e.headers?.Authorization||'').match(/^Bearer\s+(dw_[\w-]+)$/i)?.[1];
  if(!token||token.length>100)throw Error('无效的快捷指令令牌');const row=await get('bridge:'+hash(token));if(!row?.userId)throw Error('令牌已失效');
  const d=parse(e);if(d.action!=='add_task')throw Error('暂时只支持 add_task');const title=String(d.title||'').trim().slice(0,150),due=String(d.due||'').trim();
  if(!title)throw Error('需要填写任务名称');if(due&&!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(due))throw Error('时间格式应为 YYYY-MM-DDTHH:mm');
  const k='bridge-inbox:'+row.userId,old=await get(k)||[],item={id:crypto.randomUUID(),title,due,createdAt:new Date().toISOString()};
  await put(k,[...old.slice(-98),item]);return result(200,{ok:true,notice:'任务已进入待领取队列；用户下次打开网页时导入本机任务。'});
 }catch(err){return fail(err)}
};
