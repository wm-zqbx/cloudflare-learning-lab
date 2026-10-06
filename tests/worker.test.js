import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
const call = (path, init) => worker.fetch(new Request('https://example.com'+path, init), { ASSETS: { fetch: () => new Response('asset') } });
test('health reports that cloud storage is not connected', async () => {
  const response=await call('/api/health'); const body=await response.json();
  assert.equal(response.status,200); assert.equal(body.ok,true); assert.match(body.storage,/未接入/);
});
test('echo processes but never claims to save input', async () => {
  const response=await call('/api/echo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'  项目计划  '})});
  const body=await response.json(); assert.equal(body.title,'项目计划'); assert.equal(body.saved,false); assert.equal(response.status,200);
});
test('rejects malformed and oversized input', async () => {
  assert.equal((await call('/api/echo',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'})).status,400);
  assert.equal((await call('/api/echo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'x'.repeat(5000)})})).status,413);
  assert.equal((await call('/api/echo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:42})})).status,400);
});
test('unknown APIs and methods fail rather than serving a page',async()=>{
  assert.equal((await call('/api/missing')).status,404);
  assert.equal((await call('/api/echo')).status,405);
  assert.equal((await call('/index.html')).status,200);
});
test('D1 lesson reads the bound database record and keeps the response uncached', async () => {
  const record = { id:'1', title:'来自测试数据库的记录' };
  const DB = { prepare:() => ({ bind:() => ({ first:async () => record }) }) };
  const response = await worker.fetch(new Request('https://example.com/api/d1/task'), { DB });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { source:'D1', task:record });
});
test('D1 lesson cannot pretend to read without a database or accept public writes', async () => {
  assert.equal((await call('/api/d1/task')).status, 503);
  assert.equal((await call('/api/d1/task', {method:'POST'})).status, 405);
  const DB = { prepare:() => ({ bind:() => ({ first:async () => null }) }) };
  const response = await worker.fetch(new Request('https://example.com/api/d1/task'), { DB });
  assert.equal(response.status, 404);
});
test('KV lesson reads only the public announcement key from the binding', async () => {
  let requestedKey;
  const CONFIG = { get:async key => { requestedKey = key; return '来自测试 KV 的公告'; } };
  const response = await worker.fetch(new Request('https://example.com/api/kv/announcement?key=private-key'), { CONFIG });
  assert.equal(requestedKey, 'site-announcement');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { source:'KV', key:'site-announcement', value:'来自测试 KV 的公告' });
});
test('KV missing configuration, absent values and public writes do not report success', async () => {
  assert.equal((await call('/api/kv/announcement')).status, 503);
  assert.equal((await call('/api/kv/announcement', {method:'POST'})).status, 405);
  const response = await worker.fetch(new Request('https://example.com/api/kv/announcement'), { CONFIG:{get:async () => null} });
  assert.equal(response.status, 404);
  // An empty string is still a stored value, distinct from a missing key.
  const empty = await worker.fetch(new Request('https://example.com/api/kv/announcement'), { CONFIG:{get:async () => ''} });
  assert.equal(empty.status, 200);
  assert.equal((await empty.json()).value, '');
});
test('R2 lesson streams the fixed public file with download headers', async () => {
  const text = '来自文件存储的实际内容';
  let requestedKey;
  const FILES = { get:async key => {
    requestedKey = key;
    return { body:new Response(text).body, size:new TextEncoder().encode(text).length, httpEtag:'"sample-etag"' };
  } };
  const response = await worker.fetch(new Request('https://example.com/api/r2/sample?key=private.pdf'), { FILES });
  assert.equal(requestedKey, 'samples/brief.txt');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('ETag'), '"sample-etag"');
  assert.match(response.headers.get('Content-Disposition'), /^attachment;/);
  assert.equal(response.headers.get('X-Lab-Source'), 'R2');
  assert.equal(await response.text(), text);
});
test('R2 cannot claim success without a connection, accept writes, or return a deleted file', async () => {
  assert.equal((await call('/api/r2/sample')).status, 503);
  assert.equal((await call('/api/r2/sample', {method:'POST'})).status, 405);
  const response = await worker.fetch(new Request('https://example.com/api/r2/sample'), { FILES:{get:async () => null} });
  assert.equal(response.status, 404);
});
