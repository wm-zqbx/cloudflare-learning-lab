const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/health') {
      if (request.method !== 'GET') return json({ error: '请使用 GET' }, 405);
      return json({ ok: true, runtime: 'Cloudflare Workers', time: new Date().toISOString(), storage: env.DB ? 'D1 已绑定；D1 课读取云端样例，原任务演示仍保存在浏览器' : '未接入数据库；演示数据只在浏览器中保存' });
    }
    if (url.pathname === '/api/d1/task') {
      if (request.method !== 'GET') return json({ error: '此样例只接受 GET 读取' }, 405);
      if (!env.DB) return json({ error: 'D1 数据库尚未配置' }, 503);
      try {
        // Return only the public lesson record, not arbitrary records in this database.
        const task = await env.DB.prepare('SELECT id, title FROM tasks WHERE id = ?1 LIMIT 1').bind('1').first();
        if (!task) return json({ error: '云端样例尚未写入' }, 404);
        return json({ source: 'D1', task });
      } catch {
        console.error(JSON.stringify({ event: 'd1_read_failed' }));
        return json({ error: '暂时无法读取数据库，请稍后重试' }, 500);
      }
    }
    if (url.pathname === '/api/kv/announcement') {
      if (request.method !== 'GET') return json({ error: '此样例只接受 GET 读取' }, 405);
      if (!env.CONFIG) return json({ error: 'KV 尚未配置' }, 503);
      try {
        // Read only this public configuration key, never a key supplied by a visitor.
        const key = 'site-announcement';
        const value = await env.CONFIG.get(key);
        if (value === null) return json({ error: '云端公告尚未写入' }, 404);
        return json({ source: 'KV', key, value });
      } catch {
        console.error(JSON.stringify({ event: 'kv_read_failed' }));
        return json({ error: '暂时无法读取公告，请稍后重试' }, 500);
      }
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
      return json({ title: body.title.trim(), processedBy: 'Worker fetch handler', saved: false, explanation: '这是回显接口，不写入数据库；D1 课展示云端存储。' });
    }
    if (url.pathname.startsWith('/api/')) return json({ error: '接口不存在' }, 404);
    return env.ASSETS.fetch(request);
  }
};
