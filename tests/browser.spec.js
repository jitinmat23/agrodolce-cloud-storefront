import { test, expect } from '@playwright/test';
test('menu filters, basket persistence, guest order, and special enquiry',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:3000');
  await expect(page.locator('.product-card')).toHaveCount(6);
  await page.getByRole('button',{name:'Brownies',exact:true}).click();
  await expect(page.locator('.product-card')).toHaveCount(1);
  await page.getByRole('button',{name:'Add Fudgy little squares to basket'}).click();
  await page.reload();await expect(page.locator('#basket-count')).toHaveText('1');
  await page.locator('#open-basket').click();
  await page.getByRole('button',{name:'Increase Fudgy little squares quantity'}).click();
  await expect(page.locator('#basket-total')).toHaveText('₹720');
  const order=page.locator('#order-form');
  await order.getByLabel('Your name').fill('Browser Test');
  await order.getByLabel('WhatsApp number').fill('+919876543210');
  await order.getByLabel('Preferred pickup date').fill('2099-01-01');
  await order.getByLabel('Preferred pickup time').fill('12:00');
  await order.getByRole('button',{name:'Request your bakes'}).click();
  await expect(page.locator('#order-success')).toContainText('Preview request saved');
  await expect(page.locator('#basket-count')).toHaveText('0');
  await page.getByRole('button',{name:'Close basket'}).click();
  const special=page.locator('#special-form');
  for(const name of ['occasion','bake','flavour','size','style','egg'])await special.locator(`[name=${name}]`).selectOption(`${name}-0`);
  await special.getByLabel('Your name').fill('Special Test');
  await special.getByLabel('WhatsApp number').fill('+919876543210');
  await special.getByLabel('Preferred pickup date').fill('2099-01-01');
  await special.getByLabel('Preferred pickup time').fill('14:30');
  await special.getByRole('button',{name:'Send a special enquiry'}).click();
  await expect(special.locator('.form-feedback')).toContainText('Preview request saved');
  expect(errors).toEqual([]);
});
test('desktop and mobile layouts fit viewport',async({page})=>{
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:900});await page.goto('http://localhost:3000');
    await expect(page.locator('.product-card')).toHaveCount(6);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await page.screenshot({path:`/tmp/agrodolce-${width}.png`,fullPage:true});
  }
});
