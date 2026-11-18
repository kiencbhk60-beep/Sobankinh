import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';

function loadComponent(name) {
  const url = new URL(`../app/${name}.tsx`, import.meta.url);
  const require = createRequire(url), module = {exports: {}};
  const code = ts.transpileModule(readFileSync(url, 'utf8'), {compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  }}).outputText;
  vm.runInNewContext(code, {module, exports: module.exports, require: path => path.endsWith('.css') ? {} : require(path)});
  return module.exports.default;
}
const Indicator = loadComponent('connection-indicator');
for (const [status, label] of Object.entries({
  connecting: 'Đang kết nối máy chủ', connected: 'Đã kết nối máy chủ', disconnected: 'Mất kết nối máy chủ',
})) {
  const html = renderToStaticMarkup(React.createElement(Indicator, {status}));
  assert(html.includes(`class="server-status ${status}"`));
  assert(html.includes('role="status"'));
  assert(html.includes('aria-live="polite"'));
  assert(html.includes(`title="${label}"`));
  assert(html.includes(`<span class="server-status-label">${label}</span>`));
  assert(html.includes('<span class="server-status-dot" aria-hidden="true"></span>'));
}
const ThemeToggle = loadComponent('theme-toggle');
const theme = renderToStaticMarkup(React.createElement(ThemeToggle));
assert(theme.includes('type="button"'));
assert(theme.includes('aria-pressed="false"'));
assert(theme.includes('aria-label="Chuyển sang nền tối"'));
console.log('PASS: three connection states, hidden accessible labels and keyboard-ready theme control.');
