import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('../__music/index.html',import.meta.url),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
test('normal filter navigation retains cards; cached thumbnails never wait for the observer',()=>{
  assert.match(js,/function filterAndRender\([^)]*preserveCards=(?:metadataRefresh\|\|)?!!navigation/);
  assert.match(js,/else if\(thumbs.has\(item.path\)\)thumbnail.src=thumbs.get\(item.path\);else observer.observe/);
  assert.match(html,/html\{scrollbar-gutter:stable\}/);
  assert.match(js,/if\(node.textContent!==message\)node.textContent=message/);
});
