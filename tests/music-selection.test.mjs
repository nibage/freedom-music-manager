import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('../__music/index.html',import.meta.url),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const slice=(a,b)=>{const x=js.indexOf(a),y=js.indexOf(b,x);assert.ok(x>=0&&y>x);return js.slice(x,y)};
const display=slice('function displayedPlayerPath(){','function updatePlayerControls(){');
const stage=slice('function prepareTrack(path){','async function startTrack(');
const toggle=slice('function selectedPlaybackPaths(){','function stepMusic(');
const click=slice('function activateCard(path,event){','// Desktop marquee selection');
const queueLogic=slice('function queueInsert(queue,paths,current,next,eligible){','function shuffleUpcoming(');
function harness({playing='a',queue=['a','b']}={}){
  const nodes=Object.fromEntries(['playerTitle','playerArtist','playerCover','viewBack'].map(id=>[id,{textContent:'',dataset:{},src:''}]));
  const filtered=['a','b','c'].map(path=>({path,name:path,music:{title:path.toUpperCase()}}));
  const events=[],env={nodes,filtered,events,el:id=>nodes[id],byPath:new Map(filtered.map(x=>[x.path,x])),musicTitle:item=>item.music.title,
    queueThumb(){},updatePlayerControls(){},syncViewBack(){},DEFAULT_COVER:'cover',playing,queue};
  const api=new Function('env',
    'const {nodes,filtered,events,el,byPath,musicTitle,queueThumb,updatePlayerControls,syncViewBack,DEFAULT_COVER}=env;'+
    "let playerPath=env.playing,playerPreviewPath=null,playerSelectionKey=null,playerRepeat='all',currentPath='c',playerQueue=env.queue.slice(),playerURL=playerPath?'blob:old':null,playerRequest=7,playerLoading=false,playerWantsPlay=false,deletingMedia=false,librarySwitching=false,suppressCardClick=false,selectedPaths=new Set(),selectionAnchor=null,visibleCount=80;"+
    "const playerAudio={paused:!playerPath,ended:false,currentTime:12,pause(){events.push('pause')}};const playerEligible=p=>byPath.has(p);function resetQueueOrder(){events.push('reset-order')}function setPlayerQueue(paths){playerQueue=paths.slice();playerSelectionKey=null;resetQueueOrder()}function startTrack(path,newQueue){events.push(['start',path,newQueue]);}function resumePlayer(){events.push('resume')}function updateSelectionUI(){if(playerPreviewPath&&!selectedPaths.has(playerPreviewPath))dismissTrackPreview()}function clearSelection(){selectedPaths.clear();selectionAnchor=null;dismissTrackPreview();updateSelectionUI()}"+
    display+stage+toggle+click+queueLogic+
    ";return {prepareTrack,dismissTrackPreview,toggleMusic,toggleViewerPlayback,click:(path,mod={})=>activateCard(path,{preventDefault(){},stopPropagation(){},...mod}),state:()=>({path:playerPath,preview:playerPreviewPath,shown:displayedPlayerPath(),queue:playerQueue.slice(),url:playerURL,request:playerRequest,time:playerAudio.currentTime,paused:playerAudio.paused,selection:[...selectedPaths],title:el('playerTitle').textContent})};"
  )(env);
  return {api,events};
}
test('normal click selects only one track; Ctrl toggles without additive plain clicks',()=>{
  const {api}=harness();
  api.click('b');assert.deepEqual(api.state().selection,['b']);
  api.click('c',{ctrlKey:true});assert.deepEqual(api.state().selection,['b','c']);
  api.click('a');assert.deepEqual(api.state().selection,['a']);assert.equal(api.state().preview,null);
});
test('selecting another track only changes the preview, not current playback or queue',()=>{
  const {api,events}=harness();const before=api.state();
  api.click('c');const after=api.state();
  for(const key of ['path','url','request','time','paused','queue'])assert.deepEqual(after[key],before[key]);
  assert.equal(after.preview,'c');assert.equal(after.title,'C');assert.deepEqual(events,[]);
  api.dismissTrackPreview();assert.equal(api.state().shown,'a');assert.equal(api.state().title,'A');assert.equal(api.state().url,before.url);
});
test('Play replaces the existing queue with only the selected track',()=>{
  const {api,events}=harness();api.click('c');api.toggleMusic();
  assert.deepEqual(api.state().queue,['c']);
  assert.deepEqual(events,['reset-order',['start','c',false]]);
});
test('without an active track selection prepares a preview and Play starts it',()=>{
  const {api,events}=harness({playing:null,queue:[]});api.click('b');
  assert.equal(api.state().path,null);assert.equal(api.state().preview,'b');assert.deepEqual(events,[]);
  api.toggleMusic();assert.deepEqual(events,['reset-order',['start','b',false]]);
});
test('selection toolbar is hidden in both layouts and queue actions live in footer',()=>{
  assert.match(html,/#selectionBar,\.detailed-mode #selectionBar\{display:none!important\}/);
  const footer=html.slice(html.indexOf('<footer id="musicPlayer"'),html.indexOf('</footer>'));
  assert.match(footer,/id="playerTitle"[\s\S]*?id="playerQueueButton"[\s\S]*?id="bulkQueue"[\s\S]*?id="bulkPlayNext"[\s\S]*?id="playerPlay"/);
  assert.doesNotMatch(js,/playerPrepared/);
  assert.doesNotThrow(()=>new Function(js));
});

test('second click on sole selected track deselects and restores the current player',()=>{
  const {api,events}=harness();
  const before=api.state();api.click('b');api.click('b');
  assert.deepEqual(api.state().selection,[]);assert.equal(api.state().preview,null);
  assert.equal(api.state().shown,'a');assert.equal(api.state().url,before.url);
  assert.equal(api.state().time,before.time);assert.deepEqual(events,[]);
});
test('click on a selected member of a multi-selection reduces it to that one track',()=>{
  const {api}=harness();api.click('b');api.click('c',{ctrlKey:true});api.click('b');
  assert.deepEqual(api.state().selection,['b']);assert.equal(api.state().preview,'b');
});
test('cover opens details instead of selecting; both redundant info buttons are gone',()=>{
  assert.match(js,/media\.onclick=e=>openCoverDetails\(item\.path,e\)/);
  assert.match(js,/function openCoverDetails\(path,event\)\{[\s\S]*?if\(suppressCardClick\)return;[\s\S]*?void openViewer\(path\)/);
  assert.match(js,/meta\.onclick=selectFromCaption/);
  assert.match(html,/<button id="playerCoverButton"[^>]*><img id="playerCover"/);
  assert.match(js,/el\('playerCoverButton'\)\.onclick=\(\)=>\{const path=displayedPlayerPath\(\);if\(path\)void openViewer\(path\)\}/);
  assert.doesNotMatch(html,/playerDetails|track-info-button/);
});

test('multi-selection replaces queue in results order from either player',()=>{for(const method of ['toggleMusic','toggleViewerPlayback']){const {api,events}=harness();api.click('c');api.click('b',{ctrlKey:true});api[method]();assert.deepEqual(api.state().queue,['b','c']);assert.deepEqual(events,['reset-order',['start','b',false]]);}});
test('preview without selection plays just the viewed track',()=>{const {api,events}=harness();api.toggleViewerPlayback();assert.deepEqual(api.state().queue,['c']);assert.deepEqual(events,['reset-order',['start','c',false]]);});
