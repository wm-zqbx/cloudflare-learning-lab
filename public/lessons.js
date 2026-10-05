window.LESSONS = [
  {
    "id": "assets",
    "name": "Workers Static Assets",
    "group": "发布网站",
    "headline": "把文件变成一个可访问的网站",
    "scene": "团队需要一个项目资料站，展示说明、任务列表和附件入口。HTML、CSS、JS 都是部署时已经生成的文件。",
    "role": "浏览器请求 /index.html → Cloudflare 直接返回静态文件。只有 /api/* 才运行 Worker。本项目 public/ 就是静态资源目录。",
    "quota": "直接静态资源请求免费且不限次数；存储 Assets 无额外费用。Worker 代码请求单独计量。",
    "steps": [
      "在 public/ 编写 HTML、CSS、JS。本项目用三个网页组成学习站，不需要前端框架。",
      "运行 npm install，再运行 npm run dev，访问 http://localhost:8787。",
      "运行 npm run build 检查配置；完成 Cloudflare 登录后运行 npm run deploy，获得 workers.dev 地址。"
    ],
    "code": "// wrangler.jsonc\n\"assets\": {\n  \"directory\": \"./public\",\n  \"binding\": \"ASSETS\",\n  \"run_worker_first\": [\"/api/*\"]\n}",
    "verify": "打开首页和教程页，再查看 Network：HTML 返回 200，/api/health 返回 JSON。修改 public/index.html 后重新部署，确认新版本可见。",
    "pitfall": "静态托管不会执行 PHP 或任意服务器进程。不要把 run_worker_first 对所有路径开启，否则静态页面访问也可能调用 Worker。Pages 仍可用，新项目采用 Workers。",
    "doc": "https://developers.cloudflare.com/workers/static-assets/"
  },
  {
    "id": "dns",
    "name": "DNS",
    "group": "发布网站",
    "headline": "让域名找到你的应用",
    "scene": "客户记不住 workers.dev 地址，希望用自己的域名访问资料站。本项目实际使用 lab.aecai.us.ci。",
    "role": "DNS 负责域名定位；Worker 自定义域名负责将请求路由到应用。橙云代理和仅 DNS 解析是两种不同的访问路径。",
    "quota": "免费计划提供 DNS；域名注册与续费需要另外支付。",
    "steps": [
      "本次实际操作：将 aecai.us.ci 加入 Cloudflare Free，然后在 DNSHE 把 nameservers 改成 coco.ns.cloudflare.com 和 ivan.ns.cloudflare.com。原来没有 DNS 记录；有记录的域名必须先完整迁移。",
      "等待 Cloudflare 的域名状态变成 Active。域名仍由 DNSHE 管理注册与续期，之后的 DNS 记录在 Cloudflare 管理。",
      "在 wrangler.jsonc 添加 lab.aecai.us.ci 的 custom_domain 配置，再运行 npm run deploy。Cloudflare 自动建立 DNS 记录、Worker 绑定和证书，也可在 Settings → Domains & Routes 操作。",
      "打开 https://lab.aecai.us.ci 和 /api/health：前者返回静态网页，后者运行 Worker。自定义域名绑定整个主机名，不在 pattern 后面加 /*。"
    ],
    "code": "# 查看权威 DNS 与站点解析\ndig NS aecai.us.ci\ndig lab.aecai.us.ci\n\n// 本项目 wrangler.jsonc 中的真实配置\n\"routes\": [\n  { \"pattern\": \"lab.aecai.us.ci\", \"custom_domain\": true }\n]\n\n# 发布后验证应用\ncurl https://lab.aecai.us.ci/api/health",
    "verify": "域名打开同一份资料站，HTTPS 无证书错误。理解为什么“DNS 已解析”不一定等于“应用已正确路由”。",
    "pitfall": "接入 DNS 不会自动把现有服务器内容搬到 Workers。不要把 Worker 地址填成 IP。改变 nameservers 前检查原有记录。",
    "doc": "https://developers.cloudflare.com/dns/"
  },
  {
    "id": "tls",
    "name": "SSL / TLS",
    "group": "发布网站",
    "headline": "保护传输中的资料",
    "scene": "用户提交项目名称和留言，不能让它们以明文经过网络。",
    "role": "HTTPS 保护浏览器到 Cloudflare 的连接。有外部源站时，还要保护 Cloudflare 到源站的第二段连接；Workers 托管不需要自己装源站证书。",
    "quota": "Universal SSL 边缘证书免费；高级证书产品另外计费。",
    "steps": [
      "本项目先使用 workers.dev 测试 HTTPS，再通过 Worker Custom Domain 绑定 lab.aecai.us.ci。Cloudflare 为这个主机名自动签发证书；不用自己购买或上传证书。",
      "若连接自有服务器，给源站安装有效证书并选择 Full (strict)。",
      "在浏览器中检查证书域名、有效期，以及页面是否引用 http:// 资源。"
    ],
    "code": "# 检查本项目 HTTPS 响应（不跳过证书校验）\ncurl -I https://lab.aecai.us.ci\ncurl https://lab.aecai.us.ci/api/health\n\n# 本项目：Cloudflare 自己托管应用\nBrowser -- HTTPS --> Cloudflare Static Assets / Worker\n\n# 外部源站场景才需要第二段连接\nBrowser -- HTTPS --> Cloudflare\nCloudflare -- HTTPS, valid certificate --> Origin",
    "verify": "浏览器没有证书警告和混合内容错误；外部源站也使用 HTTPS。",
    "pitfall": "边缘 HTTPS 不代表源站一定加密。Flexible 模式会让 Cloudflare 到源站的连接使用 HTTP，不适合传输敏感信息。",
    "doc": "https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/"
  },
  {
    "id": "cache",
    "name": "CDN / 缓存 / DDoS",
    "group": "观察网站",
    "headline": "减少重复读取，让源站少做事",
    "scene": "项目封面、样式和公开介绍会被很多人重复读取，适合缓存；订单状态和用户资料需要及时、正确地返回。本站新增了真实缓存观察实验。",
    "role": "浏览器缓存保留本机副本，CDN 缓存让多个访客复用边缘内容。Workers Static Assets 自动处理静态资源的边缘缓存；本项目用 _headers 配置版本文件的浏览器缓存，用 Worker 响应头禁止实时接口缓存。",
    "quota": "免费基础 CDN、缓存和 DDoS 能力；高级规则、安全服务有方案差异。",
    "steps": [
      "打开项目演示页的“真实网络实验”，点击“运行缓存对比”。它对 /style.css、/cache-demo/project.v1.json、/api/health 各请求两次，并展示实际响应头。",
      "看 CF-Cache-Status：HIT 表示头部报告命中边缘缓存；MISS 表示报告未命中。不能保证第二次一定 HIT；本地开发或 Worker 直接生成的响应可能没有这个头。实验绕过浏览器 HTTP 缓存，所以显示的是当前网络响应，不是浏览器本地命中。",
      "看 Cache-Control：普通静态资源默认 public, max-age=0, must-revalidate，允许保存但复用前要校验；版本文件通过 public/_headers 设置 max-age=31536000, immutable，允许浏览器长期复用。这里的浏览器策略与 Cloudflare 内部资源缓存是不同层。",
      "查看 v1 和 v2 两个公开介绍文件。更新长期缓存的资源时，用新的版本号或内容哈希改变文件名，再更新页面引用；旧 URL 的内容保持不变。本项目没有给仍会原地更新的 style.css、app.js 或 HTML 设置一年缓存。",
      "观察 /api/health 两次生成时间和 no-store。实时或私人接口不应直接共享缓存。_headers 只作用于静态资源；Worker 接口的头部必须由 src/worker.js 设置。",
      "如果以后代理自己的服务器，再在 Cloudflare Cache Rules 配置合适的公开资源路径和缓存时间。不能照搬“缓存所有页面”到登录页或私人接口。本站使用 Static Assets，本次没有添加全站 Cache Rule。",
      "DDoS 防护用于自动识别和缓解洪水式攻击，免费计划也提供标准防护。正常机器人反复提交表单仍需 Turnstile、权限和限流；本次实验没有进行攻击测试。"
    ],
    "code": "# public/_headers：只对版本固定的公开文件设置长期浏览器缓存\n/cache-demo/*\n  Cache-Control: public, max-age=31536000, immutable\n\n// src/worker.js：真实接口已经返回该头部\nheaders: { \"Cache-Control\": \"no-store\" }\n\n# 查看线上实际响应头\ncurl -I https://lab.aecai.us.ci/cache-demo/project.v1.json\ncurl -I https://lab.aecai.us.ci/style.css\n# health 只接受 GET，读取头部时也使用 GET\ncurl -D - https://lab.aecai.us.ci/api/health\n\n# 更新内容时发布新 URL\n/cache-demo/project.v1.json\n/cache-demo/project.v2.json",
    "verify": "实验显示六条实际响应。版本文件返回 v1 和一年缓存策略，v2 链接返回新内容；实时接口返回 no-store。记录静态资源实际 HIT/MISS，不伪造命中状态。ETag 是内容版本标识，不是命中证明；Age 头可能缺失。",
    "pitfall": "浏览器缓存与边缘缓存不是同一层。Static Assets 官方说明 CF-Cache-Status 有少量误判可能，可作为观察信号。缓存一年后，仅清除 Cloudflare 缓存不能保证清除用户设备的副本，因此版本 URL 很重要。基础 DDoS 防护不等于业务接口不会被滥用。",
    "doc": "https://developers.cloudflare.com/workers/static-assets/headers/"
  },
  {
    "id": "analytics",
    "name": "Web Analytics",
    "group": "观察网站",
    "headline": "知道大家是否真的在使用",
    "scene": "想知道资料站哪些页面受欢迎，以及用户是否遇到加载缓慢。",
    "role": "网页中的统计 beacon 收集访问与性能数据，控制台展示页面和来源。它和 Worker 后端日志用途不同。",
    "quota": "所有计划可使用 Web Analytics；不等于无限保存所有原始事件。",
    "steps": [
      "在 Cloudflare Web Analytics 添加站点，取得该站点的 beacon 配置。",
      "按官方说明添加统计脚本；本项目默认没有统计脚本，添加时需要同步调整 _headers 的 CSP。",
      "访问几次不同页面，稍后去控制台观察访问与性能数据。"
    ],
    "code": "<!-- 用控制台生成的配置替换占位符后接入 -->\n<script defer\n src=\"https://static.cloudflareinsights.com/beacon.min.js\"\n data-cf-beacon='{\"token\":\"YOUR_SITE_TOKEN\"}'>\n</script>",
    "verify": "控制台显示真实站点访问；核对浏览器没有 CSP 错误。控制台结果可能延迟，也可能被拦截器影响。",
    "pitfall": "不要把演示页面上的计数当成真实访问统计。本站统计示意只解释数据流，未接入 beacon。",
    "doc": "https://developers.cloudflare.com/web-analytics/"
  },
  {
    "id": "workers",
    "name": "Workers",
    "group": "开发应用",
    "headline": "在前端与数据之间处理请求",
    "scene": "用户在网页中填写任务名称，后端要检查格式，然后返回处理结果。",
    "role": "浏览器 POST /api/echo → Worker 校验 JSON → 返回 JSON。之后可在同一个 fetch handler 中用绑定访问 D1、KV 或 R2。",
    "quota": "Free 每天 10 万次 Worker 请求；每次调用 10ms CPU 时间，CPU 时间不是网络等待时间。",
    "steps": [
      "阅读 src/worker.js：路由、请求方法、输入大小、字段验证、响应状态。",
      "运行 npm run dev，在演示页点“检查 Worker”或“发送到接口”。",
      "在 Network 查看请求与响应；试着提交错误格式，确认接口返回 400。"
    ],
    "code": "// 本项目真实存在的接口\nconst response = await fetch(\"/api/echo\", {\n  method: \"POST\",\n  headers: { \"Content-Type\": \"application/json\" },\n  body: JSON.stringify({ title: \"准备项目资料\" })\n});\nconsole.log(await response.json());",
    "verify": "/api/health 返回 runtime 与时间；/api/echo 返回 saved:false，明确说明只处理、不保存。",
    "pitfall": "不要在浏览器 JS 中放 API 密钥。模块级变量不能用作持久数据库。脚本标签里的代码和 Worker 代码运行在不同环境。",
    "doc": "https://developers.cloudflare.com/workers/"
  },
  {
    "id": "d1",
    "name": "D1",
    "group": "开发应用",
    "headline": "让任务刷新后仍存在云端",
    "scene": "多个同事需要看到同一份任务，而不是各自浏览器的一份副本。",
    "role": "Worker 用 DB 绑定执行参数化 SQL。任务标题等结构化数据放 D1，附件本体放 R2。演示页当前使用 localStorage，不是 D1。",
    "quota": "免费总计 5GB，单库最大 500MB；每天读 500 万行、写 10 万行。计量是扫描和写入的行数，不是 SQL 次数。",
    "steps": [
      "创建数据库：npx wrangler d1 create learning-tasks，把返回的绑定配置加入 wrangler.jsonc。",
      "本地建表：npx wrangler d1 execute learning-tasks --local --file=docs/schema.sql。远端初始化时改用 --remote。",
      "新增 Worker 路由并用 env.DB 访问。写入接口要做身份或 Turnstile 校验，然后将前端切换到远端接口。"
    ],
    "code": "// 教学片段：先配置 DB 绑定，再放到 Worker handler 中\nconst title = \"准备项目资料\";\nawait env.DB.prepare(\n  \"INSERT INTO tasks (id, title) VALUES (?, ?)\"\n).bind(crypto.randomUUID(), title).run();\n\nconst { results } = await env.DB.prepare(\n  \"SELECT id, title, done FROM tasks ORDER BY created_at DESC LIMIT 20\"\n).all();",
    "verify": "从两台设备访问相同接口，看到同一条任务；用 D1 控制台检查记录。观察 meta 中读写行数。",
    "pitfall": "本地与远端数据库是两个环境。不要拼接用户输入成 SQL。5GB 是账户总额，不是一个免费库的上限。",
    "doc": "https://developers.cloudflare.com/d1/platform/pricing/"
  },
  {
    "id": "kv",
    "name": "Workers KV",
    "group": "开发应用",
    "headline": "保存读得多、改得少的配置",
    "scene": "资料站首页要显示项目介绍，或者把 /s/guide 短链接映射到完整教程地址。",
    "role": "Worker 用 KV 读取配置和短链接映射。KV 是最终一致，不适合库存扣减、余额或要求立即一致的任务状态。",
    "quota": "免费 1GB；每天读 10 万次，写、删除、列表操作各 1000 次。",
    "steps": [
      "运行 npx wrangler kv namespace create CONFIG，将返回的 binding 改为 CONFIG 并加入配置。",
      "写入示例：npx wrangler kv key put project-name \"学习项目\" --binding CONFIG --local。",
      "Worker 用 env.CONFIG.get(\"project-name\") 获取；部署时确认本地和远端值各自配置。"
    ],
    "code": "// 教学片段：在 Worker handler 内使用绑定\nconst projectName = await env.CONFIG.get(\"project-name\");\nreturn Response.json({ projectName: projectName ?? \"默认项目\" });",
    "verify": "改变键值后接口显示新配置。跨地区读取可能不会立即一致，适合允许传播延迟的内容。",
    "pitfall": "KV 不是关系数据库。不要做必须精确的全局计数，也不要假设写入后所有位置立即读到新值。",
    "doc": "https://developers.cloudflare.com/kv/platform/pricing/"
  },
  {
    "id": "r2",
    "name": "R2",
    "group": "开发应用",
    "headline": "把附件从数据库中分离出来",
    "scene": "项目任务需要附一张设计图。数据库只保存附件 key，图片本体存在文件桶。",
    "role": "上传请求经过鉴权 → Worker 将文件写入 BUCKET → D1 保存关联 key。下载时 Worker 检查权限，再流式返回 R2 body。",
    "quota": "Standard 每月 10 GB-month、100 万次 A 类操作、1000 万次 B 类操作免费；直接出网无流量费。超额存储和操作会收费。",
    "steps": [
      "运行 npx wrangler r2 bucket create learning-files，再添加 R2 绑定 BUCKET。",
      "先使用小文件，给上传设大小和文件类型限制。涉及账户计费开通时先查看控制台条件。",
      "下载接口用绑定读取，私人文件经过鉴权；不把整个桶直接公开。"
    ],
    "code": "// 教学片段：先完成鉴权，再读取文件\nconst object = await env.BUCKET.get(\"example/cover.png\");\nif (!object) return new Response(\"Not found\", { status: 404 });\nconst headers = new Headers();\nobject.writeHttpMetadata(headers);\nheaders.set(\"ETag\", object.httpEtag);\nheaders.set(\"X-Content-Type-Options\", \"nosniff\");\nreturn new Response(object.body, { headers });",
    "verify": "刷新后仍能下载附件，确认 R2 控制台存在对象。演示页里的文件操作只显示本地文件信息，不上传。",
    "pitfall": "免出网费不代表容量和请求无限免费。r2.dev 用于开发测试，不能当作无限制生产分发地址。",
    "doc": "https://developers.cloudflare.com/r2/pricing/"
  },
  {
    "id": "turnstile",
    "name": "Turnstile",
    "group": "安全与远程",
    "headline": "在提交前验证请求来自正常访客",
    "scene": "公开留言接口受到机器人反复提交，需要在写入 D1 前加一道验证。",
    "role": "前端组件生成 token → 前端连同表单提交 → Worker 使用 secret 调用 Siteverify → 验证通过才写数据。",
    "quota": "Free 最多 20 个组件，每个 10 个主机名；验证请求不限次数。",
    "steps": [
      "在 Turnstile 创建组件，配置实际域名。sitekey 放前端，secret 用 npx wrangler secret put TURNSTILE_SECRET 保存。",
      "前端将 cf-turnstile-response token 和表单一起提交；按官方说明加载组件并更新 CSP。",
      "Worker 必须在服务端 Siteverify。检查 success、预期 hostname 和 action，验证失败就拒绝写入。"
    ],
    "code": "// 教学片段：token 来自提交的表单\nconst result = await fetch(\n  \"https://challenges.cloudflare.com/turnstile/v0/siteverify\",\n  { method: \"POST\", body: new URLSearchParams({\n    secret: env.TURNSTILE_SECRET, response: token\n  }) }\n);\nconst validation = await result.json();\nif (!validation.success) return new Response(\"验证失败\", { status: 403 });\n// 接下来还应核对 hostname / action，再保存数据",
    "verify": "正常用户能提交，缺少或重复使用 token 的请求被拒绝。本站按钮只是流程示意，不生成真实 token。",
    "pitfall": "仅在前端显示绿色勾号不等于安全。token 有有效期且只可验证一次。Turnstile 不能替代用户登录或全部限流策略。",
    "doc": "https://developers.cloudflare.com/turnstile/get-started/server-side-validation/"
  },
  {
    "id": "tunnel",
    "name": "Cloudflare Tunnel",
    "group": "安全与远程",
    "headline": "让本地服务可以被远程访问",
    "scene": "开发者在笔记本运行内部预览站，需要让同事远程查看，不希望配置公网 IP。",
    "role": "本地 cloudflared 主动连接 Cloudflare，将收到的请求转给 localhost:8787。本地服务仍运行在自己的设备上。",
    "quota": "免费方案可用；不用公网 IP，机器与 cloudflared 必须保持运行。",
    "steps": [
      "从 Cloudflare 官方来源安装 cloudflared，并启动 npm run dev。",
      "用临时测试隧道：cloudflared tunnel --url http://localhost:8787，获得随机 trycloudflare.com 地址。",
      "长期使用时建立命名隧道、配置自定义主机名；内部页面再加 Access 策略。"
    ],
    "code": "# 临时测试，可能公开你的本地学习站\ncloudflared tunnel --url http://localhost:8787\n\n# 停止 cloudflared 后，这个入口即不可用",
    "verify": "用另一台设备打开隧道地址；停掉本地进程后访问失败。临时隧道只适合短期测试。",
    "pitfall": "Tunnel 不会自动给应用加登录。没有 Access 的公开主机名可能被所有人访问。不要暴露开发密钥或私人管理界面。",
    "doc": "https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/"
  },
  {
    "id": "access",
    "name": "Access / Zero Trust",
    "group": "安全与远程",
    "headline": "让后台只对指定人员开放",
    "scene": "资料站前台公开，但 /admin 或内部预览站仅允许团队成员访问。",
    "role": "请求先到 Access → 身份验证与策略检查 → 通过才到 Worker 或 Tunnel。UI 中隐藏菜单不能代替访问控制。",
    "quota": "有免费方案；用户额度、日志保留和功能边界以账户当前方案为准。",
    "steps": [
      "在 Zero Trust 添加 Self-hosted 应用，绑定 admin.example.com 或指定路径。",
      "建立 Allow 策略，仅允许你的测试邮箱或团队身份组；不要用 Allow everyone。",
      "确认所有到达源站的路径都受保护。若 Worker 另有 workers.dev 入口，需关闭或同样保护，避免绕过。"
    ],
    "code": "# 访问路径示意\nBrowser → Access login → Policy → Application\n\n# 只接受自定义域名时，配置示例\n\"workers_dev\": false\n\n# 应用还应验证 Access JWT（不要只信任身份请求头）",
    "verify": "未登录或不在允许列表时无法访问；允许的账号能访问。直接源站地址与替代入口也不能绕过。",
    "pitfall": "Access 是身份策略，Tunnel 是连接通道。本站“允许/拒绝”按钮只是策略模拟，不是登录系统。",
    "doc": "https://developers.cloudflare.com/cloudflare-one/access-controls/"
  },
  {
    "id": "email",
    "name": "Email Routing",
    "group": "扩展能力",
    "headline": "用域名地址接收项目邮件",
    "scene": "希望客户发送邮件到 hello@example.com，并转到自己现有的邮箱。",
    "role": "发件人 → 域名 MX 指向 Cloudflare → Email Routing → 已验证的目标邮箱。没有新建完整邮箱存储服务。",
    "quota": "Email Routing 在免费和付费计划中可用；通用对外发信属于不同能力和计费要求。",
    "steps": [
      "在域名下打开 Email Routing，验证你准备接收邮件的现有邮箱。",
      "按控制台要求配置 MX / TXT；如果域名已有邮件服务，先确认是否可以迁移。",
      "建立 hello 别名并转到已验证邮箱，使用外部邮箱发送测试邮件。"
    ],
    "code": "# 路由示意（非程序配置）\nhello@example.com\n  → 已验证的现有邮箱\n\n# 检查邮件记录\ndig MX example.com\ndig TXT example.com",
    "verify": "目标邮箱收到从外部发送的测试邮件。确认 SPF 等记录不存在互相冲突的重复配置。",
    "pitfall": "收件转发不等于可以从相同地址直接对外发信，也不是完整 IMAP 邮箱。本项目没有替你创建邮箱规则。",
    "doc": "https://developers.cloudflare.com/email-service/"
  },
  {
    "id": "ai",
    "name": "Workers AI",
    "group": "扩展能力",
    "headline": "给项目笔记加一个摘要按钮",
    "scene": "用户写了一段项目笔记，希望自动提炼成行动项。",
    "role": "浏览器提交文本 → Worker 做权限和长度校验 → env.AI.run 调用模型 → 返回摘要。无需将模型密钥放进浏览器。",
    "quota": "每天 1 万 Neurons 免费额度，不是 1 万 Token 或 1 万次请求；部分模型需要付费方式。",
    "steps": [
      "查看当前模型目录，选择支持免费额度的文本模型。AI 绑定在 wrangler.jsonc 中配置。",
      "Worker 用 env.AI.run 调用；设文本长度、输出长度和用户请求限制。",
      "AI 推理即便从本地开发调用也可能使用云端额度。开始前检查模型和账户计费状态。"
    ],
    "code": "// 教学片段；模型可用性与计费需在接入时核对\n\"ai\": { \"binding\": \"AI\" }\n\n// 在 Worker handler 内（需先做权限与输入检查）\nconst result = await env.AI.run(\"@cf/meta/llama-3.1-8b-instruct\", {\n  messages: [\n    { role: \"system\", content: \"用中文提炼三个行动项。\" },\n    { role: \"user\", content: note }\n  ],\n  max_tokens: 256\n});",
    "verify": "同一文本得到模型生成的摘要，控制台能看到真实推理用量。本项目摘要按钮是本地文本截取，明确不调用模型。",
    "pitfall": "AI 输出需要人工检查。不要公开无鉴权的推理接口；免费额度不是所有模型都免费的保证。",
    "doc": "https://developers.cloudflare.com/workers-ai/platform/pricing/"
  }
];
