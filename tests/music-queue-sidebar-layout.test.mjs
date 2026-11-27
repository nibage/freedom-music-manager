import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('../__music/index.html',import.meta.url),'utf8');
test('queue feedback is right aligned inside the pagination row',()=>{
  assert.match(html,/id="queuePagination"[^>]*><button[^>]*id="queuePagePrev"[\s\S]*?id="queuePageLabel"[\s\S]*?id="queuePageNext"[^>]*>Next page<\/button><button[^>]*id="queueRemoveSelected"[^>]*>Remove from queue \(0\)<\/button><div id="queueFeedback" role="status" aria-live="polite"><\/div><\/div>/);
  assert.equal((html.match(/id="queueFeedback"/g)||[]).length,1);
  assert.match(html,/#queueFeedback \{[^}]*margin-left:auto;text-align:right/);
});
test('sidebar collection tabs and actions share one compact row',()=>{
  assert.match(html,/\.shell > aside \.collection-header\{display:flex;flex-wrap:nowrap!important/);
  assert.match(html,/\.shell > aside \.collection-header \.collection-switch\{flex:0 0 auto!important;width:max-content/);
  assert.match(html,/\.shell > aside \.collection-header \.collection-actions\{flex:0 0 auto;width:auto;justify-content:flex-end;margin-left:auto/);
  assert.doesNotMatch(html,/\.shell > aside \.collection-header \.collection-switch\{flex:1 1 100%/);
});
