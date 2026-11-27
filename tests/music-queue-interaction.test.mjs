import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('../__music/index.html',import.meta.url),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const source=js.slice(js.indexOf('function queueMembershipAction('),js.indexOf('function renderQueuePagination('));
function harness({panel='queue',playing=false,selected=null,historySelected=null}={}){
  const button={setAttribute(){},textContent:'',disabled:false},label={textContent:''},events=[];
  const playerAudio={paused:!playing,ended:false,pause(){this.paused=true;events.push('pause')}};
  const env={button,events,playerAudio,panel,selected,historySelected,playing,label,el:id=>id==='queuePlayText'?label:button,playerEligible:p=>p!=='missing',
    startTrack:(p,n)=>events.push(['start',p,n]),resetQueueOrder:()=>events.push('reset'),updatePlayerControls:()=>events.push('update')};
  const logic=js.slice(js.indexOf('function queueInsert('),js.indexOf('function shuffleUpcoming('));
  const api=new Function('env','const {el,playerEligible,playerAudio,startTrack,resetQueueOrder,updatePlayerControls}=env;'+
    "const QUEUE_PAGE_SIZE=2;let queuePanel=env.panel,queuePage=0,historyPage=0,playerPath='a',playerQueue=['a','b','c'],playerHistory=[{path:'missing'},{path:'h'},{path:'i'}],historySelectedEntries=new Set(playerHistory.filter(e=>e.path===env.historySelected)),historySelectionAnchor=null,historyPlaybackSelection=null,root={},playerURL=null,playerLoading=false,playerWantsPlay=false,playerOncePaths=null,playerSelectionKey=null;"+
    "function clearSelection(){}function startSelectedPlayback(paths,once){env.events.push(['once',paths,once])}function toggleActualPlayback(){env.events.push('resume')}"+logic+source+";return {queueMembershipAction,queuePanelTarget,toggleQueuePanelPlayback,updateQueuePlayButton,historyPaths,historyRange,queue:()=>playerQueue.slice()};")(env);
  return {...env,api};
}
test('hover membership adds missing or removes fully queued selections, including the current track',()=>{
  const {api,playerEligible}=harness();
  assert.deepEqual(api.queueMembershipAction(['a','b','d'],['a','b'],'a',playerEligible),{mode:'add',selected:['a','b','d']});
  assert.deepEqual(api.queueMembershipAction(['a','b'],['a','b'],'a',playerEligible),{mode:'remove',selected:['a','b']});
  assert.deepEqual(api.queueMembershipAction(['a'],['a'],'a',playerEligible).selected,['a']);
});
test('idle playback starts entire queue rather than a selected row',()=>{
  const {api,events}=harness({selected:'b'});api.toggleQueuePanelPlayback();assert.deepEqual(events,[['start','a',false]]);
});
test('history playback uses all playable entries and preserves existing queue',()=>{
  const {api,events}=harness({panel:'history'});assert.equal(api.queuePanelTarget(),'h');api.toggleQueuePanelPlayback();
  assert.deepEqual(api.queue(),['a','b','c']);assert.deepEqual(events,[['once',['h','i'],true]]);
});
test('playing audio pauses regardless of panel and button reflects playback',()=>{
  const {api,events,label}=harness({panel:'history',playing:true});api.updateQueuePlayButton();assert.equal(label.textContent,'Pause');
  api.toggleQueuePanelPlayback();assert.deepEqual(events,['pause','update']);api.updateQueuePlayButton();assert.equal(label.textContent,'Play');
});
test('fixed size dialog and hover badge markup',()=>{
  assert.match(html,/#musicQueueDialog \{width:min\(760px,96vw\);height:90dvh/);
  assert.match(html,/\.player-queue-control:hover #bulkQueue:not\(\[disabled\]\)/);
  assert.match(html,/id="queueAddResults"[^>]*>Use current results/);
  const footer=html.slice(html.indexOf('<footer id="musicPlayer"'),html.indexOf('</footer>'));
  assert.doesNotMatch(footer,/>＋ Queue<\/button>/);
  assert.doesNotThrow(()=>new Function(js));
});

test('hover rule overrides the hidden badge and enables its independent hit target',()=>{
  assert.match(html,/#musicPlayer #bulkQueue,#viewerPlayer #viewerQueueTrack\{display:inline-flex!important;[^}]*visibility:hidden;pointer-events:none/);
  assert.match(html,/#musicPlayer \.player-queue-control:hover #bulkQueue:not\(:disabled\)[^{]*\{visibility:visible;pointer-events:auto\}/);
});
test('queue toolbar, collection manager and preview have the requested controls',()=>{
  assert.match(html,/id="queuePlay"[\s\S]*?id="queueClear"[\s\S]*?id="queueAddResults"[\s\S]*?id="queueAppendResults"[\s\S]*?id="historyClear"[\s\S]*?id="queueList"/);
  assert.match(html,/#queuePlay\{width:91px;min-width:91px/);
  assert.match(html,/#queuePlay\[aria-label="Pause"\] #queuePlayIcon\{clip-path:none;background:linear-gradient/);
  assert.match(html,/id="queueCollections"[\s\S]*?id="queueTags"[\s\S]*?id="queueCollectionNew"[\s\S]*?id="queueCollectionRemove"/);
  assert.doesNotMatch(html,/id="playlist(?:Delete|Name|Save)"/);
  assert.match(html,/#viewerPlayer\{grid-column:1;grid-row:2/);
  assert.doesNotMatch(html,/id="viewerPlayer(?:Title|Artist)"/);
  assert.match(js,/el\('queueClear'\)\.onclick=\(\)=>\{stopMusic\(\);clearSelection\(\)/);
});

test('history selection plays just chosen tracks in list order, without duplicates',()=>{const {api,events}=harness({panel:'history',historySelected:'i'});api.toggleQueuePanelPlayback();assert.deepEqual(events,[['once',['i'],true]]);const entries=[{path:'b'},{path:'a'},{path:'b'},{path:'missing'}];assert.deepEqual(api.historyPaths(entries,new Set(entries),p=>p!=='missing'),['b','a']);assert.deepEqual(api.historyRange(entries,entries[2],entries[0]),entries.slice(0,3));});
test('history controls are multiselect and queue has no row selection',()=>{assert.match(html,/id="historyList"[^>]*aria-multiselectable="true"/);assert.match(js,/historySelectedEntries=new Set\(playerHistory\)/);assert.match(js,/function initHistorySelection\(\)[\s\S]*?setPointerCapture/);assert.match(html,/id="historyClear"[\s\S]*?id="historyUseSelection"[\s\S]*?id="historyAppendSelection"/);assert.match(js,/row\.setAttribute\('role','listitem'\)/);});
