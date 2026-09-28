import { products } from '../content/catalogue.js';
import { money, escapeHTML as esc } from '../shared/utils.js';
export function initCatalogue(add) {
  const filters=document.querySelector('#filters'), grid=document.querySelector('#products');
  const categories=['All bakes',...new Set(products.map(p=>p.category))];
  filters.innerHTML=categories.map((x,i)=>`<button class="filter" type="button" aria-pressed="${i===0}" data-category="${esc(x)}">${esc(x)}</button>`).join('');
  const render=category=>{grid.innerHTML=products.filter(p=>category==='All bakes'||p.category===category).map(p=>`<article class="product-card"><div class="product-image"><img src="${esc(p.image)}" alt="${esc(p.alt)}" loading="lazy"><span class="egg-badge"><span class="egg-dot ${p.egg==='Contains egg'?'contains':''}"></span>${esc(p.egg)}</span></div><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><div class="product-bottom"><span class="price">${money(p.price)}<span class="unit">/ ${esc(p.unit)}</span></span><button class="add-button" data-add="${p.id}" aria-label="Add ${esc(p.name)} to basket">Add <span>+</span></button></div></article>`).join('');};
  filters.addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;filters.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render(b.dataset.category);});
  grid.addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(b)add(b.dataset.add);});render('All bakes');
}
