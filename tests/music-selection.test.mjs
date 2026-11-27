import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('../__music/index.html',import.meta.url),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const slice=(a,b)=>{const start=js.indexOf(a),end=js.indexOf(b,start);assert.ok(start>=0&&end>start);return js.slice(start,end)};
const selection=slice('function activateCard(path,event){','// Desktop marquee selection');
const prepare=slice('function prepareTrack(path){','async function startTrack');
const toggle=slice('function toggleMusic(){','function stepMusic');
const queue=slice('function addMusicQueue(paths,next=false){','function toggleShuffle');
const logic=html.match(/\/\* BEGIN MUSIC PLAYER LOGIC \*\/([\s\S]*?)\/\* END MUSIC PLAYER LOGIC \*\//)[1];
function harness(){
  const env={events:[],playerAudio:{paused:true,ended:false},eligible:p=>p!=='trash',filtered:['a','b','c','trash'].map(path=>({path}))};
  const api=new Function('env',
    "let selectedPaths=new Set(),selectionAnchor=null,suppressCardClick=false,visibleCount=80,playerPath=null,playerPrepared=false,playerRequest=0,playerLoading=false,playerWantsPlay=false,playerSeekActive=false,deletingMedia=false,librarySwitching=false,root={},playerQueue=[],playerURL=null;const {playerAudio,filtered}=env,playerEligible=env.eligible;"+
    "function releasePlayerSource(){playerURL=null;playerAudio.paused=true;env.events.push('release')}function updatePlayerTrack(){}function updatePlayerTime(){}function queueChanged(){}function updateSelectionUI(){}function updatePlayerControls(){}function resetQueueOrder(){}function queueNotice(){}function resumePlayer(){env.events.push('resume')}async function startTrack(path,snapshot){env.events.push(['start',path,snapshot])}"+
    logic+prepare+toggle+queue+selection+
    ";return {click:(path,mod={})=>activateCard(path,{preventDefault(){},stopPropagation(){},...mod}),toggleMusic,addMusicQueue,state:()=>({selected:[...selectedPaths],path:playerPath,prepared:playerPrepared,queue:[...playerQueue]}),setQueue:q=>{playerQueue=q.slice()}}"
  )(env);
  return {...env,api};
}
test('plain click stages one track without autoplay and replaces selection',()=>{
  const x=harness();x.api.click('a');assert.deepEqual(x.api.state(),{selected:['a'],path:'a',prepared:true,queue:[]});
  x.api.click('b');assert.deepEqual(x.api.state(),{selected:['b'],path:'b',prepared:true,queue:[]});
  assert.deepEqual(x.events,['release','release']);
  x.api.toggleMusic();assert.deepEqual(x.events.at(-1),['start','b',true]);
});
test('Ctrl/Cmd toggles and Shift selects ranges without staging another track',()=>{
  const x=harness();x.api.click('a');x.api.click('c',{ctrlKey:true});
  assert.deepEqual(x.api.state().selected,['a','c']);assert.equal(x.api.state().path,'a');
  x.api.click('c',{metaKey:true});assert.deepEqual(x.api.state().selected,['a']);
  x.api.click('a');x.api.click('c',{shiftKey:true});assert.deepEqual(x.api.state().selected,['a','b','c']);
  assert.equal(x.api.state().path,'a');x.api.click('b');assert.deepEqual(x.api.state().selected,['b']);
});
test('staging preserves explicit queue and footer actions can enqueue a staged track',()=>{
  const x=harness();x.api.setQueue(['c']);x.api.click('a');assert.deepEqual(x.api.state().queue,['c']);
  x.api.addMusicQueue(['a']);assert.deepEqual(x.api.state().queue,['c','a']);
  x.api.addMusicQueue(['b'],true);assert.deepEqual(x.api.state().queue,['b','c','a']);
  x.api.toggleMusic();assert.deepEqual(x.events.at(-1),['start','a',false]);
});
test('Trash is selectable without preparing an unplayable file',()=>{
  const x=harness();x.api.click('trash');assert.deepEqual(x.api.state().selected,['trash']);assert.equal(x.api.state().path,null);
});
test('footer holds fixed queue actions between track info and transport, with no popup',()=>{
  const footer=html.slice(html.indexOf('<footer id="musicPlayer"'),html.indexOf('</footer>'));
  assert.match(footer,/class="player-track"[\s\S]*?id="bulkQueue"[\s\S]*?id="bulkPlayNext"[\s\S]*?class="player-center"/);
  assert.doesNotMatch(html,/musicSelectionActions|musicSelectedCount|ctrlKey:!e\.shiftKey/);
  assert.match(js,/media\.onclick=e=>activateCard\(item\.path,e\)/);
  assert.match(js,/const selectFromCaption=e=>\{[\s\S]*?activateCard\(item\.path,e\)/);
  assert.doesNotThrow(()=>new Function(js));
});
test('initial volume display does not recreate browser preferences after cache reset',()=>{
  const update=slice('function applyPlayerVolume(){','function persistPlayerVolume');
  assert.doesNotMatch(update,/localStorage/);
  assert.match(js,/function persistPlayerVolume\(\)\{try\{localStorage\.setItem/);
});
