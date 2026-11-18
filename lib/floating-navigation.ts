export type Point = {x: number; y: number};
export type Viewport = {width: number; height: number};
export type Rect = {left: number; top: number; right: number; bottom: number};
export type MenuPlacement = {x: number; y: number; labelX: number; labelY: number; boxes: Rect[]};
export const MASCOT_SIZE = 64;
export const POSITION_KEY = 'sobankinh-mascot-position-v1';
const margin = 12;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function clampAnchor(point: Point, view: Viewport): Point {
  return {
    x: clamp(Number.isFinite(point.x) ? point.x : margin, margin, Math.max(margin, view.width - MASCOT_SIZE - margin)),
    y: clamp(Number.isFinite(point.y) ? point.y : margin, margin, Math.max(margin, view.height - MASCOT_SIZE - margin)),
  };
}
export function defaultAnchor(view: Viewport): Point {
  return clampAnchor({x: view.width - MASCOT_SIZE - 16, y: view.height - MASCOT_SIZE - 40}, view);
}
export function saveAnchor(point: Point, view: Viewport): string {
  const safe = clampAnchor(point, view);
  return JSON.stringify({x: (safe.x - margin) / Math.max(1, view.width - MASCOT_SIZE - 2 * margin), y: (safe.y - margin) / Math.max(1, view.height - MASCOT_SIZE - 2 * margin)});
}
export function loadAnchor(value: string | null, view: Viewport): Point {
  try {
    const parsed = JSON.parse(value || 'null');
    if (Number.isFinite(parsed?.x) && Number.isFinite(parsed?.y)) return clampAnchor({
      x: margin + parsed.x * Math.max(1, view.width - MASCOT_SIZE - 2 * margin),
      y: margin + parsed.y * Math.max(1, view.height - MASCOT_SIZE - 2 * margin),
    }, view);
  } catch { /* Storage is optional. */ }
  return defaultAnchor(view);
}
export function overlaps(a: Rect, b: Rect, gap = 4): boolean {
  return a.left < b.right + gap && a.right + gap > b.left && a.top < b.bottom + gap && a.bottom + gap > b.top;
}
export function avoidActions(point: Point, view: Viewport, actions: Rect[]): Point {
  const safe = clampAnchor(point, view);
  const box = (p: Point): Rect => ({left: p.x, top: p.y, right: p.x + MASCOT_SIZE, bottom: p.y + MASCOT_SIZE});
  if (!actions.some(rect => overlaps(box(safe), rect, 8))) return safe;
  const candidates = actions.flatMap(rect => [
    {x: safe.x, y: rect.top - MASCOT_SIZE - 12}, {x: safe.x, y: rect.bottom + 12},
    {x: rect.left - MASCOT_SIZE - 12, y: safe.y}, {x: rect.right + 12, y: safe.y},
  ]).map(p => clampAnchor(p, view)).filter(p => !actions.some(rect => overlaps(box(p), rect, 8)));
  candidates.sort((a, b) => Math.hypot(a.x - safe.x, a.y - safe.y) - Math.hypot(b.x - safe.x, b.y - safe.y));
  return candidates[0] || safe;
}

/** Prefer the original quarter-circle. Near an edge or the centre, use a wider/two-ring fan. */
export function menuLayout(anchor: Point, view: Viewport, count = 5): MenuPlacement[] {
  const origin = {x: anchor.x + MASCOT_SIZE / 2, y: anchor.y + MASCOT_SIZE / 2};
  const avatar: Rect = {left: anchor.x, top: anchor.y, right: anchor.x + MASCOT_SIZE, bottom: anchor.y + MASCOT_SIZE};
  const inside = (r: Rect) => r.left >= margin && r.right <= view.width - margin && r.top >= margin && r.bottom <= view.height - margin;
  const place = (x: number, y: number, above = false): MenuPlacement | null => {
    const circle = {left: x - 24, top: y - 24, right: x + 24, bottom: y + 24};
    const labelLeft = clamp(x - 44, margin, view.width - margin - 88);
    const labelTop = y + (above ? -58 : 30);
    const label = {left: labelLeft, top: labelTop, right: labelLeft + 88, bottom: labelTop + 28};
    if (![circle, label].every(r => inside(r) && !overlaps(r, avatar, 6))) return null;
    return {x: x - origin.x, y: y - origin.y, labelX: labelLeft - x, labelY: labelTop - y, boxes: [circle, label]};
  };
  const compatible = (a: MenuPlacement, b: MenuPlacement) => !a.boxes.some(r => b.boxes.some(s => overlaps(r, s)));
  const direction = origin.x > view.width / 2 ? (origin.y > view.height / 2 ? -135 : 135) : (origin.y > view.height / 2 ? -45 : 45);
  const canonical = Array.from({length: count}, (_, index) => {
    const angle = (direction - 45 + index * 90 / Math.max(1, count - 1)) * Math.PI / 180;
    return place(origin.x + Math.cos(angle) * 222, origin.y + Math.sin(angle) * 222);
  });
  if (canonical.every((p): p is MenuPlacement => !!p) && canonical.every((p, i) => canonical.slice(i + 1).every(q => compatible(p, q)))) return canonical;

  const candidates: (MenuPlacement & {score: number; angle: number})[] = [];
  const centre = direction * Math.PI / 180;
  for (const radius of [222, 180, 140, 104, 260]) for (let step = 0; step < 32; step++) {
    const angle = step * Math.PI / 16;
    const difference = Math.abs(Math.atan2(Math.sin(angle - centre), Math.cos(angle - centre)));
    for (const above of [false, true]) {
      const p = place(origin.x + Math.cos(angle) * radius, origin.y + Math.sin(angle) * radius, above);
      if (p) candidates.push({...p, score: Math.abs(radius - 222) / 30 + difference + (above ? .4 : 0), angle});
    }
  }
  // Additional safe slots for very short landscape viewports.
  for (let y = 40; y <= view.height - 68; y += 88) for (const x of [56, view.width / 2, view.width - 56]) {
    const p = place(x, y);
    if (p) candidates.push({...p, score: 100, angle: Math.atan2(y - origin.y, x - origin.x)});
  }
  candidates.sort((a, b) => a.score - b.score);
  const order = (items: MenuPlacement[]) => items.sort((a, b) => {
    const angle = (p: MenuPlacement) => (Math.atan2(p.y, p.x) - centre + Math.PI * 3) % (Math.PI * 2);
    return angle(a) - angle(b);
  });
  for (let seed = -1; seed < Math.min(40, candidates.length); seed++) {
    const chosen: MenuPlacement[] = seed < 0 ? [] : [candidates[seed]];
    for (const candidate of candidates) {
      if (chosen.every(p => compatible(p, candidate))) chosen.push(candidate);
      if (chosen.length === count) return order(chosen);
    }
  }
  throw Error('The viewport is too small to display the navigation safely.');
}
