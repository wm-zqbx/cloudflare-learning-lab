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
