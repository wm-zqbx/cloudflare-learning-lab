const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/health') {
      if (request.method !== 'GET') return json({ error: '请使用 GET' }, 405);
      return json({ ok: true, runtime: 'Cloudflare Workers', time: new Date().toISOString(), storage: '未接入数据库；演示数据只在浏览器中保存' });
    }
    if (url.pathname === '/api/echo') {
      if (request.method !== 'POST') return json({ error: '请使用 POST' }, 405);
      if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: '请提交 application/json' }, 415);
      // Read a bounded stream instead of accepting an unbounded body.
      const reader = request.body?.getReader();
      if (!reader) return json({ error: '缺少请求内容' }, 400);
      let size = 0;
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 4096) { await reader.cancel(); return json({ error: '请求不能超过 4 KiB' }, 413); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      let body;
      try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { return json({ error: 'JSON 格式无效' }, 400); }
      if (!body || typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200) return json({ error: 'title 必须是 1–200 字符的文本' }, 400);
      return json({ title: body.title.trim(), processedBy: 'Worker fetch handler', saved: false, explanation: '接口已处理请求。持久化需要接入 D1。' });
    }
    if (url.pathname.startsWith('/api/')) return json({ error: '接口不存在' }, 404);
    return env.ASSETS.fetch(request);
  }
};
