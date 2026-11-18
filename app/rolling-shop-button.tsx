// Lucian UX/UI Prompt #009 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#009
'use client';

import {useState, type CSSProperties} from 'react';
import './rolling-shop-button.css';
import {reactTo} from '../lib/mascot-reactions';

export const SHOP_URL = 'https://cincacao.trekbross.workers.dev/';

function Face({text}: {text: string}) {
  return <span className="u009-face">{Array.from(text).map((character, index) => {
    const letter = character === ' ' ? '\u00a0' : character;
    return <span key={index} data-c={letter} style={{'--i': index} as CSSProperties}>{letter}</span>;
  })}</span>;
}

export default function RollingShopButton() {
  const [selected, setSelected] = useState(false);
  return <span className={`u009${selected ? ' is-on' : ''}`}>
    <a className="u009-btn" href={SHOP_URL} target="_blank" rel="noopener noreferrer" role="button" aria-pressed={selected}
      onClick={() => {setSelected(current => !current);reactTo('shop');}}
      onKeyDown={event => { if (event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}>
      <span className="u009-fill" aria-hidden="true"/>
      <span className="u009-word" aria-hidden="true"><Face text="Mở shop kính"/><Face text="Đã mở shop"/></span>
      <span className="u009-sr">{selected ? 'Đã mở shop kính' : 'Mở shop kính'} (tab mới)</span>
      <span className="u009-orb" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M7 17L17 7M9 7h8v8"/></svg>
        <svg viewBox="0 0 24 24"><path d="M7 17L17 7M9 7h8v8"/></svg>
      </span>
    </a>
  </span>;
}
