import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('../__music/index.html',import.meta.url),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
test('queue membership action precedes queue and has a reserved left slot',()=>{
  assert.match(html,/<div class="player-queue-control"><button[^>]*id="bulkQueue"[\s\S]*?<\/button><button[^>]*id="playerQueueButton"/);
  assert.match(html,/\.player-queue-control\{[^}]*padding-left:28px/);
  assert.match(html,/#musicPlayer #bulkQueue\{[^}]*left:0;top:50%/);
});
test('metadata filters stick directly below the measured header',()=>{
  assert.match(html,/#musicFilters\{position:sticky;top:var\(--gallery-header-height,68px\);z-index:8/);
  assert.match(js,/setProperty\('--gallery-header-height',galleryTopbar\.getBoundingClientRect\(\)\.height\+'px'\)/);
});
test('Detailed View label remains constant while pressed state toggles',()=>{
  const src=js.slice(js.indexOf("let layoutMode='classic';"),js.indexOf('async function restoreLayoutPreference()'));
  const node={textContent:'',setAttribute(k,v){this[k]=v}};
  const apply=new Function('node',"const el=()=>node,document={body:{classList:{toggle(){}}}},updateSelectionUI=()=>{};"+src+";return applyLayout;")(node);
  apply('classic');assert.equal(node.textContent,'☰ Detailed View');assert.equal(node['aria-pressed'],'false');
  apply('detailed');assert.equal(node.textContent,'☰ Detailed View');assert.equal(node['aria-pressed'],'true');
  assert.match(html,/#layoutToggle\[aria-pressed="true"\]\{[\s\S]*?border-color:var\(--ok\)/);
});
test('light detailed cards are white, hover grey, and labels black',()=>{
  assert.match(html,/html\[data-theme="light"\] body\.detailed-mode #gallery \.photo\{background:#fff;color:#111\}/);
  assert.match(html,/body\.detailed-mode #gallery \.photo:hover\{background:#ededed\}/);
  assert.match(html,/body\.detailed-mode #gallery \.photo \.track-details\{color:#111\}/);
});
test('pause is drawn as two thick bars and remains accessible',()=>{
  assert.match(js,/el\('playerPlay'\)\.textContent=!preview&&playing\?'':'▶';el\('playerPlay'\)\.setAttribute\('aria-label',playLabel\)/);
  assert.match(html,/#playerPlay\[aria-label="Pause"\]::before\{[\s\S]*?currentColor 0 5px,transparent 5px 10px,currentColor 10px 15px/);
  assert.doesNotThrow(()=>new Function(js));
});
