(() => {
  'use strict';
  const button = document.querySelector('#cache-run');
  if (!button) return;
  const output = document.querySelector('#cache-results');
  const status = document.querySelector('#cache-status');
  const targets = [
    ['普通样式文件', '/style.css'],
    ['带版本的公开介绍', '/cache-demo/project.v1.json'],
    ['实时 Worker 接口', '/api/health']
  ];
  function cell(row, value, tag = 'td', detail) {
    const element = document.createElement(tag);
    element.textContent = value;
    if (tag === 'th') element.scope = 'row';
    if (detail) {
      const small = document.createElement('small');
      small.textContent = detail;
      element.append(small);
    }
    row.append(element);
  }
  button.addEventListener('click', async () => {
    if (location.protocol === 'file:') {
      status.textContent = '请通过线上学习站或 npm run dev 访问；直接打开文件无法观察网络缓存。';
      return;
    }
    button.disabled = true;
    output.replaceChildren();
    status.textContent = '正在读取 6 次实际网络响应…';
    let failures = 0;
    try {
      for (const [name, path] of targets) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          const row = document.createElement('tr');
          cell(row, name, 'th', path + ' · 第 ' + attempt + ' 次');
          try {
            // Bypass browser storage to observe fresh network headers.
            // Keep identical URLs so we do not change the cache key.
            const response = await fetch(path, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
            const body = await response.text();
            let content = 'CSS 静态资源';
            if (path.endsWith('.json') || path.startsWith('/api/')) {
              const data = JSON.parse(body);
              content = data.version ? '版本：' + data.version : '生成时间：' + (data.time || '未提供');
            }
            const edge = response.headers.get('cf-cache-status');
            cell(row, String(response.status));
            cell(row, edge || '未返回', 'td', edge === 'HIT' ? '报告边缘命中' : edge === 'MISS' ? '报告未命中' : '按实际头部判断');
            cell(row, response.headers.get('cache-control') || '未返回');
            cell(row, content, 'td', 'ETag：' + (response.headers.get('etag') || '未返回'));
            if (!response.ok) failures++;
          } catch (error) {
            failures++;
            const errorCell = document.createElement('td');
            errorCell.colSpan = 4;
            errorCell.textContent = '请求失败：' + error.message;
            row.append(errorCell);
          }
          output.append(row);
        }
      }
      status.textContent = failures ? '已完成，有 ' + failures + ' 次请求异常。请检查网络或部署状态。' : '完成：下表来自实际响应。本地开发通常没有 CF-Cache-Status；线上也不保证每次都 HIT。';
    } finally {
      button.disabled = false;
    }
  });
})();
