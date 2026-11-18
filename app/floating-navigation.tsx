'use client';

import {useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent} from 'react';
import {LayoutDashboard, ShoppingBag, Coins, ClipboardList, Package, X} from 'lucide-react';
import MascotAvatar from './mascot-avatar';
import {REACTIONS, reactTo, type Reaction} from '../lib/mascot-reactions';
import {POSITION_KEY, defaultAnchor, clampAnchor, loadAnchor, saveAnchor, avoidActions, navigationLayout, type Point, type Viewport} from '../lib/floating-navigation';
import './floating-navigation.css';

type Props = {tab: string; onNavigate: (tab: string) => void; openOrderCount: number; modalOpen: boolean; reaction?: Reaction};

export default function FloatingNavigation({tab, onNavigate, openOrderCount, modalOpen, reaction = REACTIONS.neutral}: Props) {
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const frame = useRef(0), pointerFrame = useRef(0), suppressClick = useRef(false);
  const drag = useRef<{id: number; x: number; y: number; start: Point; moved: boolean} | null>(null);
  const current = useRef<Point | null>(null), viewport = useRef<Viewport>({width: 390, height: 844});
  const reposition = useRef(() => {});
  const [anchor, setAnchor] = useState<Point | null>(null);
  const [view, setView] = useState<Viewport>(viewport.current);
  const [expanded, setExpanded] = useState(false), [present, setPresent] = useState(false), [dragging, setDragging] = useState(false);
  const items = [
    {label: 'Dashboard', Icon: LayoutDashboard}, {label: 'Bán hàng', Icon: ShoppingBag},
    {label: 'Lịch sử nhập hàng', Icon: Coins}, {label: 'Đơn hàng', Icon: ClipboardList, count: openOrderCount},
    {label: 'Kho hàng', Icon: Package},
  ];
  const point = anchor || defaultAnchor(view);
  const layout = useMemo(() => present ? navigationLayout(point, view) : {anchor: point, items: []}, [present, anchor, view]);
  const placements = layout.items;

  function move(next: Point, avoid = false) {
    const v = viewport.current;
    const actions = avoid ? [...document.querySelectorAll<HTMLElement>('main .primary,main input,main select,main textarea,.mobile-cart,.topbar button,.topbar .u009')]
      .map(node => node.getBoundingClientRect()).filter(r => r.width && r.height && r.top < v.height && r.bottom > 0) : [];
    current.current = avoid ? avoidActions(next, v, actions) : clampAnchor(next, v);
    setAnchor(current.current);
  }
  function remember() {
    if (current.current) try { localStorage.setItem(POSITION_KEY, saveAnchor(current.current, viewport.current)); } catch {}
  }
  function close(immediate = false) {
    if (dialog.current?.open && !immediate) reactTo('menu.close');
    cancelAnimationFrame(frame.current);
    clearTimeout(timer.current);
    setExpanded(false);
    if (immediate || matchMedia('(prefers-reduced-motion: reduce)').matches) dialog.current?.close();
    else timer.current = setTimeout(() => dialog.current?.close(), 460);
  }
  function open() {
    if (modalOpen || drag.current) return;
    clearTimeout(timer.current);
    setPresent(true);
    dialog.current?.showModal();
    frame.current = requestAnimationFrame(() => { frame.current = requestAnimationFrame(() => setExpanded(true)); });
  }
  useEffect(() => {
    let scheduled = 0;
    const measure = () => {
      scheduled = 0;
      if (drag.current || dialog.current?.open) return;
      const previous = current.current ? saveAnchor(current.current, viewport.current) : null;
      const v = {width: document.documentElement.clientWidth, height: visualViewport?.height || innerHeight};
      viewport.current = v; setView(v);
      let saved = previous;
      if (!saved) try { saved = localStorage.getItem(POSITION_KEY); } catch {}
      move(loadAnchor(saved, v), true);
    };
    const schedule = () => { if (!scheduled) scheduled = requestAnimationFrame(measure); };
    const resize = () => { if (dialog.current?.open) close(true); schedule(); };
    reposition.current = measure;
    measure();
    addEventListener('resize', resize);
    document.addEventListener('scroll', schedule, {capture: true, passive: true});
    visualViewport?.addEventListener('resize', resize);
    const observer = new ResizeObserver(schedule);
    const main = document.querySelector('main');
    if (main) observer.observe(main);
    return () => {
      removeEventListener('resize', resize);
      document.removeEventListener('scroll', schedule, true);
      visualViewport?.removeEventListener('resize', resize);
      cancelAnimationFrame(scheduled);
      observer.disconnect();
    };
  }, []);
  useEffect(() => { if (modalOpen) close(true); else reposition.current(); }, [modalOpen, tab]);
  useEffect(() => () => { cancelAnimationFrame(frame.current); cancelAnimationFrame(pointerFrame.current); clearTimeout(timer.current); }, []);

  function startDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || event.isPrimary === false || !current.current) return;
    event.preventDefault();
    suppressClick.current = false;
    drag.current = {id: event.pointerId, x: event.clientX, y: event.clientY, start: {...current.current}, moved: false};
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus({preventScroll: true});
  }
  function moveDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.hypot(dx, dy) > 5) { start.moved = true; setDragging(true); }
    if (!start.moved) return;
    cancelAnimationFrame(pointerFrame.current);
    pointerFrame.current = requestAnimationFrame(() => move({x: start.start.x + dx, y: start.start.y + dy}));
  }
  function finishDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    cancelAnimationFrame(pointerFrame.current);
    if (start.moved) move({x: start.start.x + event.clientX - start.x, y: start.start.y + event.clientY - start.y}, true);
    suppressClick.current = start.moved;
    if (start.moved) reactTo('drag.end');
    drag.current = null; setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    remember();
  }
  const style = {'--radial-left': `${point.x}px`, '--radial-top': `${point.y}px`} as CSSProperties;
  return <div className={`floating-navigation${dragging ? ' is-dragging' : ''}`} style={style} hidden={modalOpen}>
    <button ref={trigger} type="button" className="radial-toggle radial-launcher" aria-label="Mở menu điều hướng — mascot Bross. Kéo hoặc dùng phím mũi tên để di chuyển." title="Nhấn để mở menu · Kéo để di chuyển · Home để đặt lại" aria-haspopup="dialog" aria-expanded={present} aria-controls="ledger-radial-dialog"
      onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={event => { if (drag.current) finishDrag(event); }}
      onClick={event => { if (suppressClick.current) { suppressClick.current = false; event.preventDefault(); return; } open(); }}
      onKeyDown={event => {
        const step = event.shiftKey ? 32 : 16;
        const deltas: Record<string, Point> = {ArrowLeft:{x:-step,y:0},ArrowRight:{x:step,y:0},ArrowUp:{x:0,y:-step},ArrowDown:{x:0,y:step}};
        if (event.key === 'Home') { event.preventDefault(); move(defaultAnchor(viewport.current), true); remember(); }
        else if (deltas[event.key] && current.current) { event.preventDefault(); const d=deltas[event.key]; move({x:current.current.x+d.x,y:current.current.y+d.y},true); remember(); }
      }}>
      <MascotAvatar active={!present&&!modalOpen} reaction={dragging ? REACTIONS['drag.end'] : reaction}/>
      {openOrderCount > 0 && <span className="radial-count"><span className="radial-sr-only">Thông báo: </span>{openOrderCount}</span>}
    </button>
    <dialog ref={dialog} id="ledger-radial-dialog" style={{'--radial-left': `${layout.anchor.x}px`, '--radial-top': `${layout.anchor.y}px`} as CSSProperties} className={`radial-dialog${expanded ? ' is-expanded' : ''}`} aria-label="Điều hướng Sổ bán kính" onCancel={event => {event.preventDefault();close();}} onClick={event=>{if(event.target===event.currentTarget)close();}} onClose={()=>{setExpanded(false);setPresent(false);reposition.current();trigger.current?.focus({preventScroll:true});}}>
      <nav className="radial-items" aria-label="Chức năng Sổ bán kính" inert={!expanded}>
        {items.map(({label,Icon,count},index)=>{
          const p=placements[index];
          const itemStyle={'--item-x':`${p?.x||0}px`,'--item-y':`${p?.y||0}px`,'--label-x':`${p?.labelX??-44}px`,'--label-y':`${p?.labelY??30}px`,'--radial-order':index,'--radial-reverse':items.length-1-index} as CSSProperties;
          return <button key={label} type="button" className={`radial-item${tab===label?' is-selected':''}`} style={itemStyle} aria-current={tab===label?'page':undefined} onClick={()=>{onNavigate(label);close();}}>
            <span className="radial-circle"><Icon size={22} aria-hidden="true"/>{!!count&&<span className="radial-count">{count}</span>}</span><span className="radial-label">{label}</span>
          </button>;
        })}
      </nav>
      <button type="button" className="radial-toggle radial-close" aria-label="Đóng menu điều hướng" onClick={()=>close()} autoFocus><MascotAvatar active={present} reaction={REACTIONS['menu.close']}/><span className="radial-close-mark" aria-hidden="true"><X size={14}/></span></button>
    </dialog>
  </div>;
}
