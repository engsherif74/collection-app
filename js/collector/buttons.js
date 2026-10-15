import {get} from '../core/db.js';
import {isOn,enable,supported} from './lock.js';
const ok=f=>/^https:\/\//.test(f)||/^[\w.-]+\.html?$/.test(f),url=f=>/^https:/.test(f)?f:'pages/'+f;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export function openPage(file,params){
  const u=url(file)+(params?'?'+params:''),d=document.createElement('dialog');d.className='viewer';
  d.innerHTML=`<iframe src="${esc(u)}"></iframe><div class="actions"><a class="btn ghost sm" href="${esc(u)}" target="_blank" rel="noopener">فتح في نافذة جديدة</a><button class="btn sm" id="cl">إغلاق</button></div>`;
  d.querySelector('#cl').onclick=()=>{d.close();d.remove();};document.body.append(d);d.showModal();
}
export async function renderMenu(){
  const f=await get('meta','file'),b=(f?.buttons||[]).filter(x=>ok(x.file)).sort((p,q)=>p.order-q.order),m=document.getElementById('menu'),on=await isOn(),can=!on&&await supported();
  m.innerHTML=(can?'<button data-lock="1">🔒 تفعيل قفل التطبيق ببصمة الجهاز</button>':'')+b.map(x=>`<button data-f="${esc(x.file)}">${esc(x.name)}</button>`).join('');
  document.getElementById('menuBtn').hidden=!m.children.length;
  const l=m.querySelector('[data-lock]');if(l)l.onclick=async()=>{m.hidden=true;try{await enable();alert('تم تفعيل القفل.');}catch(e){alert(e.message||'تعذر تنفيذ العملية');}renderMenu();};
  m.querySelectorAll('[data-f]').forEach(btn=>btn.onclick=()=>{m.hidden=true;openPage(btn.dataset.f);});
}
