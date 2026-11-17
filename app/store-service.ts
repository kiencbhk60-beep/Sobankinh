import seed from './seed.json';
import {applyAction,State,Order,total,sellable,isPackaging,migrateFIFO,migratePackaging,buildPublicCatalog,SHOP_PRODUCT_MAP,CODE_TO_SHOP_KEY} from './domain';
export type StoreDB={prepare:(query:string)=>{bind:(...values:any[])=>any}};
const STORE_ID='official-store-v1';
type Stored={state:State;operations:string[]};

const rateBuckets=new Map<string,{hits:number[];keys:Set<string>;windowStart:number}>();
export function resetRateLimits(){rateBuckets.clear();}
export function checkOrderRateLimit(ip:string,idempotencyKey:string,now=Date.now()):boolean{
 const windowMs=60_000;
 if(rateBuckets.size>2000){
  for(const [k,v] of rateBuckets)if(now-v.windowStart>windowMs)rateBuckets.delete(k);
 }
 const key=ip||'unknown';
 let bucket=rateBuckets.get(key);
 if(!bucket||now-bucket.windowStart>windowMs){
  bucket={hits:[],keys:new Set(),windowStart:now};
  rateBuckets.set(key,bucket);
 }
 bucket.hits=bucket.hits.filter(t=>now-t<=windowMs);
 bucket.hits.push(now);
 if(bucket.hits.length>40)return false;
 if(idempotencyKey&&!bucket.keys.has(idempotencyKey)){
  if(bucket.keys.size>=8)return false;
  bucket.keys.add(idempotencyKey);
 }
 return true;
}

export async function readStore(db:StoreDB){
 await db.prepare('INSERT OR IGNORE INTO stores (id,data,revision) VALUES (?,?,0)').bind(STORE_ID,JSON.stringify({state:seed,operations:[]})).run();
 const row=await db.prepare('SELECT data,revision FROM stores WHERE id=?').bind(STORE_ID).first();
 if(!row)throw Error('Kho dữ liệu chưa sẵn sàng.');
 const value=JSON.parse(row.data) as Stored;
 for(const sp of seed.products){const p=value.state.products.find(x=>x.code===sp.code);if(p&&sp.image)p.image=sp.image;}
 return {state:value.state,revision:row.revision as number,operations:value.operations??[]};
}

export async function readPublicCatalog(db:StoreDB){
 const {state,revision}=await readStore(db);
 return {
  revision,
  updatedAt:new Date().toISOString(),
  items:buildPublicCatalog(state),
 };
}

export function formatPublicOrder(o:Order){
 return {
  id:o.id,
  number:o.number,
  date:o.date,
  status:o.status,
  customer:o.customer,
  phone:o.phone,
  address:o.address,
  note:o.note,
  paid:o.paid,
  total:total(o),
  lines:o.lines.map(l=>({
   code:l.code,
   shopKey:CODE_TO_SHOP_KEY[l.code]??null,
   name:l.name,
   qty:l.qty,
   price:l.price,
   lineTotal:l.qty*l.price,
  })),
 };
}

export async function createOnlineOrder(db:StoreDB,payload:any,clientIp='unknown'){
 if(!payload||typeof payload!=='object')return {status:400,body:{error:'Dữ liệu đơn hàng không hợp lệ.'}};
 if(payload.website&&String(payload.website).trim()!=='')return {status:400,body:{error:'Yêu cầu không hợp lệ.'}};
 const rawKey=String(payload.idempotencyKey??'').trim();
 if(!/^[a-zA-Z0-9_-]{8,64}$/.test(rawKey))return {status:400,body:{error:'Mã định danh đơn hàng không hợp lệ.'}};
 if(!checkOrderRateLimit(clientIp,rawKey))return {status:429,body:{error:'Bạn gửi quá nhiều yêu cầu trong thời gian ngắn. Vui lòng đợi ít phút rồi thử lại.'}};

 const customer=String(payload.customer??payload.fullname??'').trim();
 if(customer.length<2||customer.length>100)return {status:400,body:{error:'Vui lòng nhập họ và tên (từ 2 đến 100 ký tự).'}};
 const rawPhone=String(payload.phone??'').trim();
 const normalizedPhone=rawPhone.replace(/[\s.()-]/g,'');
 if(!/^(?:0[0-9]{9}|\+84[0-9]{9}|84[0-9]{9})$/.test(normalizedPhone))return {status:400,body:{error:'Vui lòng nhập số điện thoại Việt Nam hợp lệ.'}};
 const address=String(payload.address??'').trim();
 if(address.length<10||address.length>300)return {status:400,body:{error:'Vui lòng nhập địa chỉ nhận hàng chi tiết (từ 10 đến 300 ký tự).'}};
 const note=String(payload.note??payload.notes??'').trim().slice(0,500);

 const rawItems=Array.isArray(payload.items)?payload.items:Array.isArray(payload.lines)?payload.lines:null;
 if(!rawItems||!rawItems.length||rawItems.length>20)return {status:400,body:{error:'Danh sách sản phẩm đặt hàng không hợp lệ.'}};

 const requestedMap=new Map<string,{code:string;shopKey:string;qty:number}>();
 for(const item of rawItems){
  if(!item||typeof item!=='object')return {status:400,body:{error:'Thông tin sản phẩm không hợp lệ.'}};
  const shopKey=typeof item.shopKey==='string'?item.shopKey.trim().toLowerCase():typeof item.key==='string'?item.key.trim().toLowerCase():'';
  const rawCode=typeof item.code==='string'?item.code.trim().toUpperCase():'';
  let resolvedCode='';
  let resolvedShopKey='';
  if(shopKey){
   const mapped=SHOP_PRODUCT_MAP[shopKey];
   if(!mapped)return {status:400,body:{error:`Sản phẩm "${shopKey}" chưa được ghép mã mở bán.`}};
   if(rawCode&&rawCode!==mapped)return {status:400,body:{error:'Mã sản phẩm không khớp với danh mục cửa hàng.'}};
   resolvedCode=mapped;
   resolvedShopKey=shopKey;
  }else if(rawCode){
   const mappedShopKey=CODE_TO_SHOP_KEY[rawCode];
   if(!mappedShopKey)return {status:400,body:{error:`Mã sản phẩm "${rawCode}" không thuộc danh mục mở bán trực tuyến.`}};
   resolvedCode=rawCode;
   resolvedShopKey=mappedShopKey;
  }else{
   return {status:400,body:{error:'Thiếu mã sản phẩm.'}};
  }
  const qty=Number(item.qty??item.quantity);
  if(!Number.isInteger(qty)||qty<1||qty>99)return {status:400,body:{error:'Số lượng mỗi sản phẩm phải là số nguyên từ 1 đến 99.'}};
  const prev=requestedMap.get(resolvedCode);
  const nextQty=(prev?.qty??0)+qty;
  if(nextQty>99)return {status:400,body:{error:'Tối đa 99 chiếc cho mỗi sản phẩm.'}};
  requestedMap.set(resolvedCode,{code:resolvedCode,shopKey:resolvedShopKey,qty:nextQty});
 }

 const orderId='web-'+rawKey;
 const requestId='web-req-'+rawKey;
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

 for(let attempt=0;attempt<6;attempt++){
  const current=await readStore(db);
  const existing=current.state.orders.find(o=>o.id===orderId);
  if(existing){
   return {status:200,body:{ok:true,deduplicated:true,order:formatPublicOrder(existing)}};
  }

  const migrated=migrateFIFO(migratePackaging(current.state));
  const canonicalLines:{code:string;qty:number;price:number}[]=[];
  for(const reqItem of requestedMap.values()){
   const p=migrated.products.find(x=>x.code===reqItem.code);
   const label=reqItem.shopKey?reqItem.shopKey.toUpperCase():reqItem.code;
   if(!p||isPackaging(p))return {status:400,body:{error:`Không tìm thấy sản phẩm ${label}.`}};
   if(typeof p.price!=='number'||!Number.isFinite(p.price)||p.price<=0){
    return {status:400,body:{error:`Mẫu kính ${label} hiện chưa có giá bán hợp lệ. Vui lòng liên hệ cửa hàng.`}};
   }
   const maxSellable=sellable(migrated,p);
   if(maxSellable<=0){
    return {status:409,body:{error:`Mẫu kính ${label} hiện đã hết hàng.`}};
   }
   if(reqItem.qty>maxSellable){
    return {status:409,body:{error:`Mẫu kính ${label} chỉ còn ${maxSellable} chiếc có thể đặt.`}};
   }
   // Always use server-side canonical price (p.price); ignore any client-supplied price.
   canonicalLines.push({code:p.code,qty:reqItem.qty,price:p.price});
  }

  let next:State;
  try{
   next=applyAction(current.state,{
    type:'order',
    data:{
     id:orderId,
     online:true,
     date,
     customer,
     phone:normalizedPhone,
     address,
     seller:'Web Cincacao',
     note,
     paid:0,
     lines:canonicalLines,
    },
   });
  }catch(e){
   return {status:400,body:{error:e instanceof Error?e.message:'Dữ liệu đơn hàng không hợp lệ.'}};
  }

  const stored={state:next,operations:[...current.operations.slice(-199),requestId]};
  const updated=await db.prepare('UPDATE stores SET data=?,revision=revision+1 WHERE id=? AND revision=?').bind(JSON.stringify(stored),STORE_ID,current.revision).run();
  if(updated.meta.changes===1){
   const created=next.orders.find(o=>o.id===orderId)!;
   return {status:201,body:{ok:true,deduplicated:false,order:formatPublicOrder(created)}};
  }
 }

 return {status:503,body:{error:'Hệ thống đang xử lý nhiều đơn hàng cùng lúc. Vui lòng thử lại sau giây lát.'}};
}

export async function writeStore(db:StoreDB,action:any){
 if(!action||!['order','receipt','product','update','cost'].includes(action.type))return {status:400,body:{error:'Thao tác không hợp lệ.'}};
 if(!Number.isSafeInteger(action.revision)||action.revision<0||typeof action.requestId!=='string'||!/^[a-f0-9-]{36}$/i.test(action.requestId))return {status:400,body:{error:'Yêu cầu không hợp lệ.'}};
 const current=await readStore(db);
 const result=(s:typeof current)=>({state:s.state,revision:s.revision});
 const duplicate=current.operations.includes(action.requestId)||(action.type==='order'&&current.state.orders.some(o=>o.id===action.data?.id))||(action.type==='receipt'&&current.state.receipts.some(r=>r.id===action.data?.id));
 if(duplicate)return {status:200,body:result(current)};
 if(current.revision!==action.revision)return {status:409,body:{...result(current),error:'Dữ liệu đã thay đổi trên thiết bị khác. Đã tải bản mới; kiểm tra lại rồi bấm lưu.'}};
 let next:State;
 try{next=applyAction(current.state,action);}catch(e){return {status:400,body:{error:e instanceof Error?e.message:'Dữ liệu không hợp lệ.'}};}
 const stored={state:next,operations:[...current.operations.slice(-199),action.requestId]};
 const updated=await db.prepare('UPDATE stores SET data=?,revision=revision+1 WHERE id=? AND revision=?').bind(JSON.stringify(stored),STORE_ID,current.revision).run();
 if(updated.meta.changes!==1){const latest=await readStore(db);return {status:409,body:{...result(latest),error:'Một thiết bị khác vừa lưu dữ liệu. Kiểm tra lại rồi bấm lưu.'}};}
 return {status:200,body:{state:next,revision:current.revision+1}};
}
