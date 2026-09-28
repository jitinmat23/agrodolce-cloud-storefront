import { initSubscription } from './features/subscriptions.js';
import { createBasket } from './features/basket.js';
import { initCatalogue } from './features/catalogue.js';
import { contactFields, initSpecialOptions, bindRequestForm } from './features/forms.js';
import { money } from './shared/utils.js';
const $=s=>document.querySelector(s);
let invalidateOrder=()=>{};
const basket=createBasket(()=>{invalidateOrder();renderBasket();});
function renderBasket(){
  $('#basket-count').textContent=basket.count();$('#basket-items').innerHTML=basket.render();
  $('#basket-total').textContent=money(basket.total());$('#basket-checkout').hidden=!basket.count();
}
let toastTimer;
initCatalogue(id=>{basket.add(id);$('#toast').textContent='A little sweetness added to your basket';$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2300);});
const dialog=$('#basket-dialog');
$('#open-basket').addEventListener('click',()=>{$('#order-success').hidden=true;renderBasket();dialog.showModal();});
$('#close-basket').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right)dialog.close();}});
$('#basket-items').addEventListener('click',e=>{
  const change=e.target.closest('[data-change]'),remove=e.target.closest('[data-remove]');
  if(change)basket.change(change.dataset.change,Number(change.dataset.delta));
  if(remove)basket.remove(remove.dataset.remove);
  if(e.target.closest('#continue-browsing')){dialog.close();$('#menu').scrollIntoView();}
});
$('#order-contact').innerHTML=contactFields('order');$('#special-contact').innerHTML=contactFields('special');initSpecialOptions();
invalidateOrder=bindRequestForm($('#order-form'),()=>({type:'order',items:basket.items()}),message=>{basket.clear();$('#basket-items').innerHTML='';$('#order-success').textContent=message;$('#order-success').hidden=false;});
bindRequestForm($('#special-form'),fields=>({type:'enquiry',options:Object.fromEntries(['occasion','bake','flavour','size','style','egg'].map(k=>[k,fields[k]])),requirements:fields.requirements}));
$('#year').textContent=new Date().getFullYear();renderBasket();
fetch('/api/config').then(r=>r.json()).then(config=>{if(config.preview){$('#preview-note').textContent='Preview only · Sample products, prices & photos. Submissions are saved as tests.';}else{$('#preview-note').hidden=true;}}).catch(()=>{$('#preview-note').textContent='Request service unavailable. You can browse while we reconnect.';});

initSubscription();
