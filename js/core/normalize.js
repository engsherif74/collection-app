import {CFG} from './config.js';
const IN='٠١٢٣٤٥٦٧٨٩';
export const latin=s=>String(s??'').replace(/[٠-٩]/g,d=>IN.indexOf(d));
export const clean=s=>String(s??'').normalize('NFKC').replace(/[\u202A-\u202E\u200E\u200F\uFEFF\u00A0\r\n]+/g,' ').replace(/\s+/g,' ').trim();
export const pad2=v=>{const t=latin(clean(v));return /^\d+$/.test(t)?t.padStart(2,'0'):t;};
export const colName=h=>{const c=clean(h);return CFG.alias[c]||c;};
export const searchKey=s=>clean(s).replace(/[\u064B-\u065F\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه');
export const month=v=>{
  const t=latin(clean(v));let m=t.match(/^(\d{4})\D?(\d{1,2})$/);
  if(m)return m[1]+m[2].padStart(2,'0');
  m=t.match(/^(\d{1,2})\D+(\d{4})$/);return m?m[2]+m[1].padStart(2,'0'):t;
};
export const subscriberId=(cat,sec,blk,bld,apt,sub='00')=>[cat.gov,cat.area,sec,sec,blk,bld,apt,sub].map(pad2).join('');
