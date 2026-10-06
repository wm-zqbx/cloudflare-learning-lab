(() => {
  'use strict';
  const button = document.querySelector('#kv-read');
  const value = document.querySelector('#kv-value');
  const status = document.querySelector('#kv-status');
  async function read() {
    if (location.protocol === 'file:') {
      value.textContent = '请用线上网址或本地开发服务器访问。';
      status.textContent = '当前没有连接 KV。';
      return;
    }
    button.disabled = true;
    status.textContent = '正在通过 Worker 读取 KV…';
    try {
      const response = await fetch('/api/kv/announcement', { cache:'no-store', signal:AbortSignal.timeout(15000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '读取失败');
      if (data.source !== 'KV' || data.key !== 'site-announcement' || typeof data.value !== 'string') throw new Error('接口未返回预期的公告');
      value.textContent = data.value;
      status.textContent = '已从真实 KV 读取公告。';
    } catch (error) {
      value.textContent = '暂时无法展示公告。';
      status.textContent = '读取失败：' + error.message;
    } finally {
      button.disabled = false;
    }
  }
  button.addEventListener('click', () => { void read(); });
  void read();
})();
