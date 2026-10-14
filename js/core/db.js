import {CFG} from './config.js';
let dbp;
const open=()=>dbp||(dbp=new Promise((res,rej)=>{
  const r=indexedDB.open(CFG.db,CFG.dbVer);
  r.onupgradeneeded=()=>CFG.stores.forEach(s=>{if(!r.result.objectStoreNames.contains(s))r.result.createObjectStore(s);});
  r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);
}));
const tx=async(s,mode,f)=>{const d=await open();return new Promise((res,rej)=>{const t=d.transaction(s,mode),q=f(t.objectStore(s));t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error);});};
export const get=(s,k)=>tx(s,'readonly',o=>o.get(k));
export const put=(s,k,v)=>tx(s,'readwrite',o=>o.put(v,k));
export const del=(s,k)=>tx(s,'readwrite',o=>o.delete(k));
export const all=s=>tx(s,'readonly',o=>o.getAll());
export const clear=s=>tx(s,'readwrite',o=>o.clear());
export const putMany=(s,pairs)=>tx(s,'readwrite',o=>{pairs.forEach(([k,v])=>o.put(v,k));});
