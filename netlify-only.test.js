'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const crypto=require('node:crypto');
process.env.NODE_ENV='test';
process.env.DAYWEAVE_SERVER_SECRET=crypto.randomBytes(32).toString('base64');
process.env.DAYWEAVE_SETUP_CODE='test-bootstrap-secret-should-be-long-enough';
process.env.ALLOWED_AI_HOSTS='api.openai.com';
const memory=new Map();
global.__DAYWEAVE_TEST_BLOBS__={
 async get(k){return memory.has(k)?structuredClone(memory.get(k)):null},
 async setJSON(k,val){memory.set(k,structuredClone(val))},
 async delete(k){memory.delete(k)}
};
const endpoint=(name,method='POST',body={},token)=>require('../netlify/functions/'+name+'.js').handler({httpMethod:method,body:JSON.stringify(body),headers:token?{authorization:'Bearer '+token}:{}});
const parse=(r)=>JSON.parse(r.body);
let adminToken,memberToken,invite,userId;
test('initialize the one and only admin account',async()=>{
 const a=await endpoint('setup','POST',{email:'creator@example.test',password:'increasingly-good-password',setupCode:process.env.DAYWEAVE_SETUP_CODE});assert.equal(a.statusCode,201,a.body);
 const b=await endpoint('setup','POST',{email:'intruder@example.test',password:'increasingly-good-password',setupCode:process.env.DAYWEAVE_SETUP_CODE});assert.equal(b.statusCode,409);
 const signin=parse(await endpoint('login','POST',{email:'creator@example.test',password:'increasingly-good-password'}));assert.ok(signin.access_token);adminToken=signin.access_token;
});
test('only admin can generate invite, and code has high entropy',async()=>{
 const denied=await endpoint('invitations','POST',{},undefined);assert.equal(denied.statusCode,401);
 const invited=await endpoint('invitations','POST',{},adminToken);assert.equal(invited.statusCode,201,invited.body);invite=parse(invited).code;assert.match(invite,/^DW-[A-F0-9]{4}(-[A-F0-9]{4}){7}$/);
});
test('registration consumes invite, creates separate user who cannot invite',async()=>{
 const bad=await endpoint('register','POST',{email:'friend@example.test',password:'friend-password-very-long',invite:'DW-DEAD-BEEF-DEAD-BEEF-DEAD-BEEF-DEAD-BEEF'});assert.equal(bad.statusCode,403);
 const r=await endpoint('register','POST',{email:'friend@example.test',password:'friend-password-very-long',invite});assert.equal(r.statusCode,201,r.body);
 const reuse=await endpoint('register','POST',{email:'other@example.test',password:'friend-password-very-long',invite});assert.equal(reuse.statusCode,403);
 const sign=await endpoint('login','POST',{email:'friend@example.test',password:'friend-password-very-long'});assert.equal(sign.statusCode,200,sign.body);const cred=parse(sign);memberToken=cred.access_token;userId=cred.user.id;
 const self=await endpoint('whoami','GET',{},memberToken);assert.equal(parse(self).user.id,userId);
 const forbidden=await endpoint('invitations','POST',{},memberToken);assert.equal(forbidden.statusCode,400);
});
test('password and forged bearer rejected',async()=>{
 assert.equal((await endpoint('login','POST',{email:'friend@example.test',password:'wrong-password-very-long'})).statusCode,401);
 assert.notEqual((await endpoint('whoami','GET',{},memberToken.slice(0,-2)+'AA')).statusCode,200);
});
test('per-user credentials are encrypted and separated',async()=>{
 let r=await endpoint('ai-settings','POST',{base:'https://api.openai.com/v1',model:'gpt-4o-mini',key:'sk-example-key'},memberToken);assert.equal(r.statusCode,200,r.body);
 const s=require('../netlify/lib/shared'),memberCfg=memory.get('ai:'+userId);assert.ok(memberCfg.keyCipher);assert.ok(!JSON.stringify(memberCfg).includes('sk-example-key'));
 assert.equal(s.decrypt(memberCfg.keyCipher),'sk-example-key');
 r=await endpoint('ai-settings','GET',{},adminToken);assert.equal(parse(r).configured,false);
});
test('iOS webhook queues tasks for correct account, and acknowledges',async()=>{
 let r=await endpoint('shortcut-token','POST',{},memberToken);assert.equal(r.statusCode,201,r.body);const t=parse(r).token;
 r=await endpoint('shortcut','POST',{action:'add_task',title:'今晚背 20 个意大利语单词',due:'2026-10-20T19:00'},t);
 assert.equal(r.statusCode,200,r.body);
 r=await endpoint('shortcut-inbox','GET',{},memberToken);let items=parse(r).items;assert.equal(items.length,1);assert.equal(items[0].title,'今晚背 20 个意大利语单词');
 r=await endpoint('shortcut-inbox','GET',{},adminToken);assert.equal(parse(r).items.length,0);
 await endpoint('shortcut-inbox','POST',{ids:items.map(i=>i.id)},memberToken);
 r=await endpoint('shortcut-inbox','GET',{},memberToken);assert.equal(parse(r).items.length,0);
});
test('allowlist rejects unsafe AI endpoints',async()=>{
 const s=require('../netlify/lib/shared');assert.equal(s.aiEndpoint('https://api.openai.com/v1'),'https://api.openai.com/v1/chat/completions');
 for(const url of ['http://api.openai.com/v1','https://evil.test/v1','https://api.openai.com:444/v1','https://api.openai.com@evil.test/v1'])assert.throws(()=>s.aiEndpoint(url));
});

test('deployment health detects available storage and configured secret',async()=>{
 const response=await endpoint('health','GET');
 assert.equal(response.statusCode,200,response.body);
 const data=parse(response);assert.equal(data.ok,true);assert.equal(data.serverSecret,'configured');assert.equal(data.storage,'available');
});
