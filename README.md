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

也可以双击 `public/index.html` 阅读教程和进行本地演示；真实 Worker API 需要通过 Wrangler 开发服务器或云端部署访问。

## 实现状态

- 已实现：静态网页、自定义域名与 HTTPS、14 节课程、搜索、学习进度、任务新增/完成/删除、文件元信息查看、文本摘要流程示意、Access 策略模拟。
- 真正可执行的 Worker：`GET /api/health`、`POST /api/echo`。回显接口限制 4 KiB、校验字段，不保存数据。
- **浏览器任务仅保存在 localStorage；附件不上传；摘要不调用 AI；身份选择不是认证。**
- 未创建云端 D1、KV、R2、Turnstile、Access、Tunnel、Email Routing 或 AI 资源；未添加统计 beacon。教程提供接入步骤和片段，不能把本地模拟当成云端服务已经生效。
- 当前仓库有 CI 检查与手动部署 workflow。创建仓库不等于已经部署 Cloudflare。

## CDN 与缓存实战

打开 [真实缓存实验](https://lab.aecai.us.ci/lab#cache-lab)，点击“运行缓存对比”。分别对普通样式文件、版本固定的公开介绍和实时 Worker 接口请求两次，显示真实 HTTP 状态、CF-Cache-Status、Cache-Control、ETag 和内容版本或生成时间。

- 普通静态资源保留默认浏览器策略：可保存，每次使用前校验新鲜度。Static Assets 自动处理边缘资源缓存。
- public/cache-demo/ 中的版本文件使用一年浏览器缓存；内容更新发布新文件名，旧版本不原地修改。
- /api/health 由 Worker 返回 no-store，保留实时响应。

实验使用 fetch 的 cache: no-store 绕过浏览器 HTTP 缓存以观察网络响应，URL 保持不变。它不测浏览器本地缓存命中，也不保证 CDN 第二次必定 HIT；本地开发通常没有边缘状态头。未新增全站 Cache Rule，也未进行 DDoS 攻击测试。

配置依据：[Static Assets 响应头](https://developers.cloudflare.com/workers/static-assets/headers/)。基础 DDoS 防护的免费范围见 [官方说明](https://developers.cloudflare.com/ddos-protection/)；表单与接口仍需自己的权限及滥用保护。

2026-10-05 线上验证：六次响应均为 200。style.css 与 project.v1.json 各两次报告 HIT；前者返回默认浏览器校验策略，后者返回一年缓存策略。health 两次返回 no-store 和不同的生成时间，未返回 CF-Cache-Status。v2 文件独立返回正确的新内容。该结果是一次网络环境下的观测，不保证所有地点都一样。

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
- `wrangler.jsonc`：Cloudflare 配置，无云端资源绑定或密钥
- `docs/schema.sql`：后续 D1 实验的表结构
- `.github/workflows/`：检查与手动部署
- `tests/worker.test.js`：请求验证与路由检查

## 接入时留意

`.env`、`.dev.vars`、Token 和私人文件不要提交。公开应用写入需做身份、输入和滥用保护。本项目的 CSP 仅允许本站资源；接入 Turnstile 或 Web Analytics 时，按其官方要求更新 `public/_headers`。

本项目为个人学习示例，与 Cloudflare 官方没有隶属关系。
