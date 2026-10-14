export const totals=(a,f=s=>s.value)=>a.reduce((t,s)=>({n:t.n+1,count:t.count+s.count,value:t.value+f(s)}),{n:0,count:0,value:0});
