import { sendEmail } from './email.js';
import { sendWhatsApp } from './whatsapp.js';
export function providersReady(env){return ['RESEND_API_KEY','EMAIL_FROM','BAKER_EMAIL','TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_WHATSAPP_FROM','BAKER_WHATSAPP_TO','TWILIO_CONTENT_SID'].every(k=>env[k]?.trim());}
export function notificationWorker(store, env, senders={email:sendEmail,whatsapp:sendWhatsApp}) {
  let busy=false;
  return async()=>{if(busy)return;busy=true;try{for(const job of store.pending()){try{const providerId=await senders[job.channel](JSON.parse(job.payload),env);store.accepted(job.request_id,job.channel,providerId);}catch{store.retry(job.request_id,job.channel,job.attempts+1);console.error(`Notification attempt failed: ${job.channel}, request ${job.request_id}`);}}}finally{busy=false;}};
}
export function summary(request){
  const details=request.type==='order'?request.items.map(x=>`${x.quantity} × ${x.name} (${x.unit})`).join('; '):Object.entries(request.options).map(([k,v])=>`${k}: ${v}`).join('; ');
  return `${request.type==='order'?'Order request':'Special enquiry'} ${request.id}\n${request.contact.name} | ${request.contact.phone}${request.contact.email?' | '+request.contact.email:''}\nPickup requested: ${request.pickup.date} at ${request.pickup.time} IST\n${details}${request.total?'\nEstimated total: INR '+(request.total/100):''}${request.requirements?'\nOther requirements: '+request.requirements:''}`;
}
