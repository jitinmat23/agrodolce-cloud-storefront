import { validateSubscription } from './subscriptions.js';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRequest, ValidationError } from './validation.js';
import { openStore } from './storage.js';
import { providersReady, notificationWorker } from './notifications/index.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export function createApp(env=process.env){
  const preview=env.PREVIEW_MODE!=='false';
  if(!preview&&!providersReady(env))throw new Error('Live mode requires both notification providers. See .env.example.');
  const store=openStore(resolve(root,env.DATA_DIR||'.data'));
  const work=notificationWorker(store,env);
  const timer=setInterval(()=>void work().catch(()=>console.error('Notification queue unavailable')),15000);timer.unref();
  const limits=new Map();
  const server=createServer(async(req,res)=>{
    const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; img-src 'self' https://images.unsplash.com; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"};
    const json=(status,body)=>{res.writeHead(status,{...headers,'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
    try{
      const url=new URL(req.url,'http://localhost');
      if(req.method==='GET'&&url.pathname==='/api/config')return json(200,{preview});
      if(req.method==='POST'&&['/api/requests','/api/subscriptions'].includes(url.pathname)){
        const expectedOrigin=env.SITE_ORIGIN||`http://localhost:${env.PORT||3000}`;
        if(req.headers.origin&&req.headers.origin!==expectedOrigin)return json(403,{error:'Please submit from the bakery website.'});
        if(!req.headers['content-type']?.startsWith('application/json'))return json(415,{error:'Expected a JSON request.'});
        const address=req.socket.remoteAddress,now=Date.now();
        for(const [ip,value] of limits)if(value.until<now)limits.delete(ip);
        const limit=limits.get(address)||{count:0,until:now+60000};
        if(++limit.count>15)return json(429,{error:'Too many requests. Please wait a minute and try again.'});limits.set(address,limit);
        const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>16384)return json(413,{error:'Your request is too large.'});chunks.push(chunk);}
        let input;try{input=JSON.parse(Buffer.concat(chunks).toString());}catch{return json(400,{error:'Invalid request format.'});}
        if (url.pathname === '/api/subscriptions') {
          const subscriptions = validateSubscription(input);
          store.subscribeAll(subscriptions, preview);
          return json(200, { preview, message: 'Subscription preferences saved.' });
        }
        const request=validateRequest(input);const created=store.save(request,preview);
        json(created?201:200,{reference:request.id,preview});void work().catch(()=>console.error('Notification queue unavailable'));return;
      }
      if(req.method!=='GET'&&req.method!=='HEAD')return json(405,{error:'Method not allowed.'});
      let path=decodeURIComponent(url.pathname),file;
      if(path==='/'||path==='/index.html')file=resolve(root,'public/index.html');
      else if(/^\/images\/[a-zA-Z0-9_.-]+$/.test(path))file=resolve(root,'public'+path);
      else if(/^\/src\/(app\.js|(?:content|features|shared|styles)\/[a-zA-Z0-9_.-]+)$/.test(path))file=resolve(root,'.'+path);
      else return json(404,{error:'Not found.'});
      const data=await readFile(file),types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png'};
      res.writeHead(200,{...headers,'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data);
    }catch(e){if(e instanceof ValidationError||e.status)return json(e.status||400,{error:e.message});if(e.code==='ENOENT')return json(404,{error:'Not found.'});console.error('Request handling failed:',e.name);json(500,{error:'We couldn’t save your request. Please try again.'});}
  });
  server.on('close',()=>{clearInterval(timer);store.close();});
  return server;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const server=createApp();server.listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log(`Agrodolce is running at http://localhost:${process.env.PORT||3000} (${process.env.PREVIEW_MODE==='false'?'live':'preview'} mode)`));
}
