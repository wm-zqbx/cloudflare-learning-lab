(() => {
  'use strict';
  const form = document.querySelector('#worker-form');
  const select = document.querySelector('#worker-case');
  const title = document.querySelector('#worker-title');
  const status = document.querySelector('#worker-status');
  const requestView = document.querySelector('#worker-request');
  const responseView = document.querySelector('#worker-response');
  const table = document.querySelector('#worker-results');
  const buttons = [document.querySelector('#worker-send'), document.querySelector('#worker-all')];
  const cases = [
    { id:'valid', name:'正常标题 → 200', expected:200, note:'正常请求经过校验，返回去掉首尾空格的标题；saved 仍为 false。', make:value => ({ path:'/api/echo', method:'POST', type:'application/json', body:JSON.stringify({title:value}) }) },
    { id:'empty', name:'空白标题 → 400', expected:400, note:'绕过前端输入限制，直接提交空白字符串。后端应拒绝。', make:() => ({ path:'/api/echo', method:'POST', type:'application/json', body:JSON.stringify({title:'   '}) }) },
    { id:'json', name:'损坏的 JSON → 400', expected:400, note:'Content-Type 正确，但请求体不是有效 JSON。', make:() => ({ path:'/api/echo', method:'POST', type:'application/json', body:'{' }) },
    { id:'method', name:'用 GET 提交 → 405', expected:405, note:'地址正确，方法不正确。GET 通常用来读取，本站提交接口只接受 POST。', make:() => ({ path:'/api/echo', method:'GET' }) },
    { id:'type', name:'用 text/plain 提交 → 415', expected:415, note:'JSON 文本使用错误的 Content-Type，后端拒绝不支持的格式。', make:() => ({ path:'/api/echo', method:'POST', type:'text/plain', body:JSON.stringify({title:'准备项目资料'}) }) },
    { id:'size', name:'超过 4 KiB → 413', expected:413, note:'此请求约 5 KiB，超过应用设定的 4 KiB 限制；不是压力测试。', make:() => ({ path:'/api/echo', method:'POST', type:'application/json', body:JSON.stringify({title:'x'.repeat(5000)}) }) },
    { id:'missing', name:'不存在的 API → 404', expected:404, note:'请求不存在的 API。应该返回 JSON 错误，而不是把网页 HTML 当作接口结果。', make:() => ({ path:'/api/not-a-real-endpoint', method:'GET' }) }
  ];
  for (const item of cases) {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.name;
    select.append(option);
  }
  const updateNote = () => {
    const item = cases.find(value => value.id === select.value);
    document.querySelector('#worker-case-note').textContent = item.note;
    title.disabled = item.id !== 'valid';
  };
  select.addEventListener('change', updateNote);
  updateNote();
  function lock(value) {
    for (const button of buttons) button.disabled = value;
    select.disabled = value;
  }
  function addCell(row, text, tag = 'td') {
    const cell = document.createElement(tag);
    cell.textContent = text;
    if (tag === 'th') cell.scope = 'row';
    row.append(cell);
  }
  async function send(item, value) {
    const spec = item.make(value);
    const bytes = new TextEncoder().encode(spec.body || '').byteLength;
    const preview = spec.body ? spec.body.slice(0, 600) + (spec.body.length > 600 ? '\n…（仅截短展示，发送完整请求体）' : '') : '（无请求体）';
    requestView.textContent = spec.method + ' ' + spec.path + '\nContent-Type: ' + (spec.type || '未设置') + '\n请求体：' + bytes + ' bytes\n\n' + preview;
    const response = await fetch(spec.path, {
      method: spec.method,
      headers: spec.type ? { 'Content-Type':spec.type } : undefined,
      body: spec.body,
      cache: 'no-store',
      signal: AbortSignal.timeout(15000)
    });
    const type = response.headers.get('content-type') || '';
    const policy = response.headers.get('cache-control') || '未返回';
    const raw = await response.text();
    let body;
    try { body = JSON.parse(raw); } catch {}
    responseView.textContent = 'HTTP ' + response.status + '\nContent-Type: ' + type + '\nCache-Control: ' + policy + '\n\n' + (body ? JSON.stringify(body, null, 2) : raw.slice(0, 1200));
    const expectedBody = item.id === 'valid' ? body?.title === value.trim() && body?.saved === false : typeof body?.error === 'string';
    const passed = response.status === item.expected && type.includes('application/json') && policy === 'no-store' && expectedBody;
    return { passed, status:response.status, summary:body?.error || (body?.title ? '标题：' + body.title + '；saved：' + body.saved : '非预期响应') };
  }
  async function run(all) {
    if (location.protocol === 'file:') {
      status.textContent = '请通过线上网址或 npm run dev 访问，直接打开 HTML 无法运行后端实验。';
      return;
    }
    lock(true);
    table.replaceChildren();
    responseView.textContent = '等待响应…';
    const selected = all ? cases : [cases.find(item => item.id === select.value)];
    let passed = 0;
    status.textContent = '正在发送真实请求…';
    try {
      for (const item of selected) {
        const value = all ? '  整理项目资料  ' : title.value;
        const row = document.createElement('tr');
        addCell(row, item.name, 'th');
        addCell(row, String(item.expected));
        try {
          const result = await send(item, value);
          if (result.passed) passed++;
          addCell(row, String(result.status));
          addCell(row, result.summary);
          addCell(row, result.passed ? '通过' : '与预期不同');
        } catch (error) {
          addCell(row, '请求失败');
          addCell(row, error.message);
          addCell(row, '未通过');
          responseView.textContent = '请求失败：' + error.message;
        }
        table.append(row);
      }
      status.textContent = passed + ' / ' + selected.length + ' 项符合预期。拒绝错误输入也属于通过；这不是保存到数据库。' + (!all && select.value === 'valid' && !title.value.trim() ? '当前标题为空白，后端拒绝是合理结果。' : '');
    } finally {
      lock(false);
    }
  }
  form.addEventListener('submit', event => { event.preventDefault(); void run(false); });
  document.querySelector('#worker-all').addEventListener('click', () => { void run(true); });
})();
