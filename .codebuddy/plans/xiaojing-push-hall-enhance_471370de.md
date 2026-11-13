---
name: xiaojing-push-hall-enhance
overview: 在现有「小晶推送馆」单页 UI 基础上增强功能（搜索、编辑、点赞、热搜联动发布），保持纯 HTML+CSS+JS 与 LocalStorage 本地存储，完成后 Git 提交并直连推送到 GitHub 远程仓库。
design:
  architecture:
    framework: html
  styleKeywords:
    - 玻璃拟态 Glassmorphism
    - 柔和渐变
    - 轻科技感
    - 微交互动效
    - 卡片式布局
  fontSystem:
    fontFamily: PingFang-SC
    heading:
      size: 40px
      weight: 700
    subheading:
      size: 20px
      weight: 700
    body:
      size: 14px
      weight: 400
  colorSystem:
    primary:
      - "#5B5FE9"
      - "#7C4DFF"
      - "#FF7A9A"
    background:
      - "#EEF1FB"
      - "#F7F4FF"
      - "#FFFFFF"
    text:
      - "#2B2D42"
      - "#6C6F85"
      - "#FFFFFF"
    functional:
      - "#22C55E"
      - "#EF4444"
      - "#F59E0B"
todos:
  - id: extend-storage-layer
    content: 改造 loadPosts/savePosts：字段归一化补 likes、单调唯一 id、写入失败提示
    status: completed
  - id: add-search-filter
    content: 新增搜索栏与 renderPosts 关键词过滤、命中计数与空态
    status: completed
    dependencies:
      - extend-storage-layer
  - id: add-edit-flow
    content: 实现编辑态：回填表单、保存修改/取消编辑、列表标记与滚动定位
    status: completed
    dependencies:
      - extend-storage-layer
  - id: add-like-action
    content: 新增点赞按钮与计数持久化，扩展列表事件委托为多动作
    status: completed
    dependencies:
      - extend-storage-layer
  - id: hot-topic-bridge
    content: 热搜条目可点击/回车预填标题并平滑滚动聚焦发布表单
    status: completed
    dependencies:
      - add-edit-flow
  - id: verify-with-playwright
    content: Use [skill:playwright-cli] 验证发布、搜索、编辑、点赞、删除与刷新持久化并截图
    status: completed
    dependencies:
      - add-search-filter
      - add-edit-flow
      - add-like-action
      - hot-topic-bridge
  - id: commit-and-push
    content: 提交 v1.1 并 git push -u origin main 直连推送，失败如实反馈
    status: completed
    dependencies:
      - verify-with-playwright
---

## 需求概述

在已有「小晶推送馆」单页（`index.html`）基础上做功能增强，保持现有视觉外观与交互基调不变，交付一个可直接双击打开运行的静态页面。

## 核心功能

- 今日热搜：展示 10 条内置热点，含排名徽章、分类标签、热度条与热度数值，按热度降序排列。
- 发布个人推送：填写标题（≤60 字）与正文（≤1000 字），提交后即时出现在「我的推送」列表顶部；空标题、空正文、全空均给出明确错误提示。
- 查看与持久化：列表按时间倒序展示标题、时间、正文；数据通过 Local Storage 保存，刷新/重开浏览器后仍在；存储不可用或已满时降级不崩溃。
- 删除推送：二次确认后删除并同步存储。
- 新增搜索筛选：按标题与正文模糊匹配（忽略大小写），实时过滤，并显示「共 N 条 / 命中 M 条」。
- 新增编辑推送：单条进入编辑态，回填到表单，按钮变为「保存修改」，可取消；保存后更新原条目并保留累计点赞数。
- 新增点赞：每条推送可点赞/取消点赞，计数落库持久化。
- 新增热搜联动：点击热搜条目自动预填到发布表单标题，便于围绕热点发布。
- 兼容旧数据：v1.0 已存在的本地推送记录不会丢失，自动补齐新字段。

## 版本管理与发布

- 使用 Git 提交本次增强（中文提交信息），直连推送到已配置的 GitHub 远程仓库 `origin` 的 `main` 分支并建立上游追踪；若网络不可达，如实反馈错误原因，不伪造成功结果。

## 视觉与体验

沿用现有渐变玻璃拟态卡片风格：淡紫蓝渐变背景、半透明白色卡片、渐变主按钮、圆角与柔和投影。新增控件（搜索框、编辑/点赞按钮）沿用同一套 CSS 变量与圆角、阴影、悬停微动效；列表与热搜保持左右两栏，窄屏（≤860px）自动单列。整体只做增量，不改变原有版式与配色。

## 技术栈

- 纯 HTML5 + CSS3 + 原生 JavaScript（ES5/ES6 语法，无构建、无依赖、无 CDN），单文件内联，保持项目现状。
- 数据持久化：`window.localStorage`，键名沿用 `xjjg_posts`，值为推送对象数组的 JSON。
- 版本管理：Git，远程 `origin = https://github.com/Hehuanjing/xiaojing-push-hall.git`，分支 `main`。

## 实现方案

在现有 `index.html`（534 行，内联 `<style>` 与 `<script>`）上做增量改造，复用既有函数与样式变量，不重写、不重构无关代码。

1. **数据模型与存储层（改造现有 `loadPosts`/`savePosts`）**

- 记录结构：`{ id: number, title: string, body: string, time: number, likes: number }`。
- `loadPosts()` 在现有类型校验基础上做字段归一化：`likes` 缺失或非数字时补 `0`，标题/正文做 `slice` 长度上限截断，避免历史脏数据导致渲染异常。
- `id` 生成由 `Date.now()` 改为单调唯一（`Date.now() * 1000 + counter` 或 `Date.now() + Math.random()` 后取整），规避快速连续发布导致的同 id 与编辑/点赞/删除定位错乱。
- 保持 `storageAvailable()` 探测与 `memoryStore` 内存降级、`try/catch` 静默降级逻辑不变；写入失败时沿用 `showHint` 提示，不抛出阻断流程。
- 新增内存态 `editingId`（`null` 表示新增态），不落库。

2. **搜索筛选（新增）**

- 在「我的推送」卡片标题下插入搜索输入框，复用 `.form-row input` 的输入样式并新增窄高度变体类。
- `renderPosts()` 改为：先 `posts.slice().sort((a,b)=>b.time-a.time)`（避免原地排序副作用），再按 `keyword` 过滤（`title` 与 `body` 拼接后 `toLowerCase().includes`），最后渲染。
- 计数文案区分「共 N 条」与「命中 M 条」；命中为空时渲染独立空态（区别于「还没有推送」）。
- 输入事件做轻量防抖（约 120ms）或用 `input` 直接重渲染（数据量小，单次渲染 O(n)，n 为用户本地条目数，无需虚拟化）。

3. **编辑流程（新增）**

- 列表每条动作区改为「编辑 / 点赞 / 删除」三个按钮，统一用 `.btn-icon` 基类 + `data-id`、`data-action`，沿用现有 `#postList` 事件委托模式，不新增多点绑定。
- 进入编辑：填充 `#titleInput`/`#bodyInput`，主按钮文案切为「保存修改」并展示「取消编辑」次级按钮，卡片滚动到表单并用输入框 `focus()`；离开编辑（取消/保存/删除当前项）时复位为新增态。
- 提交分支：`editingId === null` 走 `push`，否则定位记录更新 `title`/`body`/`time`，`likes` 保留；更新后清空表单并提示。
- 编辑中若表单被清空/校验失败，沿用现有三段校验与 `showHint(text, ok)` 提示风格。

4. **点赞（新增）**

- 沿用点击事件委托，`data-action="like"` 时对该记录 `likes = (likes|0) + 1`（再次点击可取消：`likes > 0 ? likes - 1 : 0`），`savePosts` 后仅重渲染列表并保持滚动位置与搜索关键词，避免整页抖动。
- 按钮上直接展示计数，为 0 时不显示数字。

5. **热搜联动（新增）**

- 热搜项由 `renderHotList()` 生成的 `div` 增加 `tabindex="0"`、`role="button"` 与 `data-index`；点击或 `Enter` 时取对应 `HOT_TOPICS` 标题预填 `#titleInput`，并 `scrollIntoView({behavior:"smooth"})` 到发布卡片、聚焦正文输入框。
- 复用 `HOT_TOPICS` 数组，不重复定义数据。

6. **安全与健壮性**

- 所有渲染继续使用现有 `escapeHtml()` 拼接字符串，新增字段（如计数、关键词）不直接插入用户输入；`keyword` 不写入 HTML。
- 新增 CSS 只追加，不改动既有选择器；动画沿用 `fadeUp/popIn` 关键帧，新增元素继承延迟节奏。

## 实施要点

- 修改集中在 `index.html` 的 `<style>` 尾部（追加新样式）与 `<script>` 内对应函数：`loadPosts`、`savePosts`、`renderPosts`、`renderHotList`、表单 submit 处理器、`#postList` 事件委托、初始化 IIFE；DOM 侧仅新增搜索框、编辑态按钮、动作按钮容器。
- 性能：渲染为整块 `innerHTML` 重建，用户本地条目规模小（几十条量级），可接受；不引入 `requestAnimationFrame`/虚拟列表等过度设计。搜索过滤为 O(n) 字符串匹配。
- 兼容性：不改 `xjjg_posts` 键名与数据结构主字段，保证 v1.0 数据可直接读取；不使用可选链等新语法之外的能力以外的高级特性，保持可双击直接运行。
- 版本管理：改动完成后 `git add -A`，提交信息如 `feat: 小晶推送馆 v1.1 支持搜索/编辑/点赞`；`git push -u origin main` 直连推送。若报 `Failed to connect to github.com:443` 等网络错误，如实回报并给出可重试命令，不修改 git 全局代理配置。

## 架构设计

单文件分层结构（与现状一致）：样式层（CSS 变量 + 组件类）→ 结构层（banner / 两栏 layout 三张卡片）→ 逻辑层（存储层 load/save 与降级 → 工具层 escapeHtml/formatTime/showHint → 渲染层 renderHotList/renderPosts → 事件层 表单 submit、列表事件委托 → 初始化 IIFE）。新增能力挂接在既有渲染层与事件层，不新增模块或文件依赖。

## 目录结构

```
lastday/
├── index.html    # [MODIFY] 小晶推送馆单页。新增：搜索框与窄版输入样式、动作按钮组（编辑/点赞/删除）、编辑态按钮与取消按钮、
│                 #          编辑状态 editingId 与提交分支、点赞计数持久化、热搜项可点击预填标题、
│                 #          loadPosts 字段归一化（likes 默认 0）与单调唯一 id、renderPosts 关键词过滤与命中空态、
│                 #          列表事件委托扩展 data-action、追加 CSS（搜索栏、动作区、点赞态、编辑态按钮）
├── README.md     # [NEW] 项目说明：页面定位、功能清单、本地打开方式、Local Storage 键名 xjjg_posts 与数据结构、Git 推送说明
└── .gitignore    # [KEEP] 现有忽略规则（.playwright-cli/、Thumbs.db、.DS_Store），无需改动
```

## 设计定位

沿用现有「渐变玻璃拟态 + 轻科技感」风格做增量扩展，不改变整体版式、配色与信息层级，新增控件在视觉上与原表单、按钮、标签同源。

## 增量界面设计

- 我的推送卡片头部：标题下方插入搜索栏，胶囊形窄输入框，左侧内嵌放大镜图标（纯 CSS/字符实现，不引入图标库），聚焦时沿用主色描边与 4px 柔光外发光；右侧显示「共 N 条 · 命中 M 条」灰色小字。
- 推送条目动作区：标题行右侧新增动作按钮组，编辑与删除为弱化图标按钮（透明底、悬停变主色/危险色浅底 + 1.1 倍缩放），点赞按钮为胶囊状，含点赞图形与计数，已点赞时填充 `--primary-2` 渐变前景并轻微弹跳动画。
- 编辑态：发布卡主按钮文案切为「保存修改」，按钮下方并排出现「取消编辑」次级按钮（白底描边、悬停主色描边），编辑中的条目在列表内以 2px 主色渐变左边框标记。
- 热搜联动：热搜条目悬停时现有右移效果保留，并新增右侧「去发布」提示文字淡入；点击后表单聚焦并滚动，标题输入框出现一次 0.6s 主色呼吸高亮。
- 空态与提示：区分「还没有推送」与「没有匹配的推送」两种插画式空态，文案与图标保持现有 `.empty` 风格。

## 交互与动效

输入框聚焦、按钮悬停、条目悬停均沿用现有 0.2s~0.25s 缓动；新增元素入场使用现有 `fadeUp/popIn` 关键帧并沿用逐条延迟节奏；点赞与保存成功复用 `showHint` 顶部短提示（2.6s 淡出），不新增弹窗。

## 响应式

≤860px 时搜索栏与动作区随卡片单列排布；动作按钮保证最小 32px 点击热区；文字超长时标题单行省略、正文换行保留。

## Agent Extensions

### Skill

- **playwright-cli**
- Purpose: 在本地以 `file://` 打开 `index.html`，自动化验证「发布 → 刷新后仍在 → 搜索过滤 → 编辑保存 → 点赞计数 → 删除」全链路，并截图确认新增控件与原有视觉一致、窄屏布局正常。
- Expected outcome: 产出可复现的验证结论与截图证据，确认 Local Storage 读写、编辑态切换、点赞持久化均符合预期，无控制台报错或回归。