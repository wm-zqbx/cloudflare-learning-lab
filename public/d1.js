(() => {
  'use strict';
  const button = document.querySelector('#d1-read');
  const table = document.querySelector('#d1-task');
  const status = document.querySelector('#d1-status');
  async function read() {
    if (location.protocol === 'file:') {
      status.textContent = '请用线上网址访问真实 D1。';
      return;
    }
    button.disabled = true;
    status.textContent = '正在通过 Worker 读取 D1…';
    try {
      const response = await fetch('/api/d1/task', { cache:'no-store', signal:AbortSignal.timeout(15000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '读取失败');
      if (data.source !== 'D1' || typeof data.task?.title !== 'string') throw new Error('接口未返回预期的云端记录');
      const row = document.createElement('tr');
      for (const value of [data.task.id, data.task.title]) {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.append(cell);
      }
      table.replaceChildren(row);
      status.textContent = '已从 D1 读取真实记录。';
    } catch (error) {
      table.replaceChildren();
      status.textContent = '读取失败：' + error.message;
    } finally {
      button.disabled = false;
    }
  }
  button.addEventListener('click', () => { void read(); });
  void read();
})();
