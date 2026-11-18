// Lucian UX/UI Prompt #219 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#219
'use client';

import {useEffect, useRef, useState} from 'react';
import {flushSync} from 'react-dom';
import './theme.css';

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    let savedDark = false;
    try { savedDark = localStorage.getItem('trekbross-theme') === 'dark'; } catch {}
    document.documentElement.dataset.theme = savedDark ? 'dark' : 'light';
    setDark(savedDark);
  }, []);

  async function toggle() {
    if (busy.current || !button.current) return;
    const root = document.documentElement;
    const next = !dark;
    const sync = () => {
      root.dataset.theme = next ? 'dark' : 'light';
      flushSync(() => setDark(next));
      try { localStorage.setItem('trekbross-theme', next ? 'dark' : 'light'); } catch {}
    };
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || root.classList.contains('motion-paused');
    if (!document.startViewTransition || reduced) { sync(); return; }
    const bounds = button.current.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2, y = bounds.top + bounds.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    busy.current = true;
    try {
      const transition = document.startViewTransition(sync);
      await transition.ready;
      await root.animate({clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`]}, {
        duration: 700, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)',
      }).finished;
      await transition.finished;
    } catch { sync(); }
    finally { busy.current = false; }
  }

  return <button ref={button} className="u219-tg" type="button" aria-label={dark ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'} aria-pressed={dark} onClick={toggle}>
    {dark ? <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 9.8A5.6 5.6 0 0 1 6.2 2.5a5.6 5.6 0 1 0 7.3 7.3z" fill="currentColor"/></svg>
      : <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3" fill="currentColor"/><g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 1.5v1.4M8 13.1v1.4M1.5 8h1.4M13.1 8h1.4M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1"/></g></svg>}
  </button>;
}
