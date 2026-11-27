import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('../__music/index.html',import.meta.url),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const source=js.slice(js.indexOf('function queueCollectionOptions('),js.indexOf('function renderPlaylistOptions(){'));
const options=new Function(source+';return queueCollectionOptions')();
test('search filters collection and tag names independently, ignoring case',()=>{
  const albums=new Map([['Rock mix',new Set(['b','a'])],['Jazz',new Set(['c'])],['Rock live',new Set()]]);
  const tags=[{key:'rock',label:'ROCK',count:3},{key:'jazz',label:'Jazz',count:1}];
  assert.deepEqual(options('albums',' ROCK ',albums,tags).map(x=>x.key),['Rock live','Rock mix']);
  assert.deepEqual(options('tags','rock',albums,tags),[{key:'rock',label:'ROCK',count:3}]);
  assert.deepEqual(options('albums','nothing',albums,tags),[]);
});
test('Use collection replaces queue exactly without unrelated current track; Append remains distinct',()=>{
  const use=js.slice(js.indexOf('function useQueueCollection(){'),js.indexOf('function initMusicCollections(){'));
  const api=new Function("let root={},playerPath='a',queue=['a','d'],stopped=false,cleared=false,queueCollectionMode='albums';function queueCollectionPaths(){return ['c','b','missing']}const playerEligible=p=>p!=='missing';function stopMusic(){stopped=true;playerPath=null}function clearSelection(){cleared=true}function setPlayerQueue(p){queue=p}function queueNotice(){}"+use+";return ()=>{useQueueCollection();return {queue,stopped,cleared}}")();
  assert.deepEqual(api(),{queue:['c','b'],stopped:true,cleared:true});
  assert.match(js,/el\('playlistAppend'\)\.onclick=\(\)=>\{const paths=queueCollectionPaths\(\);if\(paths\)appendQueueMembership\(paths\)\}/);
});
test('compact collection controls use two rows and 1:2 search-select ratio; history hides whole panel',()=>{
  assert.match(html,/id="queueCollectionPanel"[\s\S]*?id="queueCollections"[\s\S]*?id="queueTags"[\s\S]*?id="queueCollectionNew"[\s\S]*?id="queueCollectionRemove"[\s\S]*?id="queueCollectionQuery"[\s\S]*?id="playlistSelect"[\s\S]*?id="playlistLoad"[\s\S]*?id="playlistAppend"/);
  assert.match(html,/\.queue-collection-search\{display:grid;grid-template-columns:minmax\(0,1fr\) minmax\(0,2fr\)/);
  assert.match(html,/#queueCollectionPanel\[hidden\]\{display:none!important\}/);
  assert.match(js,/el\('queueCollectionPanel'\)\.hidden=history/);
  assert.doesNotMatch(html,/id="playlistPlay"/);
});
