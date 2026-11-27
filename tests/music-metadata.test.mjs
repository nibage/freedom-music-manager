// Run: python3 scripts/generate_music_demo.py demo-music
// Then: node tests/music-metadata.test.mjs demo-music
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(join(repo, '__music/index.html'), 'utf8');
const code = html.match(/\/\* BEGIN AUDIO METADATA \*\/([\s\S]*?)\/\* END AUDIO METADATA \*\//);
assert.ok(code, 'Metadata parser is embedded in the HTML');
const parse = new Function(code[1] + '\nreturn readAudioMetadata;')();
const dir = resolve(process.argv[2] || join(repo, 'demo-music'));
const manifest = JSON.parse(await readFile(join(dir, 'expected-metadata.json'), 'utf8'));
const keys = { title:'title', artist:'artist', album:'album', genre:'genre', date:'year', track:'track' };
for (const entry of manifest) {
  const data = await readFile(join(dir, entry.path));
  const file = new Blob([data]);
  Object.defineProperty(file, 'name', { value:entry.path });
  const actual = await parse(file, true);
  for (const [key, expected] of Object.entries(entry.tags)) {
    assert.equal(actual[keys[key]], String(expected), entry.path + ': ' + key);
  }
  if (!Object.keys(entry.tags).length) {
    for (const key of Object.values(keys)) assert.equal(actual[key], undefined, entry.path + ': untagged field ' + key);
  }
  assert.ok(Number.isFinite(actual.duration) && Math.abs(actual.duration - entry.duration_seconds) < 0.4,
    entry.path + ': expected duration ' + entry.duration_seconds + ', got ' + actual.duration);
  console.log('PASS', entry.path);
}
// Malformed audio must produce a safe empty result.
const invalid = new Blob([Buffer.from('ID3\x04\x00\x00\x7f\x7f\x7f\x7f')]);
assert.deepEqual(await parse(invalid), {});
// Check embedded artwork extraction using a tiny original ID3 APIC fixture.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGJcAAAAASUVORK5CYII=', 'base64');
const apic = Buffer.concat([Buffer.from([0]), Buffer.from('image/png\0'), Buffer.from([3,0]), png]);
const header = Buffer.alloc(10); header.write('APIC'); header.writeUInt32BE(apic.length,4);
const body = Buffer.concat([header,apic]);
const tag = Buffer.from([73,68,51,3,0,0,0,0,(body.length>>7)&127,body.length&127]);
const art = await parse(new Blob([tag,body]),true);
assert.equal(art.cover?.type,'image/png');
assert.deepEqual(Buffer.from(await art.cover.arrayBuffer()),png);
console.log('PASS malformed input and embedded artwork');
console.log('All '+manifest.length+' demo tracks passed.');
