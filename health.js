'use strict';
// Safe health-check: reports no secrets or private records.
const {result,get,master}=require('../lib/shared');
exports.handler=async event=>{
 if(event.httpMethod!=='GET')return result(405,{ok:false,error:'Use GET'});
 let secretReady=true,storageReady=true;
 try{master()}catch{secretReady=false}
 try{await get('system:admin')}catch{storageReady=false}
 const ok=secretReady&&storageReady;
 return result(ok?200:503,{app:'DAYWEAVE',ok,functions:'available',serverSecret:secretReady?'configured':'missing_or_invalid',storage:storageReady?'available':'unavailable',tip:ok?'Ready. Open the site and initialize the administrator if needed.':'Check DAYWEAVE_SERVER_SECRET and Netlify Blobs/Functions logs.'});
};
