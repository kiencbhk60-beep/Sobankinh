import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const cache = new Map();
function load(path) {
  if (cache.has(path)) return cache.get(path).exports;
  const module = {exports:{}}; cache.set(path,module);
  const code=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{module,exports:module.exports,require:name=>load(resolve(dirname(path),name+'.ts'))});
  return module.exports;
}
const root=fileURLToPath(new URL('../lib/',import.meta.url));
const {REACTIONS,savedReaction,IDLE_INTERLUDES,chooseIdleInterlude}=load(resolve(root,'mascot-reactions.ts'));
const {BotEngine}=load(resolve(root,'bloub/engine.ts'));
const {EXPRESSION_BY_ID}=load(resolve(root,'bloub/expressions.ts'));
const {SHAPE_BY_ID}=load(resolve(root,'bloub/skins.ts'));
assert.equal(REACTIONS.welcome.state,'notify');
assert.equal(REACTIONS['menu.close'].state,'orbit');
assert.equal(REACTIONS['drag.end'].state,'wide');
assert.equal(REACTIONS.search.state,'thinking');
assert.equal(REACTIONS['cart.add'].expression,'heureux');
assert.equal(REACTIONS['cart.edit'].expression,'neutre');
for(const [key,reaction] of [...Object.entries(REACTIONS),...IDLE_INTERLUDES.map((step,i)=>['idle-'+i,step])]) {
  const engine=new BotEngine(100,reaction.state,SHAPE_BY_ID.get('cercle').radii,EXPRESSION_BY_ID.get(reaction.expression));
  const frame=engine.sample(1.2);
  assert(frame.bodyPath&&!frame.bodyPath.includes('NaN'),key+' has valid geometry');
  if(reaction.state==='orbit') assert(frame.arcs.length>0,'Orbit must render its rings');
  if(reaction.state==='notify') assert(frame.notif,'Notification must render its dot');
  if(reaction.state==='thinking') assert(frame.dots.length>0,'Thinking must render its dots');
}
for (let previous=-1;previous<IDLE_INTERLUDES.length;previous++) for (const sample of [0,.5,.999]) {
  const next=chooseIdleInterlude(previous,()=>sample);
  assert.notEqual(next.index,previous,'idle faces do not repeat consecutively');
  assert(next.pause>=2400&&next.pause<=4000,'idle has a short natural rest');
}
const prior={status:'Chờ giao',paid:100};
for(const [status,expected] of [['Đang giao','shipping'],['Đã giao','delivered'],['Đã hủy','cancelled'],['Đã hoàn','returned'],['Chờ hàng về','success']]) {
  assert.equal(savedReaction('update',{status,paid:100},prior),expected);
}
assert.equal(savedReaction('update',{status:'Chờ giao',paid:200},prior),'payment');
assert.equal(savedReaction('update',{status:'Chờ giao',paid:100},{status:'Chờ xác nhận',paid:100}),'confirmed');
assert.equal(savedReaction('receipt',{}),'success');
assert.equal(savedReaction('product',{}),'success');
assert.equal(REACTIONS.saving.duration,0,'pending saves remain Thinking until an actual result');
assert(REACTIONS.error.priority>REACTIONS.connected.priority,'passive connection cannot hide a save error');
console.log('PASS: selected effects, full Bloub decorations, real save outcome mapping and pending-state duration.');

// Exercise the real hook with a deterministic browser clock, without any store/API writes.
const browser = new EventTarget(), document = new EventTarget();
document.hidden=false;
let current, cleanup, now=0, timerId=0;
const timers=new Map(), session=new Map();
const schedule=(fn,ms)=>{const id=++timerId;timers.set(id,{fn,at:now+ms});return id;};
function advance(ms) {
  const end=now+ms;
  while(true) {
    const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
    if(!next)break;
    now=next[1].at;timers.delete(next[0]);next[1].fn();
  }
  now=end;
}
const hook={exports:{}};
const hookCode=ts.transpileModule(readFileSync(new URL('../app/use-mascot-reactions.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(hookCode,{
  module:hook,exports:hook.exports,window:browser,document,
  Math:{random:()=>0},
  sessionStorage:{getItem:k=>session.get(k),setItem:(k,v)=>session.set(k,v)},
  setTimeout:schedule,clearTimeout:id=>timers.delete(id),
  require:name=>name==='react'?{useState:value=>{current=value;return[value,next=>{current=next;}];},useEffect:fn=>{cleanup=fn();}}:load(resolve(root,'mascot-reactions.ts')),
});
hook.exports.default();
const emit=detail=>browser.dispatchEvent(new CustomEvent('sobankinh:mascot',{detail}));
assert.equal(current.state,'notify','first session greets with Notification');
emit('connected');assert.equal(current.state,'notify','passive connection cannot interrupt greeting');
emit('cart.add');assert.equal(current.expression,'heureux');
emit('cart.edit');assert.equal(current.expression,'neutre');
emit('saving');advance(20000);assert.equal(current.state,'thinking','pending is not falsely reported successful');
emit('error');assert.equal(current.state,'alert');
emit('saving');emit('success');assert.equal(current.expression,'heureux','successful retry overrides old error');
emit('connected');assert.equal(current.expression,'heureux');
advance(3000);assert.equal(current.expression,'neutre');
advance(5000);assert.equal(current.state,'wink');
advance(1600);assert.equal(current.state,'thinking');
advance(2600);assert.equal(current.state,'wide');
advance(1800);assert.equal(current.expression,'curieux','core sequence leads to a playful face');
advance(2000);assert.equal(current.expression,'neutre','mascot rests between combinations');
advance(2400);assert.equal(current.state,'wink','idle sequence resumes after rest');
document.dispatchEvent(new Event('pointerdown'));assert.equal(current.state,'idle','activity immediately stops idle effects');
advance(8000);assert.equal(current.state,'wink');
document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));
assert.equal(timers.size,0,'hidden tab stops the idle cycle');
document.hidden=false;document.dispatchEvent(new Event('visibilitychange'));assert.equal(current.state,'notify');
cleanup();assert.equal(timers.size,0,'all timers are cleared on unmount');
console.log('PASS: first visit, priority, retry, pending, expiry, inactivity/wake and cleanup.');
