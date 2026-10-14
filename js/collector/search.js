import {st,esc,refresh,renderBuilding} from './browse.js';
import {keyOf as key} from './ledger.js';
import {searchKey} from '../core/normalize.js';
import {money} from '../core/utils.js';
let q='',scope='route';
const fz=s=>searchKey(s).replace(/[خج]/g,'ح').replace(/ذ/g,'د');
export async function renderSearch(el){
  document.getElementById('back').hidden=true;await refresh();
  el.innerHTML=`<div class="card"><input id="q" class="srch" placeholder="اكتب اسم العميل…" value="${esc(q)}" autocomplete="off"><div class="tools"><label class="chk"><input type="radio" name="sc" value="route" ${scope==='route'?'checked':''}> خط سيري فقط</label><label class="chk"><input type="radio" name="sc" value="all" ${scope==='all'?'checked':''}> الملف كاملاً</label></div></div><div id="sr" class="blist"></div>`;
  const draw=()=>{
    const ws=fz(q).split(' ').filter(Boolean),sr=el.querySelector('#sr');if(!ws.length){sr.innerHTML='';return;}
    const m=st.S.filter(s=>!st.paid.has(key(s))&&(scope==='all'||s.inRoute)&&ws.every(w=>fz(s.name||'').includes(w))),g={};
    m.forEach(s=>(g[`${s.sector}|${s.blk}|${s.bld}`]??=[]).push(s));
    sr.innerHTML=Object.entries(g).slice(0,40).map(([k,a])=>{const[x,b,d]=k.split('|');return `<button class="brow srow" data-g="${k}"><b>قطاع ${x} · بلوك ${b} · عمارة ${d}</b><span>${a.slice(0,3).map(s=>esc(s.name)).join('، ')}${a.length>3?` +${a.length-3}`:''}</span><span>${a[0].inRoute?'':'<em class="tag">خارج خط سيري</em>'}</span><strong>${money(a.reduce((t,s)=>t+s.value,0))}</strong></button>`;}).join('')||'<div class="card empty">لا نتائج.</div>';
    sr.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{const[x,bl,d]=b.dataset.g.split('|');st.sector=x;st.blk=bl;st.bld=d;st.all=scope==='all';st.sel.clear();history.pushState({v:'bld'},'');renderBuilding(el);});
  };
  el.querySelector('#q').oninput=e=>{q=e.target.value;draw();};
  el.querySelectorAll('[name=sc]').forEach(r=>r.onchange=()=>{scope=r.value;draw();});draw();
}
