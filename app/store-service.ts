import seed from './seed.json';
import {applyAction,State} from './domain';
export type StoreDB={prepare:(query:string)=>{bind:(...values:any[])=>any}};
const STORE_ID='official-store-v1';
type Stored={state:State;operations:string[]};
export async function readStore(db:StoreDB){
 await db.prepare('INSERT OR IGNORE INTO stores (id,data,revision) VALUES (?,?,0)').bind(STORE_ID,JSON.stringify({state:seed,operations:[]})).run();
 const row=await db.prepare('SELECT data,revision FROM stores WHERE id=?').bind(STORE_ID).first();
 if(!row)throw Error('Kho dữ liệu chưa sẵn sàng.');
 const value=JSON.parse(row.data) as Stored;
 return {state:value.state,revision:row.revision as number,operations:value.operations??[]};
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
