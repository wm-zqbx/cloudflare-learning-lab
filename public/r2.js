(() => {
  'use strict';
  const button = document.querySelector('#r2-read');
  const status = document.querySelector('#r2-status');
  const preview = document.querySelector('#r2-preview');
  const box = document.querySelector('#r2-preview-box');
  const download = document.querySelector('#r2-download');
  async function read() {
    if (location.protocol === 'file:') {
      status.textContent = '请用线上网址或本地开发服务器访问；离线页面没有连接 R2。';
      return;
    }
    button.disabled = true;
    box.hidden = true;
    download.hidden = true;
    status.textContent = '网页已发出请求，正在由 Worker 检查文件…';
    try {
      const response = await fetch('/api/r2/sample', {cache:'no-store', signal:AbortSignal.timeout(15000)});
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '文件读取失败');
      }
      if (response.headers.get('X-Lab-Source') !== 'R2' || !response.headers.get('Content-Type')?.startsWith('text/plain')) throw new Error('接口没有返回预期的 R2 文本附件');
      // This lesson serves one fixed small text object; reject oversized previews.
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let size = 0;
      let text = '';
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 8192) { await reader.cancel(); throw new Error('附件超过本课预览的 8 KiB 限制'); }
        text += decoder.decode(value, {stream:true});
      }
      preview.textContent = text + decoder.decode();
      box.hidden = false;
      download.hidden = false;
      const local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      status.textContent = local ? '已读取本地开发样例（默认模拟 R2，不代表云端已开通）。' : '已从 R2 读取文件正文；可继续下载这份附件。';
    } catch (error) {
      preview.textContent = '';
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  }
  button.addEventListener('click', () => { void read(); });
  void read();
})();
