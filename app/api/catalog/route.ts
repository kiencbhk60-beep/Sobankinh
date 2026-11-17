import {env} from 'cloudflare:workers';
import {readPublicCatalog} from '../../store-service';
import {buildShopCorsHeaders,isAllowedShopOrigin} from '../../cors';

export const dynamic='force-dynamic';

export async function OPTIONS(request:Request){
 const origin=request.headers.get('origin');
 if(origin&&!isAllowedShopOrigin(origin)){
  return new Response(null,{status:403,headers:{'Cache-Control':'no-store'}});
 }
 return new Response(null,{status:204,headers:buildShopCorsHeaders(request,'GET, OPTIONS')});
}

export async function GET(request:Request){
 const origin=request.headers.get('origin');
 const headers=buildShopCorsHeaders(request,'GET, OPTIONS');
 if(origin&&!isAllowedShopOrigin(origin)){
  return Response.json({error:'Nguồn yêu cầu không hợp lệ.'},{status:403,headers:{'Cache-Control':'no-store'}});
 }
 try{
  const catalog=await readPublicCatalog(env.DB!);
  return Response.json(catalog,{status:200,headers});
 }catch{
  return Response.json({error:'Không tải được danh mục sản phẩm. Vui lòng thử lại.'},{status:503,headers});
 }
}
