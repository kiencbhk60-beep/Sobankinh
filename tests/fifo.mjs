import assert from 'node:assert/strict';import ts from 'typescript';import {readFileSync} from 'node:fs';
const compile=p=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const url=compile('app/domain.ts');const {applyAction,lineCost,migrateFIFO}=await import(url);
const rjs=ts.transpileModule(readFileSync('app/reporting.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace("'./domain'",JSON.stringify(url));const {report}=await import('data:text/javascript;base64,'+Buffer.from(rjs).toString('base64'));
const initial={products:[{code:'K-01',name:'Kính',cost:0,stock:0,orderStock:5,price:150000,threshold:1,image:''}],orders:[],receipts:[],history:[]};
const receipt=(id,date,qty,cost,source='warehouse')=>({type:'receipt',data:{id,date,qty,cost,code:'K-01',source}});
const order=(id,qty)=>({type:'order',data:{id,qty,date:'2026-10-11',seller:'A',paid:0,expense:99999,lines:[{code:'K-01',qty,price:150000}]}});
const update=(id,status)=>({type:'update',data:{id,status,paid:0}});
let s=applyAction(initial,receipt('later','2026-10-10',5,80000));s=applyAction(s,receipt('earlier','2026-10-05',10,90000));
for(const [qty,profit,cost] of [[15,950000,1300000],[13,810000,1140000]]){let a=applyAction(s,order('sale',qty));assert.equal(lineCost(a.orders[0].lines[0]),cost);assert.equal(a.orders[0].expense,0);assert.equal(a.orders[0].lines[0].allocations[0].lotId,'earlier');a=applyAction(a,update('sale','Đã giao'));assert.equal(report(a,'','','').profit,profit);assert.equal(a.products[0].stock,15-qty);a=applyAction(a,update('sale','Đã hoàn'));assert.equal(a.lots.reduce((n,l)=>n+l.remaining,0),15);assert.equal(report(a,'','','').revenue,0);}
let a=applyAction(s,order('sale',13));a=applyAction(a,update('sale','Đã hủy'));assert.equal(a.lots.reduce((n,l)=>n+l.remaining,0),15);
a=applyAction(s,order('sale',13));a=applyAction(a,order('second',2));assert.equal(lineCost(a.orders[0].lines[0]),160000);
a=applyAction(initial,order('preorder',3));assert.equal(lineCost(a.orders[0].lines[0]),0);a=applyAction(a,receipt('p1','2026-10-10',1,90000,'order'));assert.equal(lineCost(a.orders[0].lines[0]),90000);a=applyAction(a,receipt('p2','2026-10-11',2,80000,'order'));assert.equal(lineCost(a.orders[0].lines[0]),250000);assert.equal(a.orders[0].status,'Chờ giao');
assert.deepEqual(applyAction(a,receipt('p2','2026-10-11',2,80000,'order')),a);
assert.throws(()=>applyAction(initial,receipt('bad','2026-10-10',1,'')));
const legacy=structuredClone(s);delete legacy.fifoVersion;delete legacy.lots;legacy.orders=[{id:'old',status:'Chờ giao',lines:[{code:'K-01',qty:2,cost:70000}],paid:0}];const migrated=migrateFIFO(legacy);assert.equal(migrated.lots[0].remaining,13);assert.equal(lineCost(migrated.orders[0].lines[0]),140000);assert.deepEqual(migrateFIFO(migrated),migrated);
console.log('FIFO examples, date ordering, reservations, cancellations, returns, preorders, idempotency and migration passed');
