'use client';

import {memo, useEffect, useId, useMemo, useRef, useState} from 'react';
import {BotEngine} from '../lib/bloub/engine';
import {EXPRESSION_BY_ID} from '../lib/bloub/expressions';
import {SHAPE_BY_ID} from '../lib/bloub/skins';
import {STATE_BY_ID} from '../lib/bloub/states';
import {RAYON} from '../lib/bloub/repere';
import {REACTIONS, type Reaction} from '../lib/mascot-reactions';
import type {DotRender} from '../lib/bloub/decor';

const createEngine = (reaction: Reaction) => new BotEngine(RAYON, reaction.state, SHAPE_BY_ID.get('cercle')!.radii, EXPRESSION_BY_ID.get(reaction.expression)!);

function MascotAvatar({active = true, reaction = REACTIONS.neutral}: {active?: boolean; reaction?: Reaction}) {
  const uid = 'ledger-mascot-' + useId().replace(/[^a-zA-Z0-9-]/g, '');
  const svg = useRef<SVGSVGElement>(null);
  const runtime = useRef<{engine: BotEngine; clock: number} | null>(null);
  const initial = useMemo(() => createEngine(REACTIONS.neutral).sample(1), []);
  const [frame, setFrame] = useState(initial);
  useEffect(() => {
    if (!active) return;
    let engine = runtime.current?.engine || createEngine(REACTIONS.neutral), clock = runtime.current?.clock || 1;
    let last = 0, drawn = 0, raf = 0, gazeAt = 0, stateAt = clock;
    engine.setExpression(EXPRESSION_BY_ID.get(reaction.expression)!, clock);
    if (engine.state === reaction.state && reaction.state !== 'idle') engine.reset(reaction.state, clock);
    else engine.setState(reaction.state, clock);
    if (reaction.state !== 'idle') engine.setLook(null, clock);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const render = () => setFrame(engine.sample(clock));
    const tick = (time: number) => {
      clock += last ? Math.min(.064, Math.max(0, (time - last) / 1000)) : 0;
      last = time;
      // Bloub's transient states are not periodic. Replay their original cycle while held.
      if (reaction.state !== 'idle' && clock-stateAt > STATE_BY_ID.get(reaction.state)!.duration) {engine.reset(reaction.state,clock);stateAt=clock;}
      if (time - drawn >= 40) {render();drawn=time;}
      raf = requestAnimationFrame(tick);
    };
    const motion = () => {
      cancelAnimationFrame(raf);
      if (reduced.matches) {engine=createEngine(reaction);clock=1.2;stateAt=0;}
      render();
      if (!reduced.matches && !document.hidden) {last=0;raf=requestAnimationFrame(tick);}
    };
    const follow = (event: PointerEvent) => {
      if (reaction.state !== 'idle' || reduced.matches || document.hidden || performance.now()-gazeAt<80 || !svg.current) return;
      gazeAt=performance.now();
      const rect=svg.current.getBoundingClientRect();
      engine.setLook({yaw:Math.max(-26,Math.min(26,(event.clientX-rect.x-rect.width/2)/innerWidth*52)),pitch:Math.max(-18,Math.min(18,-(event.clientY-rect.y-rect.height/2)/innerHeight*36)),mix:.75,spin:0,wander:.25},clock);
    };
    const leave=()=>engine.setLook(null,clock);
    reduced.addEventListener('change',motion);
    document.addEventListener('visibilitychange',motion);
    document.addEventListener('pointermove',follow,{passive:true});
    document.addEventListener('pointerleave',leave);
    motion();
    return()=>{runtime.current={engine,clock};cancelAnimationFrame(raf);reduced.removeEventListener('change',motion);document.removeEventListener('visibilitychange',motion);document.removeEventListener('pointermove',follow);document.removeEventListener('pointerleave',leave);};
  },[active,reaction.state,reaction.expression]);
  const dot=(d:DotRender,i:number)=>d.d?<path key={i} d={d.d} transform={'translate('+d.x+' '+d.y+') rotate('+(d.rot||0)+') scale('+RAYON+')'} fill={d.color||'#ff6a00'} opacity={d.opacity}/>:<circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.color||'#ff6a00'} opacity={d.opacity}/>;
  const arc=(front:boolean)=><g fill="none" strokeLinecap="round">{frame.arcs.map(a=><path key={a.id} d={front?a.front:a.back} stroke={'url(#'+uid+'-'+a.id+')'} strokeWidth={a.width} opacity={a.opacity}/>)}</g>;
  return <svg ref={svg} className="radial-mascot" data-state={reaction.state} data-expression={reaction.expression} viewBox="-112 -112 224 224" aria-hidden="true">
    <defs>
      <clipPath id={uid+'-clip'}><path d={frame.bodyPath}/></clipPath>
      <mask id={uid+'-mask'} maskUnits="userSpaceOnUse" x="-158" y="-158" width="316" height="316"><path d={frame.bodyPath} fill="white"/>{frame.notch&&<circle {...{cx:frame.notch.x,cy:frame.notch.y,r:frame.notch.r}} fill="black"/>}</mask>
      {frame.arcs.map(a=><linearGradient key={a.id} id={uid+'-'+a.id} gradientUnits="userSpaceOnUse" {...{x1:a.grad.x1,y1:a.grad.y1,x2:a.grad.x2,y2:a.grad.y2}}>{a.grad.stops.map((c,i)=><stop key={i} offset={i/Math.max(1,a.grad.stops.length-1)} stopColor={c}/>)}</linearGradient>)}
    </defs>
    {arc(false)}
    {frame.dotsBehind&&frame.dots.map(dot)}
    <g opacity={frame.bodyAlpha} mask={'url(#'+uid+'-mask)'}><path d={frame.bodyPath} fill="#ff6a00"/><g fill="#111111" clipPath={'url(#'+uid+'-clip)'}>{frame.eyes.map((eye,i)=><path key={i} d={eye.d} transform={eye.matrix} opacity={eye.alpha}/>)}</g></g>
    {!frame.dotsBehind&&frame.dots.map(dot)}
    {frame.notif&&<circle cx={frame.notif.x} cy={frame.notif.y} r={frame.notif.r} fill="#55b6ff"/>}
    {arc(true)}
  </svg>;
}
export default memo(MascotAvatar);
