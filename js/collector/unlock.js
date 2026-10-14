import {deriveKey,unwrapMaster} from '../core/crypto.js';
import {put} from '../core/db.js';
import {latin} from '../core/normalize.js';
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export const getBin=async p=>{const r=await fetch(p,{cache:'no-store'});if(!r.ok)throw new Error('الملف '+decodeURIComponent(p)+' غير موجود في مكانه (رمز '+r.status+'). تأكد من رفعه ومن أن الإنترنت يعمل');return new Uint8Array(await r.arrayBuffer());};
export async function login(name,no,pw){
  no=latin(String(no).trim());pw=String(pw).trim();
  const keys=JSON.parse(new TextDecoder().decode(await getBin('data/keys.bin')));
  const env=keys.envelopes[no];if(!env)throw new Error('رقم الأداء غير مسجل. المسجل: '+Object.keys(keys.envelopes).slice(0,5).join('، '));
  name=keys.names?.[no]||name;if(!name)throw new Error('اكتب الاسم كما سجّله الأدمن');
  const userKey=await deriveKey(pw,no);
  let master;try{master=await unwrapMaster(unb64(env),userKey);}catch{throw new Error('كلمة السر غير صحيحة');}
  const a={name,no,userKey,master};await put('meta','auth',a);return a;
}
