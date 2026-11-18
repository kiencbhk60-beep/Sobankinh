'use client';

import {memo, useEffect, useId, useMemo, useRef} from 'react';
import {BotEngine} from '../lib/bloub/engine';
import {EXPRESSION_BY_ID} from '../lib/bloub/expressions';
import {SHAPE_BY_ID} from '../lib/bloub/skins';
import {RAYON} from '../lib/bloub/repere';

const createEngine = () => new BotEngine(RAYON, 'idle', SHAPE_BY_ID.get('cercle')!.radii, EXPRESSION_BY_ID.get('neutre')!);

/** Neutral idle only. Business-event expressions await the owner's selection. */
function MascotAvatar({active = true}: {active?: boolean}) {
  const clip = 'ledger-mascot-' + useId().replace(/[^a-zA-Z0-9-]/g, '');
  const svg = useRef<SVGSVGElement>(null);
  const eyes = useRef<(SVGPathElement | null)[]>([]);
  const initial = useMemo(() => createEngine().sample(1), []);
  useEffect(() => {
    if (!active) return;
    let engine = createEngine(), clock = 1, last = 0, drawn = 0, raf = 0, gazeAt = 0;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const render = () => engine.sample(clock).eyes.forEach((eye, index) => {
      const node = eyes.current[index];
      node?.setAttribute('d', eye.d);
      node?.setAttribute('transform', eye.matrix);
      node?.setAttribute('opacity', String(eye.alpha));
    });
    const tick = (time: number) => {
      clock += last ? Math.min(.064, Math.max(0, (time - last) / 1000)) : 0;
      last = time;
      if (time - drawn >= 32) { render(); drawn = time; }
      raf = requestAnimationFrame(tick);
    };
    const motion = () => {
      cancelAnimationFrame(raf);
      if (reduced.matches) { engine = createEngine(); clock = 1; }
      render();
      if (!reduced.matches && !document.hidden) { last = 0; raf = requestAnimationFrame(tick); }
    };
    const follow = (event: PointerEvent) => {
      if (reduced.matches || document.hidden || performance.now() - gazeAt < 80 || !svg.current) return;
      gazeAt = performance.now();
      const rect = svg.current.getBoundingClientRect();
      engine.setLook({yaw: Math.max(-26, Math.min(26, (event.clientX - rect.x - rect.width / 2) / innerWidth * 52)), pitch: Math.max(-18, Math.min(18, -(event.clientY - rect.y - rect.height / 2) / innerHeight * 36)), mix: .75, spin: 0, wander: .25}, clock);
    };
    const leave = () => engine.setLook(null, clock);
    reduced.addEventListener('change', motion);
    document.addEventListener('visibilitychange', motion);
    document.addEventListener('pointermove', follow, {passive: true});
    document.addEventListener('pointerleave', leave);
    motion();
    return () => {
      cancelAnimationFrame(raf);
      reduced.removeEventListener('change', motion);
      document.removeEventListener('visibilitychange', motion);
      document.removeEventListener('pointermove', follow);
      document.removeEventListener('pointerleave', leave);
    };
  }, [active]);
  return <svg ref={svg} className="radial-mascot" viewBox="-112 -112 224 224" aria-hidden="true">
    <defs><clipPath id={clip}><circle r="100"/></clipPath></defs>
    <circle r="100" fill="#ff6a00"/>
    <g fill="#111111" clipPath={`url(#${clip})`}>{initial.eyes.map((eye, index) => <path key={index} ref={node => { eyes.current[index] = node; }} d={eye.d} transform={eye.matrix} opacity={eye.alpha}/>)}</g>
  </svg>;
}
export default memo(MascotAvatar);
