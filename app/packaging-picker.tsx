'use client';
import {State,isPackaging,productUnit,quoteFIFO,available} from './domain';
const money=(n:number)=>new Intl.NumberFormat('vi-VN').format(n)+' ₫';
export default function PackagingPicker({state,selection,onChange}:{state:State;selection:Record<string,string>;onChange:(code:string,value:string)=>void}){
 const items=state.products.filter(p=>isPackaging(p)&&p.code!=='CCS');
 const cost=items.reduce((n,p)=>n+quoteFIFO(state,p.code,Math.max(0,Number(selection[p.code])||0)).cost,0);
 return <details className="packaging-picker"><summary>Nguyên vật liệu đóng gói <span>{money(cost)}</span></summary><p>Chọn số lượng dùng cho cả đơn. Kho trừ khi lưu đơn; giá vốn lấy theo lô nhập sớm nhất.</p>{items.map(p=>{const qty=Number(selection[p.code])||0;return <div className="packaging-choice" key={p.code}><div><b>{p.name}</b><small>{p.code} · còn {available(state,p)} {productUnit(p)}</small></div><label>Số lượng ({productUnit(p)})<input aria-label={'Số lượng đóng gói '+p.code} type="number" min="0" max={available(state,p)} step="1" placeholder="0" value={selection[p.code]??''} onChange={e=>onChange(p.code,e.target.value)}/></label>{qty>available(state,p)&&<small className="packaging-error">Không đủ tồn {p.code}</small>}</div>})}<p className="hint">CCS chỉ theo dõi trong kho. Cost vật tư được cộng riêng vào cost kính, nên không cộng lại phần này trong giá nhập kính.</p></details>;
}
