import { summary } from './index.js';
export async function sendWhatsApp(request,env){
  const body=new URLSearchParams({From:env.TWILIO_WHATSAPP_FROM,To:env.BAKER_WHATSAPP_TO,ContentSid:env.TWILIO_CONTENT_SID,ContentVariables:JSON.stringify({'1':request.id,'2':summary(request).replace(/\s+/g,' ').slice(0,1400)})});
  const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(env.TWILIO_ACCOUNT_SID)}/Messages.json`,{method:'POST',headers:{Authorization:`Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},body,signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('WhatsApp provider rejected notification');const data=await response.json();if(!data.sid)throw new Error('Missing provider acknowledgement');return data.sid;
}
