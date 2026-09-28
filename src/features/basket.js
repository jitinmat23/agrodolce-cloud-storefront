import { products } from '../content/catalogue.js';
import { money, escapeHTML as esc } from '../shared/utils.js';
export function createBasket(onChange) {
  let items = [];
  try { const stored = JSON.parse(localStorage.getItem('agrodolce-basket') || '[]'); if (Array.isArray(stored)) items = stored.filter(x => products.some(p => p.id === x.id) && Number.isInteger(x.quantity) && x.quantity > 0 && x.quantity <= 50).slice(0, products.length); } catch {}
  const save = () => { try {localStorage.setItem('agrodolce-basket', JSON.stringify(items));} catch {} onChange(); };
  return {
    items: () => items.map(x => ({...x})),
    count: () => items.reduce((n,x) => n+x.quantity,0),
    total: () => items.reduce((n,x) => n+products.find(p => p.id===x.id).price*x.quantity,0),
    add(id) { if(!products.some(p=>p.id===id)) return; const item=items.find(x=>x.id===id); if(item) item.quantity=Math.min(50,item.quantity+1); else items.push({id,quantity:1}); save(); },
    change(id, delta) { const item=items.find(x=>x.id===id); if(item) item.quantity=Math.min(50,item.quantity+delta); items=items.filter(x=>x.quantity>0); save(); },
    remove(id) { items=items.filter(x=>x.id!==id); save(); },
    clear() { items=[]; save(); },
    render() { return items.length ? items.map(item => {const p=products.find(p=>p.id===item.id);return `<article class="basket-line"><img src="${esc(p.image)}" alt="${esc(p.alt)}"><div><h3>${esc(p.name)}</h3><span class="small-note">${esc(p.unit)} · ${money(p.price)}</span><div class="quantity"><button type="button" data-change="${p.id}" data-delta="-1" aria-label="Decrease ${esc(p.name)} quantity">−</button><span aria-label="Quantity">${item.quantity}</span><button type="button" data-change="${p.id}" data-delta="1" aria-label="Increase ${esc(p.name)} quantity" ${item.quantity>=50?'disabled':''}>+</button><button type="button" class="remove" data-remove="${p.id}">Remove</button></div></div><strong>${money(p.price*item.quantity)}</strong></article>`;}).join('') : '<div class="empty-basket"><span>✧</span><h3>Room for something lovely</h3><p>Your basket is waiting for its first bake.</p><button class="button" id="continue-browsing">Explore our bakes →</button></div>'; }
  };
}
