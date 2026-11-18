'use client';

import {Check, ClipboardList, Search} from 'lucide-react';
import {type Order, total} from './domain';
import './orders-panel.css';

export const ORDER_FILTERS=['Tất cả','Chờ xác nhận','Chờ hàng về','Chờ giao','Đang giao','Đã giao','Đã hủy','Đã hoàn'];
const statusStyle:Record<string,string>={'Chờ xác nhận':'pending','Chờ hàng về':'waiting','Chờ giao':'ready','Đang giao':'shipping','Đã giao':'delivered','Đã hủy':'cancelled','Đã hoàn':'returned'};
const money=(n:number)=>new Intl.NumberFormat('vi-VN').format(n)+' ₫';
const fold=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');

type Props={
 orders:Order[];
 search:string;
 filter:string;
 onSearch:(value:string)=>void;
 onFilter:(value:string)=>void;
 onDetail:(order:Order)=>void;
 onConfirm:(order:Order)=>void;
 busy:boolean;
 ready:boolean;
};

export default function OrdersPanel({orders,search,filter,onSearch,onFilter,onDetail,onConfirm,busy,ready}:Props){
 const counts=orders.reduce<Record<string,number>>((result,order)=>{result[order.status]=(result[order.status]??0)+1;return result;},{});
 const query=fold(search);
 const visible=orders.filter(o=>(filter==='Tất cả'||o.status===filter)&&fold(o.number+' '+o.customer+' '+o.phone+' '+o.tracking).includes(query));
 const badge=(o:Order)=><span className={'order-status '+(statusStyle[o.status]??'')}>{o.status}</span>;
 const products=(o:Order)=><div className="order-products">{o.lines.map(l=><div key={l.code}><b>{l.name}</b><small>{l.code} × {l.qty}{(l.orderQty??0)>0&&<span className="order-unreceived"> · {l.orderQty} chờ về</span>}</small></div>)}</div>;
 const actions=(o:Order)=><div className="order-actions">{o.status==='Chờ xác nhận'&&<button type="button" className="primary order-confirm" disabled={busy||!ready} onClick={()=>onConfirm(o)}><Check size={15} aria-hidden="true"/>Xác nhận</button>}<button type="button" className="secondary order-detail" onClick={()=>onDetail(o)} aria-label={'Chi tiết '+o.number}>Chi tiết <span aria-hidden="true">→</span></button></div>;
 return <section className="panel orders-panel" aria-label="Quản lý đơn hàng">
  <div className="order-toolbar">
   <div><h2>Danh sách đơn hàng <span>{orders.length}</span></h2><p aria-live="polite">{visible.length} đơn đang hiển thị</p></div>
   <div className="search order-search"><Search size={19} aria-hidden="true"/><input aria-label="Tìm đơn hàng" placeholder="Mã đơn, tên khách, điện thoại, vận đơn…" value={search} onChange={event=>onSearch(event.target.value)}/></div>
  </div>
  <div className="order-filters" role="group" aria-label="Lọc đơn theo trạng thái">{ORDER_FILTERS.map(status=><button key={status} type="button" className={filter===status?'order-filter selected':'order-filter'} aria-pressed={filter===status} onClick={()=>onFilter(status)}>{status}<span>{status==='Tất cả'?orders.length:counts[status]??0}</span></button>)}</div>
  {visible.length?<>
   <div className="orders-desktop"><table className="orders-table"><thead><tr><th scope="col">Mã đơn</th><th scope="col">Ngày bán</th><th scope="col">Khách hàng</th><th scope="col">Sản phẩm</th><th scope="col">Tổng tiền</th><th scope="col">Đã thu</th><th scope="col">Trạng thái</th><th scope="col">Thao tác</th></tr></thead><tbody>{visible.map(o=><tr key={o.id}>
    <th scope="row"><b>{o.number}</b><small>{o.seller}</small></th><td>{o.date}</td><td><b>{o.customer}</b><small>{o.phone||'Khách lẻ'}</small></td><td>{products(o)}</td><td className="order-money">{money(total(o))}</td><td className="order-money">{money(o.paid)}<small>{o.paid===total(o)?'Đã thu đủ':'Còn '+money(total(o)-o.paid)}</small></td><td>{badge(o)}{o.tracking&&<small className="order-tracking">{o.tracking}</small>}</td><td>{actions(o)}</td>
   </tr>)}</tbody></table></div>
   <div className="order-cards">{visible.map(o=><article className="order-card" key={o.id} aria-label={'Đơn '+o.number}>
    <div className="order-card-head"><div><h3>{o.number}</h3><time dateTime={o.date}>{o.date}</time></div>{badge(o)}</div>
    <div className="order-card-customer"><b>{o.customer}</b><small>{o.phone||'Khách lẻ'}</small></div>
    {products(o)}
    <dl className="order-card-totals"><div><dt>Tổng tiền</dt><dd>{money(total(o))}</dd></div><div><dt>Đã thu</dt><dd>{money(o.paid)}</dd></div></dl>
    {o.tracking&&<p className="order-tracking">Vận đơn: {o.tracking}</p>}
    {actions(o)}
   </article>)}</div>
  </>:<div className="empty large order-empty"><ClipboardList size={32} aria-hidden="true"/><h3>{orders.length?'Không có đơn phù hợp':'Chưa có đơn hàng'}</h3><p>{orders.length?'Thử đổi trạng thái hoặc từ khóa tìm kiếm.':'Đơn từ website và Bán hàng sẽ xuất hiện tại đây.'}</p>{(search||filter!=='Tất cả')&&<button className="secondary" onClick={()=>{onSearch('');onFilter('Tất cả');}}>Xóa bộ lọc</button>}</div>}
 </section>;
}
