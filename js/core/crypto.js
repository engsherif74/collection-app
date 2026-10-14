import {CFG} from './config.js';
import {gzip,gunzip} from './compress.js';
const enc=new TextEncoder(),dec=new TextDecoder(),AES={name:'AES-GCM',length:256};
export async function deriveKey(password,no,role='collector'){
  const base=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt:enc.encode(`${CFG.salt}|${role}|${no}`),iterations:CFG.iter,hash:'SHA-256'},base,AES,false,['encrypt','decrypt']);
}
export async function seal(key,bytes){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,bytes));
  const out=new Uint8Array(13+ct.length);out[0]=CFG.schema;out.set(iv,1);out.set(ct,13);return out;
}
export async function unseal(key,data){
  if(data[0]!==CFG.schema)throw new Error('إصدار ملف غير مدعوم');
  return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:data.slice(1,13)},key,data.slice(13)));
}
export const newMaster=()=>crypto.subtle.generateKey(AES,true,['encrypt','decrypt']);
export async function wrapMaster(master,userKey){return seal(userKey,new Uint8Array(await crypto.subtle.exportKey('raw',master)));}
export async function unwrapMaster(envelope,userKey){return crypto.subtle.importKey('raw',await unseal(userKey,envelope),'AES-GCM',false,['encrypt','decrypt']);}
export const pack=async(obj,key)=>seal(key,await gzip(enc.encode(JSON.stringify(obj))));
export const unpack=async(bytes,key)=>JSON.parse(dec.decode(await gunzip(await unseal(key,bytes))));
