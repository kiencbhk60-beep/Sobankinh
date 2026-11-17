import {env} from 'cloudflare:workers';
import {createOnlineOrder} from '../../store-service';
import {buildShopCorsHeaders,isAllowedShopOrigin} from '../../cors';

export const dynamic='force-dynamic';

export async function OPTIONS(request:Request){
 const origin=request.headers.get('origin');
 if(origin&&!isAllowedShopOrigin(origin)){
  return new Response(null,{status:403,headers:{'Cache-Control':'no-store'}});
 }
 return new Response(null,{status:204,headers:buildShopCorsHeaders(request,'POST, OPTIONS')});
}

export async function POST(request:Request){
 const origin=request.headers.get('origin');
 const headers=buildShopCorsHeaders(request,'POST, OPTIONS');
 if(origin&&!isAllowedShopOrigin(origin)){
  return Response.json({error:'Nguồn yêu cầu không hợp lệ.'},{status:403,headers:{'Cache-Control':'no-store'}});
 }
 const contentType=request.headers.get('content-type')||'';
 if(!contentType.toLowerCase().includes('application/json')){
  return Response.json({error:'Định dạng yêu cầu không hợp lệ.'},{status:415,headers});
 }
 const clientIp=
  request.headers.get('cf-connecting-ip')||
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||
  'unknown';
 try{
  const raw=await request.text();
  if(raw.length>16384){
   return Response.json({error:'Dữ liệu đơn hàng quá lớn.'},{status:413,headers});
  }
  let payload:any;
  try{
   payload=JSON.parse(raw);
  }catch{
   return Response.json({error:'Dữ liệu đơn hàng không hợp lệ.'},{status:400,headers});
  }
  const headerKey=request.headers.get('x-idempotency-key')?.trim();
  if(headerKey&&!payload.idempotencyKey){
   payload.idempotencyKey=headerKey;
  }
  const result=await createOnlineOrder(env.DB!,payload,clientIp);
  return Response.json(result.body,{status:result.status,headers});
 }catch{
  return Response.json({error:'Không thể xử lý đơn hàng lúc này. Vui lòng thử lại sau.'},{status:503,headers});
 }
}
