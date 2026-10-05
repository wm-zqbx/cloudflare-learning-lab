(() => {
  'use strict';
  const status = document.querySelector('#analytics-status');
  const show = message => { if (status) status.textContent = message; };
  // This beacon token identifies the public site. It is not a Cloudflare API token.
  // Keep local development and the workers.dev fallback out of this site's data.
  if (location.hostname !== 'lab.aecai.us.ci') {
    show('此地址未启用统计。请访问 lab.aecai.us.ci；本地开发和备用域名不采集。');
    return;
  }
  const existing = document.querySelector('script[data-cf-beacon]');
  if (existing) {
    let matches = false;
    try { matches = JSON.parse(existing.dataset.cfBeacon).token === '29a3c522775b43658ab100b05147536c'; } catch {}
    show(matches ? '页面已有本站统计脚本，已避免重复安装；真实数量在 Cloudflare 后台查看。' : '检测到不同站点标识的统计脚本，已暂停手动加载，需检查重复注入。');
    return;
  }
  const script = document.createElement('script');
  script.type = 'module';
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  script.dataset.cfBeacon = JSON.stringify({ token: '29a3c522775b43658ab100b05147536c' });
  script.onload = () => show('统计脚本已加载。后台汇总可能延迟；此提示不代表数据已入库，实际数量以 Cloudflare 控制台为准。');
  script.onerror = () => show('统计脚本加载失败。检查网络、浏览器拦截器或 CSP；页面其他功能可以继续使用。');
  show('正在加载 Cloudflare 统计脚本…');
  document.body.append(script);
})();
