const DEFAULT_ALLOWED_ORIGINS=new Set([
 'https://cincacao.trekbross.workers.dev',
 'https://sobankinh.trekbross.workers.dev',
]);

export function isAllowedShopOrigin(origin:string|null):boolean{
 if(!origin)return true;
 if(DEFAULT_ALLOWED_ORIGINS.has(origin))return true;
 try{
  const url=new URL(origin);
  if(url.protocol==='http:'&&(url.hostname==='localhost'||url.hostname==='127.0.0.1'))return true;
 }catch{
  return false;
 }
 return false;
}

export function buildShopCorsHeaders(request:Request,methods='GET, OPTIONS'):Record<string,string>{
 const origin=request.headers.get('origin');
 const allowOrigin=origin&&isAllowedShopOrigin(origin)?origin:'https://cincacao.trekbross.workers.dev';
 return {
  'Cache-Control':'no-store',
  'Access-Control-Allow-Origin':allowOrigin,
  'Access-Control-Allow-Methods':methods,
  'Access-Control-Allow-Headers':'Content-Type, X-Idempotency-Key',
  'Access-Control-Max-Age':'86400',
  'Vary':'Origin',
 };
}
