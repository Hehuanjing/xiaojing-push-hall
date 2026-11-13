# 小晶推送馆

「今日热搜 + 个人推送」单页应用：查看今日热点，发布、搜索、编辑、点赞、删除自己的推送，数据保存在浏览器 `localStorage` 中。

v2.0 起由原生单文件版迁移为 **Vue 3 + Pinia** 工程，采用 **TDD（测试先行）** 开发。

## 技术栈

| 层次 | 选型 |
| --- | --- |
| 运行时 | Node.js v26（fnm 安装） |
| 构建 | Vite 8 + `@vitejs/plugin-vue` |
| 框架 | Vue 3（Composition API + `<script setup>`，JavaScript） |
| 状态 | Pinia（setup store） |
| 测试 | Vitest + `@vue/test-utils` + jsdom |
| 存储 | `window.localStorage`（键名 `xjjg_posts`） |

## 快速开始

```bash
npm install
npm run dev      # 本地开发 http://localhost:5173
npm test         # 运行单元 / 组件测试
npm run build    # 生产构建到 dist/
npm run preview  # 预览构建产物
```

> 若本机 `node` / `npm` 不在 PATH（fnm 安装），先把
> `C:\Users\86195\AppData\Roaming\fnm\node-versions\v26.13.0\installation` 加入 PATH。

## 功能

- **今日热搜**：10 条内置热点，按日期种子生成热度并降序排列；点击条目或聚焦后按 Enter，会把标题预填到发布表单并聚焦正文。
- **发布推送**：标题（≤ 60 字）+ 正文（≤ 1000 字）；三段校验（都空 / 缺标题 / 缺正文）；成功后置顶并提示。
- **我的推送**：按时间倒序展示标题、`YYYY-MM-DD HH:mm`、正文与操作按钮。
- **搜索**：标题 + 正文模糊匹配（忽略大小写），输入 120ms 防抖，显示「共 N 条 · 命中 M 条」，并区分两种空态。
- **编辑**：回填表单、按钮切「保存修改」、可取消；保存后更新原条目并保留点赞数。
- **点赞**：点赞/取消切换，计数持久化，计数为 0 时不显示数字。
- **删除**：二次确认后删除并同步存储。
- **持久化**：刷新/重开浏览器后数据仍在；存储不可用或写满时降级为内存态并提示，不崩溃。

## 目录结构

```
.
├── index.html                 # Vite 入口
├── legacy/index.html          # v1.x 单文件实现（仅历史参考）
├── src/
│   ├── main.js                # createApp + Pinia 挂载
│   ├── App.vue                # 页面骨架与热搜→表单联动
│   ├── assets/base.css        # 全局主题变量、玻璃拟态卡片、动画
│   ├── data/hotTopics.js      # 内置热搜常量
│   ├── utils/date.js          # 时间与日期胶囊格式化
│   ├── utils/hotTopics.js     # 按日期种子生成热度并排序
│   ├── services/postStorage.js# localStorage 读写、归一化、异常降级
│   ├── stores/posts.js        # Pinia setup store（唯一状态源）
│   └── components/            # AppHeader / HotTopicCard / PublishCard / PostListCard / PostItem / SearchBox
└── tests/
    ├── setup.js               # 每个用例前清理 localStorage
    ├── unit/                  # date / hotTopics / postStorage / postsStore
    └── components/            # PublishCard / PostListCard / PostItem / HotTopicCard / SearchBox
```

## 测试策略（TDD）

开发按 RED → GREEN → REFACTOR 推进，提交历史中可见先后顺序：

1. `tests/unit/date.spec.js`、`hotTopics.spec.js` 先行 → 实现 `utils`。
2. `tests/unit/postStorage.spec.js`（含「存储抛错」分支）→ 实现存储适配层。
3. `tests/unit/postsStore.spec.js` → 实现 store 的发布/编辑/点赞/删除/搜索/持久化。
4. 组件测试（PostItem → SearchBox → HotTopicCard → PublishCard → PostListCard）→ 实现对应组件。

测试避免依赖实现细节：断言渲染文本、可见状态、emit 事件与 localStorage 数据；存储层通过参数注入假对象模拟不可用/写满；搜索防抖用 `vi.useFakeTimers()` 验证。

```bash
npm test            # 9 个测试文件，76 个用例
npm run coverage    # 覆盖率报告
```

## 数据结构

`localStorage` 键名 `xjjg_posts`，值为推送数组的 JSON：

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

- `id`：`Date.now() * 1000 + 自增序号`，单调唯一，避免同毫秒重复。
- `likes` / `liked`：点赞计数与状态；v1.x 旧数据读取时自动补齐（`likes: 0`、`liked: false`）。
- 读取时还会过滤非法条目、截断超长标题/正文、修正非法的 `time`。

## 版本历史

- **v2.0**：以 TDD 方式改写为 Vite + Vue 3 + Pinia 工程，拆分组件与 store，补齐 76 个测试。
- **v1.1**：原生单文件版新增搜索、编辑、点赞与热搜联动。
- **v1.0**：原生单文件最小可用版（归档于 `legacy/index.html`）。

远程仓库：<https://github.com/Hehuanjing/xiaojing-push-hall>
