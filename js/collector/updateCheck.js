import {get} from '../core/db.js';
export async function check(onNew){
  if(!navigator.onLine)return;
  try{const v=await (await fetch('version.json',{cache:'no-store'})).json(),c=await get('meta','ver');
    if(c&&['full','route','keys','settings'].some(k=>v[k]!==c[k]))onNew(v);}catch{}
}
