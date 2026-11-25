// Run: node --test tests/music-filters.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../__music/index.html',import.meta.url),'utf8');
const code=html.match(/\/\* BEGIN MUSIC FILTER LOGIC \*\/([\s\S]*?)\/\* END MUSIC FILTER LOGIC \*\//)[1];
const f=new Function(code+'\nreturn {musicFold,musicYear,musicFacetKey,musicDurationBucket,matchesMusicFacets,buildMusicFacets,matchesMusicQuery,sortMusicResults};')();
const items=[
  {path:'A/10.mp3',name:'10.mp3',musicReady:true,music:{title:'Červená',artist:'Écho',album:'Night',year:'2025-01-01',genre:'Ambient',track:'10/12',duration:80}},
  {path:'B/2.flac',name:'2.flac',musicReady:true,music:{title:'Blue',artist:'Echo',album:'Night',year:'2025',genre:'Ambient',track:'2/12',duration:310}},
  {path:'C.wav',name:'C.wav',musicReady:true,music:{}},
  {path:'D.ogg',name:'D.ogg'}
];
test('accent-insensitive search across tags and music metadata',()=>{
  assert.ok(f.matchesMusicQuery(items[0],'cervena echo'));
  assert.ok(f.matchesMusicQuery(items[0],'cervena relax',['Relax']));
  assert.ok(!f.matchesMusicQuery(items[0],'cervena jazz'));
});
test('year values are normalized and pending values are not missing',()=>{
  assert.equal(f.musicFacetKey(items[0],'year'),'v:2025');
  assert.equal(f.musicFacetKey(items[1],'year'),'v:2025');
  assert.equal(f.musicFacetKey(items[2],'artist'),'missing');
  assert.equal(f.musicFacetKey(items[3],'artist'),'pending');
  assert.equal(f.musicDurationBucket(items[2]),'unknown');
  assert.equal(f.musicDurationBucket(items[3]),'pending');
});
test('facets combine using AND and count other applicable choices',()=>{
  assert.ok(f.matchesMusicFacets(items[0],{artist:'v:echo',duration:'short'}));
  assert.ok(!f.matchesMusicFacets(items[1],{artist:'v:echo',duration:'short'}));
  assert.equal(f.buildMusicFacets(items,{genre:'v:ambient'}).artist.get('v:echo').count,2);
  assert.equal(f.buildMusicFacets(items,{duration:'long'}).artist.get('v:echo').count,1);
  assert.equal(f.buildMusicFacets(items,{}).artist.get('missing').count,1);
});
test('duration buckets do not overlap at boundaries',()=>{
  for(const [duration,bucket] of [[119,'short'],[120,'medium'],[299,'medium'],[300,'long']]){
    assert.equal(f.musicDurationBucket({musicReady:true,music:{duration}}),bucket);
  }
});
test('album sort uses numeric track numbers, duration sort leaves unknown last',()=>{
  assert.deepEqual(f.sortMusicResults(items.slice(),'album',1).slice(0,2).map(x=>x.path),['B/2.flac','A/10.mp3']);
  assert.deepEqual(f.sortMusicResults(items.slice(),'duration',-1).slice(0,2).map(x=>x.path),['B/2.flac','A/10.mp3']);
  assert.equal(f.sortMusicResults(items.slice(),'duration',1)[0].path,'A/10.mp3');
});
test('default order respects saved collection order',()=>{
  assert.deepEqual(f.sortMusicResults(items.slice(),'auto',1,new Set(['C.wav','A/10.mp3','B/2.flac','D.ogg'])).map(x=>x.path),['C.wav','A/10.mp3','B/2.flac','D.ogg']);
});
