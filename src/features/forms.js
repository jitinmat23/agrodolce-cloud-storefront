import { enquiryOptions } from '../content/catalogue.js';
import { escapeHTML as esc, indiaToday } from '../shared/utils.js';
export function contactFields(prefix) {
  return `<div class="form-grid"><label>Your name<input name="name" autocomplete="name" required maxlength="100" placeholder="First & last name"></label><label>WhatsApp number<input name="phone" type="tel" autocomplete="tel" required maxlength="20" pattern="[+0-9 ()-]{10,20}" placeholder="+91 98765 43210"></label></div><label>Email address <span class="optional">(optional)</span><input name="email" type="email" autocomplete="email" maxlength="254" placeholder="you@example.com"></label><div class="form-grid"><label>Preferred pickup date<input name="date" type="date" min="${indiaToday()}" required></label><label>Preferred pickup time<input name="time" type="time" required></label></div><p class="form-note">Pickup in Devanahalli, Bengaluru. Date and time are subject to confirmation.</p>`;
}
export function initSpecialOptions() {
  const names={occasion:'The occasion',bake:'Something sweet',flavour:'Flavour',size:'Size / servings',style:'Decoration style',egg:'Egg preference'};
  document.querySelector('#special-options').innerHTML=Object.entries(enquiryOptions).map(([key,values])=>`<label>${names[key]}<select name="${key}" required><option value="">Choose an option</option>${values.map((x,i)=>`<option value="${key}-${i}">${esc(x)}</option>`).join('')}</select></label>`).join('');
}
export function bindRequestForm(form, getPayload, onSuccess) {
  let requestId=crypto.randomUUID(), submitting=false;
  form.addEventListener('input',()=>{if(!submitting)requestId=crypto.randomUUID();});
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(submitting||!form.reportValidity())return;
    const feedback=form.querySelector('.form-feedback'),button=form.querySelector('[type=submit]');
    const fields=Object.fromEntries(new FormData(form));
    const payload={id:requestId,...getPayload(fields),contact:{name:fields.name,phone:fields.phone,email:fields.email},pickup:{date:fields.date,time:fields.time},website:fields.website};
    submitting=true;button.disabled=true;feedback.className='form-feedback';feedback.textContent='Sending your request…';
    try {
      const response=await fetch('/api/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'We couldn’t save your request. Please try again.');
      const message=result.preview ? `Preview request saved (${result.reference}). This is a test; no order has been placed and no notifications have been sent.` : `Request received (${result.reference}). The baker will contact you to confirm.`;
      feedback.className='form-feedback success';feedback.textContent=message;form.reset();requestId=crypto.randomUUID();onSuccess?.(message);
    } catch(error) {feedback.className='form-feedback error';feedback.textContent=error.message==='Failed to fetch'?'Unable to connect. Please try again; your details are still here.':error.message;}
    finally {submitting=false;button.disabled=false;}
  });
  return ()=>{requestId=crypto.randomUUID();};
}
