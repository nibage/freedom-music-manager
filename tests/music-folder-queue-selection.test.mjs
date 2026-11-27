import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('../__music/index.html',import.meta.url),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
test('closed folder label shows basename, header and native menu retain full relative path',()=>{
  const nodes={folder:{value:'Music/Artist/Album'},folderLeaf:{},headerRelativePath:{}};
  const source=js.slice(js.indexOf('function updateFolderDisplay(){'),js.indexOf('function filterAndRender(metadataRefresh'));
  const update=new Function('nodes','const el=id=>nodes[id];'+source+';return updateFolderDisplay')(nodes);
  update();assert.equal(nodes.folderLeaf.textContent,'Album');assert.equal(nodes.headerRelativePath.textContent,'Music/Artist/Album');assert.equal(nodes.folder.title,'Music/Artist/Album');
  nodes.folder.value='';update();assert.equal(nodes.folderLeaf.textContent,'All folders');
  assert.match(js,/select\.add\(new Option\(folder,folder\)\)/);
  assert.match(html,/#folderLeaf\{[^}]*pointer-events:none/);
});
test('bulk removal preserves queue order, does not stop audio, and clears queue selection',()=>{
  const source=js.slice(js.indexOf('function removeSelectedQueuePaths(){'),js.indexOf('function initHistorySelection(){'));
  const run=new Function("let playerQueue=['a','b','c','d'],queueSelectedPaths=new Set(['b','d']),queueSelectionAnchor='b',playerPath='b',notice='',changes=0;function resetQueueOrder(){}function queueChanged(){changes++}function queueNotice(s){notice=s}"+source+";removeSelectedQueuePaths();return {queue:playerQueue,selection:queueSelectedPaths.size,playerPath,notice,changes}")();
  assert.deepEqual(run,{queue:['a','c'],selection:0,playerPath:'b',notice:'2 track(s) removed from queue.',changes:1});
  assert.match(html,/id="queuePageNext"[^>]*>Next page<\/button><button[^>]*id="queueRemoveSelected"/);
});
