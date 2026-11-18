import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync(new URL('../lib/floating-navigation.ts', import.meta.url), 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022},
}).outputText;
const {menuLayout, clampAnchor, saveAnchor, loadAnchor, avoidActions, overlaps} = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
let checked = 0;
for (const [width, height] of [[320,568],[375,667],[390,844],[430,932],[768,600],[1024,768],[1440,900],[568,320],[320,320]]) {
  const view = {width, height};
  for (const x of [12, width / 2 - 32, width - 76]) for (const y of [12, height / 2 - 32, height - 76]) {
    const anchor = clampAnchor({x,y}, view);
    const layout = menuLayout(anchor, view);
    assert.equal(layout.length, 5);
    for (let i=0;i<layout.length;i++) {
      for (const rect of layout[i].boxes) {
        assert(rect.left>=12 && rect.top>=12 && rect.right<=width-12 && rect.bottom<=height-12, `${width}x${height}: item is outside the viewport`);
      }
      for (let j=i+1;j<layout.length;j++) {
        assert(!layout[i].boxes.some(a=>layout[j].boxes.some(b=>overlaps(a,b))), 'menu items/labels overlap');
      }
    }
    const restored = loadAnchor(saveAnchor(anchor,view),view);
    assert(Math.abs(restored.x-anchor.x)<.001 && Math.abs(restored.y-anchor.y)<.001);
    checked++;
  }
  const submit = {left:0,right:width,top:height-90,bottom:height-20};
  const clear = avoidActions({x:width-76,y:height-76},view,[submit]);
  assert(clear.y+64<=submit.top-8, 'launcher does not cover save/checkout');
  for (const value of [null,'bad-json','{}','{"x":999,"y":-9}']) {
    const p=loadAnchor(value,view);
    assert(p.x>=12 && p.y>=12 && p.x+64<=width-12 && p.y+64<=height-12);
  }
}
console.log(`PASS: ${checked} dragged positions, mobile/desktop/landscape layout, non-overlapping labels, storage and action clearance.`);
