'use strict';
const {result,identity,fail}=require('../lib/shared');
exports.handler=async e=>{if(e.httpMethod!=='GET')return result(405,{error:'Method not allowed'});try{const u=await identity(e);return result(200,{user:{id:u.id,email:u.email,role:u.role}})}catch(err){return fail(err)}};
