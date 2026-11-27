import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('../__music/index.html',import.meta.url),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const slice=(a,b)=>{const start=js.indexOf(a),end=js.indexOf(b,start);assert.ok(start>=0&&end>start);return js.slice(start,end)};
const history=slice('const VIEW_HISTORY_LIMIT=50;','function typeOf(path){');
const filters=slice('function filterAndRender(metadataRefresh=','function renderCards(){');
const collections=slice('function currentAlbum(){','function visibleAlbumCount(paths){');
const logic=html.match(/\/\* BEGIN MUSIC FILTER LOGIC \*\/([\s\S]*?)\/\* END MUSIC FILTER LOGIC \*\//)[1];
const facetReader=slice('function readMusicFacets(){','function refreshMusicFacetOptions(');
function harness(){
  const nodes=Object.fromEntries(['query','folder','kind','viewBack','musicArtist','musicAlbum','musicGenre','musicYear','musicLength','musicSort'].map(id=>[id,{value:'',disabled:false,selectedIndex:0,options:[],add(o){this.options.push(o)}}]));
  nodes.musicSort.value='auto';
  const images=[
    {path:'A/1.mp3',name:'1.mp3',musicReady:true,music:{title:'Lake',artist:'Echo',album:'Night',genre:'Ambient',year:'2025',duration:80}},
    {path:'A/2.flac',name:'2.flac',musicReady:true,music:{title:'Forest',artist:'Other',album:'Day',genre:'Jazz',year:'2024',duration:310}},
    {path:'B/3.mp3',name:'3.mp3',musicReady:true,music:{title:'Lake',artist:'Echo',album:'Night',genre:'Ambient',year:'2025',duration:200}}
  ];
  const albums=new Map([['Travel',new Set(['B/3.mp3'])]]);
  const tags=new Map([['A/1.mp3',['Water']],['B/3.mp3',['Water']]]);
  const favorites=new Set(['A/1.mp3']),trash=new Set();
  const env={nodes,images,albums,tags,favorites,trash,el:id=>nodes[id],localStorage:{setItem(){}},
    Option:class{constructor(text,value){this.text=text;this.value=value}},audioFormat:p=>p.split('.').at(-1),
    renderAlbumList(){},renderTagList(){},navButtonActive(){},renderCards(){},clearSelection(){},syncFilterControls(){},knownTags:()=>[{key:'water'}],
    refreshMusicFacetOptions(){},updateMusicFilterStatus(){},updateResultsLine(){},rememberMusicSort(){}};
  const api=new Function('env',
    'const {el,images,albums,tags,favorites,trash,localStorage,Option,audioFormat,renderAlbumList,renderTagList,navButtonActive,renderCards,syncFilterControls,knownTags,refreshMusicFacetOptions,updateMusicFilterStatus,updateResultsLine,rememberMusicSort}=env;'+
    "let root={},librarySwitching=false,selectedPaths=new Set(),playerPreviewPath=null,selectedAlbumNames=new Set(),selectedTagKeys=new Set(),selectedSpecialViews=new Set(),collectionOperator='OFF',folderLocked=true,activeView={type:'all'},filtered=[],visibleCount=80,musicSortDirection=1;const FOLDER_LOCK_KEY='lock',COLLECTION_OPERATOR_KEY='operator',musicFacetIds={artist:'musicArtist',album:'musicAlbum',genre:'musicGenre',year:'musicYear'};"+
    'function clearSelection(){selectedPaths.clear();playerPreviewPath=null;}'+logic+facetReader+collections+history+filters+
    ";return {filterAndRender,goBackView,resetViewHistory,scheduleSearchNavigation,chooseCollection,chooseSpecialView,state:()=>({view:captureViewState(),results:filtered.map(x=>x.path),history:viewHistory.length,backDisabled:el('viewBack').disabled,selection:[...selectedPaths],preview:playerPreviewPath}),select:p=>{selectedPaths.add(p);playerPreviewPath=p;syncViewBack()},mode:(operator,locked)=>{collectionOperator=operator;folderLocked=locked;filterAndRender(false,'filter')},direction:()=>{musicSortDirection*=-1;filterAndRender(false,'filter')}}"
  )(env);
  api.filterAndRender();
  return {api,nodes,albums};
}
test('Back restores search, folder, format and results in sequence',()=>{
  const {api,nodes}=harness();
  const initial=api.state();
  nodes.query.value='lake';api.filterAndRender(false,'search');
  const search=api.state();
  nodes.folder.value='A';api.filterAndRender(false,'filter');
  const folder=api.state();
  nodes.kind.value='flac';api.filterAndRender(false,'filter');
  assert.deepEqual(api.state().results,[]);
  api.goBackView();assert.deepEqual(api.state().view,folder.view);assert.deepEqual(api.state().results,folder.results);
  api.goBackView();assert.deepEqual(api.state().view,search.view);assert.deepEqual(api.state().results,search.results);
  api.goBackView();assert.deepEqual(api.state().view,initial.view);assert.deepEqual(api.state().results,initial.results);assert.equal(api.state().backDisabled,true);
});
test('Back restores all metadata facets and sort direction',()=>{
  const {api,nodes}=harness();
  nodes.musicArtist.value='v:echo';nodes.musicAlbum.value='v:night';nodes.musicGenre.value='v:ambient';nodes.musicYear.value='v:2025';nodes.musicLength.value='medium';nodes.musicSort.value='duration';api.filterAndRender(false,'filter');
  api.direction();
  const saved=api.state();assert.deepEqual(saved.results,['B/3.mp3']);
  for(const id of ['musicArtist','musicAlbum','musicGenre','musicYear','musicLength'])nodes[id].value='';
  nodes.musicSort.value='auto';api.filterAndRender(false,'filter');
  api.goBackView();assert.deepEqual(api.state().view,saved.view);assert.deepEqual(api.state().results,saved.results);
  api.goBackView();assert.equal(api.state().view.direction,1);
});
test('Back restores collection combinations and folder lock',()=>{
  const {api,nodes}=harness();
  nodes.folder.value='A';api.filterAndRender(false,'filter');api.mode('OR',false);
  api.chooseCollection('album','Travel');api.chooseCollection('tag','water');api.chooseSpecialView('favorites');
  const saved=api.state();api.mode('AND',true);api.goBackView();
  assert.deepEqual(api.state().view,saved.view);assert.deepEqual(api.state().results,saved.results);
});
test('metadata refresh is not navigation, but preserves a pending search',()=>{
  const {api,nodes}=harness();
  api.filterAndRender(true);assert.equal(api.state().history,0);
  nodes.query.value='lake';api.scheduleSearchNavigation();api.filterAndRender(true);
  assert.equal(api.state().history,1);api.goBackView();assert.equal(nodes.query.value,'');assert.equal(api.state().history,0);
});
test('search coalesces, history is bounded and resets per library',()=>{
  const {api,nodes}=harness();
  nodes.query.value='l';api.filterAndRender(false,'search');nodes.query.value='lake';api.filterAndRender(false,'search');
  assert.equal(api.state().history,1);
  for(let i=0;i<60;i++){nodes.folder.value=i%2?'A':'B';api.filterAndRender(false,'filter')}
  assert.equal(api.state().history,50);api.resetViewHistory();assert.equal(api.state().history,0);assert.equal(api.state().backDisabled,true);
});
test('header places Back between format and view, with compact search before folder and format',()=>{
  const header=html.slice(html.indexOf('<header class="top">'),html.indexOf('</header>'));
  assert.match(header,/id="query"[^>]*>\s*<select id="folder"[\s\S]*?id="folderLock"[\s\S]*?id="kind"[\s\S]*?id="viewBack"[\s\S]*?id="layoutToggle"/);
  assert.match(html,/\.top > \.filters > #query\{[\s\S]*?max-width:220px;[\s\S]*?margin-left:auto;/);
  assert.match(js,/el\('viewBack'\)\.onclick=goBackView/);
  assert.match(js,/async function activateLibrary\(picked\)[\s\S]*?resetViewHistory\(\)/);
  assert.match(js,/const changed=\(\)=>\{clearSelection\(\);visibleCount=80;filterAndRender\(false,'filter'\)\}/);
  assert.doesNotThrow(()=>new Function(js));
});

test('header status reserves a fixed width and preserves full text on hover',()=>{
  const rules=[...html.matchAll(/\.top-right #status\{([^}]+)\}/g)];
  assert.equal(rules.length,1);
  assert.match(rules[0][1],/flex:0 0 160px;width:160px;min-width:160px;max-width:160px;/);
  assert.match(rules[0][1],/text-overflow:ellipsis;white-space:nowrap;text-align:right;/);
  const source=html.match(/function setStatus\(s\)\{[^}]+\}/)[0];
  const status={};
  const setStatus=new Function('el',source+';return setStatus')(id=>status);
  for(const message of ['loaded from index','Loading metadata…','Scanning all subfolders…']){
    setStatus(message);
    assert.equal(status.textContent,message);
    assert.equal(status.title,message);
  }
});

test('Back clears the selection before consuming filter history',()=>{
  const {api,nodes}=harness();
  nodes.query.value='lake';api.filterAndRender(false,'search');api.select('A/1.mp3');
  assert.equal(api.state().backDisabled,false);assert.equal(api.state().history,1);
  api.goBackView();assert.deepEqual(api.state().selection,[]);assert.equal(api.state().preview,null);
  assert.equal(api.state().history,1);assert.equal(api.state().view.query,'lake');
  api.goBackView();assert.equal(api.state().view.query,'');assert.equal(api.state().backDisabled,true);
});
