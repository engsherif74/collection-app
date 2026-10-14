import {get,put,del} from '../core/db.js';
const rnd=n=>crypto.getRandomValues(new Uint8Array(n));
export const supported=async()=>!!(window.PublicKeyCredential&&PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable&&await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
export const isOn=async()=>!!(await get('meta','lock'));
export async function enable(){
  if(!(await supported()))throw new Error('هذا الجهاز لا يدعم القفل ببصمة أو نقش أو كلمة مرور الجهاز، أو لم يُفعَّل قفل الشاشة في إعدادات الجهاز.');
  const c=await navigator.credentials.create({publicKey:{challenge:rnd(32),rp:{name:'محصّل الغاز'},user:{id:rnd(16),name:'collector',displayName:'محصّل'},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'discouraged'},timeout:60000}});
  await put('meta','lock',{id:new Uint8Array(c.rawId)});
}
export async function verify(){
  const l=await get('meta','lock');if(!l)return true;
  await navigator.credentials.get({publicKey:{challenge:rnd(32),allowCredentials:[{type:'public-key',id:l.id}],userVerification:'required',timeout:60000}});return true;
}
export const disable=()=>del('meta','lock');
