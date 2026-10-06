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
    "scene": "学习站已经上线，想知道首页、教程和演示页是否有人使用，访客从哪里来，以及页面是否加载缓慢。当前已为 lab.aecai.us.ci 接入真实 Web Analytics。",
    "role": "浏览器中的 beacon 向 Cloudflare 发送页面访问和性能数据，再由后台汇总。它反映访客浏览网页时的体验；Worker 日志记录后端执行，CDN 请求统计还包括静态文件和接口，两者与页面浏览量不是同一口径。",
    "quota": "所有计划可使用 Web Analytics；不等于无限保存所有原始事件。",
    "steps": [
      "本次已在账户 Web Analytics 创建 lab.aecai.us.ci 站点，选择手动 JS 接入（auto_install:false）。公开的 beacon token 是站点标识，不是具有管理权限的 API Token。",
      "各个主要 HTML 页面加载 public/analytics.js。脚本只在 lab.aecai.us.ci 加载一次官方 beacon；本地开发和 workers.dev 备用域名不采集。以后新建 HTML 页面时也要添加这段引用。",
      "在 public/_headers 的 CSP 中允许 static.cloudflareinsights.com 加载脚本，允许 cloudflareinsights.com 发送数据。没有移除 CSP，也没有允许任意第三方脚本。",
      "导航请求实测发现边缘会注入另一枚统计标识。本项目给主要 HTML 页及其规范路径设置 Cache-Control 的 no-transform，阻止额外注入，只保留自己的手动安装；版本文件的一年缓存策略不变。脚本检测到不同标识时会提示冲突，而不会静默跳过。",
      "分别打开首页、课程页和演示页。稍后进入账户 Web Analytics，选择本站与最近的时间范围，查看 Page views、Visits、页面路径和来源。页面加载完成时及离开页面时会报告数据。",
      "工作中先看哪些页面常用，再看来源和性能。Page views 是页面浏览；Visits 按来源判断访问开始，不是独立用户数。一次访问可能打开多个页面。",
      "LCP 看主要内容出现速度，INP 看操作后响应是否及时，CLS 看布局是否跳动。刚开通或样本少时，部分指标可能为空；性能数据还可能在离开页面后上报。",
      "本项目课程用 #hash 切换章节，它仍是同一个 HTML 页面；不能用页面浏览量精确推断每节课的点击或学习完成率。需要业务事件时另做方案。本次没有发送表单里的任务或笔记。"
    ],
    "code": "<!-- 本项目各个主要 HTML 页面中的实际引用 -->\n<script defer src=\"analytics.js\"></script>\n\n// public/analytics.js 的核心逻辑\nif (location.hostname === \"lab.aecai.us.ci\") {\n  const script = document.createElement(\"script\");\n  script.type = \"module\";\n  script.src = \"https://static.cloudflareinsights.com/beacon.min.js\";\n  script.dataset.cfBeacon = JSON.stringify({\n    token: \"29a3c522775b43658ab100b05147536c\"\n  });\n  document.body.append(script);\n}\n\n# public/_headers：只增加指定的官方域名\nscript-src 'self' https://static.cloudflareinsights.com;\nconnect-src 'self' https://cloudflareinsights.com;\n\n# HTML 手动安装时防止额外自动注入，保留校验策略\n/lab\n  Cache-Control: public, max-age=0, must-revalidate, no-transform\n# 其他 HTML 页及 .html 路径也配置相同策略",
    "verify": "演示页显示统计脚本是否加载。浏览器 Network 应看到 beacon.min.js 及向 cloudflareinsights.com/cdn-cgi/rum 的 POST。后台出现本站的实际页面数据才证明汇总成功；加载提示本身不能证明入库。不要直接用 curl 制造统计事件。",
    "pitfall": "只选一种安装方式，避免重复安装。浏览器拦截器、网络或 CSP 可能影响采集，控制台也有汇总延迟。访问量不是独立人数，Web Analytics 不是任务数据库，也不是完整行为录屏或所有业务事件分析。",
    "doc": "https://developers.cloudflare.com/web-analytics/get-started/"
  },
  {
    "id": "workers",
    "name": "Workers",
    "group": "开发应用",
    "headline": "在前端与数据之间处理请求",
    "scene": "用户在网页填写任务标题，后端要独立检查请求再返回结果。在工作中，Worker 还可以负责权限校验、调用外部 API、读写数据库和生成动态响应。本站新增 worker.html 请求实验。",
    "role": "public/workers.js 在浏览器发起 fetch(\"/api/echo\")；src/worker.js 在 Cloudflare 的 fetch handler 收到请求，依次校验路径、方法、内容类型、大小、JSON 和字段，然后返回 Response。后续通过 env 绑定访问 D1、KV、R2。",
    "quota": "Free 每天 10 万次 Worker 请求；每次调用 10ms CPU 时间，CPU 时间不是网络等待时间。",
    "steps": [
      "打开本站 /worker 请求实验页。先用正常标题发送一次请求，比较左侧 JSON 与右侧响应；标题首尾空格由后端去掉，响应包含 processedBy 和 saved:false。",
      "再选择空白标题、损坏 JSON、错误方法、错误类型、超大请求、不存在的 API。观察 400、405、415、413、404。实验直接构造请求，可以说明为什么前端 maxlength 不能代替后端校验。",
      "点击“运行全部 7 项对比”。所有请求都发到真实部署，判断实际状态、JSON 内容和 no-store；错误输入被后端正确拒绝也算实验通过。实验不会保存任务。",
      "阅读 public/workers.js：浏览器 fetch() 是发起请求。阅读 src/worker.js：导出的 fetch(request, env) 是处理请求的入口。request 包含本次请求；env 提供配置好的资源绑定。",
      "阅读 wrangler.jsonc：main 指向 src/worker.js；run_worker_first 只包含 /api/*。因此网页文件由 Static Assets 直接返回，接口运行后端代码。不要为了接口把所有静态路径都改成先执行 Worker。",
      "在自己的电脑运行 npm run dev 并验证，再运行 npm run check、npm run build 和 npm run deploy。GitHub 保存版本，当前本地 Wrangler 负责发布；自动部署另按 GitHub 课程配置。",
      "处理成功不等于持久保存：回显接口的 saved:false 仍为真实状态。D1 课已连接真实数据库，展示云端样例。模块级变量不会可靠地在所有请求和地区间共享，也不能当作持久数据库。",
      "调用外部服务时，把管理密钥保存为 Worker Secret，在后端使用。公开的浏览器代码不能保存秘密；输入校验也不等于已经完成身份验证或防滥用。"
    ],
    "code": "// 浏览器：发起请求（public/workers.js）\nconst response = await fetch(\"/api/echo\", {\n  method: \"POST\",\n  headers: { \"Content-Type\": \"application/json\" },\n  body: JSON.stringify({ title: \"  准备项目资料  \" })\n});\nconsole.log(response.status, await response.json());\n\n// 后端入口结构示意：完整校验见 src/worker.js\nexport default {\n  async fetch(request, env) {\n    // request：本次传入请求\n    // env：配置的 ASSETS / DB / KV 等绑定\n    // 先检查路径、方法、大小和字段，再返回响应\n    return Response.json({ saved: false });\n  }\n};\n\n// 本项目响应内容示例\n{ \"title\": \"准备项目资料\", \"processedBy\": \"Worker fetch handler\",\n  \"saved\": false, \"explanation\": \"接口已处理请求。持久化需要接入 D1。\" }",
    "verify": "请求实验显示真实的请求体和响应头。正常输入返回 200、trim 后的标题和 saved:false；错误输入按规则拒绝。接口返回 application/json 和 no-store。断网或纯静态服务器不会伪装成实验通过。",
    "pitfall": "网页输入限制可以被绕过，后端要独立校验。4 KiB 是本项目规则，不是平台最大上传额度。Worker 可以处理请求，但没有数据库就不代表保存。CPU 时间不包含等待网络或数据库的时间；不能把 10ms CPU 理解成请求必须在 10ms 内完成。",
    "doc": "https://developers.cloudflare.com/workers/runtime-apis/handlers/fetch/"
  },
  {
    "id": "d1",
    "name": "D1",
    "group": "开发应用",
    "headline": "把结构化数据保存在云端的表里",
    "scene": "任务要在关闭网页后仍存在，并让不同设备读取同一份记录。打开 d1.html，只看一条真实云端任务和重新读取按钮。",
    "role": "网页展示，Worker 查询，D1 保存。一行是一条记录，一列是一个字段。D1 是托管的 SQL 数据库；它不会自动保存网页输入，必须执行写入操作。",
    "quota": "免费总计 5GB，单库最大 500MB；每天读 500 万行、写 10 万行。计量是扫描和写入的行数，不是 SQL 次数。",
    "steps": [
      "已创建 cloudflare-learning-lab-d1 数据库，在 tasks 表写入编号为 1 的公开样例，并用 DB 绑定连接 Worker。",
      "打开 d1.html：/api/d1/task 通过 Worker 读取 D1；页面不会把任务写死，也没有使用 localStorage。",
      "点击重新读取或刷新页面；从另一台设备也能读到相同的云端记录。配置与 SQL 放在折叠说明里。",
      "本次网页只读固定样例；原任务列表仍是本地演示。应用新增、修改任务，需要另外实现经过身份和输入校验的写入接口。",
      "本地开发先执行 npx wrangler d1 execute cloudflare-learning-lab-d1 --local --file=docs/d1-intro.sql。本地数据库和远端是两份独立数据。"
    ],
    "code": "// src/worker.js：读取一条公开样例\nconst task = await env.DB.prepare(\n  \"SELECT id, title FROM tasks WHERE id = ?1 LIMIT 1\"\n).bind(\"1\").first();\n\n// wrangler.jsonc 已配置 DB 绑定\n// 本地初始化\nnpx wrangler d1 execute cloudflare-learning-lab-d1 --local --file=docs/d1-intro.sql\n\n// 管理端写入示例，网页不提供公开写入接口\nINSERT INTO tasks (id, title) VALUES ('1', '理解 D1 如何保存数据');",
    "verify": "网页通过真实 Worker 读取 D1，刷新后仍读取同一条记录。可在 D1 控制台查询编号 1，核对标题。接口失败时页面报告错误，不用浏览器数据假装成功。",
    "pitfall": "绑定数据库不等于所有接口都会保存。echo 仍是回显，原任务列表仍用 localStorage；本页的记录来自真实 D1。数据库表不是文件桶；附件本体以后放 R2。",
    "doc": "https://developers.cloudflare.com/d1/platform/pricing/"
  },
  {
    "id": "kv",
    "name": "Workers KV",
    "group": "开发应用",
    "headline": "保存读得多、改得少的配置",
    "scene": "网站公告每天改一次，却被很多人读取。打开 kv.html：用一个固定的名字取出一条真实公告。",
    "role": "键是查找用的名字，值是对应的内容。Worker 用 CONFIG 绑定读取 site-announcement，网页展示这个值。",
    "quota": "免费 1GB；每天读 10 万次，写、删除、列表操作各 1000 次。",
    "steps": [
      "已创建并绑定 CONFIG 命名空间，远端保存一条 site-announcement 公告。",
      "打开 kv.html，点击重新读取：/api/kv/announcement 通过真实 KV 绑定按键取值。",
      "修改远端：npx wrangler kv key put site-announcement \"今晚 8 点学习 R2\" --binding CONFIG --remote。",
      "修改后网页无需重新发布；其他地区可能 60 秒或更久才读到新公告。",
      "本地初始化：npx wrangler kv key put site-announcement --path docs/kv-announcement.txt --binding CONFIG --local。"
    ],
    "code": "// Worker 内通过绑定按键取值；不存在的键返回 null\nconst value = await env.CONFIG.get('site-announcement');",
    "verify": "公告来自 KV，网页没有内置公告内容或保存到 localStorage。管理员修改远端值后，在传播完成后读取新文字。",
    "pitfall": "适合读多写少的配置。no-store 不绕过 KV 自身缓存，不要做必须精确的全局计数或库存扣减。公开接口只读固定公告键。",
    "doc": "https://developers.cloudflare.com/kv/platform/pricing/"
  },
  {
    "id": "r2",
    "name": "R2",
    "group": "开发应用",
    "headline": "附件独立保存，网页不必随附件重发",
    "scene": "客户不断补充需求附件。放进网页源码会反复发布；R2 让程序独立保存和取得文件。固定网页资源继续用 Static Assets 就足够。",
    "role": "r2.html 依次解释问题、对象/键/桶、下载逻辑、开发者与程序的分工，最后验证一个固定的公开附件。账号尚未开通 R2，真实文件实例待建立。",
    "quota": "Standard 每月 10 GB-month、100 万次写入等操作、1000 万次读取等操作免费；直接出网无流量费。超额存储和操作会收费。",
    "steps": [
      "先打开 r2.html 理解职责，开通、命令和配置都在折叠区。",
      "账号持有人确认 R2 订阅条件后，才创建并连接 cloudflare-learning-lab-files 桶。",
      "准备一份公開教学文件，程序固定读取 samples/brief.txt；公开接口不允许任意文件查找或写入。"
    ],
    "code": "// 连接 R2 后，程序按查找名取文件\nconst file = await env.FILES.get('samples/brief.txt');\nif (!file) return new Response('文件不存在', {status:404});\nreturn new Response(file.body);",
    "verify": "连接后读取正文与下载证明程序取到文件；独立替换后读到新正文才进一步证明更新与网站发布分离。目前仅本地 R2 模拟可验证，云端未连接时明确返回 503。",
    "pitfall": "R2 不自动上传网页选中的文件、不自动记录 D1 任务关联或决定谁能下载。桶默认不公开，项目连接与文件权限需编程处理。",
    "doc": "https://developers.cloudflare.com/r2/"
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
