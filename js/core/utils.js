export const cmpNum=(a,b)=>{for(let i=0;i<a.length;i++){const d=Number(a[i])-Number(b[i]);if(d)return d;}return 0;};
export const money=n=>Number(n||0).toLocaleString('en-US');
export const today=()=>new Date().toISOString().slice(0,10);
export const uid=no=>`${no}-${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;
export const kb=n=>(n/1024).toFixed(1)+' ك.ب';
