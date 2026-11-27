import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('../__music/index.html',import.meta.url),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const source=js.slice(js.indexOf('function queueDragRange('),js.indexOf('function initHistorySelection(){'));
const range=new Function(source+';return queueDragRange')();
const rows=[{entry:'a',top:0,bottom:40},{entry:'b',top:40,bottom:80},{entry:'c',top:80,bottom:120}];
test('drag can begin or end in blank space, in either direction',()=>{
  assert.deepEqual(range(rows,200,20),['a','b','c']);
  assert.deepEqual(range(rows,20,200),['a','b','c']);
  assert.deepEqual(range(rows,200,100),['c']);
  assert.deepEqual(range(rows,200,150),[]);
  assert.deepEqual(range(rows,-20,60),['a','b']);
});
test('range works in scroll content coordinates and excludes un-crossed rows',()=>{
  assert.deepEqual(range(rows,50,100),['b','c']);
  assert.deepEqual(range(rows,50,20),['a','b']);
  assert.deepEqual(range([],20,300),[]);
});
test('blank clicks clear the active selection without intercepting actions',()=>{
  const s=js.slice(js.indexOf('function initHistorySelection(){'),js.indexOf('function useHistorySelection('));
  assert.match(s,/dialog\.addEventListener\('click'/);
  assert.match(s,/if\(e\.target\.closest\('\.queue-row,button,input,select,textarea,a,label,\[contenteditable=true\]'\)\)return/);
  assert.match(s,/if\(currentSelection\(\)\.size\)setSelection\(new Set\(\),null\)/);
  assert.match(s,/startContentY:contentY\(e\.clientY\)/);
  assert.doesNotMatch(s,/if\(!entry\)return/);
});
