'use client';
import {useEffect,useRef,type ReactNode} from 'react';

/** Native modal provides focus containment, Escape and background inertness. */
export default function MotionDialog({children,label,busy,onClose}:{children:ReactNode;label:string;busy:boolean;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 const closing=useRef(false);
 const current=useRef({busy,onClose});
 current.current={busy,onClose};
 useEffect(()=>{
  const dialog=ref.current!;
  const previous=document.activeElement as HTMLElement|null;
  const overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  dialog.showModal();
  return()=>{dialog.getAnimations({subtree:true}).forEach(a=>a.cancel());dialog.close();document.body.style.overflow=overflow;previous?.focus({preventScroll:true});};
 },[]);
 async function close(){
  if(current.current.busy||closing.current)return;
  closing.current=true;
  const dialog=ref.current!;
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches && document.documentElement.dataset.input!=='keyboard'){
   const panel=dialog.querySelector('.modal')!;
   await panel.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.98)'}],{duration:140,easing:'cubic-bezier(0.23,1,0.32,1)',fill:'forwards'}).finished.catch(()=>{});
  }
  if(current.current.busy){dialog.getAnimations({subtree:true}).forEach(a=>a.cancel());closing.current=false;return;}
  if(dialog.isConnected)current.current.onClose();
 }
 return <dialog ref={ref} className="overlay motion-dialog" aria-label={label} onCancel={e=>{e.preventDefault();if(!current.current.busy)current.current.onClose();}} onClick={e=>{if(e.target===e.currentTarget||(e.target as HTMLElement).closest('[data-dialog-close]'))void close();}}>
  <section className="modal">{children}</section>
 </dialog>;
}
