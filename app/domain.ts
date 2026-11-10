export type Product={code:string;name:string;cost:number;price:number;stock:number;orderStock?:number;threshold:number;image:string;kind?:'glasses'|'packaging';unit?:string};
export type Lot={id:string;code:string;date:string;qty:number;remaining:number;cost:number;source:string};
export type Allocation={lotId:string;date:string;qty:number;cost:number};
export type Line={code:string;name:string;qty:number;price:number;cost:number;orderQty?:number;allocations?:Allocation[]};
export type Order={id:string;number:string;date:string;customer:string;phone:string;address:string;seller:string;note:string;tracking:string;status:string;paid:number;expense:number;lines:Line[];packaging?:Line[]};
export type State={products:Product[];orders:Order[];receipts:any[];history:any[];lots?:Lot[];fifoVersion?:number;packagingVersion?:number;costVersion?:number;costHistory?:{code:string;before:number;after:number;date:string;source:string}[]};
export const packagingCatalog=[
 {code:'HO-01',name:'Hộp to',unit:'cái'},
 {code:'HO-02',name:'Hộp nhỏ',unit:'cái'},
 {code:'CCS',name:'Gói chống sốc',unit:'cuộn'},
 {code:'TĐ',name:'Túi đựng',unit:'cái'},
 {code:'HK',name:'Hộp kính',unit:'hộp'},
];
export const isPackaging=(p:Product)=>p.kind==='packaging'||packagingCatalog.some(x=>x.code===p.code);
export const productUnit=(p:Product)=>packagingCatalog.find(x=>x.code===p.code)?.unit??p.unit??'chiếc';
export function migratePackaging(input:State):State{
 const s=structuredClone(input);if(s.packagingVersion===1)return s;
 for(const item of packagingCatalog){const p=s.products.find(p=>p.code===item.code);if(p){p.kind='packaging';p.unit=item.unit;}else s.products.push({...item,kind:'packaging',cost:0,price:0,stock:0,orderStock:0,threshold:1,image:''});}
 s.packagingVersion=1;return s;
}
export const packagingCost=(o:Order)=>(o.packaging??[]).reduce((n,l)=>n+lineCost(l),0);
export const orderCost=(o:Order)=>o.lines.reduce((n,l)=>n+lineCost(l),0)+packagingCost(o);
export function quoteFIFO(s:State,code:string,qty:number){
 let left=qty,cost=0;
 for(const lot of (s.lots??[]).filter(l=>l.code===code&&l.remaining>0).sort((a,b)=>a.date.localeCompare(b.date))){const take=Math.min(left,lot.remaining);cost+=take*lot.cost;left-=take;if(left===0)break;}
 return {cost,missing:left};
}
export const total=(o:Order)=>o.lines.reduce((s,l)=>s+l.qty*l.price,0);
export const reserved=(s:State,code:string)=>s.orders.filter(o=>['Chờ giao','Chờ hàng về'].includes(o.status)).reduce((n,o)=>n+o.lines.filter(l=>l.code===code).reduce((n,l)=>n+l.qty-(l.orderQty??0),0),0);
export const available=(s:State,p:Product)=>p.stock-reserved(s,p.code);
export const reservedOrder=(s:State,code:string)=>s.orders.filter(o=>['Chờ giao','Chờ hàng về'].includes(o.status)).reduce((n,o)=>n+o.lines.filter(l=>l.code===code).reduce((n,l)=>n+(l.orderQty??0),0),0);
export const availableOrder=(s:State,p:Product)=>(p.orderStock??0)-reservedOrder(s,p.code);
export const sellable=(s:State,p:Product)=>available(s,p)+availableOrder(s,p);
export const lineCost=(l:Line)=>l.allocations?l.allocations.reduce((n,a)=>n+a.qty*a.cost,0):l.qty*l.cost;
export function migrateFIFO(input:State):State{
 const s=structuredClone(input);if(s.fifoVersion===1)return s;
 s.lots=[];
 for(const p of s.products){const qty=Math.max(0,available(s,p));if(qty)s.lots.push({id:'opening-'+p.code,code:p.code,date:'0000-00-00',qty,remaining:qty,cost:p.cost,source:'Tồn chuyển đổi'});}
 // Old orders retain their historical cost; their held stock is excluded above.
 s.fifoVersion=1;return s;
}
function takeLots(s:State,code:string,qty:number):Allocation[]{
 const out:Allocation[]=[];
 for(const lot of (s.lots??[]).filter(l=>l.code===code&&l.remaining>0).sort((a,b)=>a.date.localeCompare(b.date))){const take=Math.min(qty,lot.remaining);if(take){lot.remaining-=take;qty-=take;out.push({lotId:lot.id,date:lot.date,qty:take,cost:lot.cost});}if(!qty)break;}
 if(qty)throw Error('Không đủ số lượng trong lô nhập của '+code);return out;
}
function restoreLine(s:State,l:Line,id:string){
 if(l.allocations){for(const a of l.allocations){const lot=s.lots!.find(b=>b.id===a.lotId);if(!lot)throw Error('Không tìm thấy lô nhập gốc');lot.remaining+=a.qty;}}
 else {const qty=l.qty-(l.orderQty??0);if(qty)s.lots!.push({id:'legacy-'+id+'-'+l.code,code:l.code,date:'0000-00-00',qty,remaining:qty,cost:l.cost,source:'Hoàn / hủy đơn cũ'});}
}
const num=(v:any,label:string,integer=false)=>{const n=Number(v);if(v===''||v===null||v===undefined||!Number.isFinite(n)||n<0||n>1e10||(integer&&!Number.isInteger(n)))throw Error(label+' không hợp lệ');return n;};
const str=(v:any,max=500)=>String(v??'').trim().slice(0,max);
export function applyAction(original:State,a:any):State{
 const s:State=migrateFIFO(migratePackaging(original));const d=a.data||{};
 const recordCost=(p:Product,cost:number,source:string,date=new Date().toISOString())=>{if(p.cost!==cost){s.costHistory??=[];s.costHistory.unshift({code:p.code,before:p.cost,after:cost,date,source});}p.cost=cost;};
 if(a.type==='order'){
  if(s.orders.some(o=>o.id===d.id))return s;
  if(!Array.isArray(d.lines)||!d.lines.length||d.lines.length>100)throw Error('Hãy chọn sản phẩm');
  const seen=new Set();const lines=d.lines.map((l:any)=>{const p=s.products.find(p=>p.code===l.code);if(!p||isPackaging(p)||seen.has(l.code))throw Error('Mã sản phẩm không hợp lệ hoặc trùng');seen.add(l.code);const qty=num(l.qty,'Số lượng',true);if(qty<1||qty>sellable(s,p))throw Error(p.code+': không đủ tồn có thể bán');const price=num(l.price,'Giá bán');if(price<=0)throw Error('Vui lòng nhập giá bán');const orderQty=Math.max(0,qty-available(s,p));const allocations=takeLots(s,p.code,qty-orderQty);return {code:p.code,name:p.name,cost:p.cost,qty,price,orderQty,allocations};});
  if(d.packaging!==undefined&&!Array.isArray(d.packaging))throw Error('Danh sách đóng gói không hợp lệ');
  if((d.packaging??[]).length>4)throw Error('Chọn tối đa 4 loại vật tư đóng gói');
  const packagingSeen=new Set();
  const packaging:Line[]=(d.packaging??[]).map((l:any)=>{
   const p=s.products.find(p=>p.code===l.code);
   if(!p||!isPackaging(p)||p.code==='CCS'||packagingSeen.has(l.code))throw Error('Vật tư đóng gói không hợp lệ hoặc trùng');
   packagingSeen.add(l.code);const qty=num(l.qty,'Số lượng đóng gói',true);
   if(qty<1||qty>available(s,p))throw Error(p.code+': không đủ tồn đóng gói');
   const allocations=takeLots(s,p.code,qty);p.stock-=qty;
   return {code:p.code,name:p.name,qty,price:0,cost:p.cost,allocations};
  });
  if(!str(d.seller))throw Error('Vui lòng chọn người bán');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date))throw Error('Ngày bán không hợp lệ');
  const o:Order={id:str(d.id,80),number:'DH-'+String(s.orders.length+1).padStart(4,'0'),date:d.date,customer:str(d.customer)||'Khách lẻ',phone:str(d.phone,30),address:str(d.address),seller:str(d.seller,80),note:str(d.note),tracking:'',status:lines.some((l:Line)=>(l.orderQty??0)>0)?'Chờ hàng về':'Chờ giao',paid:num(d.paid,'Tiền đã thu'),expense:0,lines,packaging};
  if(!o.id||o.paid>total(o))throw Error('Tiền đã thu không được vượt tổng đơn');s.orders.unshift(o);
 }else if(a.type==='update'){
  const o=s.orders.find(o=>o.id===d.id);if(!o)throw Error('Không tìm thấy đơn');
  const next=str(d.status);const allowed:Record<string,string[]>={'Chờ hàng về':['Chờ hàng về','Đã hủy'],'Chờ giao':['Chờ giao','Đang giao','Đã giao','Đã hủy'],'Đang giao':['Đang giao','Đã giao','Đã hoàn'],'Đã giao':['Đã giao','Đã hoàn'],'Đã hủy':['Đã hủy'],'Đã hoàn':['Đã hoàn']};
  if(!allowed[o.status]?.includes(next))throw Error('Chuyển trạng thái không hợp lệ');
  const paid=num(d.paid,'Tiền đã thu');if(paid>total(o))throw Error('Tiền đã thu vượt tổng đơn');
  if(o.status==='Chờ giao'&&['Đang giao','Đã giao'].includes(next))for(const l of o.lines){const p=s.products.find(p=>p.code===l.code)!;if(p.stock<l.qty)throw Error('Không đủ hàng trong kho');p.stock-=l.qty;}
  if(['Đang giao','Đã giao'].includes(o.status)&&next==='Đã hoàn')for(const l of o.lines){s.products.find(p=>p.code===l.code)!.stock+=l.qty;restoreLine(s,l,o.id);}
  if(['Chờ giao','Chờ hàng về'].includes(o.status)&&next==='Đã hủy'){for(const l of o.lines)restoreLine(s,l,o.id);for(const l of o.packaging??[]){s.products.find(p=>p.code===l.code)!.stock+=l.qty;restoreLine(s,l,o.id);}}
  o.status=next;o.paid=paid;o.tracking=str(d.tracking,100);o.note=str(d.note);
 }else if(a.type==='receipt'){
  if(s.receipts.some(r=>r.id===d.id))return s;
  const p=s.products.find(p=>p.code===d.code);if(!p)throw Error('Hãy chọn mã hàng');const qty=num(d.qty,'Số lượng',true);if(qty<1)throw Error('Số lượng phải lớn hơn 0');const cost=num(d.cost,'Giá nhập');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date))throw Error('Ngày nhập không hợp lệ');
  if(!str(d.id,80))throw Error('Thiếu mã phiếu nhập');
  s.lots!.push({id:str(d.id,80),code:p.code,date:d.date,qty,remaining:qty,cost,source:'Lô nhập'});
  if(d.source==='order'){
   if(isPackaging(p))throw Error('Vật tư đóng gói chỉ nhập vào kho thực tế');
   if(qty>(p.orderStock??0))throw Error('Số nhận vượt tồn order');
   p.orderStock=(p.orderStock??0)-qty;
   let remaining=qty;
   for(const o of [...s.orders].reverse())if(['Chờ hàng về','Chờ giao'].includes(o.status)){
    for(const l of o.lines)if(l.code===p.code){const received=Math.min(remaining,l.orderQty??0);if(received){
      if(!l.allocations){const held=l.qty-(l.orderQty??0);l.allocations=held?[{lotId:'legacy-held-'+o.id+'-'+l.code,date:'0000-00-00',qty:held,cost:l.cost}]:[];if(held)s.lots!.push({id:'legacy-held-'+o.id+'-'+l.code,code:l.code,date:'0000-00-00',qty:held,remaining:0,cost:l.cost,source:'Giữ cho đơn cũ'});}
      l.allocations.push(...takeLots(s,p.code,received));
     }l.orderQty=(l.orderQty??0)-received;remaining-=received;}
    if(o.status==='Chờ hàng về'&&o.lines.every(l=>!(l.orderQty??0)))o.status='Chờ giao';
   }
  }
  p.stock+=qty;recordCost(p,cost,'Nhập hàng',d.date);s.receipts.unshift({id:str(d.id,80),code:p.code,name:p.name,unit:productUnit(p),qty,cost,source:d.source==='order'?'order':'warehouse',date:d.date,note:str(d.note)});
 }else if(a.type==='cost'){
  const p=s.products.find(p=>p.code===d.code);if(!p)throw Error('Không tìm thấy mã kính');recordCost(p,num(d.cost,'Giá vốn'),'Sửa giá vốn');
 }else if(a.type==='product'){
  const code=str(d.code,30).toUpperCase();if(!/^[A-ZĐ0-9_-]+$/.test(code)||!str(d.name))throw Error('Nhập mã và tên sản phẩm hợp lệ');
  const p=s.products.find(p=>p.code===code);const data={name:str(d.name,120),cost:num(d.cost,'Giá vốn'),price:num(d.price,'Giá bán'),threshold:num(d.threshold,'Ngưỡng tồn',true)};
  const stock=num(d.stock??p?.stock??0,'Tồn thực tế',true),orderStock=num(d.orderStock??p?.orderStock??0,'Tồn order',true);
  if((p&&isPackaging(p))&&orderStock!==0)throw Error('Vật tư đóng gói không có tồn order');
  if(stock<reserved(s,code)||orderStock<reservedOrder(s,code))throw Error('Mỗi loại tồn không được nhỏ hơn số đang giữ tương ứng');
  const delta=stock-(p?.stock??0);
  if(delta>0)s.lots!.push({id:'adjust-'+crypto.randomUUID(),code,date:new Date().toISOString().slice(0,10),qty:delta,remaining:delta,cost:data.cost,source:'Điều chỉnh tồn'});
  if(delta<0)takeLots(s,code,-delta);
  if(p){recordCost(p,data.cost,'Sửa sản phẩm');Object.assign(p,data,{stock,orderStock});}else s.products.push({code,...data,stock,orderStock,image:''});
 }else throw Error('Thao tác không hợp lệ');
 return s;
}
