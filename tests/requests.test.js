import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/server/index.js';
import { openStore } from '../src/server/storage.js';
import { notificationWorker } from '../src/server/notifications/index.js';
import { validateRequest } from '../src/server/validation.js';
const valid=()=>({id:randomUUID(),type:'order',contact:{name:'Test Baker',phone:'+91 9876543210',email:''},pickup:{date:'2099-01-01',time:'12:00'},items:[{id:'brownies',quantity:2}],website:''});
async function fixture(t){const directory=await mkdtemp(join(tmpdir(),'agrodolce-'));const server=createApp({DATA_DIR:directory,PREVIEW_MODE:'true'});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(async()=>{await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});});const base=`http://127.0.0.1:${server.address().port}`;return {base,directory,post:body=>fetch(base+'/api/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})};}
test('guest order is saved once, survives reopening, and ignores browser-supplied prices',async t=>{const {post,directory}=await fixture(t);const request=valid();request.total=1;request.items[0].price=1;let response=await post(request);assert.equal(response.status,201);assert.equal((await response.json()).preview,true);response=await post(request);assert.equal(response.status,200);const store=openStore(directory);t.after(()=>store.close());assert.equal(store.save(validateRequest(request),true),false);assert.equal(validateRequest(request).total,72000);request.items[0].quantity=3;assert.equal((await post(request)).status,409);});
test('invalid baskets, contact details, and past or impossible pickup dates are rejected',async t=>{const {post}=await fixture(t);for(const modify of [r=>r.items=[],r=>r.items[0].quantity=-1,r=>r.items[0].id='unknown',r=>r.contact.phone='abc',r=>r.contact.email='bad',r=>r.pickup.date='2020-01-01',r=>r.pickup.date='2099-02-31',r=>r.website='spam']){const r=valid();modify(r);assert.equal((await post(r)).status,400);}});
test('special enquiry accepts configured options and rejects arbitrary dropdown values',async t=>{const {post}=await fixture(t);const r={...valid(),type:'enquiry',options:Object.fromEntries(['occasion','bake','flavour','size','style','egg'].map(k=>[k,`${k}-0`])),requirements:'Eggless, please'};delete r.items;assert.equal((await post(r)).status,201);r.id=randomUUID();r.options.flavour='made-up';assert.equal((await post(r)).status,400);});
test('private files are inaccessible and cross-origin submissions are rejected',async t=>{const {base}=await fixture(t);for(const path of ['/.env','/.data/requests.sqlite','/src/server/index.js','/package.json'])assert.equal((await fetch(base+path)).status,404);assert.equal((await fetch(base+'/api/requests',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://other.example'},body:JSON.stringify(valid())})).status,403);assert.equal((await fetch(base)).status,200);assert.equal((await fetch(base+'/src/app.js')).status,200);});
test('provider failure preserves request and retries only the failed channel',async t=>{const dir=await mkdtemp(join(tmpdir(),'agrodolce-queue-'));const store=openStore(dir);t.after(async()=>{store.close();await rm(dir,{recursive:true,force:true});});const request=validateRequest(valid());store.save(request,false);let email=0,whatsapp=0;const worker=notificationWorker(store,{}, {email:async()=>{email++;return 'email-id';},whatsapp:async()=>{whatsapp++;throw Error('offline');}});await worker();await worker();assert.equal(email,1);assert.equal(whatsapp,1);assert.equal(store.save(request,false),false);assert.equal(store.pending().length,0);});
test('live mode refuses to start without notification configuration',()=>{assert.throws(()=>createApp({PREVIEW_MODE:'false'}),/both notification providers/);});

test('subscriptions accept both channels, deduplicate contacts, and require consent', async t => {
  const { base, directory } = await fixture(t);
  const post = body => fetch(base + '/api/subscriptions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const input = { channels: ['email', 'whatsapp'], email: ' Subscriber@Example.com ', phone: '+91 98765 43210', consent: true };
  assert.equal((await post({ ...input, consent: false })).status, 400);
  assert.equal((await post({ ...input, channels: [] })).status, 400);
  assert.equal((await post({ ...input, email: 'invalid' })).status, 400);
  assert.equal((await post({ ...input, phone: '9876543210' })).status, 400);
  assert.equal((await post(input)).status, 200);
  assert.equal((await (await post(input)).json()).preview, true);
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(join(directory, 'requests.sqlite'));
  try {
    const rows = db.prepare('SELECT channel, destination, preview FROM subscribers ORDER BY channel').all();
    assert.equal(rows.length, 2);
    assert.equal(rows[0].destination, 'subscriber@example.com');
    assert.equal(rows[1].destination, '+919876543210');
    assert.ok(rows.every(row => row.preview === 1));
  } finally { db.close(); }
  assert.equal((await fetch(base + '/api/subscriptions')).status, 404);
});
