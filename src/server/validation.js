import { products, enquiryOptions } from '../content/catalogue.js';
export class ValidationError extends Error {}
const fail=message=>{throw new ValidationError(message);};
const text=(value,max=100)=>typeof value==='string'&&value.trim().length<=max?value.trim():'';
export function validateRequest(input, now=new Date()) {
  if(!input||typeof input!=='object')fail('Invalid request.');
  if(typeof input.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.id))fail('Invalid submission identifier. Please refresh and try again.');
  if(input.website)fail('Unable to accept this request.');
  if(!['order','enquiry'].includes(input.type))fail('Invalid request type.');
  const name=text(input.contact?.name),phone=text(input.contact?.phone,20),email=text(input.contact?.email??'',254);
  if(name.length<2)fail('Please enter your name (2–100 characters).');
  if(!/^\+?[\d ()-]+$/.test(phone)||phone.replace(/\D/g,'').length<10||phone.replace(/\D/g,'').length>15)fail('Please enter a valid WhatsApp number including country code.');
  if(input.contact?.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Please enter a valid email address.');
  const date=text(input.pickup?.date,10),time=text(input.pickup?.time,5);
  const pickup=new Date(`${date}T${time}:00+05:30`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||!Number.isFinite(pickup.getTime())||new Date(`${date}T00:00:00Z`).toISOString().slice(0,10)!==date)fail('Please choose a valid pickup date and time.');
  if(pickup<=now)fail('Please choose a future pickup date and time (India time).');
  const result={id:input.id,type:input.type,contact:{name,phone,email},pickup:{date,time},status:'pending',createdAt:now.toISOString()};
  if(input.type==='order'){
    if(!Array.isArray(input.items)||!input.items.length||input.items.length>products.length)fail('Please add at least one bake to your basket.');
    const seen=new Set();result.items=input.items.map(item=>{
      const p=products.find(p=>p.id===item?.id);
      if(!p||seen.has(p.id)||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>50)fail('Your basket contains an invalid item or quantity.');
      seen.add(p.id);return {id:p.id,name:p.name,unit:p.unit,unitPrice:p.price,quantity:item.quantity};
    });result.total=result.items.reduce((n,x)=>n+x.unitPrice*x.quantity,0);
  }else{
    result.options={};for(const [key,values] of Object.entries(enquiryOptions)){
      const selected=values.findIndex((_,i)=>`${key}-${i}`===input.options?.[key]);
      if(selected<0)fail(`Please choose a valid ${key} option.`);result.options[key]=values[selected];
    }
    if(typeof input.requirements!=='undefined'&&(typeof input.requirements!=='string'||input.requirements.length>1500))fail('Other requirements must be under 1,500 characters.');
    result.requirements=text(input.requirements??'',1500);
  }return result;
}
