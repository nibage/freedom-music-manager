import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('../__music/index.html',import.meta.url),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
test('main and preview share one audio element and mirrored transport controls',()=>{
  assert.equal((html.match(/<audio\b/g)||[]).length,1);
  const preview=html.slice(html.indexOf('<footer id="viewerPlayer"'),html.indexOf('</footer>',html.indexOf('<footer id="viewerPlayer"')));
  for(const id of ['viewerQueueButton','viewerQueueTrack','viewerPlayNext','viewerPlayTrack','viewerPlayerPrev','viewerPlayerNext','viewerPlayerStop','viewerPlayerShuffle','viewerPlayerRepeat','viewerPlayerSeek','viewerPlayerMute','viewerPlayerVolume'])assert.ok(preview.includes('id="'+id+'"'));
  assert.match(js,/el\('viewerPlayTrack'\)\.onclick=toggleViewerPlayback/);
  assert.match(js,/el\('viewerQueueButton'\)\.onclick=openMusicQueue/);
  assert.match(js,/el\('viewerPlayerShuffle'\)\.onclick=toggleShuffle/);
});
test('select all selects filtered playable tracks beyond the rendered page',()=>{
  const source=js.slice(js.indexOf('function selectAllMusicResults(){'),js.indexOf('function clearSelection(){playerSelectionKey='));
  const api=new Function("let root={},librarySwitching=false,deletingMedia=false,selectedPaths=new Set(),selectionAnchor=null,filtered=Array.from({length:200},(_,i)=>({path:String(i)}));const playerEligible=p=>p!=='199';function prepareTrack(){}function dismissTrackPreview(){}function updateSelectionUI(){}"+source+";return ()=>{selectAllMusicResults();return [...selectedPaths]}")();
  assert.equal(api().length,199);
  assert.match(html,/id="musicFilterReset"[^>]*>Reset filters<\/button>\s*<button id="musicSelectAll"/);
});
test('selected playback uses finite queue and disables repeat on new selection',()=>{
  const source=js.slice(js.indexOf('function startSelectedPlayback('),js.indexOf('function viewerPlaybackPaths('));
  assert.match(source,/playerRepeat='off';[\s\S]*?setPlayerQueue\(paths\)/);
  assert.match(js,/addEventListener\('ended',\(\)=>\{[\s\S]*?else if\(next\)void startTrack\(next,false,true\)\}\)/);
  assert.doesNotThrow(()=>new Function(js));
});
