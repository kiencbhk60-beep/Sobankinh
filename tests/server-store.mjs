import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const js=p=>ts.transpileModule(readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const seed=JSON.parse(readFileSync('app/seed.json','utf8'));
const domain=uri(js('app/domain.ts'));
const {readStore,writeStore}=await import(uri(js('app/store-service.ts').replace("import seed from './seed.json';",'const seed='+JSON.stringify(seed)+';').replace("'./domain'",JSON.stringify(domain))));
const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync('drizzle/0000_spotty_agent_brand.sql','utf8'));
const db={prepare(sql){
 return {bind(...args){
  return {
   async first(){return sqlite.prepare(sql).get(...args);},
   async run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}};}
  };
 }};
}};
let r=await readStore(db);assert.equal(r.revision,0);assert.equal(r.state.orders.length,0);assert.equal(r.state.products.reduce((n,p)=>n+p.stock,0),16);assert.equal(r.state.lots.reduce((n,l)=>n+l.qty*l.cost,0),1041398);
const order=(id)=>({requestId:crypto.randomUUID(),revision:0,type:'order',data:{id,date:'2026-11-10',seller:'QA',paid:0,lines:[{code:'K-01',qty:1,price:150000}]}});
const one=order('first'),two=order('second');const both=await Promise.all([writeStore(db,one),writeStore(db,two)]);assert.deepEqual(both.map(r=>r.status).sort(),[200,409]);
r=await readStore(db);assert.equal(r.state.orders.length,1);assert.equal(r.revision,1);
const winning=both[0].status===200?one:two;assert.equal((await writeStore(db,winning)).status,200);assert.equal((await readStore(db)).revision,1);
assert.equal((await writeStore(db,{...winning,requestId:crypto.randomUUID()})).status,200);
const stale=await writeStore(db,{type:'product',data:{...seed.products[1],name:'bad overwrite'},revision:0,requestId:crypto.randomUUID()});assert.equal(stale.status,409);
const invalid=await writeStore(db,{...order('invalid'),revision:1,data:{id:'invalid',lines:[{code:'K-01',qty:99,price:150000}],paid:0,date:'2026-11-10'}});assert.equal(invalid.status,400);assert.equal((await readStore(db)).revision,1);
const delivered=await writeStore(db,{type:'update',revision:1,requestId:crypto.randomUUID(),data:{id:winning.data.id,status:'Đã giao',paid:150000}});assert.equal(delivered.status,200);assert.equal(delivered.body.state.products[0].stock,0);
const restart=await readStore(db);assert.equal(restart.revision,2);assert.equal(restart.state.orders[0].status,'Đã giao');assert.equal(restart.state.products[0].stock,0);
assert.equal((await writeStore(db,{type:'reset',revision:2,requestId:crypto.randomUUID()})).status,400);
console.log('Opening Inventory reconciled; persistent store, concurrent writes, stale edits, idempotent orders, invalid stock and delivery passed.');
