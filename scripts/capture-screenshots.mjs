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
  await card.locator('.video-tile').click();
  await page.waitForFunction(() => playerPath?.includes('First Light') && !playerAudio.paused && playerAudio.currentTime > 0, null,{timeout:15000});
  await page.locator('#musicFilterReset').click();
  await page.locator('#musicGenre').selectOption('v:electronic');
  await page.waitForFunction(() => filtered.length === 3 && playerPath?.includes('First Light') && !playerAudio.paused);
  await page.locator('#playerPlay').click();
  await page.waitForFunction(() => playerAudio.paused);
  await page.locator('#musicFilterReset').click();
  await page.locator('#playerQueueButton').click();
  await page.locator('#queueAddResults').click();
  await page.locator('#playlistName').fill('CI demo collection');
  await page.locator('#playlistSave').click();
  await page.waitForFunction(() => albums.get('CI demo collection')?.size === 9);
  await page.waitForFunction(() => !pendingSaves);
  await page.locator('#queueClose').click();
  await page.evaluate(async () => {await flushMusicCache();await saveQueue;});
  // Re-open the same mock library: metadata cache and collection order persist.
  await page.evaluate(async () => activateLibrary(window.__demoRoot));
  await page.waitForFunction(() => !musicIndexing && musicCacheHits === 9 && albums.get('CI demo collection')?.size === 9, null,{timeout:30000});
  await page.waitForFunction(() => document.querySelectorAll('#gallery .photo').length === 9);
  await page.locator('#musicSort').selectOption('title');
  await page.waitForFunction(() => filtered[0]?.music?.title === 'Blue Horizon');
  await page.locator('#musicSort').selectOption('auto');
  // Collection actions must fit in the narrow desktop sidebar, not just the viewport.
  await page.waitForFunction(()=>{
    const aside=document.querySelector('.aside-content').getBoundingClientRect();
    const remove=document.getElementById('removeCollection').getBoundingClientRect();
    return remove.right<=aside.right+1 && remove.width>0 && document.getElementById('tagEmpty').hidden;
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
  if (errors.length) throw new Error('Browser JavaScript errors: '+errors.join('; '));
  await context.close();
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
