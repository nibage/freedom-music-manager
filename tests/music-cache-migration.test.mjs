import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../__music/index.html',import.meta.url),'utf8');
const logic=html.match(/\/\* BEGIN MUSIC CACHE LOGIC \*\/([\s\S]*?)\/\* END MUSIC CACHE LOGIC \*\//)[1];
const migration=html.match(/\/\* BEGIN MUSIC DIRECTORY MIGRATION \*\/([\s\S]*?)\/\* END MUSIC DIRECTORY MIGRATION \*\//)[1];
const cache=new Function(logic+'\nreturn {parseMusicCache,serializeMusicCache,validMusicCacheStamp};')();

const fixture="\nclass Dir {\n  constructor(){this.kind='directory';this.children=new Map()}\n  async getDirectoryHandle(n,{create=false}={}){let v=this.children.get(n);if(!v&&create){v=new Dir();this.children.set(n,v)}if(!v||v.kind!=='directory')throw Object.assign(Error(n),{name:'NotFoundError'});return v}\n  async *entries(){yield* this.children}\n}\nconst maybeGetDir=async(d,n)=>{try{return await d.getDirectoryHandle(n)}catch(e){if(e.name==='NotFoundError')return null;throw e}};\nconst hasFile=async(d,n)=>d.children.get(n)?.kind==='file';\nconst readText=async(d,n)=>d.children.get(n)?.body||'';\nconst writeText=async(d,n,body)=>d.children.set(n,{kind:'file',body});\nconst META_FOLDER='__music',PREVIOUS_META_FOLDER='__gallery',LEGACY_META_FOLDER='_gallery',DATA_FOLDER='data',COLLECTIONS_FOLDER='collections';\nconst getMetaDir=async(create,r)=>(await r.getDirectoryHandle(META_FOLDER,{create})).getDirectoryHandle(DATA_FOLDER,{create});\nconst galleryCollectionDialog=async()=>true;\nasync function seed(){\n const r=new Dir(),old=await (await r.getDirectoryHandle('__gallery',{create:true})).getDirectoryHandle('data',{create:true});\n await writeText(old,'favorites.txt','a.mp3\\n');\n await writeText(old,'tags.tsv','a.mp3\\tRelax\\n');\n const albums=await old.getDirectoryHandle('albums',{create:true});await writeText(albums,'Night.txt','b.mp3\\na.mp3\\n');\n return {r,old,albums}\n}\n";

const fs=new Function(fixture+'\n'+migration+'\nreturn {seed,prepareMusicLayout,getMetaDir,readText,writeText,hasFile};')();
test('cache preserves only supported metadata and invalidates on size or modified time',()=>{
 const entries=new Map([['a.mp3',{size:123,modified:50,metadata:{title:'Song',duration:42,cover:'ignored'}}]]);
 const read=cache.parseMusicCache(cache.serializeMusicCache(entries),p=>p.endsWith('.mp3'));
 assert.deepEqual(read.get('a.mp3').metadata,{title:'Song',duration:42});
 assert.ok(cache.validMusicCacheStamp(read.get('a.mp3'),{size:123,lastModified:50}));
 assert.ok(!cache.validMusicCacheStamp(read.get('a.mp3'),{size:124,lastModified:50}));
 assert.ok(!cache.validMusicCacheStamp(read.get('a.mp3'),{size:123,lastModified:51}));
 assert.equal(cache.parseMusicCache('{"version":0,"entries":[]}',()=>true).size,0);
});
test('migration copies metadata, preserves original and collection order; marker prevents repeated import',async()=>{
 const {r,old}=await fs.seed();await fs.prepareMusicLayout(r);
 const dest=await fs.getMetaDir(false,r),cols=await dest.getDirectoryHandle('collections');
 assert.equal(await fs.readText(cols,'Night.txt'),'b.mp3\na.mp3\n');
 assert.equal(await fs.readText(old,'favorites.txt'),'a.mp3\n');
 assert.equal(await fs.readText(dest,'tags.tsv'),'a.mp3\tRelax\n');
 await fs.writeText(dest,'favorites.txt','changed.mp3\n');await fs.prepareMusicLayout(r);
 assert.equal(await fs.readText(dest,'favorites.txt'),'changed.mp3\n');
});
test('conflicts detected before copying metadata files',async()=>{
 const {r}=await fs.seed(),dest=await fs.getMetaDir(true,r);
 await fs.writeText(dest,'favorites.txt','different.mp3\n');
 await assert.rejects(fs.prepareMusicLayout(r),/Conflicting existing metadata/);
 assert.equal(await fs.readText(dest,'favorites.txt'),'different.mp3\n');
 assert.ok(!await fs.hasFile(dest,'tags.tsv'));
});
