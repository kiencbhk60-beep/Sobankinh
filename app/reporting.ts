import {State,total,lineCost,packagingCost} from './domain';
export const excelCosts:Record<string,number>={'K-01':82793,'K-02':82793,'K-03':82793,'K-04':82793,'K-05':42893,'K-06':71621,'K-07':71621,'K-08':42893,'K-09':38903,'K-10':59651,'K-11':59651};
export function migrateCosts(input:State):State{
 const s=structuredClone(input);
 if(s.costVersion===1)return s;
 for(const [i,code] of Object.keys(excelCosts).entries()){
  const p=s.products.find(p=>p.code===code);
  if(p&&p.cost===50000+i*5000&&!s.receipts.some(r=>r.code===code)&&!(s.costHistory??[]).some(r=>r.code===code))p.cost=excelCosts[code];
 }
 s.costVersion=1;return s;
}
export function report(s:State,from:string,to:string,seller:string){
 const orders=s.orders.filter(o=>(!from||o.date>=from)&&(!to||o.date<=to)&&(!seller||o.seller===seller));
 const active=orders.filter(o=>!['Đã hủy','Đã hoàn'].includes(o.status));
 const delivered=active.filter(o=>o.status==='Đã giao');
 const packaging=delivered.reduce((n,o)=>n+packagingCost(o),0),returnedPackaging=orders.filter(o=>o.status==='Đã hoàn').reduce((n,o)=>n+packagingCost(o),0);
 const revenue=delivered.reduce((n,o)=>n+total(o),0),cost=delivered.reduce((n,o)=>n+o.lines.reduce((v,l)=>v+lineCost(l),0),0),expense=delivered.reduce((n,o)=>n+o.expense,0);
 const days=new Map<string,number>(),products=new Map<string,{code:string;name:string;qty:number;revenue:number;cost:number}>();
 for(const o of delivered){days.set(o.date,(days.get(o.date)??0)+total(o));for(const l of o.lines){const r=products.get(l.code)??{code:l.code,name:l.name,qty:0,revenue:0,cost:0};r.qty+=l.qty;r.revenue+=l.qty*l.price;r.cost+=lineCost(l);products.set(l.code,r);}}
 return {revenue,cost,packaging,returnedPackaging,totalCost:cost+packaging,expense,profit:revenue-cost-packaging-returnedPackaging-expense,delivered:delivered.length,units:delivered.reduce((n,o)=>n+o.lines.reduce((v,l)=>v+l.qty,0),0),pending:active.filter(o=>o.status!=='Đã giao').reduce((n,o)=>n+total(o),0),paid:active.reduce((n,o)=>n+o.paid,0),due:active.reduce((n,o)=>n+total(o)-o.paid,0),excluded:orders.filter(o=>['Đã hủy','Đã hoàn'].includes(o.status)).length,days:[...days].sort((a,b)=>a[0].localeCompare(b[0])),products:[...products.values()].sort((a,b)=>b.revenue-a.revenue)};
}
