// Captures REAL application screenshots with an isolated binary-safe demo library.
// Never opens or uploads the user's personal music library.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, readdir, mkdir, unlink } from 'node:fs/promises';
import { join, resolve, relative, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootPath = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mediaDir = join(rootPath, 'demo-music');
const html = await readFile(join(rootPath, '__music', 'index.html'));
const files = {};
async function collect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await collect(full);
    else if (entry.isFile()) files[relative(mediaDir, full).split('\\').join('/')] = Array.from(await readFile(full));
  }
}
await collect(mediaDir);
const mediaPaths = Object.keys(files).filter(p => /\.(?:mp3|flac|wav|ogg|m4a|aac|opus|aiff|aif|alac|wma)$/i.test(p));
if (mediaPaths.length !== 9) throw new Error('Expected nine generated audio fixtures');

const server = createServer((req, res) => {
  if (req.url !== '/' && req.url !== '/index.html') { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();

let browser;
try {
  browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 2048, height: 1080 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.dismiss());
  await page.addInitScript((contents) => {
    class MockFile {
      kind = 'file';
      constructor(name, text) { this.name = name; this.body = Uint8Array.from(text); this.lastModified = 1731000000000; }
      async getFile() {
        const ext=this.name.split('.').at(-1).toLowerCase();
        const type=({wav:'audio/wav',mp3:'audio/mpeg',flac:'audio/flac',ogg:'audio/ogg',opus:'audio/ogg',m4a:'audio/mp4',png:'image/png',webp:'image/webp',json:'application/json',txt:'text/plain',tsv:'text/plain'})[ext]||'application/octet-stream';
        return new File([this.body], this.name, { type, lastModified: this.lastModified });
      }
      async createWritable() {
        const self = this;
        return { async write(payload) {
          self.body = typeof payload === 'string' ? new TextEncoder().encode(payload) : new Uint8Array(await new Response(payload).arrayBuffer());
        }, async close() {} };
      }
    }
    class MockDir {
      kind = 'directory';
      constructor(name) { this.name = name; this.nodes = new Map(); }
      async getDirectoryHandle(name, opts = {}) {
        let node = this.nodes.get(name);
        if (!node && opts.create) { node = new MockDir(name); this.nodes.set(name, node); }
        if (!node || node.kind !== 'directory') throw new DOMException('Directory not found: ' + name, 'NotFoundError');
        return node;
      }
      async getFileHandle(name, opts = {}) {
        let node = this.nodes.get(name);
        if (!node && opts.create) { node = new MockFile(name, []); this.nodes.set(name, node); }
        if (!node || node.kind !== 'file') throw new DOMException('File not found: ' + name, 'NotFoundError');
        return node;
      }
      async removeEntry(name) {
        if (!this.nodes.has(name)) throw new DOMException('Not found', 'NotFoundError');
        this.nodes.delete(name);
      }
      async *entries() { for (const item of this.nodes) yield item; }
      async queryPermission() { return 'granted'; }
      async requestPermission() { return 'granted'; }
      async isSameEntry(handle) { return this === handle; }
      async resolve(handle) { return this === handle ? [] : null; }
    }
    const root = new MockDir('demo-music');
    for (const [path, value] of Object.entries(contents)) {
      const parts = path.split('/'); const name = parts.pop();
      let dir = root;
      for (const segment of parts) {
        let next = dir.nodes.get(segment);
        if (!next) { next = new MockDir(segment); dir.nodes.set(segment, next); }
        dir = next;
      }
      dir.nodes.set(name, new MockFile(name, value));
    }
    Object.defineProperty(window, 'showDirectoryPicker', { configurable: true, value: async () => root });
    window.__demoRoot = root;
    window.__demoMediaPaths = Object.keys(contents).filter(p => /\.(?:mp3|flac|wav|ogg|m4a|aac|opus|aiff|aif|alac|wma)$/i.test(p));
  }, files);

  await page.goto('http://127.0.0.1:' + address.port + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#themeSelect').selectOption('dark');
  await page.locator('#openFolder').click();
  await page.waitForFunction(() => typeof images !== 'undefined' && images.length === 9 && !scanInProgress && !musicIndexing, null, { timeout: 45000 });
  await page.waitForFunction(() => document.querySelectorAll('#gallery .photo').length === 9);
  await page.waitForFunction(() => [...document.querySelectorAll('#gallery img.thumb')].some(img => img.src.startsWith('blob:')));
  // Metadata facet and format filtering work against the generated files.
  await page.locator('#musicArtist').selectOption('v:aurora signals');
  await page.waitForFunction(() => filtered.length === 3);
  await page.locator('#musicFilterReset').click();
  await page.locator('#kind').selectOption('wav');
  await page.waitForFunction(() => filtered.length === 3);
  // WAV is broadly supported in Chromium. Start playback and change filters.
  const card = page.locator('#gallery .photo').filter({hasText:'First Light'});
  const initialTop=await page.locator('#gallery').evaluate(e=>e.getBoundingClientRect().top);
  await card.locator('.video-tile').click();
  await page.waitForFunction(()=>document.getElementById('viewer').open&&currentPath?.includes('First Light')&&!selectedPaths.size&&!playerPath);
  await page.evaluate(()=>closeViewer());
  await card.locator('.meta').click();
  await page.waitForFunction(()=>playerPreviewPath?.includes('First Light')&&!playerPath&&playerAudio.paused&&selectedPaths.size===1);
  await card.locator('.meta').click();
  await page.waitForFunction(()=>!selectedPaths.size&&!playerPreviewPath);
  await card.locator('.meta').click();
  await page.waitForFunction(()=>playerPreviewPath?.includes('First Light')&&selectedPaths.size===1);
  await page.locator('#playerCoverButton').click();
  await page.locator('#viewerPlayer').waitFor({state:'visible'});
  await page.locator('#viewerQueueButton').waitFor({state:'visible'});
  await page.waitForFunction(()=>document.getElementById('viewer').open&&currentPath?.includes('First Light')&&selectedPaths.size===1&&!playerPath);
  await page.evaluate(()=>closeViewer());
  if(await page.locator('#gallery').evaluate(e=>e.getBoundingClientRect().top)!==initialTop)throw Error('Selecting a track moved the results grid');
  const other=page.locator('#gallery .photo').filter({hasNotText:'First Light'}).first();
  await other.locator('.meta').click({modifiers:['Control']});
  await page.waitForFunction(()=>selectedPaths.size===2&&playerPreviewPath?.includes('First Light'));
  await other.locator('.meta').click();
  await page.waitForFunction(()=>selectedPaths.size===1&&playerPreviewPath&&playerAudio.paused&&!playerPreviewPath.includes('First Light'));
  await card.locator('.meta').click();
  await page.waitForFunction(()=>selectedPaths.size===1&&playerPreviewPath?.includes('First Light')&&playerAudio.paused);
  await page.locator('#playerPlay').click();
  await page.waitForFunction(()=>playerQueue.length===1&&playerQueue[0]?.includes('First Light'));
  await page.waitForFunction(() => playerPath?.includes('First Light') && !playerAudio.paused && playerAudio.currentTime > 0, null,{timeout:15000});
  const original=await page.evaluate(()=>({path:playerPath,url:playerURL,request:playerRequest,time:playerAudio.currentTime,queue:playerQueue.slice()}));
  await other.locator('.meta').click();
  await page.waitForFunction(()=>playerPreviewPath&&playerPreviewPath!==playerPath&&selectedPaths.size===1);
  const preview=await page.evaluate(()=>({path:playerPath,url:playerURL,request:playerRequest,time:playerAudio.currentTime,queue:playerQueue.slice(),paused:playerAudio.paused}));
  if(preview.path!==original.path||preview.url!==original.url||preview.request!==original.request||preview.time<original.time||preview.paused||JSON.stringify(preview.queue)!==JSON.stringify(original.queue))throw Error('Selecting another track interrupted playback or changed the queue');
  if(await page.locator('#gallery').evaluate(e=>e.getBoundingClientRect().top)!==initialTop)throw Error('Selecting during playback moved results');
  await other.locator('.meta').click();
  await page.waitForFunction(()=>!playerPreviewPath&&!selectedPaths.size&&playerPath?.includes('First Light')&&!playerAudio.paused);
  if(await page.evaluate(()=>playerURL)!==original.url)throw Error('Deselecting replaced audio source');
  await other.locator('.meta').click();
  await page.locator('#viewBack').click();
  await page.waitForFunction(()=>!playerPreviewPath&&!selectedPaths.size&&playerPath?.includes('First Light')&&!playerAudio.paused);
  if(await page.evaluate(()=>playerURL)!==original.url)throw Error('Back replaced the audio source');
  console.log('PASS: selecting another track and Back preserve the running audio source, playback position and queue');
  await page.locator('#musicFilterReset').click();
  await page.locator('#musicGenre').selectOption('v:electronic');
  await page.waitForFunction(() => filtered.length === 3 && playerPath?.includes('First Light') && !playerAudio.paused);
  await page.locator('#playerPlay').click();
  await page.waitForFunction(() => playerAudio.paused);
  await page.locator('#musicFilterReset').click();
  // Preview Play must replace a populated queue, play only selected WAVs, and stop at its end.
  const selectedWavs=await page.evaluate(()=>{
    const wavs=filtered.filter(x=>x.path.toLowerCase().endsWith('.wav')&&playerEligible(x.path)).slice(0,2).map(x=>x.path);
    if(wavs.length!==2)throw Error('Missing demo WAVs');
    setPlayerQueue(filtered.map(x=>x.path));
    selectedPaths=new Set(wavs);selectionAnchor=wavs[0];prepareTrack(wavs[0]);updateSelectionUI();return wavs;
  });
  await page.locator('#playerCoverButton').click();
  await page.locator('#viewerPlayTrack').click();
  await page.locator('#collectionDialogAccept').click();
  await page.waitForFunction(paths=>JSON.stringify(playerQueue)===JSON.stringify(paths)&&playerPath===paths[0]&&!playerAudio.paused&&Number.isFinite(playerAudio.duration),selectedWavs);
  await page.evaluate(()=>{playerAudio.currentTime=Math.max(0,playerAudio.duration-.15)});
  await page.waitForFunction(paths=>playerPath===paths[1]&&!playerAudio.paused&&Number.isFinite(playerAudio.duration),selectedWavs);
  await page.evaluate(()=>{playerAudio.currentTime=Math.max(0,playerAudio.duration-.15)});
  await page.waitForFunction(paths=>playerPath===paths[1]&&playerAudio.ended&&playerAudio.paused&&JSON.stringify(playerQueue)===JSON.stringify(paths),selectedWavs);
  await page.locator('#closeViewer').click();
  await page.evaluate(()=>clearSelection());
  console.log('PASS: selected-only preview playback ends after exactly two tracks');
  const preservedQueue=await page.evaluate(()=>{
    const all=filtered.filter(x=>playerEligible(x.path)).map(x=>x.path);
    setPlayerQueue(all);selectedPaths=new Set(all.slice(0,1));prepareTrack(all[0]);updateSelectionUI();return all;
  });
  await page.locator('#playerPlay').click();
  await page.locator('#collectionDialogCancel').click();
  await page.waitForFunction(paths=>JSON.stringify(playerQueue)===JSON.stringify(paths)&&playerOncePaths?.length===1&&!playerAudio.paused&&Number.isFinite(playerAudio.duration),preservedQueue);
  await page.evaluate(()=>{playerAudio.currentTime=Math.max(0,playerAudio.duration-.15)});
  await page.waitForFunction(paths=>!playerOncePaths&&!playerPath&&playerAudio.paused&&JSON.stringify(playerQueue)===JSON.stringify(paths),preservedQueue);
  await page.evaluate(()=>clearSelection());
  console.log('PASS: Play once stops without replacing existing queue');

  await page.locator('#playerQueueButton').click();
  // The hover membership badge must fit inside the Queue button, not shift the transport.
  await page.locator('#queueClose').click();
  await page.evaluate(()=>{
    const item=filtered.find(x=>playerEligible(x.path)&&x.path!==playerPath);
    if(!item)throw Error('Missing demo track for queue badge');
    selectedPaths.clear();selectedPaths.add(item.path);updateSelectionUI();
  });
  const queueBeforeHover=await page.locator('#playerQueueButton').boundingBox();
  await page.locator('#playerQueueButton').hover();
  await page.locator('#bulkQueue').waitFor({state:'visible'});
  const badge=await page.locator('#bulkQueue').boundingBox(),queueAfterHover=await page.locator('#playerQueueButton').boundingBox();
  if(!badge||!queueBeforeHover||!queueAfterHover||badge.x<queueAfterHover.x+queueAfterHover.width/2||badge.x+badge.width>queueAfterHover.x+queueAfterHover.width||badge.y<queueAfterHover.y||badge.y+badge.height>queueAfterHover.y+queueAfterHover.height)throw Error('Queue membership badge is not inside the right edge');
  if(JSON.stringify(queueBeforeHover)!==JSON.stringify(queueAfterHover))throw Error('Queue button moved on hover');
  const beforeMembership=await page.evaluate(()=>playerQueue.slice());
  const membershipMode=await page.locator('#bulkQueue').textContent();
  await page.locator('#bulkQueue').click();
  const afterMembership=await page.evaluate(()=>playerQueue.slice());
  if(membershipMode==='−'?afterMembership.length!==beforeMembership.length-1:afterMembership.length!==beforeMembership.length+1)throw Error('Queue membership click did not change membership');
  if(await page.locator('#musicQueueDialog').isVisible())throw Error('Membership action opened queue dialog');
  await page.locator('#playerQueueButton').click();
  await page.locator('#queueClear').click();
  await page.waitForFunction(()=>!playerQueue.length&&!selectedPaths.size&&!playerPath&&playerAudio.paused);
  await page.locator('#queueAddResults').click();
  await page.waitForFunction(()=>playerQueue.length===9);
  await page.locator('#queueAppendResults').click();
  await page.waitForFunction(()=>{const feedback=document.getElementById('queueFeedback'),f=feedback.getBoundingClientRect(),next=document.getElementById('queuePageNext').getBoundingClientRect();return feedback.textContent.includes('added to queue')&&f.left>=next.right&&Math.abs((f.top+f.bottom)/2-(next.top+next.bottom)/2)<3});
  await page.waitForFunction(()=>playerQueue.length===9);
  await page.locator('#queueCollectionNew').click();
  await page.locator('#collectionDialogInput').fill('CI demo collection');
  await page.locator('#collectionDialogAccept').click();
  await page.waitForFunction(() => albums.get('CI demo collection')?.size === 9&&JSON.stringify([...albums.get('CI demo collection')])===JSON.stringify(playerQueue));
  await page.waitForFunction(() => !pendingSaves);
  await page.locator('#queueCollectionQuery').fill('CI demo');
  await page.waitForFunction(()=>document.getElementById('playlistSelect').options.length===2&&document.getElementById('playlistSelect').options[1].value==='CI demo collection');
  await page.locator('#playlistSelect').selectOption('CI demo collection');
  await page.locator('#playlistLoad').click();
  const queueBounds=await page.locator('#musicQueueDialog').boundingBox();
  const queueListHeight=(await page.locator('#queueList').boundingBox()).height;
  await page.locator('#queueList .queue-row').first().locator('.queue-track-label').click();
  if(!await page.locator('#queueList .queue-row').first().evaluate(row=>row.classList.contains('is-selected')))throw Error('Queue row not selected');
  await page.locator('#queueHistoryToggle').click();
  await page.waitForFunction(()=>!document.getElementById('historyList').hidden&&document.getElementById('queueList').hidden&&!document.getElementById('historyClear').hidden);
  if(await page.locator('#queueHistoryToggle').textContent()!=='Queue')throw Error('Missing return to queue');
  if(await page.locator('#queueClear').isVisible()||await page.locator('#queueAddResults').isVisible())throw Error('Queue actions visible in History');
  if(await page.locator('#queueCollectionPanel').isVisible())throw Error('Collection controls are visible in History');
  const historyBounds=await page.locator('#musicQueueDialog').boundingBox();
  if(queueBounds.width!==historyBounds.width||queueBounds.height!==historyBounds.height)throw Error('History changed dialog dimensions');
  if((await page.locator('#historyList').boundingBox()).height<=queueListHeight)throw Error('History did not reclaim collection panel space');
  await page.locator('#historyList .queue-row').first().locator('.queue-track-label').click();
  if(!await page.locator('#historyList .queue-row').first().evaluate(row=>row.classList.contains('is-selected')))throw Error('History row not selected');
  if(await page.locator('#historyList .queue-row').count()<1)throw Error('Listening history not displayed');
  await page.locator('#queueHistoryToggle').click();
  await page.waitForFunction(()=>!document.getElementById('queueList').hidden&&document.getElementById('historyList').hidden&&document.getElementById('historyClear').hidden);
  console.log('PASS: history replaces queue list in the same dialog');
  await page.locator('#queueClose').click();
  await page.evaluate(async () => {await flushMusicCache();await saveQueue;});
  // Re-open the same mock library: metadata cache and collection order persist.
  await page.evaluate(async () => activateLibrary(window.__demoRoot));
  await page.waitForFunction(() => !musicIndexing && musicCacheHits === 9 && albums.get('CI demo collection')?.size === 9, null,{timeout:30000});
  await page.waitForFunction(() => document.querySelectorAll('#gallery .photo').length === 9);
  await page.locator('#musicSort').selectOption('title');
  await page.waitForFunction(() => filtered[0]?.music?.title === 'Blue Horizon');
  await page.locator('#musicSort').selectOption('auto');
  // Desktop filters must fit one compact row, without a visible diagnostic header.
  await page.waitForFunction(()=>{
    const panel=document.getElementById('musicFilters');
    const controls=[...panel.querySelectorAll('select,button')];
    return controls.length===9&&controls.every(e=>Math.abs(e.getBoundingClientRect().top-controls[0].getBoundingClientRect().top)<2)
      &&document.getElementById('musicIndexProgress').hidden&&document.getElementById('musicFilterSummary').hidden;
  });
  if(!decodeURIComponent(await page.locator('link[rel="icon"]').getAttribute('href')).includes('M38 13v25.5'))throw Error('Music favicon missing');
  console.log('PASS: compact one-row metadata filters and music favicon');
  // Collection actions must fit in the narrow desktop sidebar, not just the viewport.
  await page.waitForFunction(()=>{
    const aside=document.querySelector('.aside-content').getBoundingClientRect();
    const remove=document.getElementById('removeCollection').getBoundingClientRect();
    const tab=document.getElementById('showAlbums').getBoundingClientRect();
     const tags=document.getElementById('showTags').getBoundingClientRect();
     const add=document.getElementById('newCollection').getBoundingClientRect();
     return remove.right<=aside.right+1 && remove.width>0 && [tags,add,remove].every(r=>Math.abs(r.top-tab.top)<2)&&document.getElementById('tagEmpty').hidden;
  });
  await page.locator('#showTags').click();
  await page.waitForFunction(()=>!document.getElementById('tagEmpty').hidden&&document.getElementById('albumList').hidden);
  await page.locator('#showAlbums').click();
  await page.waitForFunction(()=>document.getElementById('tagEmpty').hidden&&!document.getElementById('albumList').hidden);
  console.log('PASS: collection actions fit sidebar and empty tags only appear in Tags tab');

  console.log('PASS: library scan, metadata filters, real WAV playback, persistent playback, queue, collection save, cache reuse, sorting');
  const dest = join(rootPath, 'docs', 'screenshots');
  await mkdir(dest, { recursive: true });
  async function snap(name) {
    await page.screenshot({ path: join(dest, name + '.png'), animations: 'disabled', fullPage: false });
    console.log('Captured', name + '.png');
  }
  // Keep exactly three screenshots in README and distribution ZIPs.
  // Remove obsolete captures from previous gallery versions.
  const desired = new Set(['classic-dark.png', 'classic-light.png', 'detailed-dark.png', 'mobile-light.png']);
  for (const filename of await readdir(dest)) {
    if (filename.toLowerCase().endsWith('.png') && !desired.has(filename))
      await unlink(join(dest, filename));
  }

  // Real app screenshots at one consistent viewport with the same demo media.
  await page.evaluate(() => window.scrollTo(0, 0));
  await snap('classic-dark');

  // Capture the real Detailed view, then return to Classic for Light mode.
  await page.locator('#layoutToggle').click();
  await page.waitForFunction(() =>
    document.getElementById('layoutToggle')?.getAttribute('aria-pressed') === 'true'
  );
  await page.waitForTimeout(450);
  await snap('detailed-dark');
  // Both view modes retain the same label, with pressed state conveying the mode.
  if(!(await page.locator('#layoutToggle').textContent()).includes('Detailed View'))throw Error('Detailed view label changed');
  await page.setViewportSize({width:1280,height:720});
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  await page.waitForFunction(()=>{
    const header=document.querySelector('.top').getBoundingClientRect();
    const filters=document.getElementById('musicFilters').getBoundingClientRect();
    return window.scrollY>0 && Math.abs(filters.top-header.bottom)<3;
  });
  await page.locator('#themeSelect').selectOption('light');
  await page.mouse.move(0,0);
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#gallery .photo')).backgroundColor==='rgb(255, 255, 255)');
  await page.locator('#themeSelect').selectOption('dark');
  await page.setViewportSize({width:2048,height:1080});
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.locator('#layoutToggle').click();
  await page.waitForFunction(() =>
    document.getElementById('layoutToggle')?.getAttribute('aria-pressed') === 'false'
  );

  await page.locator('#themeSelect').selectOption('light');
  await page.waitForTimeout(450);
  await snap('classic-light');
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>document.documentElement.scrollWidth<=window.innerWidth+2);
  await snap('mobile-light');
  // Verify a real browser reset after screenshots (the demo filesystem is mocked).
  await page.setViewportSize({width:2048,height:1080});
  await page.evaluate(async()=>{
    await saveQueue.catch(()=>{});
    await uiPrefsOp('readwrite',store=>store.put({id:'layout',value:'detailed'}));
    await prefsOp('readwrite',store=>store.put({id:'stale',name:'Ghost',lastUsed:42,handle:{kind:'directory'}}));
    for(const key of [THEME_KEY,LEGACY_LIBRARY_NAME_KEY,FOLDER_LOCK_KEY,COLLECTION_OPERATOR_KEY,MUSIC_SORT_KEY,playerVolumeKey])
      localStorage.setItem(key,'reset-test');
    localStorage.setItem('unrelated-app-test','keep');
  });
  await page.waitForFunction(()=>!librarySwitching&&!scanInProgress&&!thumbResetting&&!deletingMedia&&!pendingSaves);
  await page.locator('#clearCache').click();
  await page.locator('#collectionDialogCancel').click();
  if(await page.evaluate(()=>localStorage.getItem(MUSIC_SORT_KEY))!=='reset-test')throw Error('Cancelled reset modified preferences');
  await page.locator('#clearCache').click();
  await Promise.all([
    page.waitForNavigation({waitUntil:'domcontentloaded'}),
    page.locator('#collectionDialogAccept').click()
  ]);
  const reset=await page.evaluate(async()=>({
    keys:[THEME_KEY,LEGACY_LIBRARY_NAME_KEY,FOLDER_LOCK_KEY,COLLECTION_OPERATOR_KEY,MUSIC_SORT_KEY,playerVolumeKey].map(k=>localStorage.getItem(k)),
    unrelated:localStorage.getItem('unrelated-app-test'),
    records:await prefsOp('readonly',store=>store.getAll()),
    layout:await uiPrefsOp('readonly',store=>store.get('layout'))
  }));
  if(reset.keys.some(v=>v!==null)||reset.unrelated!=='keep'||reset.records.length||reset.layout!==undefined)
    throw Error('Browser reset did not clear the application storage correctly');
  if(!await page.locator('#recentFolders').isHidden())throw Error('Forgotten library selector is still visible');
  console.log('PASS: clear cache resets actual browser storage including sorting and volume, without touching unrelated data');
  if (errors.length) throw new Error('Browser JavaScript errors: '+errors.join('; '));
  await context.close();
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
