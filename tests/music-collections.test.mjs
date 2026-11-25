// Run: node --test tests/music-collections.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../__gallery/index.html',import.meta.url),'utf8');
const block=html.match(/\/\* BEGIN MUSIC PLAYER LOGIC \*\/([\s\S]*?)\/\* END MUSIC PLAYER LOGIC \*\//)[1];
const q=new Function(block+'\nreturn {nextQueueTrack,queueInsert,shuffleUpcoming,restoreUpcoming,moveQueueEntry,remapMusicPaths};')();
const all=()=>true,eligible=p=>p!=='b';
test('append and play next maintain unique ordered entries',()=>{
  assert.deepEqual(q.queueInsert(['a'],['a','b','b','c'],'a',false,eligible),['a','c']);
  assert.deepEqual(q.queueInsert(['a','b','c'],['c','d'],'a',true,all),['a','c','d','b']);
  assert.deepEqual(q.queueInsert(['a','b'],['b'],null,true,all),['b','a']);
});
test('repeat wraps only in repeat-all mode',()=>{
  assert.equal(q.nextQueueTrack(['a','b','c'],'c',1,eligible,'all'),'a');
  assert.equal(q.nextQueueTrack(['a','b','c'],'c',1,eligible,'off'),null);
  assert.equal(q.nextQueueTrack(['a','b','c'],'a',-1,eligible,'all'),'c');
  assert.equal(q.nextQueueTrack(['a','b','c'],'a',1,eligible,'one'),'c');
  assert.equal(q.nextQueueTrack(['a','b','c'],'a',0,eligible,'all'),null);
});
test('shuffle and restore preserve the current and already-played prefix',()=>{
  const original=['a','b','c','d'],shuffled=q.shuffleUpcoming(original,'b',()=>0);
  assert.deepEqual(shuffled,['a','b','d','c']);
  assert.deepEqual(q.restoreUpcoming(shuffled,'b',original),original);
});
test('reorder prevents displacement of current track',()=>{
  assert.deepEqual(q.moveQueueEntry(['a','b','c'],2,-1,'a'),['a','c','b']);
  assert.deepEqual(q.moveQueueEntry(['a','b','c'],1,-1,'a'),['a','b','c']);
});
test('approved moves remap paths and deduplicate',()=>{
  assert.deepEqual(q.remapMusicPaths(['old.mp3','new.mp3'],new Map([['old.mp3','new.mp3']])),['new.mp3']);
});
const parser=html.slice(html.indexOf('function validPlaylistName('),html.indexOf('async function loadMusicCollections('));
const ext=html.match(/const AUDIO_EXT = [^\n]+/)[0];
const type=html.match(/function typeOf\(path\)\{[^\n]+\}/)[0];
const valid=html.match(/function validPath\(path\)\{[^\n]+\}/)[0];
const parse=new Function(ext+'\n'+type+'\n'+valid+"\nconst META_FOLDER='__gallery',LEGACY_META_FOLDER='_gallery',MUSIC_HISTORY_LIMIT=200;\n"+parser+'\nreturn parseMusicCollections;')();
test('playlist order persists and history is bounded',()=>{
  const data=parse(JSON.stringify({version:1,playlists:[{name:'Night drive',paths:['x.flac','y.mp3','x.flac']}],history:Array.from({length:250},(_,i)=>({path:'x.flac',at:i}))}));
  assert.deepEqual(data.playlists.get('Night drive'),['x.flac','y.mp3']);
  assert.equal(data.history.length,200);
});
test('invalid paths and corrupt files are rejected',()=>{
  assert.throws(()=>parse(''));
  assert.throws(()=>parse(JSON.stringify({version:2,playlists:[],history:[]})));
  assert.throws(()=>parse(JSON.stringify({version:1,playlists:[{name:'Bad',paths:['../x.mp3']}],history:[]})));
});
test('bulk queue actions are outside the hidden legacy selection bar',()=>{
  assert.match(html,/<div id="musicSelectionActions"[^>]*>[\s\S]*?id="bulkQueue"[\s\S]*?id="bulkPlayNext"[\s\S]*?<\/div>/);
  assert.equal((html.match(/id="bulkQueue"/g)||[]).length,1);
});
