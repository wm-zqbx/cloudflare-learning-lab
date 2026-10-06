import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleTurnstile } from '../src/turnstile.js';

const env = {TURNSTILE_SECRET:'test-secret-not-a-real-key',TURNSTILE_HOSTNAMES:'lab.aecai.us.ci'};
const request = (body={title:'测试留言',token:'test-token'}) => new Request('https://lab.aecai.us.ci/api/turnstile/submit', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const verification = result => async () => Response.json(result);
test('missing proof is rejected before any external verification call', async()=>{
  let calls=0;
  const result=await handleTurnstile(request({title:'测试留言'}),env,async()=>{calls++;throw new Error('must not call');});
  assert.equal(result.status,403);
  assert.equal(calls,0);
});
test('the backend sends only proof and its secret to Siteverify, then processes without saving',async()=>{
  const response=await handleTurnstile(request(),env,async(url,options)=>{
    assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');
    assert.equal(options.body.get('response'),'test-token');
    assert.equal(options.body.get('secret'),env.TURNSTILE_SECRET);
    assert.equal(options.body.has('title'),false);
    return Response.json({success:true,hostname:'lab.aecai.us.ci',action:'lesson_submit'});
  });
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  const body=await response.json();
  assert.equal(body.verified,true);
  assert.equal(body.saved,false);
  assert.equal(body.title,'测试留言');
});
test('success is insufficient when the proof belongs to another website or action',async()=>{
  for (const result of [
    {success:true,hostname:'another.example',action:'lesson_submit'},
    {success:true,hostname:'lab.aecai.us.ci',action:'signup'},
    {success:'true',hostname:'lab.aecai.us.ci',action:'lesson_submit'}
  ]) assert.equal((await handleTurnstile(request(),env,verification(result))).status,403);
});
test('failed or expired proofs never reach the processing stage',async()=>{
  for (const result of [{success:false},{success:false,'error-codes':['timeout-or-duplicate']}]) {
    const response=await handleTurnstile(request(),env,verification(result));
    assert.equal(response.status,403);
    assert.equal((await response.json()).stage,'verification');
  }
});
test('missing server configuration and verification service failure fail closed',async()=>{
  assert.equal((await handleTurnstile(request(),{},verification({success:true}))).status,503);
  assert.equal((await handleTurnstile(request(),env,async()=>new Response('unavailable',{status:503}))).status,503);
});
test('invalid and oversized submissions are bounded before verification',async()=>{
  assert.equal((await handleTurnstile(request({title:'',token:'test-token'}),env)).status,400);
  assert.equal((await handleTurnstile(request({title:'x'.repeat(5000),token:'test-token'}),env)).status,413);
});
