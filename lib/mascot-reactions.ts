import type {StateId} from './bloub/states';
import type {ExpressionId} from './bloub/expressions';

export type Reaction = {state: StateId; expression: ExpressionId; duration: number; priority: number};
export const IDLE_DELAY = 8000;
export const IDLE_SEQUENCE: Reaction[] = [
  {state:'wink',expression:'neutre',duration:1600,priority:0},
  {state:'thinking',expression:'neutre',duration:2600,priority:0},
  {state:'wide',expression:'neutre',duration:1800,priority:0},
];
export const IDLE_INTERLUDES: Reaction[] = [
  {state:'idle',expression:'curieux',duration:2000,priority:0},
  {state:'idle',expression:'heureux',duration:2200,priority:0},
  {state:'idle',expression:'hilare',duration:2200,priority:0},
  {state:'idle',expression:'surpris',duration:1800,priority:0},
  {state:'idle',expression:'timide',duration:2400,priority:0},
  {state:'idle',expression:'excite',duration:2000,priority:0},
  {state:'idle',expression:'fier',duration:2200,priority:0},
  {state:'idle',expression:'mefiant',duration:2000,priority:0},
];
export function chooseIdleInterlude(previous = -1, random = Math.random) {
  const size=IDLE_INTERLUDES.length;
  const index=previous<0?Math.floor(random()*size):(previous+1+Math.floor(random()*(size-1)))%size;
  return {index,step:IDLE_INTERLUDES[index],pause:2400+Math.round(random()*1600)};
}
const pose = (state: StateId, expression: ExpressionId = 'neutre', duration = 2600, priority = 40): Reaction => ({state, expression, duration, priority});
export const REACTIONS = {
  neutral: pose('idle', 'neutre', 1600),
  welcome: pose('notify', 'neutre', 3200, 70),
  'menu.close': pose('orbit', 'neutre', 3400),
  'drag.end': pose('wide', 'neutre', 1800),
  search: pose('thinking'),
  'cart.add': pose('idle', 'heureux', 2400, 60),
  'cart.edit': pose('idle'),
  packaging: pose('idle', 'curieux'),
  customer: pose('idle', 'attentif', 2000, 30),
  invalid: pose('alert', 'neutre', 2800, 90),
  saving: pose('thinking', 'neutre', 0, 50),
  success: pose('idle', 'heureux', 2800, 80),
  error: pose('alert', 'neutre', 3200, 100),
  stock: pose('exclaim', 'neutre', 3000, 100),
  orders: pose('idle', 'attentif'),
  confirmed: pose('wink', 'neutre', 2200, 80),
  shipping: pose('comet', 'neutre', 2400, 80),
  delivered: pose('idle', 'fier', 3000, 80),
  cancelled: pose('idle', 'triste', 2600, 80),
  returned: pose('idle', 'attentif', 2600, 80),
  payment: pose('idle', 'heureux', 2800, 80),
  'receipt.open': pose('idle', 'curieux'),
  'product.open': pose('idle', 'attentif'),
  refresh: pose('thinking', 'neutre', 0, 30),
  'orders.new': pose('notify', 'neutre', 3200, 85),
  connecting: pose('thinking', 'neutre', 0, 20),
  connected: pose('wink', 'neutre', 1800, 35),
  disconnected: pose('alert', 'neutre', 3200, 95),
  theme: pose('wink', 'neutre', 1800),
  export: pose('idle', 'fier', 2400, 60),
  shop: pose('comet', 'neutre', 2400, 60),
  sleep: pose('sleep', 'somnolent', 0, 0),
  wake: pose('notify', 'neutre', 2600, 60),
} satisfies Record<string, Reaction>;
export type MascotEvent = keyof typeof REACTIONS;
export const MASCOT_EVENT = 'sobankinh:mascot';
export function reactTo(event: MascotEvent) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(MASCOT_EVENT, {detail: event}));
}

export function savedReaction(type: string, data: {id?: string; status?: string; paid?: number}, previous?: {status: string; paid: number}): MascotEvent {
  if (type !== 'update' || !previous) return 'success';
  if (previous.status === 'Chờ xác nhận' && data.status !== previous.status) return 'confirmed';
  if (data.status !== previous.status) {
    if (data.status === 'Đang giao') return 'shipping';
    if (data.status === 'Đã giao') return 'delivered';
    if (data.status === 'Đã hủy') return 'cancelled';
    if (data.status === 'Đã hoàn') return 'returned';
    return 'success';
  }
  return Number(data.paid) !== previous.paid ? 'payment' : 'success';
}
