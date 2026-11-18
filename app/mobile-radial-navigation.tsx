'use client';

import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {LayoutDashboard, ShoppingBag, Coins, ClipboardList, Package, Plus} from 'lucide-react';
import './mobile-radial-navigation.css';

type Props = {
  tab: string;
  onNavigate: (tab: string) => void;
  openOrderCount: number;
  modalOpen: boolean;
};

export default function MobileRadialNavigation({tab, onNavigate, openOrderCount, modalOpen}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const frame = useRef(0);
  const reposition = useRef(() => {});
  const [expanded, setExpanded] = useState(false);
  const [lift, setLift] = useState(0);
  const items = [
    {label: 'Dashboard', Icon: LayoutDashboard},
    {label: 'Bán hàng', Icon: ShoppingBag},
    {label: 'Lịch sử nhập hàng', Icon: Coins},
    {label: 'Đơn hàng', Icon: ClipboardList, count: openOrderCount},
    {label: 'Kho hàng', Icon: Package},
  ];

  function close(immediate = false) {
    cancelAnimationFrame(frame.current);
    clearTimeout(timer.current);
    setExpanded(false);
    if (immediate || matchMedia('(prefers-reduced-motion: reduce)').matches) dialog.current?.close();
    else timer.current = setTimeout(() => dialog.current?.close(), 460);
  }

  function open() {
    if (modalOpen || !matchMedia('(width < 768px)').matches) return;
    clearTimeout(timer.current);
    dialog.current?.showModal();
    frame.current = requestAnimationFrame(() => {
      frame.current = requestAnimationFrame(() => setExpanded(true));
    });
  }

  useEffect(() => {
    const mobile = matchMedia('(width < 768px)');
    const resize = () => { if (!mobile.matches) close(true); };
    mobile.addEventListener('change', resize);
    return () => {
      mobile.removeEventListener('change', resize);
      cancelAnimationFrame(frame.current);
      clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => { if (modalOpen) close(true); }, [modalOpen]);

  // Move the launcher above a checkout/save action instead of covering it.
  useEffect(() => {
    let scheduled = 0;
    function measure() {
      scheduled = 0;
      if (!matchMedia('(width < 768px)').matches || dialog.current?.open || !trigger.current) return;
      const safe = parseFloat(getComputedStyle(trigger.current).getPropertyValue('--radial-safe-bottom')) || 0;
      let bottom = 16 + safe;
      const right = innerWidth - 16;
      const actions = [...document.querySelectorAll<HTMLElement>('main .primary, .mobile-cart')]
        .map(el => el.getBoundingClientRect()).filter(r => r.width && r.height && r.left < right && r.right > right - 56);
      for (let pass = 0; pass < actions.length; pass++) {
        for (const r of actions) {
          const top = innerHeight - bottom - 56;
          if (r.top < top + 56 && r.bottom > top) bottom = innerHeight - r.top + 12;
        }
      }
      const maxLift = Math.max(0, innerHeight - 340 - safe);
      setLift(Math.min(maxLift, Math.max(0, bottom - 16 - safe)));
    }
    const schedule = () => { if (!scheduled) scheduled = requestAnimationFrame(measure); };
    reposition.current = measure;
    measure();
    addEventListener('scroll', schedule, {passive: true});
    addEventListener('resize', schedule);
    const observer = new ResizeObserver(schedule);
    const main = document.querySelector('main');
    if (main) observer.observe(main);
    return () => {
      removeEventListener('scroll', schedule);
      removeEventListener('resize', schedule);
      cancelAnimationFrame(scheduled);
      observer.disconnect();
    };
  }, [tab, modalOpen]);

  const style = {'--radial-lift': `${lift}px`} as CSSProperties;
  const notifications = openOrderCount;
  return <div className="mobile-radial" style={style} hidden={modalOpen}>
    <button ref={trigger} type="button" className="radial-toggle radial-launcher" aria-label="Mở menu điều hướng" aria-haspopup="dialog" aria-expanded={expanded} aria-controls="mobile-radial-dialog" onClick={open}>
      <Plus size={27} aria-hidden="true"/>
      {notifications > 0 && <span className="radial-count"><span className="radial-sr-only">Thông báo: </span>{notifications}</span>}
    </button>
    <dialog ref={dialog} id="mobile-radial-dialog" className={`radial-dialog${expanded ? ' is-expanded' : ''}`} aria-label="Điều hướng Sổ bán kính" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }} onClose={() => { setExpanded(false); reposition.current(); trigger.current?.focus({preventScroll: true}); }}>
      <nav className="radial-items" aria-label="Chức năng Sổ bán kính" inert={!expanded}>
        {items.map(({label, Icon, count}, index) => {
          const angle = index * (90 / (items.length - 1)) * Math.PI / 180;
          const itemStyle = {
            '--radial-radius': 'var(--radial-outer)',
            '--radial-x': -Math.cos(angle), '--radial-y': -Math.sin(angle),
            '--radial-order': index, '--radial-reverse': items.length - 1 - index,
          } as CSSProperties;
          const content = <><span className="radial-circle"><Icon size={22} aria-hidden="true"/>{!!count && <span className="radial-count">{count}</span>}</span><span className="radial-label">{label}</span></>;
          const className = `radial-item${tab === label ? ' is-selected' : ''}`;
          return <button key={label} type="button" className={className} style={itemStyle} aria-current={tab === label ? 'page' : undefined} onClick={() => { onNavigate(label); close(); }}>{content}</button>;
        })}
      </nav>
      <button type="button" className="radial-toggle radial-close" aria-label="Đóng menu điều hướng" onClick={() => close()} autoFocus><Plus size={27} aria-hidden="true"/></button>
    </dialog>
  </div>;
}
