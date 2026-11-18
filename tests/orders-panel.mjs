import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';

function load(file){
 const url=new URL(file,import.meta.url),require=createRequire(url),module={exports:{}};
 const compiled=ts.transpileModule(readFileSync(url,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(compiled,{module,exports:module.exports,require:name=>name.endsWith('.css')?{}:name==='./domain'?load('../app/domain.ts'):require(name)});
 return module.exports;
}
const {default:Panel}=load('../app/orders-panel.tsx');
const statuses=['Chờ xác nhận','Chờ hàng về','Chờ giao','Đang giao','Đã giao','Đã hủy','Đã hoàn'];
const orders=statuses.map((status,i)=>({id:String(i),number:`DH-QA-${i}`,date:'2026-11-18',customer:i===0?'Đặng Minh':'Khách '+i,phone:i===0?'0912345678':'',address:'QA',seller:i===0?'Web Cincacao':'QA',note:'',tracking:i===2?'VN-READY-001':'',status,paid:50,expense:0,lines:[{code:'K-QA',name:'Kính QA',qty:1,price:100,cost:10,orderQty:i===1?1:0}]}));
const snapshot=JSON.stringify(orders);
const props={orders,search:'',filter:'Tất cả',onSearch(){},onFilter(){},onDetail(){},onConfirm(){},busy:false,ready:true};
const render=overrides=>renderToStaticMarkup(React.createElement(Panel,{...props,...overrides}));
const rows=html=>(html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1]??'');
const codes=html=>[...rows(html).matchAll(/<th scope="row"><b>([^<]+)<\/b>/g)].map(m=>m[1]);
const all=render();
assert.equal(codes(all).length,7,'all includes web, internal and terminal orders');
assert.equal((all.match(/class="order-filter(?: selected)?"/g)||[]).length,8);
for(const status of ['Tất cả',...statuses]){
 const count=status==='Tất cả'?7:1;
 assert(all.includes(`${status}<span>${count}</span>`),`${status} count is based on all actual orders`);
}
for(const [i,status] of statuses.entries())assert.deepEqual(codes(render({filter:status})),[`DH-QA-${i}`]);
for(const search of ['dang minh','0912345678','dh-qa-0'])assert.deepEqual(codes(render({search})),['DH-QA-0']);
assert.deepEqual(codes(render({search:'vn-ready-001',filter:'Chờ giao'})),['DH-QA-2']);
const mismatch=render({search:'vn-ready-001',filter:'Chờ xác nhận'});
assert.deepEqual(codes(mismatch),[]);
assert(mismatch.includes('Không có đơn phù hợp'));
assert(mismatch.includes('value="vn-ready-001"'),'search stays in the input when switching status');
assert(mismatch.includes('Chờ giao<span>1</span>'),'tab counts are not narrowed by search');
const pending=render({filter:'Chờ xác nhận'});
assert(rows(pending).includes('Xác nhận'));
assert(!rows(render({filter:'Chờ giao'})).includes('order-confirm'));
assert(rows(render({filter:'Chờ xác nhận',busy:true})).includes('disabled=""'));
assert(rows(render({filter:'Chờ xác nhận',ready:false})).includes('disabled=""'));
assert(rows(all).includes('1 chờ về'),'unreceived order quantity remains visible');
for(const o of orders)assert(all.includes(`aria-label="Đơn ${o.number}"`),'mobile card is present for every status');
assert(render({orders:[]}).includes('Chưa có đơn hàng'));
assert.equal(JSON.stringify(orders),snapshot,'view operations must not mutate business data');
console.log('PASS: complete lifecycle views, real counts, combined accent-insensitive search/status filters, confirmation guards, mobile cards and immutable input.');
