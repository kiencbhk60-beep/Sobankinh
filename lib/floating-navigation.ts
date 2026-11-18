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

/** Fit complete, evenly spaced arcs rather than unrelated free slots. */
function fitMenuLayout(anchor: Point, view: Viewport, count = 5): MenuPlacement[] | null {
  const origin = {x: anchor.x + MASCOT_SIZE / 2, y: anchor.y + MASCOT_SIZE / 2};
  const avatar: Rect = {left: anchor.x - 5, top: anchor.y - 5, right: anchor.x + MASCOT_SIZE + 5, bottom: anchor.y + MASCOT_SIZE + 5};
  const inside = (r: Rect) => r.left >= margin && r.right <= view.width - margin && r.top >= margin && r.bottom <= view.height - margin;
  const place = (radius: number, angle: number, caption: number): MenuPlacement | null => {
    const x = origin.x + Math.cos(angle) * radius, y = origin.y + Math.sin(angle) * radius;
    // Reserve space for the selected ring, focus outline and notification badge.
    const circle = {left: x - 30, top: y - 30, right: x + 32, bottom: y + 30};
    const labelLeft = clamp(x + (caption === 2 ? 40 : caption === 3 ? -128 : -44), margin, view.width - margin - 88);
    const labelTop = y + (caption === 0 ? 38 : caption === 1 ? -66 : -14);
    const label = {left: labelLeft, top: labelTop, right: labelLeft + 88, bottom: labelTop + 28};
    if (![circle, label].every(r => inside(r) && !overlaps(r, avatar, 8)) || overlaps(circle, label, 8)) return null;
    return {x: x - origin.x, y: y - origin.y, labelX: labelLeft - x, labelY: labelTop - y, boxes: [circle, label]};
  };
  const compatible = (a: MenuPlacement, b: MenuPlacement) => !a.boxes.some(r => b.boxes.some(s => overlaps(r, s, 8)));
  const direction = Math.round(Math.atan2(view.height / 2 - origin.y, view.width / 2 - origin.x) / (Math.PI / 16)) * Math.PI / 16;
  const turns = [0, ...Array.from({length: 16}, (_, i) => [i + 1, -i - 1]).flat()];
  const fit = (radii: number[], angles: number[], captionMode?: number): MenuPlacement[] | null => {
    // Reject the complete arc before exploring caption placements.
    for (let i = 0; i < count; i++) {
      const x = origin.x + Math.cos(angles[i]) * radii[i], y = origin.y + Math.sin(angles[i]) * radii[i];
      const circle = {left:x-30,top:y-30,right:x+32,bottom:y+30};
      if (!inside(circle) || overlaps(circle, avatar, 8)) return null;
    }
    const choices = radii.map((radius,index) => (captionMode === undefined ? [0,1,2,3] : [captionMode])
      .map(caption => place(radius, angles[index], caption)).filter((p): p is MenuPlacement => !!p));
    if (choices.some(options => !options.length)) return null;
    const chosen: MenuPlacement[] = [];
    const visit = (index: number): boolean => {
      if (index === count) return true;
      for (const p of choices[index]) {
        if (chosen.every(q => compatible(p, q))) {
          chosen.push(p);
          if (visit(index + 1)) return true;
          chosen.pop();
        }
      }
      return false;
    };
    return visit(0) ? chosen : null;
  };
  let mixedSingle: MenuPlacement[] | null = null;
  single: for (const captionMode of [0, 1, undefined]) {
  for (const span of [90, 112.5, 135, 157.5, 180, 225, 270, 288]) {
    for (const radius of [192, 208, 224, 240, 256, 272, 288, 176, 160, 144, 128, 112]) {
      for (const turn of turns) {
        const centre = direction + turn * Math.PI / 16;
        const angles = Array.from({length: count}, (_, i) => centre + (i / Math.max(1, count - 1) - .5) * span * Math.PI / 180);
        const result = fit(Array(count).fill(radius), angles, captionMode);
        if (result) {
          if (captionMode !== undefined) return result;
          mixedSingle = result; break single;
        }
      }
    }
  }
  }
  // Two concentric arcs with constant radii and regular angular steps.
  for (const captionMode of [0, 1, undefined]) {
  if (captionMode === undefined && mixedSingle) return mixedSingle;
  for (const outer of [216, 232, 248, 200, 184, 168, 152]) for (const inner of [104, 120, 132, 136]) {
    if (outer - inner < 80) continue;
    for (const span of [60, 75, 90, 105, 120, 150, 180, 240]) for (const aligned of [true, false]) for (const innerSpread of [1, 1.5, 2]) for (const turn of turns) {
      const centre = direction + turn * Math.PI / 16;
      const radii = Array.from({length: count}, (_, i) => i % 2 ? inner : outer);
      const angles = Array.from({length: count}, (_, i) => {
        const fraction = aligned && i % 2 ? (i - 1) / Math.max(1, count - 3) : i / Math.max(1, count - 1);
        return centre + (fraction - .5) * span * (i % 2 ? innerSpread : 1) * Math.PI / 180;
      });
      const result = fit(radii, angles, captionMode);
      if (result) return result;
    }
  }
  }
  return null;
}

/** On a very short viewport, temporarily move the open menu to the nearest safe origin. */
export function navigationLayout(anchor: Point, view: Viewport) {
  const direct = fitMenuLayout(anchor, view);
  if (direct) return {anchor, items: direct};
  const candidates = [0, .5, 1].flatMap(x => [0, .5, 1].map(y => clampAnchor({
    x: 12 + (view.width - 88) * x, y: 12 + (view.height - 88) * y,
  }, view))).sort((a,b) => Math.hypot(a.x-anchor.x,a.y-anchor.y)-Math.hypot(b.x-anchor.x,b.y-anchor.y));
  for (const point of candidates) {
    const items = fitMenuLayout(point, view);
    if (items) return {anchor: point, items};
  }
  return {anchor, items: []};
}
