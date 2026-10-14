import {all,put,del,get,putMany} from '../core/db.js';
import {money} from '../core/utils.js';
import {pack,unpack} from '../core/crypto.js';
import {st,esc,toast} from './browse.js';
import {ldate} from './ledger.js';
export const choose=(title,opts,cancel=true)=>new Promise(res=>{const d=document.createElement('dialog');d.innerHTML=`<div>${title}</div>`+opts.map((o,i)=>`<button class="btn ${i?'ghost':''}" value="${i}">${o}</button>`).join('')+(cancel?'<button class="btn ghost" value="-1">إلغاء</button>':'');d.addEventListener('click',e=>{if(e.target.tagName==='BUTTON'){const v=+e.target.value;d.close();d.remove();res(v);}});d.addEventListener('cancel',e=>{if(!cancel)e.preventDefault();});document.body.append(d);d.showModal();});
export async function sendFile(file){
  if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:file.name});return 'shared';}catch{}}
  const l=document.createElement('a');l.href=URL.createObjectURL(file);l.download=file.name;l.click();return 'downloaded';
}
const num=s=>+String(s||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)),rid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const tb=(h,r)=>`<div class="wrap"><table><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr>${r.map(c=>'<tr>'+c.map(x=>`<td>${x}</td>`).join('')+'</tr>').join('')}</table></div>`;
let lastDel=null;
export async function personalCards(el,entries,again){
  const D=(await all('personalDealings')).sort((a,b)=>a.date<b.date?1:-1),P=(await all('personalPayments')).sort((a,b)=>a.payDate<b.payDate?1:-1);
  const sum=(a,f)=>a.reduce((s,x)=>s+f(x),0),L=d=>d.dir==='له'?d.amount:0,R=d=>d.dir==='عليه'?d.amount:0,net={};
  D.forEach(d=>{net[d.name]=(net[d.name]||0)+L(d)-R(d);});
  el.insertAdjacentHTML('beforeend',`<div class="card warn"><b>هذه الجداول محفوظة على هاتفك فقط. حمّلها ولو مرة أسبوعياً حتى لا تفقدها.</b><div class="actions"><button class="btn" id="bk">تحميل نسخة احتياطية</button><button class="btn ghost" id="rst">استرجاع نسخة</button><input type="file" id="rstIn" hidden></div></div>
<div class="card"><h2>جدول التعاملات الشخصية</h2><div class="actions"><button class="btn sm" id="addD">إضافة</button>${lastDel?'<button class="btn ghost sm" id="undoD">تراجع عن آخر حذف</button>':''}</div>${tb(['العميل','له عندي','عليه لي','التاريخ','ملاحظة',''],D.map(d=>[esc(d.name)+(d.src&&P.some(p=>p.src===d.src)?' ⚠':''),money(L(d)),money(R(d)),d.date,esc(d.note||''),`<button class="lnk" data-ed="${d.id}">تعديل</button><button class="lnk" data-dd="${d.id}">حذف</button>`]).concat([['المجموع',money(sum(D,L)),money(sum(D,R)),'','','']]))}${Object.keys(net).length?'<p class="mute">الصافي: '+Object.entries(net).map(([n,v])=>`${esc(n)} ${money(v)}`).join(' · ')+'</p>':''}</div>
<div class="card"><h2>جدول السداد الشخصي</h2>${tb(['العميل','المبلغ','تاريخ السداد','تاريخ التسوية',''],P.map(p=>[esc(p.name)+(p.src&&D.some(d=>d.src===p.src)?' ⚠':''),money(p.amount),p.payDate,p.settleDate||'—',(p.settleDate?'':`<button class="lnk" data-st="${p.id}">تمت التسوية</button>`)+`<button class="lnk" data-dp="${p.id}">حذف من الجدول</button>`]).concat([['المجموع',money(sum(P,p=>p.amount)),'','','']]))}<p class="mute">الحذف من هذا الجدول لا يمس أرشيف السداد.</p></div>`);
  const $=s=>el.querySelector(s),on=(s,f)=>el.querySelectorAll(s).forEach(f);
  $('#addD').onclick=async()=>{const name=(prompt('اسم العميل')||'').trim();if(!name)return;const c=await choose('النوع',['له عندي (استلمت منه)','عليه لي (دفعت عنه)']);if(c<0)return;const a=num(prompt('المبلغ'));if(a>0){const id=rid();await put('personalDealings',id,{id,name,dir:c?'عليه':'له',amount:a,date:ldate(new Date()),note:prompt('ملاحظة (اختياري)')||''});again();}};
  on('[data-ed]',b=>b.onclick=async()=>{const d=D.find(x=>x.id===b.dataset.ed),a=num(prompt('المبلغ الجديد',d.amount));if(a>0){await put('personalDealings',d.id,{...d,amount:a});again();}});
  on('[data-dd]',b=>b.onclick=async()=>{if(confirm('تأكيد حذف العميل من الجدول بعد التسوية؟')){lastDel=D.find(x=>x.id===b.dataset.dd);await del('personalDealings',lastDel.id);again();}});
  if($('#undoD'))$('#undoD').onclick=async()=>{await put('personalDealings',lastDel.id,lastDel);lastDel=null;again();};
  on('[data-st]',b=>b.onclick=async()=>{const p=P.find(x=>x.id===b.dataset.st);await put('personalPayments',p.id,{...p,settleDate:ldate(new Date())});again();});
  on('[data-dp]',b=>b.onclick=async()=>{if(confirm('حذف من الجدول؟')){await del('personalPayments',b.dataset.dp);again();}});
  on('[data-pd]',b=>b.onclick=async()=>{
    const e=entries.find(x=>x.id===b.dataset.pd),s=st.by.get(e.key)||{},name=s.name||'بدون اسم',c=await choose('إضافة تفاصيل',['سداد شخصي (سددت كامل مديونيته من جيبي)','تعاملات: له عندي','تعاملات: عليه لي']);if(c<0)return;const id=rid();
    if(c===0)await put('personalPayments',id,{id,key:e.key,name,amount:e.due,payDate:ldate(e.time),settleDate:null,src:e.id});
    else{const a=num(prompt('المبلغ',e.due));if(!(a>0))return;await put('personalDealings',id,{id,name,dir:c===1?'له':'عليه',amount:a,date:ldate(new Date()),note:'',src:e.id});}
    toast('تمت الإضافة');again();});
  $('#bk').onclick=async()=>{const a=await get('meta','auth'),name=`جداول المديونيات ${ldate(new Date())}.bin`,r=await sendFile(new File([await pack({v:1,dealings:D,payments:P},a.userKey)],name));toast(r==='shared'?'تمت المشاركة: '+name:`تم التحميل باسم «${name}» غالباً في مجلد التنزيلات`);};
  $('#rst').onclick=()=>$('#rstIn').click();
  $('#rstIn').onchange=async e=>{try{const a=await get('meta','auth'),x=await unpack(new Uint8Array(await e.target.files[0].arrayBuffer()),a.userKey);await putMany('personalDealings',x.dealings.map(d=>[d.id,d]));await putMany('personalPayments',x.payments.map(p=>[p.id,p]));toast('تم الاسترجاع');again();}catch{toast('تعذر فتح النسخة');}};
}
