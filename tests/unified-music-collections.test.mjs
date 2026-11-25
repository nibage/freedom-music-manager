// Run: node --test tests/unified-music-collections.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../__music/index.html',import.meta.url),'utf8');
const valid=html.match(/function validAlbum\(name\)\{[^\n]+\}/)[0];
const helpers=html.slice(html.indexOf('function sameMusicOrder('),html.indexOf('async function loadMusicCollections('));
const {sameMusicOrder,collectionNameForImport}=new Function(valid+'\n'+helpers+'\nreturn {sameMusicOrder,collectionNameForImport};')();
test('import reuses the same ordered collection',()=>{
  const existing=new Map([['Road',new Set(['a.mp3','b.mp3'])]]);
  assert.deepEqual(collectionNameForImport('road',['a.mp3','b.mp3'],existing),{name:'Road',exists:true});
});
test('collision preserves both collections and retry is idempotent',()=>{
  const existing=new Map([['Road',new Set(['a.mp3'])],['Road (imported)',new Set(['b.mp3','c.mp3'])]]);
  assert.deepEqual(collectionNameForImport('Road',['b.mp3','c.mp3'],existing),{name:'Road (imported)',exists:true});
  assert.deepEqual(collectionNameForImport('Road',['c.mp3','b.mp3'],existing),{name:'Road (imported 2)',exists:false});
  assert.equal(sameMusicOrder(['a','b'],['b','a']),false);
});
test('legacy playlist names are safe as filenames',()=>{
  assert.equal(collectionNameForImport('a/b',['a.mp3'],new Map()).name,'a_b');
  assert.equal(collectionNameForImport('CON',['a.mp3'],new Map()).name,'_CON');
});
test('only one collection map, history stored separately',()=>{
  assert.doesNotMatch(html,/\bmusicPlaylists\b/);
  assert.match(html,/const MUSIC_HISTORY_FILE='music-history\.json'/);
  assert.match(html,/function saveAlbum\(name\)\{const members=albums\.get\(name\)[\s\S]*?body=\[\.\.\.members\]\.join/);
  assert.match(html,/id="showAlbums"[^>]*>Music collections<\/button>/);
});
