# 小晶推送馆

「今日热搜 + 个人推送」单页应用：查看今日热点，发布、搜索、编辑、点赞、删除自己的推送。

v2.1 起数据改由 **Hono + RESTful API + 内存存储** 的后端统一维护，前端通过 HTTP 读写；浏览器 `localStorage`
降级为**离线缓存**，后端不可用时页面仍可继续使用并给出提示。

v2.0 起由原生单文件版迁移为 **Vue 3 + Pinia** 工程，全程采用 **TDD（测试先行）** 开发。

## 技术栈

| 层次 | 选型 |
| --- | --- |
| 运行时 | Node.js v26（fnm 安装） |
| 后端 | Hono 4 + `@hono/node-server`（REST API + 托管 `dist/`） |
| 构建 | Vite 8 + `@vitejs/plugin-vue` |
| 框架 | Vue 3（Composition API + `<script setup>`，JavaScript） |
| 状态 | Pinia（setup store，异步动作 + 在线/离线双通道） |
| 测试 | Vitest + `@vue/test-utils` + jsdom，服务端用 `app.request()` |
| 存储 | 服务端进程内 `Map`（预置 3 条示例）；`localStorage`（键名 `xjjg_posts`）仅作离线缓存 |

## 快速开始

```bash
npm install

npm start        # 构建 + 单端口启动：http://localhost:8787（推荐验收）
npm run dev      # 开发模式：Vite http://localhost:5173，/api 代理到 8787
npm run server   # 仅启动后端（需先 npm run build 才能打开页面）
npm test         # 运行全部单元 / 组件 / 接口测试
npm run build    # 生产构建到 dist/
npm run coverage # 覆盖率报告
```

> 若本机 `node` / `npm` 不在 PATH（fnm 安装），先把
> `C:\Users\86195\AppData\Roaming\fnm\node-versions\v26.13.0\installation` 加入 PATH。
> 开发模式下需另开一个终端执行 `npm run server`，否则 `/api` 请求会失败并进入离线缓存模式。

## 功能

- **今日热搜**：10 条内置热点，按日期种子生成热度并降序排列；点击条目或聚焦后按 Enter，会把标题预填到发布表单并聚焦正文。
- **发布推送**：标题（≤ 60 字）+ 正文（≤ 1000 字）；三段校验（都空 / 缺标题 / 缺正文）；成功后置顶并提示。
- **我的推送**：按时间倒序展示标题、`YYYY-MM-DD HH:mm`、正文与操作按钮；加载中显示加载态。
- **搜索**：标题 + 正文模糊匹配（忽略大小写），输入 120ms 防抖，显示「共 N 条 · 命中 M 条」，并区分两种空态；搜索仍在前端完成，不产生额外请求。
- **编辑**：回填表单、按钮切「保存修改」、可取消；保存后以服务端返回结果为准并保留点赞数。
- **点赞**：点赞/取消切换，`liked` 与 `likes` 由服务端统一保存（`PUT /like` 幂等），计数为 0 时不显示数字。
- **删除**：二次确认后删除并同步服务端与缓存。
- **离线降级**：请求失败（网络不可达或 5xx）时自动读写本地缓存，页面顶部提示当前处于缓存模式；恢复在线后以服务端数据为准，离线期间的改动不自动回传。

## 目录结构

```
.
├── index.html                 # Vite 入口
├── legacy/index.html          # v1.x 单文件实现（仅历史参考）
├── shared/
│   └── postSchema.js          # 前后端共享常量、校验与归一化（单一事实来源）
├── server/
│   ├── store.js               # 内存仓储：Map 存储、单调 id、幂等点赞、预置数据
│   ├── app.js                 # createApp({ store })：REST 路由与统一错误响应
│   └── index.js               # 单端口启动：API + dist 静态资源 + SPA fallback
├── src/
│   ├── main.js                # createApp + Pinia 挂载
│   ├── App.vue                # 页面骨架、热搜→表单联动、离线提示
│   ├── assets/base.css        # 全局主题变量、玻璃拟态卡片、动画
│   ├── data/hotTopics.js      # 内置热搜常量
│   ├── utils/date.js          # 时间与日期胶囊格式化
│   ├── utils/hotTopics.js     # 按日期种子生成热度并排序
│   ├── services/postApi.js    # REST 客户端（可注入 fetch，统一 ApiError）
│   ├── services/postStorage.js# localStorage 离线缓存读写与异常降级
│   ├── stores/posts.js        # Pinia setup store（唯一状态源，异步动作）
│   └── components/            # AppHeader / HotTopicCard / PublishCard / PostListCard / PostItem / SearchBox
└── tests/
    ├── setup.js               # 用例前后清理 localStorage（兼容 node 环境）
    ├── server/                # store / REST 接口测试（app.request，无真实端口）
    ├── unit/                  # postSchema / postApi / postStorage / postsStore / date / hotTopics
    └── components/            # PublishCard / PostListCard / PostItem / HotTopicCard / SearchBox
```

## REST 接口

| 方法 | 路径 | 请求体 | 成功 | 失败 |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | - | 200 `{ ok: true }` | - |
| GET | `/api/posts` | - | 200 `{ posts }`（按时间倒序） | - |
| POST | `/api/posts` | `{ title, body }` | 201 `{ post }` | 400 `{ message }` |
| PUT | `/api/posts/:id` | `{ title, body }` | 200 `{ post }` | 400 / 404 `{ message }` |
| PUT | `/api/posts/:id/like` | `{ liked: boolean }` | 200 `{ post }`（幂等） | 400 / 404 `{ message }` |
| DELETE | `/api/posts/:id` | - | 204 无响应体 | 404 `{ message }` |

- 校验规则、截断上限与提示文案来自 `shared/postSchema.js`，前后端共用。
- 非法 JSON 返回 400；未知 `/api/*` 返回 JSON 404，不会被 SPA fallback 吞掉。

## 测试策略（TDD）

开发按 RED → GREEN → REFACTOR 推进：

1. `tests/unit/postSchema.spec.js`、`tests/server/store.spec.js` 先行 → 实现共享 schema 与内存仓储。
2. `tests/server/api.spec.js` 用 Hono `app.request()` 覆盖状态码、响应体与校验文案 → 实现 `server/app.js`、`server/index.js`。
3. `tests/unit/postApi.spec.js` 注入假 `fetch` 验证请求方法/路径/响应映射 → 实现 REST 客户端。
4. `tests/unit/postsStore.spec.js` 注入假 api，覆盖在线成功、离线降级、缓存写入、404 等分支 → 重构 store。
5. 组件测试补 `flushPromises()`，验证异步提交、点赞、删除与加载态。

```bash
npm test            # 14 个测试文件，144 个用例
npm run coverage    # 覆盖率报告（含 server/ 与 shared/）
```

## 数据结构

服务端内存中的推送形如：

```json
[
  {
    "id": 1794539091736001,
    "title": "标题",
    "body": "正文",
    "time": 1794539091736,
    "likes": 0,
    "liked": false
  }
]
```

- 启动时预置 3 条示例推送；进程重启后数据重置，`reset()` 可恢复预置数据。
- `id`：`Date.now() * 1000 + 自增序号`，单调唯一，避免同毫秒重复；种子数据使用小整数 id。
- `likes` / `liked`：由服务端统一维护，`PUT /like` 幂等，重复点击不会漂移计数。
- 读取缓存时仍会过滤非法条目、截断超长标题/正文、修正非法的 `time`（兼容 v1.x 旧数据）。

## 版本历史

- **v2.1**：新增 Hono + RESTful API + 内存存储后端，Hono 单端口托管构建产物；前端改异步双通道，`localStorage` 降级为离线缓存；测试增至 144 个。
- **v2.0**：以 TDD 方式改写为 Vite + Vue 3 + Pinia 工程，拆分组件与 store，补齐 76 个测试。
- **v1.1**：原生单文件版新增搜索、编辑、点赞与热搜联动。
- **v1.0**：原生单文件最小可用版（归档于 `legacy/index.html`）。

远程仓库：<https://github.com/Hehuanjing/xiaojing-push-hall>
