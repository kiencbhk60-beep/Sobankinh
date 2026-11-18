'use client';
import {useEffect, useState} from 'react';
import {MASCOT_EVENT, REACTIONS, type MascotEvent, type Reaction} from '../lib/mascot-reactions';

export default function useMascotReactions(): Reaction {
  const [reaction, setReaction] = useState<Reaction>(REACTIONS.neutral);
  useEffect(() => {
    let expiry: ReturnType<typeof setTimeout>, idle: ReturnType<typeof setTimeout>;
    let priority = 0, sleeping = false;
    const play = (event: MascotEvent) => {
      const next = REACTIONS[event];
      const passive = ['connecting','connected','refresh','sleep'].includes(event);
      if (!next || (passive && next.priority < priority)) return;
      clearTimeout(expiry); priority = next.priority;
      setReaction({...next});
      if (next.duration) expiry = setTimeout(() => {priority=0;setReaction(REACTIONS.neutral);}, next.duration);
    };
    const activity = () => {
      clearTimeout(idle);
      if (sleeping) {sleeping=false;play('wake');}
      idle = setTimeout(() => {sleeping=true;play('sleep');}, 60000);
    };
    const receive = (event: Event) => play((event as CustomEvent<MascotEvent>).detail);
    const visibility = () => {if (!document.hidden) {play('wake');activity();}};
    window.addEventListener(MASCOT_EVENT, receive);
    for (const event of ['pointerdown','keydown','input','pointermove','scroll']) document.addEventListener(event, activity, {passive:true});
    document.addEventListener('visibilitychange', visibility);
    let first = true;
    try {first=!sessionStorage.getItem('sobankinh-mascot-welcomed');sessionStorage.setItem('sobankinh-mascot-welcomed','1');} catch {}
    if (first) play('welcome');
    activity();
    return () => {
      clearTimeout(expiry);clearTimeout(idle);
      window.removeEventListener(MASCOT_EVENT, receive);
      for (const event of ['pointerdown','keydown','input','pointermove','scroll']) document.removeEventListener(event, activity);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  return reaction;
}
