import {all,get,put} from '../core/db.js';
import {money} from '../core/utils.js';
import {list,pay,addAdvance,undo,canUndo,ldate,keyOf as key} from './ledger.js';
import {totals} from './payment.js';
import {openPage} from './buttons.js';
import {getManual,saveManual} from './names.js';
export const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const st={S:[],by:new Map(),paid:new Set(),adv:new Map(),sel:new Set(),sector:'',blk:'',bld:null,open:null,pager:false,all:false,cycle:'',who:'',no:'0'};
const srt=(a,b)=>Number(a)-Number(b),back=v=>{document.getElementById('back').hidden=!v;},num=s=>+String(s||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const due=s=>Math.max(0,s.value-(st.adv.get(key(s))||0)),tot=a=>totals(a,due);
export async function refresh(){
  const mn=await getManual();st.S=await all('subscribers');st.S.forEach(s=>{const n=mn[key(s)];if(n)s.name=n;});
  st.by=new Map(st.S.map(s=>[key(s),s]));const e=await list();st.paid=new Set(e.filter(x=>x.type==='pay').map(x=>x.key));
  st.adv=new Map((await all('advance')).map(v=>[v.key,v.balance]));
}
export const work=()=>st.S.filter(s=>(st.all||s.inRoute)&&!st.paid.has(key(s)));
export const toast=t=>{const e=document.getElementById('toast');e.textContent=t;e.className='show';setTimeout(()=>e.className='',2600);};
function aptsView(a){
  const ch=a.filter(s=>st.sel.has(key(s))),ct=tot(ch),rest=tot(a).value-ct.value;
  const html=`<div class="bh"><h2>قطاع ${st.sector} · بلوك ${st.blk} · عمارة ${st.bld}</h2><label class="chk"><input type="checkbox" id="all" ${ch.length===a.length?'checked':''}> تحديد الكل</label></div><div class="alist">`+a.map(s=>{const k=key(s),b=st.adv.get(k)||0;return `<div class="ar ${st.sel.has(k)?'on':''}"><div class="ln">${esc(s.name||'بدون اسم')} <button class="lnk" data-n="${k}">✎</button></div><div class="l1"><input type="checkbox" data-k="${k}" ${st.sel.has(k)?'checked':''} aria-label="تحديد"><span class="an">شقة ${s.apt}</span><strong>${money(due(s))}</strong><span class="ct">العدد: ${s.count}${b?` · رصيد مقدم ${money(b)}`:''}</span></div><div class="l2"><span class="acts"><button class="btn sm ok" data-p="${k}">سداد</button><button class="lnk" data-pr="${k}">طباعة</button><button class="lnk" data-rd="${k}">قراءة</button><button class="lnk" data-a="${k}">مقدم</button></span></div></div>`;}).join('')+'</div>';
  return {html,ch,ct,rest};
}
const bar=v=>`<div class="bar"><div><small>المبلغ المطلوب</small><b>${money(v.ct.value)}</b></div><div><small>المتبقي من العمارة</small><b>${money(v.rest)}</b></div><button class="btn" id="pay" ${v.ch.length?'':'disabled'}>سداد</button></div>`;
function bind(el,a,v,again){
  el.querySelectorAll('[data-k]').forEach(c=>c.onchange=()=>{c.checked?st.sel.add(c.dataset.k):st.sel.delete(c.dataset.k);again();});
  el.querySelector('#all').onchange=e=>{a.forEach(s=>e.target.checked?st.sel.add(key(s)):st.sel.delete(key(s)));again();};
  el.querySelectorAll('[data-n]').forEach(b=>b.onclick=async ev=>{ev.preventDefault();const n=prompt('اسم العميل');if(n&&n.trim()){await saveManual(b.dataset.n,n.trim());await refresh();again();}});
  el.querySelectorAll('[data-a]').forEach(b=>b.onclick=async ev=>{ev.preventDefault();const x=num(prompt('مبلغ السداد المقدم'));if(x>0){await addAdvance(st.no,st.by.get(b.dataset.a),x);await refresh();toast(`سُجّل مقدم ${money(x)} جنيه`);again();}});
  el.querySelectorAll('[data-p]').forEach(b=>b.onclick=async()=>{const s=st.by.get(b.dataset.p),amt=due(s);await pay(st.no,[s],st.adv);await put('lastPosition','last',{sector:st.sector,blk:st.blk,bld:st.bld});st.sel.delete(b.dataset.p);await refresh();toast(`تم سداد شقة ${s.apt} (${money(amt)} جنيه)`);again();});
  const info=k=>{const s=st.by.get(k);return new URLSearchParams({n:s.name||'',s:s.sector,b:s.blk,d:s.bld,a:s.apt,v:s.value,r:st.adv.get(k)||0,q:due(s),c:s.count,m:st.cycle,u:st.who,k}).toString();};
  el.querySelectorAll('[data-pr]').forEach(b=>b.onclick=()=>openPage('print.html',info(b.dataset.pr)));
  el.querySelectorAll('[data-rd]').forEach(b=>b.onclick=()=>openPage('reading.html',info(b.dataset.rd)));
  const p=el.querySelector('#pay');if(p)p.onclick=async()=>{const amt=v.ct.value;await pay(st.no,v.ch,st.adv);await put('lastPosition','last',{sector:st.sector,blk:st.blk,bld:st.bld});st.sel.clear();await refresh();toast(`تم سداد ${v.ch.length} شقة (${money(amt)} جنيه)`);again();};
}
export async function renderHome(el){
  const y=scrollY;back(false);if(!st.pager)st.bld=null;const w=work();
  if(!st.S.length)return el.innerHTML='<div class="card empty">لا توجد بيانات بعد. من تبويب «ما تم تحصيله» اضغط «تحديث الملف».</div>';
  const secs=[...new Set(w.map(s=>s.sector))].sort(srt);
  if(!secs.length)return el.innerHTML='<div class="card empty">لا يوجد عملاء غير مسددين في خط سيرك. ما شاء الله.</div>';
  if(!secs.includes(st.sector))st.sector=secs[0];
  const blks=[...new Set(w.filter(s=>s.sector===st.sector).map(s=>s.blk))].sort(srt);if(!blks.includes(st.blk))st.blk=blks[0];
  const rows=w.filter(s=>s.sector===st.sector&&s.blk===st.blk),g={};rows.forEach(s=>(g[s.bld]??=[]).push(s));const t=tot(rows),last=await get('lastPosition','last');
  const hasLast=last&&w.some(s=>s.sector===last.sector&&s.blk===last.blk&&s.bld===last.bld);
  const opt=(a,v)=>a.map(x=>`<option ${x===v?'selected':''}>${x}</option>`).join('');let ov=null;
  let html=`<div class="pick"><label class="field"><span>القطاع</span><select id="sSec">${opt(secs,st.sector)}</select></label><label class="field"><span>البلوك</span><select id="sBlk">${opt(blks,st.blk)}</select></label></div><div class="tools"><button class="btn ghost sm" id="pg">${st.pager?'إيقاف عرض الصفحات':'عرض كصفحات'}</button>${hasLast?`<button class="btn sm" id="rs">استكمال من آخر عمارة (${last.sector}-${last.blk}-${last.bld})</button>`:''}</div><p class="sum">${t.n} شقة · ${t.count} فاتورة · <b>${money(t.value)}</b> جنيه</p><div class="blist">`;
  for(const b of Object.keys(g).sort(srt)){const x=tot(g[b]),o=st.pager&&st.open===b,cells=`<b>عمارة ${b}</b><span>${x.n} شقة</span><span>${x.count} فاتورة</span><strong>${money(x.value)}</strong>`;
    html+=st.pager?`<div class="brow prow ${o?'open':''}" data-b="${b}" role="button" tabindex="0">${cells}</div>`:`<button class="brow" data-b="${b}">${cells}</button>`;
    if(o){st.bld=b;const a=g[b].sort((p,q)=>srt(p.apt,q.apt));ov={a,v:aptsView(a)};html+=`<div class="card apts">${ov.v.html}</div>`;}}
  el.innerHTML=html+'</div>'+(ov?bar(ov.v):'');
  el.querySelector('#sSec').onchange=e=>{st.sector=e.target.value;st.open=null;renderHome(el);};
  el.querySelector('#sBlk').onchange=e=>{st.blk=e.target.value;st.open=null;renderHome(el);};
  el.querySelector('#pg').onclick=()=>{st.pager=!st.pager;st.open=null;st.sel.clear();renderHome(el);};
  const rs=el.querySelector('#rs');if(rs)rs.onclick=()=>{st.sector=last.sector;st.blk=last.blk;st.sel.clear();if(st.pager){st.open=last.bld;renderHome(el);}else{st.bld=last.bld;history.pushState({v:'bld'},'');renderBuilding(el);}};
  el.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{st.sel.clear();if(st.pager){st.open=st.open===b.dataset.b?null:b.dataset.b;renderHome(el);}else{st.bld=b.dataset.b;history.pushState({v:'bld'},'');renderBuilding(el);}});
  if(ov)bind(el,ov.a,ov.v,()=>renderHome(el));scrollTo(0,y);
}
export function renderBuilding(el){
  back(true);const a=work().filter(s=>s.sector===st.sector&&s.blk===st.blk&&s.bld===st.bld).sort((p,q)=>srt(p.apt,q.apt));
  if(!a.length)return history.back();const v=aptsView(a);el.innerHTML=`<div class="card">${v.html}</div>${bar(v)}`;bind(el,a,v,()=>renderBuilding(el));
}
export async function renderLedger(el,reload,exp){
  back(false);await refresh();const e=await list(),td=e.filter(x=>ldate(x.time)===ldate(new Date())),sum=td.reduce((s,x)=>s+x.amount,0);
  el.innerHTML=`<div class="card"><h2>اليوم: ${td.length} عملية · ${money(sum)} جنيه</h2></div><div class="alist card">`+(e.map(x=>{const s=st.by.get(x.key)||{};return `<div class="lrow"><span class="an">${s.apt||'?'}</span><span class="nm">${esc(s.name||'بدون اسم')}${x.type==='advance'?' <em class="tag">مقدم</em>':''}<small>قطاع ${s.sector} · بلوك ${s.blk} · عمارة ${s.bld} · ${new Date(x.time).toLocaleString('ar-EG',{dateStyle:'short',timeStyle:'short'})}</small></span><strong>${money(x.amount)}</strong>${canUndo(x)?`<button class="btn ghost sm" data-u="${x.id}">تراجع</button>`:'<small class="fin">نهائي</small>'}</div>`;}).join('')||'<p class="mute">لا توجد تحصيلات بعد.</p>')+'</div><div class="card"><div class="actions"><button class="btn" id="ex">إرسال الأرشيف للأدمن</button><button class="btn ghost" id="rl">تحديث الملف</button></div><p class="mute">يحمّل الملف الأحدث. تحصيلاتك وأرصدتك المقدمة تبقى محفوظة ومطبّقة فوقه.</p></div>';
  el.querySelectorAll('[data-u]').forEach(b=>b.onclick=async()=>{if(confirm('التراجع عن هذه العملية؟')){await undo(e.find(x=>x.id===b.dataset.u));renderLedger(el,reload);}});
  el.querySelector('#rl').onclick=reload;el.querySelector('#ex').onclick=exp;
}
