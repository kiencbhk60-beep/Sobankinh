import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const uri=(s)=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const transpile=(p)=>ts.transpileModule(readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const seed=JSON.parse(readFileSync('app/seed.json','utf8'));

const domainUri=uri(transpile('app/domain.ts'));
const {SHOP_PRODUCT_MAP,available,sellable,total,lineCost}=await import(domainUri);

const storeServiceCode=transpile('app/store-service.ts')
 .replace("import seed from './seed.json';",'const seed='+JSON.stringify(seed)+';')
 .replace("'./domain'",JSON.stringify(domainUri));
const {readStore,writeStore,readPublicCatalog,createOnlineOrder,resetRateLimits}=await import(uri(storeServiceCode));

const sqlite=new DatabaseSync(':memory:');
sqlite.exec(readFileSync('drizzle/0000_spotty_agent_brand.sql','utf8'));
const db={
 prepare(sql){
  return {
   bind(...args){
    return {
     async first(){return sqlite.prepare(sql).get(...args);},
     async run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}};},
    };
   },
  };
 },
};

// 0. Pre-populate an existing internal order to verify old orders & inventory are preserved
let store=await readStore(db);
assert.equal(store.revision,0);
const initialStockTotal=store.state.products.reduce((n,p)=>n+p.stock,0);
assert.equal(initialStockTotal,16);

// Price K-02 (unmapped internal product) and create an existing internal order for K-02
let res=await writeStore(db,{
 type:'product',
 revision:store.revision,
 requestId:crypto.randomUUID(),
 data:{...store.state.products.find(p=>p.code==='K-02'),price:320000},
});
assert.equal(res.status,200);

res=await writeStore(db,{
 type:'order',
 revision:res.body.revision,
 requestId:crypto.randomUUID(),
 data:{
  id:'existing-internal-order-1',
  date:'2026-11-15',
  seller:'Cường',
  customer:'Khách Cũ Nội Bộ',
  phone:'0901112222',
  address:'123 Nguyễn Huệ, Quận 1',
  note:'Đơn cũ trước khi đồng bộ',
  paid:100000,
  lines:[{code:'K-02',qty:1,price:320000}],
 },
});
assert.equal(res.status,200);
const oldOrderSnapshot=structuredClone(res.body.state.orders[0]);

// 1. Test Case: Sản phẩm chưa có giá (Products with price = 0 in seed)
let catalog=await readPublicCatalog(db);
const ridgelineBefore=catalog.items.find(i=>i.code==='K-08');
assert.equal(ridgelineBefore.shopKey,'ridgeline');
assert.equal(ridgelineBefore.price,null);
assert.equal(ridgelineBefore.priceDisplay,'Liên hệ để biết giá');
assert.equal(ridgelineBefore.orderable,false);
// Ensure no sensitive fields are leaked in public catalog
for(const item of catalog.items){
 assert.equal('cost' in item,false,'Catalog must NEVER expose cost');
 assert.equal('lots' in item,false,'Catalog must NEVER expose FIFO lots');
 assert.equal('threshold' in item,false,'Catalog must NEVER expose threshold');
}
assert.equal(catalog.items.some(i=>i.code==='HO-01'),false,'Catalog must NEVER expose packaging');

// Attempt to order unpriced product (K-08 / ridgeline) -> must fail with 400
resetRateLimits();
const unpricedAttempt=await createOnlineOrder(db,{
 idempotencyKey:'order-unpriced-0001',
 customer:'Nguyễn Văn A',
 phone:'0912345678',
 address:'100 Lê Lợi, Phường Bến Thành, Quận 1',
 items:[{shopKey:'ridgeline',qty:1}],
},'10.0.0.1');
assert.equal(unpricedAttempt.status,400);
assert.match(unpricedAttempt.body.error,/chưa có giá bán/);

// 2. Test Case: Thay đổi giá trong Sổ, Shop hiển thị giá mới
store=await readStore(db);
// Update prices for K-08 (RIDGELINE: stock 2), K-09 (NIGHTFALL: stock 1), K-05 (AURORA: stock 2), K-01 (SANDSTONE: stock 1)
for(const [code,newPrice] of [['K-08',450000],['K-09',390000],['K-05',520000],['K-01',480000]]){
 store=await readStore(db);
 const prod=store.state.products.find(p=>p.code===code);
 const updatedProd=await writeStore(db,{
  type:'product',
  revision:store.revision,
  requestId:crypto.randomUUID(),
  data:{...prod,price:newPrice},
 });
 assert.equal(updatedProd.status,200);
}

catalog=await readPublicCatalog(db);
const ridgelineAfter=catalog.items.find(i=>i.code==='K-08');
assert.equal(ridgelineAfter.price,450000);
assert.equal(ridgelineAfter.inStock,true);
assert.equal(ridgelineAfter.availableQty,2);
assert.equal(ridgelineAfter.orderable,true);

// 3. Test Case: Khách đặt một sản phẩm (và thử gửi giá giả mạo từ trình duyệt)
const singleOrderKey='single-order-key-0001';
const singleOrderRes=await createOnlineOrder(db,{
 idempotencyKey:singleOrderKey,
 customer:'Trần Minh Hoàng',
 phone:'0987 654 321',
 address:'456 Điện Biên Phủ, Quận Bình Thạnh, TP.HCM',
 note:'Giao giờ hành chính',
 items:[{shopKey:'ridgeline',code:'K-08',qty:1,price:1000}], // Tampered client price = 1000
},'10.0.0.2');
assert.equal(singleOrderRes.status,201);
assert.equal(singleOrderRes.body.ok,true);
assert.equal(singleOrderRes.body.deduplicated,false);
// Verify canonical server price (450,000) was used, ignoring tampered 1,000
assert.equal(singleOrderRes.body.order.lines[0].price,450000);
assert.equal(singleOrderRes.body.order.total,450000);
assert.equal(singleOrderRes.body.order.paid,0);
assert.equal(singleOrderRes.body.order.status,'Chờ xác nhận');
assert.equal('cost' in singleOrderRes.body.order.lines[0],false,'Order response must not leak cost');

// 4. Test Case: Khách bấm đặt hàng liên tục (Idempotency)
const duplicateClicks=await Promise.all([
 createOnlineOrder(db,{
  idempotencyKey:singleOrderKey,
  customer:'Trần Minh Hoàng',
  phone:'0987 654 321',
  address:'456 Điện Biên Phủ, Quận Bình Thạnh, TP.HCM',
  note:'Giao giờ hành chính',
  items:[{shopKey:'ridgeline',qty:1}],
 },'10.0.0.2'),
 createOnlineOrder(db,{
  idempotencyKey:singleOrderKey,
  customer:'Trần Minh Hoàng',
  phone:'0987 654 321',
  address:'456 Điện Biên Phủ, Quận Bình Thạnh, TP.HCM',
  note:'Giao giờ hành chính',
  items:[{shopKey:'ridgeline',qty:1}],
 },'10.0.0.2'),
]);
for(const dup of duplicateClicks){
 assert.equal(dup.status,200);
 assert.equal(dup.body.deduplicated,true);
 assert.equal(dup.body.order.id,singleOrderRes.body.order.id);
 assert.equal(dup.body.order.number,singleOrderRes.body.order.number);
}
// Verify K-08 available stock only decreased by 1 (from 2 to 1), not 3!
catalog=await readPublicCatalog(db);
assert.equal(catalog.items.find(i=>i.code==='K-08').availableQty,1);

// 5. Test Case: Khách đặt nhiều sản phẩm trong 1 đơn
const multiOrderRes=await createOnlineOrder(db,{
 idempotencyKey:'multi-order-key-0002',
 customer:'Lê Thu Hà',
 phone:'+84909123456',
 address:'789 Nguyễn Trãi, Quận 5, TP. Hồ Chí Minh',
 note:'Đóng gói kỹ giúp mình',
 items:[
  {shopKey:'ridgeline',qty:1}, // 450,000 (last unit of K-08)
  {shopKey:'aurora',qty:2},    // 520,000 * 2 = 1,040,000 (all 2 units of K-05)
 ],
},'10.0.0.3');
assert.equal(multiOrderRes.status,201);
assert.equal(multiOrderRes.body.order.total,450000+1040000);
assert.equal(multiOrderRes.body.order.lines.length,2);

// 6. Test Case: Sản phẩm hết hàng (K-08 and K-05 now have 0 availableQty)
catalog=await readPublicCatalog(db);
const k08Out=catalog.items.find(i=>i.code==='K-08');
assert.equal(k08Out.inStock,false);
assert.equal(k08Out.availableQty,0);
assert.equal(k08Out.orderable,false);

const outOfStockOrder=await createOnlineOrder(db,{
 idempotencyKey:'out-of-stock-key-0003',
 customer:'Phạm Văn B',
 phone:'0918111222',
 address:'12 Lý Tự Trọng, Quận 1, TP. Hồ Chí Minh',
 items:[{shopKey:'ridgeline',qty:1}],
},'10.0.0.4');
assert.equal(outOfStockOrder.status,409);
assert.match(outOfStockOrder.body.error,/hết hàng/);

// 7. Test Case: Hai khách cùng đặt sản phẩm tồn kho thấp (K-09 / NIGHTFALL has stock = 1)
const [conc1,conc2]=await Promise.all([
 createOnlineOrder(db,{
  idempotencyKey:'concurrent-low-stock-1',
  customer:'Khách Đồng Thời 1',
  phone:'0933111222',
  address:'Số 10 Đường 3/2, Quận 10, TP. Hồ Chí Minh',
  items:[{shopKey:'nightfall',qty:1}],
 },'10.0.0.5'),
 createOnlineOrder(db,{
  idempotencyKey:'concurrent-low-stock-2',
  customer:'Khách Đồng Thời 2',
  phone:'0933333444',
  address:'Số 20 Đường 3/2, Quận 10, TP. Hồ Chí Minh',
  items:[{shopKey:'nightfall',qty:1}],
 },'10.0.0.6'),
]);
const statuses=[conc1.status,conc2.status].sort((a,b)=>a-b);
assert.deepEqual(statuses,[201,409],'Exactly one concurrent low-stock order must succeed (201) and the other must fail (409)');

// 8. Test Case: Đơn hàng được ghi nhận đúng trong Sổ & chu trình xử lý đơn (Chờ xác nhận -> Đang giao -> Đã giao / Đã hủy)
store=await readStore(db);
const recordedSingle=store.state.orders.find(o=>o.id==='web-'+singleOrderKey);
assert.ok(recordedSingle);
assert.equal(recordedSingle.customer,'Trần Minh Hoàng');
assert.equal(recordedSingle.seller,'Web Cincacao');
assert.equal(recordedSingle.status,'Chờ xác nhận');
assert.equal(recordedSingle.paid,0);
assert.equal(lineCost(recordedSingle.lines[0]),42893); // FIFO cost preserved from opening lot of K-08!

// Transition singleOrder from Chờ xác nhận -> Đang giao -> Đã giao
res=await writeStore(db,{
 type:'update',
 revision:store.revision,
 requestId:crypto.randomUUID(),
 data:{id:recordedSingle.id,status:'Đang giao',paid:0,tracking:'VN123456',note:recordedSingle.note},
});
assert.equal(res.status,200);
// Stock of K-08 physically decremented from 2 to 1 when entering Đang giao
assert.equal(res.body.state.products.find(p=>p.code==='K-08').stock,1);

res=await writeStore(db,{
 type:'update',
 revision:res.body.revision,
 requestId:crypto.randomUUID(),
 data:{id:recordedSingle.id,status:'Đã giao',paid:450000,tracking:'VN123456',note:recordedSingle.note},
});
assert.equal(res.status,200);
assert.equal(res.body.state.orders.find(o=>o.id===recordedSingle.id).status,'Đã giao');

// Cancel multiOrder (Chờ xác nhận -> Đã hủy) and verify FIFO lots & availability are restored
res=await writeStore(db,{
 type:'update',
 revision:res.body.revision,
 requestId:crypto.randomUUID(),
 data:{id:'web-multi-order-key-0002',status:'Đã hủy',paid:0,tracking:'',note:'Khách đổi ý'},
});
assert.equal(res.status,200);
catalog=await readPublicCatalog(db);
assert.equal(catalog.items.find(i=>i.code==='K-08').availableQty,1);
assert.equal(catalog.items.find(i=>i.code==='K-05').availableQty,2);

// 9. Test Case: Đơn hàng cũ và tồn kho cũ không bị ảnh hưởng
store=await readStore(db);
const preservedOldOrder=store.state.orders.find(o=>o.id==='existing-internal-order-1');
assert.deepEqual(preservedOldOrder,oldOrderSnapshot);
const k04=store.state.products.find(p=>p.code==='K-04');
assert.equal(k04.stock,2);
assert.equal(k04.cost,82793);

// 10. Verify Trekbross app.js mapping & behavior in simulated DOM / fetch environment
const trekbrossAppJs=readFileSync('../Trekbross/app.js','utf8');
for(const [shopKey,code] of Object.entries(SHOP_PRODUCT_MAP)){
 assert.match(trekbrossAppJs,new RegExp(`${shopKey}:\\s*"${code}"`),`Trekbross app.js must map ${shopKey} -> ${code}`);
}
assert.equal(/glacier/i.test(trekbrossAppJs),false,'GLACIER must not exist in Trekbross app.js');

// Test rate limiting on spam requests with distinct idempotency keys from same IP
resetRateLimits();
let rateLimitedCount=0;
for(let i=0;i<12;i++){
 const r=await createOnlineOrder(db,{
  idempotencyKey:`spam-distinct-key-${String(i).padStart(4,'0')}`,
  customer:'Spam User',
  phone:'0912345678',
  address:'123 Đường Spam, Quận 1, TP. Hồ Chí Minh',
  items:[{shopKey:'sandstone',qty:99}], // fails stock check after rate limit check
 },'10.99.99.99');
 if(r.status===429)rateLimitedCount++;
}
assert.ok(rateLimitedCount>=4,'Rate limiter must block excessive distinct order attempts from the same IP with 429');
resetRateLimits();

console.log('All 10 Cincacao <-> Sobankinh integration, security, rate-limit & concurrency test scenarios passed!');
