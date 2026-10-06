const reply = (body, status) => new Response(JSON.stringify(body), {
  status, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
});

export async function handleTurnstile(request, env, verifyFetch = fetch) {
  if (request.method !== 'POST') return reply({error:'请使用 POST 提交。'}, 405);
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return reply({error:'请提交 JSON。'}, 415);
  const reader = request.body?.getReader();
  if (!reader) return reply({error:'缺少提交内容。'}, 400);
  const chunks = [];
  let size = 0;
  while (true) {
    const {done,value} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) { await reader.cancel(); return reply({error:'本课提交不能超过 4 KiB。'}, 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let body;
  try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { return reply({error:'提交内容不是有效 JSON。'}, 400); }
  if (typeof body?.title !== 'string' || !body.title.trim() || body.title.length > 200) return reply({error:'请输入 1–200 字符的教学留言。'}, 400);
  const token = body.token;
  if (typeof token !== 'string' || !token.trim() || token.length > 2048) return reply({ok:false,error:'没有有效的验证凭证，Worker 拒绝本次提交。',stage:'verification',reason:'missing_token'}, 403);
  const hosts = new Set((env.TURNSTILE_HOSTNAMES ?? '').split(',').map(host=>host.trim()).filter(Boolean));
  if (!env.TURNSTILE_SECRET || !hosts.size) return reply({error:'服务端验证尚未配置。'}, 503);
  let validation;
  try {
    const result = await verifyFetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:token}), signal:AbortSignal.timeout(10000)
    });
    if (!result.ok) throw new Error('verification unavailable');
    validation = await result.json();
  } catch {
    console.error(JSON.stringify({event:'turnstile_verification_unavailable'}));
    return reply({ok:false,error:'暂时无法核验凭证，Worker 未接受提交。请稍后重试。',stage:'verification'}, 503);
  }
  if (validation?.success !== true) {
    const duplicate = Array.isArray(validation?.['error-codes']) && validation['error-codes'].includes('timeout-or-duplicate');
    return reply({ok:false,error:duplicate?'凭证已过期或已使用，请重新验证。':'Cloudflare 未认可这张凭证，Worker 拒绝提交。',stage:'verification',reason:duplicate?'expired_or_used':'invalid_token'}, 403);
  }
  if (validation.action !== 'lesson_submit' || !hosts.has(validation.hostname)) return reply({ok:false,error:'凭证不属于本站的这个提交入口。',stage:'verification',reason:'wrong_context'}, 403);
  // This lesson handles the input only after verification; it deliberately does not persist it.
  return reply({ok:true,verified:true,title:body.title.trim(),processedBy:'Worker',saved:false,explanation:'服务端核验通过，Worker 已处理输入；本课没有保存留言。'}, 200);
}
