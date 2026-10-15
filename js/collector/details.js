import {get,all} from '../core/db.js';
import {personalCards} from './personal.js';
import {money} from '../core/utils.js';
import {list,ldate} from './ledger.js';
import {st,esc,work,refresh,receipt} from './browse.js';
const grp=(a,f)=>a.reduce((m,x)=>{(m[f(x)]??=[]).push(x);return m;},{}),sum=a=>a.reduce((s,x)=>s+x.amount,0);
const tbl=(h,r)=>`<div class="wrap"><table><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr>${r.map(c=>'<tr>'+c.map(x=>`<td>${x}</td>`).join('')+'</tr>').join('')}</table></div>`;
const who=e=>{const s=st.by.get(e.key)||{};return `${esc(s.name||'بدون اسم')} (${s.sector}-${s.blk}-${s.bld}-${s.apt})`;};
const kind=e=>e.type==='advance'?'مقدم':e.partial?'سداد جزئي':'سداد';
export async function renderArchive(el){
  await refresh();const e=await list(),days=grp(e,x=>ldate(x.time)),mons=grp(e,x=>ldate(x.time).slice(0,7));
  const d=Object.keys(days).sort().reverse().map(k=>`<details><summary>${k} · ${days[k].length} عملية · <b>${money(sum(days[k]))}</b></summary>${tbl(['المشترك','النوع','المبلغ',''],days[k].map(x=>[who(x),kind(x),money(x.amount),x.type==='pay'?`<button class="lnk" data-pd="${x.id}">تفاصيل</button><button class="lnk" data-pr="${x.id}">طباعة</button>`:'']))}</details>`).join('')||'<p class="mute">لا يوجد.</p>';
  const m=Object.keys(mons).sort().reverse().map(k=>{const dd=grp(mons[k],x=>ldate(x.time));return `<details><summary>${k} · ${Object.keys(dd).length} يوم · <b>${money(sum(mons[k]))}</b></summary>${tbl(['اليوم','العمليات','المجموع'],Object.keys(dd).sort().map(x=>[x,dd[x].length,money(sum(dd[x]))]))}</details>`;}).join('')||'<p class="mute">لا يوجد.</p>';
  el.innerHTML=`<div class="card"><h2>الأرشيف اليومي</h2>${d}</div><div class="card"><h2>الأرشيف الشهري</h2>${m}</div>`;
  el.querySelectorAll('[data-pr]').forEach(b=>b.onclick=()=>receipt(e.find(x=>x.id===b.dataset.pr)));
  await personalCards(el,e,()=>renderArchive(el));
}
export async function renderDetails(el,goHome){
  await refresh();const f=await get('meta','file'),rt=f?.routes||[],e=await list(),mon=ldate(new Date()).slice(0,7),cur=e.filter(x=>ldate(x.time).slice(0,7)===mon);
  const secs=[...new Set(rt.map(r=>r.sector))].sort(),sec=k=>k.split('|')[1];
  const rows=secs.map(s=>{const debt=st.S.filter(x=>x.inRoute&&x.sector===s).reduce((t,x)=>t+(x.value0??x.value),0),iss=rt.filter(r=>r.sector===s).reduce((t,r)=>t+(r.issuance||0),0),tg=rt.filter(r=>r.sector===s).reduce((t,r)=>t+(r.target||0),0),c=sum(cur.filter(x=>sec(x.key)===s));
    return [s,money(debt),iss?money(iss):'—',money(c),iss?money(iss-c):'—',iss?(c/iss*100).toFixed(1)+'%':'—',tg?money(tg-c):'—',money(debt-c)];});
  const g={};work().forEach(s=>{((g[s.sector]??={})[s.blk]??=0);g[s.sector][s.blk]+=s.value;});
  const site=Object.keys(g).sort().flatMap(s=>Object.keys(g[s]).sort((a,b)=>a-b).map(b=>[s,b,money(g[s][b]),`<button class="btn ghost sm" data-go="${s}|${b}">فتح</button>`]));
  const ad=e.filter(x=>x.type==='advance'),oor=e.filter(x=>x.out&&x.type==='pay'),os=await all('otherSource');
  el.innerHTML=`<div class="card"><h2>التفاصيل</h2>
<details open><summary>المديونية</summary>${rows.length?tbl(['القطاع','إجمالي المديونية','الإصدار','ما تم تحصيله','المتبقي من الإصدار','النسبة','المتبقي من المستهدف','المتبقي من المديونية'],rows):'<p class="mute">لا يوجد خط سير.</p>'}<p class="mute">الإصدار والمستهدف يدخلهما الأدمن مع خط السير، وتظهر «—» حتى يدخلهما.</p></details>
<details><summary>المتبقي في الموقع</summary>${site.length?tbl(['القطاع','البلوك','القيمة',''],site):'<p class="mute">لا متبقي.</p>'}</details>
<details><summary>تسديدات خارج النطاق</summary>${oor.length?tbl(['العميل','المبلغ','التاريخ'],oor.map(x=>[who(x),money(x.amount),ldate(x.time)])):'<p class="mute">لا يوجد.</p>'}</details>
<details><summary>سداد من مصدر آخر</summary>${os.length?tbl(['العميل','المبلغ','التاريخ','كامل؟'],os.map(x=>[esc(x.name||'بدون اسم'),money(x.amount),x.date,x.full?'نعم':'جزئي'])):'<p class="mute">لا يوجد.</p>'}</details>
<details><summary>سجل السداد المقدم</summary>${ad.length?tbl(['العميل','المبلغ','الرصيد الحالي','التاريخ'],ad.map(x=>[who(x),money(x.amount),money(st.adv.get(x.key)||0),ldate(x.time)])):'<p class="mute">لا يوجد.</p>'}</details>
<p class="mute">السجل اليومي والشهري في تبويب «الأرشيف».</p></div>`;
  el.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{[st.sector,st.blk]=b.dataset.go.split('|');st.open=null;goHome();});
}
