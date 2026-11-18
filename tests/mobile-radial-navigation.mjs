import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';

// Render the real component with isolated notification inputs, without touching store data.
const sourceURL = new URL('../app/floating-navigation.tsx', import.meta.url);
const source = readFileSync(sourceURL, 'utf8');
const compiled = ts.transpileModule(source, {compilerOptions: {
  jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
}}).outputText;
const localRequire = createRequire(sourceURL);
const geometry = {exports: {}};
const reactions = {exports: {}};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/mascot-reactions.ts', import.meta.url), 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText, {module: reactions, exports: reactions.exports});
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/floating-navigation.ts', import.meta.url), 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText, {module: geometry, exports: geometry.exports});
const loaded = {exports: {}};
vm.runInNewContext(compiled, {
  module: loaded, exports: loaded.exports,
  require: name => name.endsWith('.css') ? {} : name === '../lib/floating-navigation' ? geometry.exports
    : name === '../lib/mascot-reactions' ? reactions.exports
    : name === './mascot-avatar' ? {default: () => React.createElement('svg', {'data-mascot': true})} : localRequire(name),
});
const Navigation = loaded.exports.default;
const props = {tab: 'Dashboard', onNavigate() {}, openOrderCount: 0, modalOpen: false};
const render = overrides => renderToStaticMarkup(React.createElement(Navigation, {...props, ...overrides}));
const empty = render({});
assert.equal((empty.match(/class="radial-item[" ]/g) || []).length, 5);
for (const label of ['Dashboard', 'Bán hàng', 'Lịch sử nhập hàng', 'Đơn hàng', 'Kho hàng']) {
  assert(empty.includes(`<span class="radial-label">${label}</span>`), `${label} is available`);
}
assert(!empty.includes('<a '), 'mobile navigation has no storefront shortcut');
assert(!empty.includes('class="radial-count"'), 'zero notifications hide badges');
assert(!empty.includes('<span class="radial-label">Giao hàng</span>'));
assert(!empty.includes('<span class="radial-label">Xác nhận đơn hàng</span>'));
const pending = render({openOrderCount: 14, tab: 'Đơn hàng'});
assert(pending.includes('Thông báo: </span>14</span>'), 'launcher counts the unified active queue once');
assert(pending.includes('class="radial-count">14</span>'), 'unified orders badge uses its input');
assert.equal((pending.match(/aria-current="page"/g) || []).length, 1, 'exactly one section is selected');
assert(pending.includes('aria-current="page"'), 'active state remains accessible');
assert(render({modalOpen: true}).includes('hidden=""'), 'form dialogs hide the launcher');
console.log('PASS: five unified destinations, no storefront shortcut, order badges, active section and modal visibility.');
