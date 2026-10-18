'use strict';
const crypto=require('node:crypto');
const result=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},body:JSON.stringify(data)});
function method(e,expected='POST'){return e.httpMethod!==expected?result(405,{error:'Method not allowed'}):null}
function parse(e){try{const d=JSON.parse(e.body||'{}');if(!d||typeof d!=='object'||Array.isArray(d))throw Error();return d}catch{throw new Error('Invalid JSON request')}}
function hash(s){return crypto.createHash('sha256').update(s).digest('hex')}
function master(){const k=Buffer.from(process.env.DAYWEAVE_SERVER_SECRET||'','base64');if(k.length!==32)throw new Error('Set DAYWEAVE_SERVER_SECRET to a random 32-byte base64 key in Netlify environment variables');return k}
function derive(name){return crypto.createHmac('sha256',master()).update('dayweave/'+name+'/v1').digest()}
function b64j(d){return Buffer.from(JSON.stringify(d)).toString('base64url')}
function tokenFor(user){const p={sub:user.id,exp:Math.floor(Date.now()/1000)+7*86400,ver:user.ver||1};const body=b64j(p),sig=crypto.createHmac('sha256',derive('session')).update(body).digest('base64url');return {access_token:body+'.'+sig,expires_at:p.exp,user:{id:user.id,email:user.email}}}
function verify(token){const parts=String(token||'').split('.');if(parts.length!==2)throw new Error('Session invalid');const sig=crypto.createHmac('sha256',derive('session')).update(parts[0]).digest();const got=Buffer.from(parts[1],'base64url');if(got.length!==sig.length||!crypto.timingSafeEqual(got,sig))throw new Error('Session invalid');let p;try{p=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'))}catch{throw new Error('Session invalid')}if(!p?.sub||!p.exp||p.exp<Math.floor(Date.now()/1000))throw new Error('Session expired');return p}
const passHash=(pass,salt)=>crypto.scryptSync(pass,Buffer.from(salt,'hex'),64,{N:16384,r:8,p:1,maxmem:32*1024*1024}).toString('hex');
function validatePassword(p){if(typeof p!=='string'||p.length<10||p.length>120)throw Error('密码长度需要 10–120 字符')}
function credentials(password){validatePassword(password);const salt=crypto.randomBytes(16).toString('hex');return {salt,passwordHash:passHash(password,salt)}}
function samePassword(pass,u){if(typeof pass!=='string'||pass.length>120)return false;const a=Buffer.from(passHash(pass,u.salt),'hex'),b=Buffer.from(u.passwordHash,'hex');return a.length===b.length&&crypto.timingSafeEqual(a,b)}
function emailAddr(s){const v=String(s||'').trim().toLowerCase();if(v.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))throw Error('请填写有效的邮箱地址');return v}
function store(){if(process.env.NODE_ENV==='test'&&global.__DAYWEAVE_TEST_BLOBS__)return global.__DAYWEAVE_TEST_BLOBS__;const {getStore}=require('@netlify/blobs');return getStore({name:'dayweave-accounts',consistency:'strong'})}
const get=async k=>{const val=await store().get(k,{type:'json'});return val||null};
const put=async (k,val)=>store().setJSON(k,val);
const del=async k=>store().delete(k);
async function identity(e){const raw=String(e.headers?.authorization||e.headers?.Authorization||'').match(/^Bearer\s+([^\s]+)$/i)?.[1];if(!raw)throw Error('请先登录');const p=verify(raw),u=await get('user:'+p.sub);if(!u||u.ver!==p.ver)throw Error('会话已失效，请重新登录');return u}
async function adminIdentity(e){const u=await identity(e);if(u.role!=='admin')throw Error('需要管理员权限');return u}
function encrypt(value){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',derive('credential'),iv);const ct=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return [iv,cipher.getAuthTag(),ct].map(x=>x.toString('base64url')).join('.')}
function decrypt(value){const [a,b,c]=String(value).split('.');if(!a||!b||!c)throw Error('Invalid secret');const dec=crypto.createDecipheriv('aes-256-gcm',derive('credential'),Buffer.from(a,'base64url'));dec.setAuthTag(Buffer.from(b,'base64url'));return Buffer.concat([dec.update(Buffer.from(c,'base64url')),dec.final()]).toString('utf8')}
function aiEndpoint(base){let u;try{u=new URL(String(base||''))}catch{throw Error('请输入有效 API URL')}if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||u.search||u.hash)throw Error('仅允许无用户名密码的标准 HTTPS API 地址');const hosts=String(process.env.ALLOWED_AI_HOSTS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);if(!hosts.includes(u.hostname.toLowerCase()))throw Error('该 AI 服务商域名尚未加入 Netlify 环境变量 ALLOWED_AI_HOSTS');if(!u.pathname.endsWith('/chat/completions'))u.pathname=u.pathname.replace(/\/+$/,'')+'/chat/completions';return u.toString()}
function fail(e){return result(e.message?.includes('登录')||e.message?.includes('会话')||e.message?.includes('Session')?401:400,{error:e.message||'操作失败'})}
module.exports={crypto,result,method,parse,hash,get,put,del,identity,adminIdentity,credentials,samePassword,emailAddr,master,tokenFor,encrypt,decrypt,aiEndpoint,fail};
