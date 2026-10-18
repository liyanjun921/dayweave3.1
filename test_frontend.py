from playwright.sync_api import sync_playwright
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]/'public'
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for label,vp in [('desktop',{'width':1280,'height':800}),('iphone',{'width':390,'height':844})]:
  page=browser.new_page(viewport=vp)
  errs=[]
  page.on('pageerror',lambda err:errs.append(str(err)))
  html=re.sub(r'<script src="[^"]+" defer></script>','',(root/'index.html').read_text())
  page.set_content(html,wait_until='domcontentloaded')
  page.evaluate('''() => {
   for(const k of ['localStorage','sessionStorage']){const m=new Map();Object.defineProperty(window,k,{configurable:true,value:{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}})}
   window.fetch=async function(url,options={}){
    const name=String(url).split('/.netlify/functions/')[1];let response={ok:true};
    if(name==='login')response={access_token:'fake-test-token',expires_at:9999999999,user:{id:'test-user-abc',email:'demo@example.test'}};
    else if(name==='invitations')response={admin:true,code:'DW-AAAA-BBBB-CCCC-DDDD-EEEE-FFFF-0000-1111'};
    else if(name==='whoami')response={user:{id:'test-user-abc',email:'demo@example.test',role:'admin'}};
    else if(name==='shortcut-inbox')response={items:[]};
    return new Response(JSON.stringify(response),{status:200,headers:{'Content-Type':'application/json'}})
   };
  }''')
  page.add_style_tag(content=(root/'styles.css').read_text())
  for src in ['config.js','app.js','cloud.js','studio.js','dayweave-v3.js','personal-cloud.js']:
   page.add_script_tag(content=(root/src).read_text())
  page.evaluate("Object.defineProperty(Cloud, 'enabled', {get:()=>true}); Cloud.setUI()")
  page.wait_for_timeout(300)
  assert page.locator('#account-entry').is_visible()
  page.locator('#account-entry').click()
  assert page.locator('#admin-setup-button').is_visible()
  page.locator('#admin-setup-button').click()
  assert page.locator('#admin-setup-secret').is_visible()
  page.locator('#auth-email').fill('demo@example.test')
  page.locator('#auth-password').fill('my-test-password-123')
  page.locator('#admin-setup-secret').fill('super-secret-for-setup')
  page.locator('#admin-setup-submit').click()
  page.wait_for_timeout(500)
  assert page.locator('#account-label').inner_text()=='demo', (label,page.locator('#account-label').inner_text(),errs)
  assert '本机' in page.locator('#cloud-badge').inner_text()
  page.locator('button[data-view="scrapbook"]').first.click()
  page.locator('#album-new').click()
  page.locator('#album-title').fill('第一次练习口语')
  page.locator('#album-content').fill('今天跟管家用英语练习了一段点餐对话。')
  page.locator('#album-form button[type="submit"]').click()
  assert '第一次练习口语' in page.locator('#album-list').inner_text()
  page.locator('#account-entry').click()
  page.locator('#auth-logout').click()
  page.wait_for_timeout(80)
  assert '第一次练习口语' not in page.locator('#album-list').inner_text()
  page.locator('#account-entry').click()
  page.locator('#auth-email').fill('demo@example.test');page.locator('#auth-password').fill('my-test-password-123');page.locator('#auth-login').click()
  page.wait_for_timeout(300)
  assert '第一次练习口语' in page.locator('#album-list').inner_text()
  page.locator('button[data-view="settings"]').first.click()
  assert page.locator('#owncloud-connect').is_visible()
  assert not page.locator('#cloud-sync-enabled').count()
  overflow=page.evaluate('document.documentElement.scrollWidth>innerWidth')
  assert not overflow,(label,'horizontal overflow')
  assert not errs,(label,errs)
  print(label,'PASS: login/setup, local memory isolation, personal cloud opt-in, no JS errors')
  page.close()
 browser.close()
