import {get} from '../core/db.js';
import {isOn,enable,disable,verify} from './lock.js';
const ok=f=>/^https:\/\//.test(f)||/^[\w.-]+\.html?$/.test(f),url=f=>/^https:/.test(f)?f:'pages/'+f;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export function openPage(file,params){
  const u=url(file)+(params?'?'+params:''),d=document.createElement('dialog');d.className='viewer';
  d.innerHTML=`<iframe src="${esc(u)}"></iframe><div class="actions"><a class="btn ghost sm" href="${esc(u)}" target="_blank" rel="noopener">فتح في نافذة جديدة</a><button class="btn sm" id="cl">إغلاق</button></div>`;
  d.querySelector('#cl').onclick=()=>{d.close();d.remove();};document.body.append(d);d.showModal();
}
export async function renderMenu(){
  const f=await get('meta','file'),b=(f?.buttons||[]).filter(x=>ok(x.file)).sort((p,q)=>p.order-q.order),m=document.getElementById('menu'),on=await isOn();
  m.innerHTML=`<button data-lock="1">${on?'🔓 إلغاء قفل التطبيق':'🔒 قفل التطبيق ببصمة أو نقش أو كلمة الجهاز'}</button>`+b.map(x=>`<button data-f="${esc(x.file)}">${esc(x.name)}</button>`).join('');
  m.querySelector('[data-lock]').onclick=async()=>{m.hidden=true;try{if(on){await verify();await disable();alert('أُلغي قفل التطبيق.');}else{await enable();alert('تم تفعيل القفل. سيطلب التطبيق بصمتك أو النقش أو كلمة مرور الجهاز عند كل فتح.');}}catch(e){alert(e.message||'تعذر تنفيذ العملية');}renderMenu();};
  m.querySelectorAll('[data-f]').forEach(btn=>btn.onclick=()=>{m.hidden=true;openPage(btn.dataset.f);});
}
