import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('../__music/index.html',import.meta.url),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const slice=(a,b)=>{const x=js.indexOf(a),y=js.indexOf(b,x);assert.ok(x>=0&&y>x);return js.slice(x,y)};
const source=slice('function queueMembershipAction(','function renderQueuePagination(')+slice('function renderQueuePagination(','function renderPlaylistOptions(){')+slice('function renderHistory(){','function initMusicCollections(){');
function harness(){
  class Node{constructor(){this.children=[];this.className='';this.hidden=false;this.disabled=false;this.textContent='';this.attrs={};}replaceChildren(){this.children=[]}append(...xs){this.children.push(...xs);for(const x of xs)if(x&&typeof x==='object')x.parentElement=this}setAttribute(k,v){this.attrs[k]=v}showModal(){this.open=true}}
  const nodes=new Map(),el=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id)};
  const env={el,document:{createElement:()=>new Node()},queueTrackLabel:p=>p,queueButton:()=>({}),updatePlaylistButtons(){},renderPlaylistOptions(){},playerEligible:()=>true};
  const api=new Function('env','const {el,document,queueTrackLabel,queueButton,updatePlaylistButtons,renderPlaylistOptions,playerEligible}=env;'+
    "const QUEUE_PAGE_SIZE=3;let queuePanel='queue',queuePage=0,historyPage=0,playerPath='a',playerQueue=['a','b','c','d'],playerHistory=Array.from({length:8},(_,i)=>({path:'h'+i,at:i})),musicCollectionsWritable=true,root={},filtered=[],selectedPaths=new Set(),queueSelectedPath=null,historySelectedEntry=null,playerLoading=false,playerWantsPlay=false,playerAudio={paused:true,ended:false};"+
    source+";return {renderQueue,openMusicQueue,panel:p=>{queuePanel=p;renderQueue()},next:()=>{if(queuePanel==='history')historyPage++;else queuePage++;renderQueue()},clear:()=>{playerHistory=[];renderQueue()},target:queuePanelTarget,state:()=>({queuePage,historyPage,queuePanel,queue:playerQueue.slice()})};"
  )(env);
  return {api,el};
}
test('history replaces only list, returns to queue with its original page',()=>{
  const {api,el}=harness();api.openMusicQueue();api.next();
  assert.equal(el('queuePageLabel').textContent,'2 / 2');assert.equal(el('historyList').hidden,true);
  api.panel('history');assert.equal(el('queueList').hidden,true);assert.equal(el('historyList').hidden,false);assert.equal(el('historyClear').hidden,false);assert.equal(el('queueClear').hidden,true);assert.equal(el('queueAddResults').hidden,true);assert.equal(el('queueAppendResults').hidden,true);
  assert.equal(el('queueHistoryToggle').textContent,'Queue');assert.equal(el('queuePageLabel').textContent,'1 / 3');
  api.next();assert.equal(el('queuePageLabel').textContent,'2 / 3');assert.equal(el('historyList').children[0].children[0],'h3');
  api.panel('queue');assert.equal(el('queuePageLabel').textContent,'2 / 2');assert.equal(el('historyClear').hidden,true);assert.equal(el('queueHistoryToggle').textContent,'History');
});
test('history pagination clamps last page and clears without modifying queue',()=>{
  const {api,el}=harness();api.panel('history');api.next();api.next();api.next();
  assert.equal(el('queuePageLabel').textContent,'3 / 3');assert.equal(el('historyList').children.length,2);assert.equal(el('queuePageNext').disabled,true);
  const queue=api.state().queue;api.clear();
  assert.equal(el('queuePageLabel').textContent,'1 / 1');assert.equal(el('queuePagePrev').disabled,true);assert.equal(el('queuePageNext').disabled,true);
  assert.equal(el('historyClear').disabled,true);assert.deepEqual(api.state().queue,queue);assert.equal(el('historyList').children[0].textContent,'No listening history.');
});
test('history toggle and clear are on existing action rows with no details element',()=>{
  const dialog=html.slice(html.indexOf('<dialog id="musicQueueDialog"'),html.indexOf('<dialog id="viewer"'));
  assert.match(dialog,/id="queueCount"[^>]*><\/span><button[^>]*id="queueHistoryToggle"/);
  assert.match(dialog,/id="queuePlay"[\s\S]*?id="historyClear"[\s\S]*?id="queueList"[\s\S]*?id="historyList"[\s\S]*?id="queuePagePrev"[\s\S]*?id="queuePageLabel"[\s\S]*?id="queuePageNext"/);
  assert.doesNotMatch(dialog,/<details/);
  assert.match(html,/#queueHistoryToggle\{margin-left:auto/);
  assert.doesNotThrow(()=>new Function(js));
});

test('Play target comes from active list and current page',()=>{const {api,el}=harness();api.openMusicQueue();assert.equal(api.target(),'a');api.next();assert.equal(api.target(),'d');api.panel('history');assert.equal(api.target(),'h0');api.next();assert.equal(api.target(),'h3');assert.equal(el('queuePlayText').textContent,'Play');});
