import { summary } from './index.js';
export async function sendEmail(request,env){
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`agrodolce-${request.id}`},body:JSON.stringify({from:env.EMAIL_FROM,to:[env.BAKER_EMAIL],subject:`Agrodolce · New ${request.type==='order'?'order request':'special enquiry'}`,text:summary(request)}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('Email provider rejected notification');const data=await response.json();if(!data.id)throw new Error('Missing provider acknowledgement');return data.id;
}
