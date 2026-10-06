# Cloudflare Learning Lab

用一个「项目资料站」理解 Cloudflare 的 14 项常用功能。中文网页教程 + 可交互演示 + 最小 Worker 接口。使用 **Workers Static Assets**，新项目不走 Pages。

## 在线学习

已发布到 Workers Static Assets：

https://lab.aecai.us.ci

备用地址：https://cloudflare-learning-lab.cloudflare-learning-lab.workers.dev

首页是静态资源，`/api/health` 是 Worker 接口。当前发布使用本地 Wrangler；GitHub 自动部署仍按下方步骤配置。

## 已完成的域名实战

`aecai.us.ci` 已在 Cloudflare Free 激活。DNSHE 仍负责域名管理，权威 DNS 改为 Cloudflare 的 `coco.ns.cloudflare.com` 和 `ivan.ns.cloudflare.com`。迁移前没有 DNS 记录。

`wrangler.jsonc` 用 `custom_domain: true` 将 `lab.aecai.us.ci` 绑定到本 Worker。部署自动生成代理 DNS 记录和 HTTPS 证书，无需给 Worker 找一个服务器 IP，也无需手动安装证书。

2026-10-05 实测：首页 HTTPS 返回 200，`/api/health` 返回 JSON；首页响应包含 `CF-Cache-Status: HIT`。这次命中说明被测静态页面使用了缓存，不能据此假设所有接口都被缓存。

从 [DNS 实战课](https://lab.aecai.us.ci/learn#dns) 和 [SSL/TLS 实战课](https://lab.aecai.us.ci/learn#tls) 复习。不同主机名的 localStorage 相互独立，原 workers.dev 页面上的本地任务和学习进度不会自动迁到新域名。

## 立即运行

需要 Node.js 24 和 npm。

```sh
npm ci
npm run dev
```

打开 http://localhost:8787 。按 Ctrl+C 停止开发服务器。

| 页面 | 内容 |
| --- | --- |
| `/index.html` | 学习地图、架构图、14 项功能入口 |
| `/learn.html#assets` | 场景、操作步骤、代码、验证和免费边界 |
| `/learn.html#github` | GitHub 与 Cloudflare 联用流程 |
| `/lab.html` | 任务、附件、笔记和访问策略演示 |
| `/worker.html` | 请求与响应对照、7 项真实后端校验实验 |
| `/d1` | 表、记录与云端保存，一条真实 D1 样例 |
| `/kv` | 键与值，一条真实的网站公告配置 |

也可以双击 `public/index.html` 阅读教程和进行本地演示；真实 Worker API 需要通过 Wrangler 开发服务器或云端部署访问。

## 实现状态

- 已实现：静态网页、自定义域名与 HTTPS、Web Analytics、D1 云端只读样例、KV 公告配置、14 节课程、搜索、学习进度、任务新增/完成/删除、文件元信息查看、文本摘要流程示意、Access 策略模拟。
- 真正可执行的 Worker：`GET /api/health`、`POST /api/echo`、`GET /api/d1/task`、`GET /api/kv/announcement`。回显接口限制 4 KiB、校验字段，不保存数据；D1 和 KV 接口读取各自的云端样例。
- **浏览器任务仅保存在 localStorage；附件不上传；摘要不调用 AI；身份选择不是认证。**
- 未创建云端 R2、Turnstile、Access、Tunnel、Email Routing 或 AI 资源。教程提供接入步骤和片段，不能把本地模拟当成云端服务已经生效。
- 当前仓库有 CI 检查与手动部署 workflow。创建仓库不等于已经部署 Cloudflare。

## CDN 与缓存实战

打开 [真实缓存实验](https://lab.aecai.us.ci/lab#cache-lab)，点击“运行缓存对比”。分别对普通样式文件、版本固定的公开介绍和实时 Worker 接口请求两次，显示真实 HTTP 状态、CF-Cache-Status、Cache-Control、ETag 和内容版本或生成时间。

- 普通静态资源保留默认浏览器策略：可保存，每次使用前校验新鲜度。Static Assets 自动处理边缘资源缓存。
- public/cache-demo/ 中的版本文件使用一年浏览器缓存；内容更新发布新文件名，旧版本不原地修改。
- /api/health 由 Worker 返回 no-store，保留实时响应。

实验使用 fetch 的 cache: no-store 绕过浏览器 HTTP 缓存以观察网络响应，URL 保持不变。它不测浏览器本地缓存命中，也不保证 CDN 第二次必定 HIT；本地开发通常没有边缘状态头。未新增全站 Cache Rule，也未进行 DDoS 攻击测试。

配置依据：[Static Assets 响应头](https://developers.cloudflare.com/workers/static-assets/headers/)。基础 DDoS 防护的免费范围见 [官方说明](https://developers.cloudflare.com/ddos-protection/)；表单与接口仍需自己的权限及滥用保护。

2026-10-05 线上验证：六次响应均为 200。style.css 与 project.v1.json 各两次报告 HIT；前者返回默认浏览器校验策略，后者返回一年缓存策略。health 两次返回 no-store 和不同的生成时间，未返回 CF-Cache-Status。v2 文件独立返回正确的新内容。该结果是一次网络环境下的观测，不保证所有地点都一样。

## Web Analytics 实战

已创建 lab.aecai.us.ci 统计站点并选择手动 JS 安装。各个主要 HTML 页面通过 public/analytics.js 加载官方 beacon，CSP 仅增加所需的脚本与数据上报域名。脚本限制在正式域名运行，localhost 和 workers.dev 不采集；公开 beacon token 是站点标识，不能作为账户管理凭证。

[进入本站统计后台](https://dash.cloudflare.com/0611ef22eaeaf6496cc593583aa4e87d/web-analytics/overview?siteTag~in=70093ed0b15c42d287d1764cec76b576&excludeBots=Yes)（需登录你自己的 Cloudflare 账户）。[演示说明](https://lab.aecai.us.ci/lab#analytics-lab)、[第 5 课](https://lab.aecai.us.ci/learn#analytics)。

导航请求检查发现边缘会额外注入不同标识的 beacon。HTML 路径已设置 no-transform 阻止额外注入，保留本站的手动安装；版本文件缓存策略不变。脚本也会报告不同标识的冲突，避免静默跳过。

Page views 看页面浏览，Visits 按来源识别访问开始，不是独立用户数。LCP 看主要内容出现，INP 看交互响应，CLS 看布局跳动。课程的 hash 章节切换不代表新 HTML 页面，不能用页面统计直接得到学习完成率。任务与笔记没有作为自定义事件发送。

脚本已加载、请求被接收、后台出现数据，是三个不同的验证阶段。后台数据可能延迟；广告拦截器和网络问题可能造成缺失。不要直接向收集端发送伪造事件。依据：[官方安装说明](https://developers.cloudflare.com/web-analytics/get-started/)、[数据收集与上报](https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/)。

## Workers 实战

[打开真实请求实验](https://lab.aecai.us.ci/worker)。页面并排显示实际发送的 method、Content-Type、请求体与 Worker 返回的 HTTP 状态、响应头和 JSON。单次请求可使用自定义标题；全部对比使用固定示例，依次运行 7 项，不写数据库。

正常标题返回 200；空白标题和损坏 JSON 返回 400；错误方法返回 405；错误类型返回 415；超过应用的 4 KiB 限制返回 413；不存在的 API 返回 404。判断还核对 JSON 格式、no-store 和返回内容，不把错误输入遭到拒绝误认为实验失败。

public/workers.js 在浏览器发起网络请求，src/worker.js 在 Cloudflare 收到请求后执行校验。回显接口不写数据库，响应中的 saved:false 仍为真实状态。页面引用 analytics.js；HTML 规范路径保留 no-transform 避免额外统计注入。

[第 6 课](https://lab.aecai.us.ci/learn#workers)、[后端入口官方说明](https://developers.cloudflare.com/workers/runtime-apis/handlers/fetch/)。Free 当前每天 10 万次 Worker 请求、每次 10ms CPU；等待网络不计入 CPU 时间，见 [官方额度](https://developers.cloudflare.com/workers/platform/limits/)。

## D1：只看核心概念

[简洁的第 7 课](https://lab.aecai.us.ci/d1)只展示“表、记录、云端保存”：一条真实任务记录和一个重新读取按钮。SQL 与接入说明折叠，旧 learn#d1 入口会转到这页。

已创建 cloudflare-learning-lab-d1，将 docs/d1-intro.sql 的公开样例写入远端数据库。Worker 用 DB 绑定读取编号 1 的 id/title；接口 /api/d1/task 使用固定参数，只允许 GET，并返回 no-store。页面不使用 localStorage，也不内置样例标题。

原任务演示仍保存在浏览器；echo 仍不写数据库。这次公开页面只读一条学习样例，其他记录不会被该接口列出。新增或修改任务需另做经过权限校验的写入接口。先区分“Worker 处理请求”和“D1 持久保存”，再学习完整 CRUD。

本地初始化（独立于远端）：npx wrangler d1 execute cloudflare-learning-lab-d1 --local --file=docs/d1-intro.sql，然后 npm run dev。远端已初始化，重复部署不会重新插入或覆盖记录。

## KV：按名字取内容

[简洁的第 8 课](https://lab.aecai.us.ci/kv)用一条真实的网站公告解释键与值。CONFIG 命名空间已创建并绑定；Worker 固定读取 site-announcement，不接受访客指定其他键或公开写入。网页没有内置公告值，也不使用 localStorage。

运营修改 KV 公告，网页随后读取新值，无需重新部署。示例只展示读取；有管理权限的人在本项目目录修改：

```sh
npx wrangler kv key put site-announcement "今晚 8 点学习 R2" --binding CONFIG --remote
```

修改可能 60 秒或更久才被其他地区读到。接口 no-store 只控制 HTTP 缓存，不绕过 KV 内部缓存。KV 适合读多写少的配置；需要事务或准确并发更新的内容应使用更合适的存储。依据：[KV 工作原理](https://developers.cloudflare.com/kv/concepts/how-kv-works/)。

本地样例与远端独立，本地初始化后运行 npm run dev：

```sh
npx wrangler kv key put site-announcement --path docs/kv-announcement.txt --binding CONFIG --local
```

远端已初始化；部署不会覆盖 KV 值。原任务列表仍使用浏览器存储，短链接只提供教学思路，尚未实现短链接路由。

2026-10-06 验证：部署后仅用 Wrangler 修改远端公告，从“欢迎来到 Cloudflare 学习站，今天学习 KV。”改为“公告已更新：内容来自 KV，无需重新发布网页。”，再从页面读取；没有再次部署网页或 Worker。

## 14 项路线

1. Workers Static Assets：发布网页
2. DNS：域名与 Worker 路由
3. SSL/TLS：HTTPS 与源站加密
4. CDN / 缓存 / 基础 DDoS：资源分发
5. Web Analytics：访问与性能
6. Workers：后端校验和 API
7. D1：结构化任务数据
8. KV：配置与短链接
9. R2：文件附件
10. Turnstile：公开表单验证
11. Tunnel：本地服务连接
12. Access / Zero Trust：内部应用权限
13. Email Routing：域名收件转发
14. Workers AI：项目笔记摘要

所有课程均包含官方文档链接。额度快照日期：2026-10-05；接入时重新核对方案和模型价格。

## GitHub → Cloudflare

**推荐 Workers Builds：** 在 Cloudflare 创建 Worker，连接本 GitHub 仓库，选择 main。项目无需前端编译，部署命令 `npx wrangler deploy`。完成 GitHub 授权后，提交代码触发部署。

**备用 GitHub Actions：** 给仓库配置 Secret `CLOUDFLARE_API_TOKEN` 和变量 `CLOUDFLARE_ACCOUNT_ID`，在 Actions 手动运行 `Deploy to Cloudflare`。Token 只给予部署需要的最小权限。两种方式选一个，避免重复部署。

**从本地发布：**

```sh
npm run check
npm run build
npx wrangler login
npm run deploy
```

配置将 `/api/*` 交给 Worker，其余匹配的静态文件直接由 Static Assets 返回。资源请求和 Worker 请求的计量不同，详见教程。

## 文件位置

- `public/`：全部前端文件，可直接阅读
- `public/lessons.js`：14 课的详细内容
- `public/app.js`：页面与本地演示逻辑
- `public/cache.js`、`public/cache-demo/`：真实缓存观察和版本文件
- `src/worker.js`：真实 Worker 接口
- `wrangler.jsonc`：Cloudflare 配置，含 D1 与 KV 绑定，无密钥
- `public/kv.html`、`public/kv.js`：键值概念与真实公告读取
- `docs/kv-announcement.txt`：KV 公告初始化样例
- `docs/d1-intro.sql`：D1 第一课的建表与样例初始化
- `docs/schema.sql`：完整任务和附件表结构，供后续扩展参考
- `.github/workflows/`：检查与手动部署
- `tests/worker.test.js`：请求验证与路由检查

## 接入时留意

`.env`、`.dev.vars`、Token 和私人文件不要提交。公开应用写入需做身份、输入和滥用保护。本项目 CSP 已允许本站资源和指定的 Cloudflare Analytics 域名；接入 Turnstile 时，按其官方要求更新 `public/_headers`。

本项目为个人学习示例，与 Cloudflare 官方没有隶属关系。
