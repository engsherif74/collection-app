import {get,put,putMany,del} from '../core/db.js';
import {isOn,verify,disable,supported,enable} from './lock.js';
import {login} from './unlock.js';
import {loadFiles} from './fileLoader.js';
import {st,refresh,orig,renderHome,renderLedger,toast,esc} from './browse.js';
import {renderArchive,renderDetails} from './details.js';
import {renderSearch} from './search.js';
import {reconcile} from './reconcile.js';
import {choose} from './personal.js';
import {renderMenu} from './buttons.js';
import {check} from './updateCheck.js';
import {exportArchive} from './export.js';
const $=id=>document.getElementById(id),view=$('view');
let tab='home';
const R={home:()=>renderHome(view),ledger:()=>renderLedger(view,reload,doExport),search:()=>renderSearch(view),archive:()=>renderArchive(view),details:()=>renderDetails(view,()=>show('home'))};
const show=t=>{tab=t;st.bld=null;st.all=false;$('back').hidden=true;document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));R[t]();};
async function doExport(){const a=await get('meta','auth');try{const r=await exportArchive(a);toast(r.n?`جُهّز ${r.n} عملية: ${r.name}`:'لا جديد للإرسال');}catch(e){toast(e.message);}}
async function reload(){
  const a=await get('meta','auth'),f=await get('meta','file');toast('جارٍ تحديث الملف…');
  try{await loadFiles(a,()=>{},async n=>{
    const r=await reconcile(orig(),n.pairs,f?.cycle,n.full.cycle);await put('previousFile','prev',{cycle:f?.cycle,subs:orig()});
    if(r.other.length){await choose(`سيتحول ${r.other.length} عميل إلى مسدد (سُدّدوا من مصدر آخر). هل تتابع؟<details><summary>عرض الأسماء</summary>${r.other.slice(0,40).map(o=>esc(o.name||'بدون اسم')).join('<br>')}</details>`,['موافق'],false);await putMany('otherSource',r.other.map(o=>[o.id,o]));}
  });await refresh();$('upd').hidden=true;toast('تم تحديث الملف');const f2=await get('meta','file');st.cycle=f2.cycle;renderMenu();$('who').textContent=`${a.name} · إصدار ${f2.cycle}`;show(tab);}catch(e){toast(e.message);}
}
let unlocked=false,hiddenAt=0;
const showLocked=(auto=true)=>{['lock','app','tabs','exitBtn'].forEach(i=>$(i).hidden=true);$('locked').hidden=false;if(auto)tryUnlock();};
async function tryUnlock(){$('lmsg').textContent='';try{await verify();unlocked=true;$('locked').hidden=true;await boot();}catch{$('lmsg').textContent='لم يتم التحقق. اضغط «فتح التطبيق» وحاول مرة أخرى.';$('relogin').hidden=false;}}
async function autoLock(){try{if(!(await isOn())&&await supported()){await enable();unlocked=true;renderMenu();}}catch{}}
async function boot(){
  const a=await get('meta','auth'),f=await get('meta','file');
  if(!a||!f){$('locked').hidden=true;$('lock').hidden=false;$('app').hidden=true;$('tabs').hidden=true;$('exitBtn').hidden=true;return;}
  check(()=>{$('upd').hidden=false;});
  if(!unlocked&&await isOn()){showLocked();return;}
  st.no=a.no;st.cycle=f.cycle;st.who=a.name;renderMenu();$('who').textContent=`${a.name} · إصدار ${f.cycle}`;$('lock').hidden=true;$('locked').hidden=true;$('app').hidden=false;$('tabs').hidden=false;$('exitBtn').hidden=false;await refresh();show('home');autoLock();
}
$('go').onclick=async()=>{
  const b=$('go'),m=$('msg');b.disabled=true;m.textContent='جارٍ التحقق…';
  try{const a=await login($('name').value.trim(),$('no').value,$('pw').value);localStorage.setItem('lastNo',a.no);const n=await loadFiles(a,t=>m.textContent=t);m.textContent=`تم تحميل ${n} عميل`;await boot();}
  catch(e){m.textContent='✕ '+e.message;}b.disabled=false;
};
$('updBtn').onclick=reload;
$('unlockBtn').onclick=tryUnlock;
$('exitBtn').onclick=()=>{unlocked=false;showLocked(false);window.close();};
$('relogin').onclick=async()=>{if(confirm('ستدخل بالاسم وكلمة السر من جديد ويُلغى القفل. بياناتك وتحصيلاتك تبقى محفوظة. متابعة؟')){await disable();await del('meta','auth');unlocked=false;$('locked').hidden=true;boot();}};
document.addEventListener('visibilitychange',async()=>{if(document.hidden)hiddenAt=Date.now();else if(hiddenAt&&Date.now()-hiddenAt>60000&&await isOn()){unlocked=false;hiddenAt=0;boot();}});
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{st.sel.clear();st.open=null;show(b.dataset.t);});
$('back').onclick=()=>history.back();
addEventListener('popstate',()=>{if(st.sel.size&&!confirm('لديك تحديد غير محفوظ، هل تخرج؟')){history.pushState({v:'bld'},'');return;}st.sel.clear();show(tab);});
const net=()=>{$('net').textContent=navigator.onLine?'متصل':'بدون إنترنت';$('net').dataset.on=navigator.onLine;};
addEventListener('online',net);addEventListener('offline',net);net();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
$('no').value=localStorage.getItem('lastNo')||'';
$('menuBtn').onclick=e=>{e.stopPropagation();$('menu').hidden=!$('menu').hidden;};
document.addEventListener('click',()=>{$('menu').hidden=true;});
boot();
