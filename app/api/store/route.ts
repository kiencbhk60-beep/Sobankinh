import {env} from 'cloudflare:workers';
import {readStore,writeStore} from '../../store-service';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
// Shared store is protected by this Site's owner-only access policy.
// Keep the Site private; service access is enforced by the Sites gateway.
export async function GET(){
 try{const {state,revision}=await readStore(env.DB!);return Response.json({state,revision},{headers});}
 catch{return Response.json({error:'Không tải được dữ liệu máy chủ. Vui lòng thử lại.'},{status:503,headers});}
}
export async function POST(request:Request){
 const origin=request.headers.get('origin');
 if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Nguồn yêu cầu không hợp lệ.'},{status:403,headers});
 try{const raw=await request.text();if(raw.length>200000)return Response.json({error:'Yêu cầu quá lớn.'},{status:413,headers});let action;try{action=JSON.parse(raw);}catch{return Response.json({error:'Dữ liệu không hợp lệ.'},{status:400,headers});}const r=await writeStore(env.DB!,action);return Response.json(r.body,{status:r.status,headers});}
 catch{return Response.json({error:'Chưa xác nhận lưu thành công. Hãy tải lại để kiểm tra trước khi thử lại.'},{status:503,headers});}
}
