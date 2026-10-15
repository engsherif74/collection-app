import {money} from '../core/utils.js';
import {latin} from '../core/normalize.js';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const mount=d=>{document.body.append(d);d.showModal();};
// نافذة اختيارات: ترجع رقم الخيار أو -1 عند الإلغاء
export const ask=(html,opts)=>new Promise(res=>{
  const d=document.createElement('dialog');let v=-1;
  d.innerHTML=`<div>${html}</div>`+opts.map((o,i)=>`<button class="btn ${i?'ghost':''}" data-i="${i}">${o}</button>`).join('')+'<button class="btn ghost" data-i="-1">إلغاء</button>';
  d.onclick=e=>{const b=e.target.closest('button');if(b){v=+b.dataset.i;d.close();}};
  d.onclose=()=>{d.remove();res(v);};mount(d);
});
const n=s=>+latin(String(s||'').replace(/[,،٬]/g,'').replace('٫','.')).trim();
// نافذة السداد الجزئي: ترجع {count,amount} أو null
export const partial=(s,due)=>new Promise(res=>{
  const d=document.createElement('dialog');let out=null;
  d.innerHTML=`<div><b>سداد جزئي</b><br>${esc(s.name||'بدون اسم')} · شقة ${esc(s.apt)}<br><span class="mute">المستحق ${money(due)} جنيه · ${s.count} فاتورة</span></div>
<label class="field"><span>عدد الفواتير المسددة</span><input id="pc" inputmode="numeric" autocomplete="off"></label>
<label class="field"><span>القيمة المسددة (جنيه)</span><input id="pv" inputmode="decimal" autocomplete="off"></label>
<p class="mute" id="pm"></p><button class="btn ok" id="ps">سداد</button><button class="btn ghost" id="px">إلغاء</button>`;
  const $=i=>d.querySelector(i);
  $('#px').onclick=()=>d.close();
  $('#ps').onclick=()=>{
    const c=n($('#pc').value),a=Math.round(n($('#pv').value)*100)/100;
    if(!Number.isInteger(c)||c<1||c>=s.count)return $('#pm').textContent=`عدد الفواتير يكون من 1 إلى ${s.count-1}. لسداد الكل اختر «كلي».`;
    if(!(a>0)||a>=due)return $('#pm').textContent=`القيمة يجب أن تكون أكبر من صفر وأقل من ${money(due)}. لسداد الكل اختر «كلي».`;
    out={count:c,amount:a};d.close();
  };
  d.onclose=()=>{d.remove();res(out);};mount(d);setTimeout(()=>$('#pc').focus(),50);
});
