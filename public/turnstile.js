(() => {
  'use strict';
  const form = document.querySelector('#turnstile-form');
  const submit = document.querySelector('#turnstile-submit');
  const without = document.querySelector('#submit-without-token');
  const replay = document.querySelector('#submit-replay');
  const widgetStatus = document.querySelector('#widget-status');
  const status = document.querySelector('#submit-status');
  const responseBox = document.querySelector('#submit-response');
  let currentToken = '';
  let lastAccepted = null;
  let widgetId;
  let busy = false;
  function sync() {
    submit.disabled = busy || !currentToken;
    without.disabled = busy;
    replay.disabled = busy || !lastAccepted;
  }
  async function send(mode) {
    if (busy || !form.reportValidity()) return;
    const payload = mode === 'replay' ? lastAccepted : {title:form.elements.title.value, token:mode === 'without'?'':currentToken};
    if (!payload) return;
    busy = true;
    sync();
    status.textContent = '网页已提交，等待 Worker 的后台核验结果…';
    try {
      const response = await fetch('/api/turnstile/submit', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
      const data = await response.json();
      responseBox.textContent = JSON.stringify({status:response.status,response:data}, null, 2);
      if (response.ok && data.verified === true && data.saved === false) {
        status.textContent = 'Worker 核验后已处理：“' + data.title + '”。留言没有保存到数据库。';
        lastAccepted = {...payload};
      } else {
        status.textContent = '本次没有进入处理阶段：' + (data.error || '返回内容不符合预期。');
      }
    } catch {
      status.textContent = '未收到可确认的结果，请检查网络后重新验证再提交。';
      responseBox.textContent = '没有收到完整响应；不把网络失败算作提交成功。';
    } finally {
      busy = false;
      if (mode === 'normal') {
        currentToken = '';
        if (widgetId !== undefined) window.turnstile.reset(widgetId);
      }
      sync();
    }
  }
  form.addEventListener('submit', event=>{event.preventDefault(); void send('normal');});
  without.addEventListener('click', ()=>{void send('without');});
  replay.addEventListener('click', ()=>{void send('replay');});
  if (location.protocol === 'file:' || ['localhost','127.0.0.1'].includes(location.hostname)) {
    widgetStatus.textContent = '请用本站线上域名体验真实验证；本地需独立测试设置。';
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async = true;
  script.onload = () => {
    widgetStatus.textContent = '请完成组件检查。取得凭证后，才能带凭证提交。';
    widgetId = window.turnstile.render('#turnstile-widget', {
      sitekey:'0x4AAAAAAFO8wSsKXboVGd_5',action:'lesson_submit',language:'zh-cn',
      callback:token=>{currentToken=token;widgetStatus.textContent='网页已取得临时凭证。后台还没有接受提交。';sync();},
      'expired-callback':()=>{currentToken='';widgetStatus.textContent='凭证过期，请重新完成组件检查。';sync();},
      'timeout-callback':()=>{currentToken='';widgetStatus.textContent='组件检查超时，请重试。';sync();},
      'error-callback':()=>{currentToken='';widgetStatus.textContent='组件检查失败，可能与网络或浏览器环境有关。可刷新后重试。';sync();}
    });
  };
  script.onerror = () => {widgetStatus.textContent='无法加载 Cloudflare 组件，请检查网络或浏览器拦截设置。';};
  document.head.append(script);
})();
