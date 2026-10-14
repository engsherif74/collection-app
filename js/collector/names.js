import {get,put} from '../core/db.js';
export const getManual=async()=>(await get('settings','manualNames'))||{};
export const saveManual=async(k,n)=>{const m=await getManual();m[k]=n;await put('settings','manualNames',m);};
