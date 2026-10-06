(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const lessons = window.LESSONS;
  const simpleLessons = new Set(['d1', 'kv', 'r2']);
  const lessonHref = id => simpleLessons.has(id) ? id + '.html' : 'learn.html#' + id;
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  const store = {
    get(key, fallback) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { toast('浏览器存储不可用，当前操作不会持久保存。'); } }
  };
  function toast(message) { const node = $('#toast'); node.textContent = message; node.classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('visible'), 2800); }
  $(`[data-nav="${document.body.dataset.page}"]`)?.classList.add('active');
  const completedRaw = store.get('cf-lab-progress', []);
  const completed = new Set(Array.isArray(completedRaw) ? completedRaw : []);
  if ($('#feature-grid')) $('#feature-grid').innerHTML = lessons.map((item, index) => `<a class="feature-card" href="${lessonHref(item.id)}"><div class="card-top"><span>${String(index + 1).padStart(2,'0')} / ${escape(item.group)}</span><span>${completed.has(item.id) ? '已学 ✓' : '↗'}</span></div><h3>${escape(item.name)}</h3><p>${escape(item.headline)}</p></a>`).join('');

  const githubContent = `<p class="eyebrow">WORKFLOW / 代码与发布</p><h1>GitHub × Cloudflare</h1><p class="lead">GitHub 保存源码和历史，Cloudflare 运行网页与 Worker。每次修改都能追溯、检查和重新部署。</p><section><h2>推荐方式：Workers Builds</h2><ol><li>打开本项目公开仓库，先阅读 README，再克隆到自己的电脑。</li><li>在 Cloudflare Workers 中选择连接 Git 仓库，授权访问这个仓库并选择 main 分支。实际授权由你在控制台完成。</li><li>本项目没有前端编译步骤；部署命令使用 <code>npx wrangler deploy</code>。Wrangler 会上传 public/ 并发布 src/worker.js。</li><li>提交并推送修改，Cloudflare 执行构建与部署。打开部署 URL，检查网页内容与 /api/health。</li></ol></section><section><h2>备用方式：GitHub Actions</h2><p>仓库的 check.yml 在提交或 PR 时运行检查。deploy.yml 只在你手动运行时部署，不会因为推送自动消耗云端资源。</p><ol><li>给 GitHub 仓库添加 Secret：CLOUDFLARE_API_TOKEN；给它最小所需 Workers 部署权限。</li><li>添加变量 CLOUDFLARE_ACCOUNT_ID。账户 ID 是配置，不是访问密钥。</li><li>在 Actions 中选 Deploy to Cloudflare，再点 Run workflow。查看执行结果与部署地址。</li></ol><p>Workers Builds 和 Actions 部署选择一个即可，避免同一次提交重复部署。当前这两种云端部署尚未配置。</p></section><section><h2>本地修改与发布</h2><div class="lesson-code"><button class="copy" type="button">复制</button><pre>git clone https://github.com/wm-zqbx/cloudflare-learning-lab.git\ncd cloudflare-learning-lab\nnpm ci\nnpm run dev\n\n# 修改 public/ 中的文件后\nnpm run check\nnpm run build\ngit add public/\ngit commit -m "Update learning page"\ngit push\n\n# 手动从本地部署：先登录，再发布\nnpx wrangler login\nnpm run deploy</pre></div></section><section class="verify"><h2>如何确认部署成功</h2><p>检查 GitHub 提交记录、CI 结果、Cloudflare 部署日志，再打开实际网址。仅仅 push 成功，不能说明网站已上线。</p></section><section class="pitfall"><h2>公开仓库放什么</h2><p>提交源码、配置、SQL、README 和锁文件。API Token、.dev.vars、.env、私人附件不提交。不要把云端数据库或本地演示内容误当作 GitHub 会自动保存的数据。</p></section><div class="lesson-bottom"><a href="https://developers.cloudflare.com/workers/ci-cd/builds/" target="_blank" rel="noopener">Workers Builds 官方文档 ↗</a><a href="lab.html">返回项目演示 →</a></div>`;
  function renderNav(query = '') {
    let lastGroup = '';
    $('#lesson-nav').innerHTML = lessons.map((item,index) => {
      if (!`${item.name} ${item.headline} ${item.scene}`.toLowerCase().includes(query.toLowerCase())) return '';
      const group = item.group !== lastGroup ? `<p class="nav-group">${escape(item.group)}</p>` : '';
      lastGroup = item.group;
      return `${group}<a class="lesson-link ${(location.hash.slice(1) || 'assets') === item.id ? 'active' : ''}" href="${simpleLessons.has(item.id) ? lessonHref(item.id) : '#' + item.id}"><span>${String(index + 1).padStart(2,'0')}</span>${escape(item.name)}${completed.has(item.id) ? ' ✓' : ''}</a>`;
    }).join('');
    if (!$('#lesson-nav').innerHTML) $('#lesson-nav').textContent = '没有匹配的课程。';
  }
  function renderLesson() {
    const id = location.hash.slice(1) || 'assets';
    if (simpleLessons.has(id)) { location.replace(lessonHref(id)); return; }
    const index = lessons.findIndex(item => item.id === id);
    const item = lessons[index];
    renderNav($('#search').value);
    if (id === 'github') { $('#lesson-content').innerHTML = githubContent; return; }
    if (!item) { $('#lesson-content').innerHTML = '<h1>没有找到这节课</h1><a href="#assets">返回第一课 →</a>'; return; }
    $('#lesson-content').innerHTML = `<p class="eyebrow">LESSON ${String(index + 1).padStart(2,'0')} / ${escape(item.group)}</p><h1>${escape(item.name)}</h1><p class="lead">${escape(item.headline)}</p><div class="quota"><b>免费边界</b>${escape(item.quota)}</div><section><h2>工作中什么时候用？</h2><p>${escape(item.scene)}</p></section><section><h2>在这个项目中负责什么？</h2><p>${escape(item.role)}</p></section><section><h2>如何实际接入</h2><ol>${item.steps.map(step => `<li>${escape(step)}</li>`).join('')}</ol></section><section><h2>对应的代码或配置</h2><div class="lesson-code"><button class="copy" type="button">复制</button><pre>${escape(item.code)}</pre></div><p class="fine">代码片段在标注的位置使用；包含占位符的配置需要替换。当前已接入 Static Assets、域名与 HTTPS、缓存观察、Web Analytics 和 Worker 接口；数据库等能力按各课说明判断。</p></section><section class="verify"><h2>怎样确认真的生效？</h2><p>${escape(item.verify)}</p></section><section class="pitfall"><h2>常见误区</h2><p>${escape(item.pitfall)}</p></section><button id="mark-complete" class="button secondary progress-button ${completed.has(id) ? 'completed' : ''}">${completed.has(id) ? '已学会 ✓（点击撤销）' : '标记这节课已学会 ✓'}</button><div class="lesson-bottom"><a href="${item.doc}" target="_blank" rel="noopener">官方文档 ↗</a><a href="lab.html">去演示页看场景 ↗</a><a href="#${lessons[index + 1]?.id || 'github'}">${lessons[index + 1] ? '下一课：' + escape(lessons[index + 1].name) : '下一步：GitHub 发布'} →</a></div>`;
    $('#mark-complete').addEventListener('click', () => { completed.has(id) ? completed.delete(id) : completed.add(id); store.set('cf-lab-progress', [...completed]); renderLesson(); });
  }
  if ($('#lesson-content')) {
    renderLesson();
    window.addEventListener('hashchange', () => { renderLesson(); window.scrollTo({ top:0, behavior:'smooth' }); });
    $('#search').addEventListener('input', event => renderNav(event.target.value));
    $('#lesson-content').addEventListener('click', async event => {
      if (!event.target.classList.contains('copy')) return;
      const code = event.target.parentElement.querySelector('pre').textContent;
      try { await navigator.clipboard.writeText(code); toast('已复制代码'); } catch { toast('当前环境不支持自动复制，请选中代码手动复制。'); }
    });
  }
  if ($('#tasks')) {
    const saved = store.get('cf-lab-tasks', null);
    let tasks = Array.isArray(saved) ? saved.filter(task => task && typeof task.id === 'string' && typeof task.title === 'string').map(task => ({ id:task.id, title:task.title.slice(0,200), done:!!task.done })) : [{id:'example-1',title:'发布项目资料站',done:false},{id:'example-2',title:'给首页绑定一个域名',done:false}];
    function renderTasks() {
      $('#tasks').innerHTML = tasks.length ? tasks.map(task => `<li class="${task.done ? 'done' : ''}"><input type="checkbox" data-task="${escape(task.id)}" ${task.done ? 'checked' : ''} aria-label="完成 ${escape(task.title)}"><span class="task-text">${escape(task.title)}</span><button class="remove" data-remove="${escape(task.id)}" aria-label="删除 ${escape(task.title)}">删除</button></li>`).join('') : '<li class="muted">还没有任务，添加一条试试看。</li>';
    }
    function trace(steps) { $('#trace').innerHTML = steps.map(([title,body,id]) => `<div class="flow-step"><b>${escape(title)}</b><p>${escape(body)}</p>${id ? `<a href="${lessonHref(id)}">查看接入方法 →</a>` : ''}</div>`).join(''); }
    $('#task-form').addEventListener('submit', event => {
      event.preventDefault();
      const title = $('#task-title').value.trim();
      if (!title) return;
      tasks.unshift({ id:crypto.randomUUID(),title,done:false });
      store.set('cf-lab-tasks',tasks); renderTasks(); $('#task-title').value = '';
      trace([['01 · 网页收集输入','当前：浏览器已把任务保存在本机。','assets'],['02 · Turnstile 产生 token','上线时：防止机器人提交公开表单。','turnstile'],['03 · Worker 校验请求','检查权限、字段和长度，再调用数据库。','workers'],['04 · D1 持久保存','让同事也能读取同一份任务。当前尚未接入。','d1']]);
      toast('已保存到当前浏览器');
    });
    $('#tasks').addEventListener('change', event => { const task=tasks.find(item=>item.id===event.target.dataset.task); if(task){task.done=event.target.checked;store.set('cf-lab-tasks',tasks);renderTasks();trace([['更新任务状态','当前：写入 localStorage。云端版本应由 Worker 更新 D1。','d1']]);} });
    $('#tasks').addEventListener('click', event => { const id=event.target.dataset.remove; if(id){tasks=tasks.filter(item=>item.id!==id);store.set('cf-lab-tasks',tasks);renderTasks();toast('已删除本地演示任务');} });
    $('#attachment').addEventListener('change', event => {
      const file=event.target.files[0]; if(!file){$('#file-info').textContent='还没有选择文件。';return;}
      $('#file-info').textContent=`${file.name} · ${(file.size/1024).toFixed(1)} KiB · ${file.type || '未知类型'}（未上传）`;
      trace([['01 · 选择文件','当前：浏览器只展示文件元信息。没有网络上传。',null],['02 · Worker 检查权限','真实上传应限制大小、允许的类型和用户权限。','workers'],['03 · R2 保存文件','文件本体存对象桶，下载时可流式读取。','r2'],['04 · D1 保存关联','数据库只保存任务 ID、附件 key 和名称。','d1']]);
    });
    $('#summarize').addEventListener('click', () => {
      const note=$('#note').value.trim();
      if(!note){toast('先写一段笔记');return;}
      const parts=note.split(/[。！？\n]+/).map(part=>part.trim()).filter(Boolean).slice(0,3);
      $('#summary').textContent='本地截取示意（不是 AI 生成）：\n'+parts.map((part,i)=>`${i+1}. ${part.slice(0,80)}`).join('\n');
      trace([['01 · Worker 接收笔记','真实版本先验证用户和文本长度。','workers'],['02 · Workers AI 推理','通过 AI 绑定调用模型，消耗云端额度。当前没有调用。','ai'],['03 · 返回摘要','人工确认摘要后再保存到 D1。','d1']]);
    });
    async function api(path, options) {
      if(location.protocol==='file:'){ $('#api-result').textContent='请运行 npm run dev，并通过 http://localhost:8787/lab.html 访问真实接口。';return; }
      try {
        const response=await fetch(path,options);
        const type=response.headers.get('content-type') || '';
        if(!type.includes('application/json')) throw new Error('当前是纯静态预览，未运行 Worker。请使用 npm run dev。');
        const body=await response.json();
        $('#api-result').textContent=`HTTP ${response.status}\n${JSON.stringify(body,null,2)}`;
        trace([['请求到 Worker','浏览器已向 '+path+' 发送请求。','workers'],['JSON 响应','这是实际接口结果；不写入数据库。','d1']]);
      } catch(error) { $('#api-result').textContent='请求失败：'+error.message; }
    }
    $('#health').addEventListener('click',()=>api('/api/health'));
    $('#echo').addEventListener('click',()=>api('/api/echo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:$('#task-title').value.trim() || tasks[0]?.title || '准备项目资料'})}));
    $('#access-test').addEventListener('click',()=>{const allowed=$('#identity').value==='member';$('#access-result').textContent=allowed?'模拟结果：允许访问。真实 Access 还需要验证身份。':'模拟结果：拒绝访问。真实 Access 会要求登录并检查策略。';trace([['01 · Access 身份验证','真实系统先确认邮箱或身份提供商登录。','access'],['02 · 策略决策',allowed?'此处选择的模拟身份满足规则。':'此处选择的模拟身份不满足规则。','access'],['03 · Tunnel 连接内部服务','只有通过策略的请求才应该到达应用。','tunnel']]);});
    renderTasks();
  }
})();
