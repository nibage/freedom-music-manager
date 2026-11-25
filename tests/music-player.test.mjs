// Run: node --test tests/music-player.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const html=await readFile(new URL('../__gallery/index.html',import.meta.url),'utf8');
const match=html.match(/\/\* BEGIN MUSIC PLAYER LOGIC \*\/([\s\S]*?)\/\* END MUSIC PLAYER LOGIC \*\//);
assert.ok(match);
const {adjacentTrack,snapshotTracks}=new Function(match[1]+'\nreturn {adjacentTrack,snapshotTracks};')();
const all=()=>true;
test('queue captures filtered order without duplicates',()=>{
  assert.deepEqual(snapshotTracks([{path:'a'},{path:'b'},{path:'a'}],'b',all),['a','b']);
});
test('track opened through details is included',()=>{
  assert.deepEqual(snapshotTracks(['a','b'],'c',all),['a','b','c']);
});
test('trash and missing paths excluded',()=>{
  const eligible=p=>p!=='b';
  assert.deepEqual(snapshotTracks(['a','b','c'],'b',eligible),['a','c']);
  assert.equal(adjacentTrack(['a','b','c'],'a',1,eligible),'c');
  assert.equal(adjacentTrack(['a','b','c'],'c',-1,eligible),'a');
});
test('no wrap at either end and no missing anchor',()=>{
  assert.equal(adjacentTrack(['a','b'],'b',1,all),null);
  assert.equal(adjacentTrack(['a','b'],'a',-1,all),null);
  assert.equal(adjacentTrack(['a','b'],'missing',1,all),null);
});
test('audio transport is singular and independent of details dialog',()=>{
  assert.equal((html.match(/<audio\b/g)||[]).length,1);
  assert.match(html,/<footer id="musicPlayer"[\s\S]*?<audio id="bigVideo"[\s\S]*?<\/footer>/);
  const release=html.match(/function releaseViewerMedia\(\)\{([\s\S]*?)\n\}/);
  assert.ok(release);
  assert.doesNotMatch(release[1],/playerAudio|stopMusic|bigVideo/);
});
