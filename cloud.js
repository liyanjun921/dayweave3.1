/* DAYWEAVE V3.1: optional Netlify-only invited accounts, device-local memories. */
'use strict';
const Cloud={
 user:null,session:null,
 get enabled(){return (window.DAYWEAVE_CONFIG?.authMode==='netlify-blobs')&&(['https:','http:'].includes(location.protocol))},
 async request(name,{method='POST',body,token}={}){
  const r=await fetch('/.netlify/functions/'+name,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  const raw=await r.text();const data=parseRaw(raw)||{};if(!r.ok)throw new Error(data.error||'服务请求失败 '+r.status);return data;
 },
 async fn(name,opts={}){
  if(!this.session)throw Error('请先登录账号');
  if((this.session.expires_at||0)*1000<Date.now()){await this.logout(false);throw Error('登录已过期，请重新登录')}
  let body;try{body=opts.body?JSON.parse(opts.body):undefined}catch{body=undefined}
  return this.request(name,{method:opts.method||'POST',body,token:this.session.access_token});
 },
 persistSession(){try{if(this.session)localStorage.setItem('dayweave-auth-netlify',JSON.stringify(this.session));else localStorage.removeItem('dayweave-auth-netlify')}catch{}},
 loadLocalAccount(){
  const raw=parseRaw(localStorage.getItem(KEY+':'+this.user.id));
  state={...structuredClone(DEFAULT),...(raw&&typeof raw==='object'?raw:{}),settings:{...DEFAULT.settings,...(raw?.settings||{})},chats:{...DEFAULT.chats,...(raw?.chats||{})}};
  window.DAYWEAVE_CLOUD_USER_ID=this.user.id;
 },
 async login(email,password){
  if(!this.enabled)throw Error('请先把完整工程部署到 Netlify。');
  const sess=await this.request('login',{body:{email,password}});if(!sess?.access_token||!sess.user?.id)throw Error('服务端没有返回有效会话');
  this.session=sess;this.user=sess.user;this.persistSession();this.loadLocalAccount();
  if(typeof studioFirstRender!=='undefined')studioFirstRender=false;
  this.setUI();render();if(typeof renderStudio==='function')renderStudio();closeDialog('account-modal');toast('欢迎回家 ♡ 记忆仍只保存在当前设备');
  this.importShortcutTasks().catch(()=>{});
 },
 async register(email,password,invite){await this.request('register',{body:{email,password,invite}});await this.login(email,password)},
 async setup(email,password,setupCode){
  await this.request('setup',{body:{email,password,setupCode}});await this.login(email,password);toast('站长账号初始化成功 ♡');
 },
 async loadWorkspace(){
  if(!this.user)return;this.loadLocalAccount();this.setUI();render();if(typeof renderStudio==='function')renderStudio();
 },
 sync(){return Promise.reject(new Error('站长未启用统一云存档：请在设置中使用个人云盘或导出本地备份。'))},
 async importLocal(){
  if(!this.user)throw Error('请先登录');
  const raw=parseRaw(localStorage.getItem(KEY));if(!raw||!confirm('将游客本地数据导入当前账号的本机档案？这不会上传服务器，也会替换本机账号存档。'))return;
  state={...structuredClone(DEFAULT),...raw,settings:{...DEFAULT.settings,...raw.settings},chats:{...DEFAULT.chats,...raw.chats}};save();render();if(typeof renderStudio==='function')renderStudio();toast('已导入当前账号的本机档案');
 },
 async logout(show=true){
  this.session=null;this.user=null;window.DAYWEAVE_CLOUD_USER_ID=null;this.persistSession();state=loadState();this.setUI();render();if(typeof renderStudio==='function')renderStudio();closeDialog('account-modal');if(show)toast('已退出，回到这台设备的游客手账');
 },
 setUI(){
  const on=!!this.user;
  $('#account-label').textContent=on?(this.user.email?.split('@')[0]||'个人账号'):'登录 / 邀请注册';
  $('#account-logged').hidden=!on;$('#account-form-area').hidden=on;
  $('#cloud-badge').textContent=on?'♡ 已登录 · 记忆留在本机':'⌂ 本机独立记忆 · 未登录';
  $('#cloud-detail').textContent=on?'当前账户：'+this.user.email+'。对话、任务及记忆默认只保存于本设备，换设备需导出/导入。':'无需注册也能试用；邀请码用于开通独立账号。';
  $('#account-who').textContent=on?'当前账号：'+this.user.email+'（仅登录身份，不自动上云）':'';
  $('#account-modal-hint').textContent=this.enabled?'邀请码账号由 Netlify 管理。记忆和聊天默认只存本机，不上传站长数据库。':'本地试玩无需账号；邀请注册功能需要部署到 Netlify。';
  $('#auth-login').disabled=!this.enabled;$('#auth-register').disabled=!this.enabled;
  $('#admin-invite-box').hidden=true;
  if(on)this.checkAdmin().catch(()=>{});
 },
 async checkAdmin(){const x=await this.fn('invitations',{method:'GET'});$('#admin-invite-box').hidden=!x.admin},
 async restore(){
  this.setUI();if(!this.enabled)return;
  const sess=parseRaw(localStorage.getItem('dayweave-auth-netlify'));if(!sess?.access_token||!sess?.user?.id)return;
  try{
   const profile=await this.request('whoami',{method:'GET',token:sess.access_token});
   this.session=sess;this.user=profile.user;this.loadLocalAccount();if(typeof studioFirstRender!=='undefined')studioFirstRender=false;
   this.setUI();render();if(typeof renderStudio==='function')renderStudio();this.importShortcutTasks().catch(()=>{});
  }catch(e){this.session=null;this.user=null;this.persistSession();this.setUI();toast('账号会话已失效，请重新登录')}
 },
 async importShortcutTasks(){
  if(!this.user)return;
  const r=await this.fn('shortcut-inbox',{method:'GET'}),items=r.items||[];if(!items.length)return;
  state.bridgeImportedIds=Array.isArray(state.bridgeImportedIds)?state.bridgeImportedIds:[];
  const seen=new Set(state.bridgeImportedIds);let added=0;
  for(const item of items){if(seen.has(item.id))continue;
   state.tasks.push({id:uid(),title:item.title,project:'快捷指令',type:'life',priority:'medium',due:item.due||'',estimate:15,note:'通过 iOS 快捷指令创建',steps:[],done:false,createdAt:item.createdAt||new Date().toISOString()});
   seen.add(item.id);added++;
  }
  state.bridgeImportedIds=[...seen].slice(-250);save();if(added){render();toast('已收下快捷指令送来的 '+added+' 条任务 ♡')}
  await this.fn('shortcut-inbox',{method:'POST',body:JSON.stringify({ids:items.map(i=>i.id)})});
 }
};
const originalSave=save;
save=function(){if(Cloud.user){try{localStorage.setItem(KEY+':'+Cloud.user.id,JSON.stringify(state))}catch{toast('设备空间不足，请导出备份')}}else originalSave()};
const originalAiRequest=aiRequest;
aiRequest=async function(messages,opts={}){
 if(!Cloud.user)return originalAiRequest(messages,opts);
 const r=await Cloud.fn('ai',{method:'POST',body:JSON.stringify({messages,json:!!opts.json,maxTokens:opts.maxTokens||2400})});
 if(typeof r?.content!=='string')throw Error('模型未返回有效内容');return r.content;
};
const originalSaveAPI=saveAPI;
saveAPI=async function(){
 if(!Cloud.user)return originalSaveAPI();
 const base=$('#api-base').value.trim(),model=$('#api-model').value.trim(),key=$('#api-key').value.trim();
 if(!base||!model)throw Error('请填写 API URL 和模型');apiEndpoint(base);
 await Cloud.fn('ai-settings',{method:'POST',body:JSON.stringify({base,model,key})});
 state.settings.apiBase=base;state.settings.apiModel=model;save();$('#api-key').value='';updateConnection();toast('模型配置已保存在站点的加密后端中');
};
const originalTestAPI=testAPI;
testAPI=async function(){
 if(!Cloud.user)return originalTestAPI();
 const box=$('#api-status'),btn=$('#test-api');btn.disabled=true;box.textContent='正在测试…';
 try{await saveAPI();const answer=await aiRequest([{role:'user',content:'只回复“连接成功”。'}],{maxTokens:45});box.textContent='✓ '+answer.slice(0,120);box.className='connection-status success'}
 catch(e){box.textContent='✕ '+e.message;box.className='connection-status error';toast(e.message)}finally{btn.disabled=false}
};
const oldConnection=updateConnection;
updateConnection=function(){if(Cloud.user){$('#ai-connection').textContent=state.settings.apiBase?'模型服务已配置':'请设置 AI';return}oldConnection()};
function openAccount(){Cloud.setUI();openDialog('account-modal')}
$('#account-entry').onclick=openAccount;$('#open-account').onclick=openAccount;
$('#auth-login').onclick=()=>Cloud.login($('#auth-email').value.trim(),$('#auth-password').value).catch(e=>toast(e.message));
$('#auth-register').onclick=()=>Cloud.register($('#auth-email').value.trim(),$('#auth-password').value,$('#auth-invite').value.trim()).catch(e=>toast(e.message));
$('#auth-logout').onclick=()=>Cloud.logout();
$('#manual-sync').onclick=()=>exportData();
$('#auth-import-local').onclick=()=>Cloud.importLocal().catch(e=>toast(e.message));
$('#admin-create-invite').onclick=async()=>{try{const r=await Cloud.fn('invitations',{method:'POST',body:'{}'});$('#admin-invite-result').textContent='一次性邀请码：'+r.code+'（请立即复制，仅显示这一次）'}catch(e){toast(e.message)}};
$('#save-api').onclick=()=>saveAPI().catch(e=>toast(e.message));
$('#test-api').onclick=()=>testAPI().catch(e=>toast(e.message));
$('#shortcut-create-token').onclick=async()=>{try{const r=await Cloud.fn('shortcut-token',{method:'POST',body:'{}'});$('#shortcut-token-result').textContent='令牌（仅显示一次）：'+r.token;toast('iOS 桥接令牌已生成')}catch(e){toast(e.message)}};
$('#admin-setup-button').onclick=()=>{$('#admin-setup-form').hidden=!$('#admin-setup-form').hidden};
$('#admin-setup-submit').onclick=()=>Cloud.setup($('#auth-email').value.trim(),$('#auth-password').value,$('#admin-setup-secret').value.trim()).catch(e=>toast(e.message));
window.addEventListener('focus',()=>Cloud.importShortcutTasks().catch(()=>{}));
Cloud.restore();
