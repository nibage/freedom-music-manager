import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('../__music/index.html',import.meta.url),'utf8');
test('theme remains accessible without visible Theme label and library chooser is wider',()=>{
  assert.match(html,/<label class="theme-label" for="themeSelect">\s*<select id="themeSelect"[^>]*aria-label="Color theme"/);
  assert.match(html,/\.top-right \.recent-chooser\{\s*flex:0 0 180px;\s*width:180px;\s*min-width:180px;\s*max-width:180px;/);
  assert.match(html,/@media\(max-width:1799px\)\{\s*\.top-right \.recent-chooser\{width:180px/);
});
test('format width is transferred to folders at desktop and smaller widths',()=>{
  assert.match(html,/<select id="kind"[^>]*><option value="">All formats<\/option>/);
  assert.match(html,/#folderControl\{\s*flex:0 0 216px;\s*width:216px;\s*min-width:216px;\s*max-width:216px;/);
  assert.match(html,/#kind\{\s*flex:0 0 120px;\s*width:120px;\s*min-width:120px;\s*max-width:120px;/);
  assert.match(html,/#folderControl\{\s*flex:0 1 254px;/);
  assert.match(html,/#folderControl\{flex:1 1 244px;/);
});
