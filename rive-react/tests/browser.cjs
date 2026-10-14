const { chromium } = require('playwright');
(async () => {
 const browser = await chromium.launch({headless:true, channel:"chrome"});
 const page = await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5178');
 await page.getByRole('button',{name:/Thinking/}).waitFor();
 await page.waitForFunction(()=>!document.querySelector('button').disabled);
 const states=[];
 for(const name of ['Thinking','Speaking','Idle','Speaking','Thinking','Idle']) {
  await page.getByRole('button',{name:new RegExp(name)}).click();
  await page.waitForFunction(name=>document.querySelector('output').textContent==='Rive · '+name,name);
  states.push(await page.locator('output').innerText());
 }
 await page.waitForTimeout(350);
 await page.screenshot({path:'../rive-character/build/react-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:/Speaking/}).click();
 await page.waitForFunction(()=>document.querySelector('output').textContent==='Rive · Speaking');
 await page.waitForTimeout(350);
 await page.screenshot({path:'../rive-character/build/react-mobile.png',fullPage:true});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 console.log(JSON.stringify({states,errors,mobileOverflow:overflow}));
 await browser.close();
 if(errors.length||overflow) process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
