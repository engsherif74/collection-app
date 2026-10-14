import {list,keyOf as key,ldate} from './ledger.js';
export async function reconcile(oldS,pairs,oldCycle,newCycle){
  if(!oldS.length||oldCycle!==newCycle)return {other:[],gone:0};
  const nm=new Map(pairs),own={};(await list()).filter(e=>e.type==='pay').forEach(e=>{own[e.key]=(own[e.key]||0)+e.due;});
  const other=[],d=ldate(new Date());let gone=0;
  for(const o of oldS){if(!o.inRoute)continue;const k=key(o),n=nm.get(k),diff=o.value-(n?n.value:0);if(diff<=0)continue;const resid=diff-(own[k]||0);if(resid<=0)continue;
    if(!n)gone++;other.push({id:`os-${k}-${Date.now()}`,key:k,name:o.name,amount:resid,date:d,full:!n,kind:'other'});}
  return {other,gone};
}
