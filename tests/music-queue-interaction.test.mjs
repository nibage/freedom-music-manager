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
    "const QUEUE_PAGE_SIZE=2;let queuePanel=env.panel,queuePage=0,historyPage=0,queueSelectedPath=env.selected,playerPath='a',playerQueue=['a','b','c'],playerHistory=[{path:'missing'},{path:'h'},{path:'i'}],historySelectedEntry=env.historySelected?playerHistory.find(e=>e.path===env.historySelected):null,playerLoading=false,playerWantsPlay=false,playerOncePaths=null,playerSelectionKey=null;"+
    logic+source+";return {queueMembershipAction,queuePanelTarget,toggleQueuePanelPlayback,updateQueuePlayButton,queue:()=>playerQueue.slice()};")(env);
  return {...env,api};
}
test('hover membership adds missing or removes fully queued selections, including the current track',()=>{
  const {api,playerEligible}=harness();
  assert.deepEqual(api.queueMembershipAction(['a','b','d'],['a','b'],'a',playerEligible),{mode:'add',selected:['a','b','d']});
  assert.deepEqual(api.queueMembershipAction(['a','b'],['a','b'],'a',playerEligible),{mode:'remove',selected:['a','b']});
  assert.deepEqual(api.queueMembershipAction(['a'],['a'],'a',playerEligible).selected,['a']);
});
test('idle playback uses selected queue row instead of library preview',()=>{
  const {api,events}=harness({selected:'b'});api.toggleQueuePanelPlayback();assert.deepEqual(events,[['start','b',false]]);
});
test('history playback selects playable row and preserves existing queue',()=>{
  const {api,events}=harness({panel:'history'});assert.equal(api.queuePanelTarget(),'h');api.toggleQueuePanelPlayback();
  assert.deepEqual(api.queue(),['a','h','b','c']);assert.deepEqual(events,['reset',['start','h',false]]);
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
