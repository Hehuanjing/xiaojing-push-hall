---
name: commit-vue-skills
overview: 将新增的 8 个 Vue 技能目录（.codebuddy/skills/**）、.codebuddy/plans 大纲文档以及 skills-lock.json 一起加入 Git 提交，并推送到 origin/main。
todos:
  - id: verify-worktree
    content: 核对工作区状态，确认仅有 .codebuddy/ 与 skills-lock.json 待提交
    status: completed
  - id: stage-changes
    content: 按路径暂存 .codebuddy 与 skills-lock.json 并复核暂存清单
    status: completed
    dependencies:
      - verify-worktree
  - id: commit-and-push
    content: 提交并推送 origin main，验证日志与工作区干净
    status: completed
    dependencies:
      - stage-changes
---

## 产品概述

将本轮新增的 8 个 Vue 相关技能、项目规划文档以及技能锁文件纳入版本管理，并同步到远端仓库，使仓库的 AI 技能配置可复现、可协作。

## 核心功能

- 将 `.codebuddy/skills/` 下 8 个技能目录（create-adaptable-composable、vue-best-practices、vue-debug-guides、vue-jsx-best-practices、vue-options-api-best-practices、vue-pinia-best-practices、vue-router-best-practices、vue-testing-best-practices）纳入提交
- 将 `.codebuddy/plans/xiaojing-push-hall-enhance_471370de.md` 规划文档一并提交
- 将根目录 `skills-lock.json`（记录 8 个技能的来源 vuejs-ai/skills 与校验哈希）一并提交
- 提交内容仅包含上述新增文件，不改动 `index.html`、`README.md` 等既有源码与配置
- 提交完成后推送到远程 `origin/main`，并确认远端与本地一致

## 交付效果

`git status` 中不再有未跟踪的 `.codebuddy/` 与 `skills-lock.json`；提交历史新增一条中文 `chore:` 记录；本地 `main` 与 `origin/main` 同步。

## 技术方案

本次为纯版本管理操作，不涉及代码修改，使用 Git（Windows PowerShell Core 环境）完成提交与推送。

## 实施策略

1. **提交前校验**：用 `git status --short` 与 `git diff --stat` 确认工作区仅存在 `.codebuddy/`、`skills-lock.json` 两类未跟踪项，且无其他被意外修改的已跟踪文件（如 `index.html`、`README.md`）。
2. **精确暂存**：优先显式指定路径 `git add .codebuddy skills-lock.json`，避免 `git add -A` 带入无关变更；随后用 `git status --short` 复核暂存区清单（含 205 个技能 md 文件、1 个 plan md、1 个 lock json）。
3. **提交信息**：延续仓库现有中文 `feat:`/`chore:` 风格，采用
`chore: 引入 8 个 Vue 技能与项目规划文档`。
4. **推送与验证**：`git push origin main`（不使用 `-f`，不改写历史），完成后用 `git log --oneline -3` 与 `git status -sb` 验证已同步、工作区干净。

## 实施要点

- **范围控制**：仅新增文件入版本库，零源码改动；不修改 `.gitignore`（已确认其不忽略 `.codebuddy/`）、不调整 git 配置。
- **风险规避**：`chcp` 在该 PowerShell 环境不可用会打印无害报错，忽略即可；若推送失败（如凭据/网络问题），保留本地提交并回报错误原文，不做强推。
- **可复现性**：`skills-lock.json` 与技能目录保持同一次提交，保证后续按 lock 文件恢复技能时哈希一致。

## 目录结构

```
lastday/
├── .codebuddy/
│   ├── skills/                                     # [提交] 8 个技能目录，共 205 个 md 文件
│   │   ├── create-adaptable-composable/
│   │   ├── vue-best-practices/
│   │   ├── vue-debug-guides/
│   │   ├── vue-jsx-best-practices/
│   │   ├── vue-options-api-best-practices/
│   │   ├── vue-pinia-best-practices/
│   │   ├── vue-router-best-practices/
│   │   └── vue-testing-best-practices/
│   └── plans/
│       └── xiaojing-push-hall-enhance_471370de.md    # [提交] 本次规划文档
├── skills-lock.json                                # [提交] 技能来源与哈希锁文件
├── index.html                                      # [保持不变]
├── README.md                                       # [保持不变]
└── .gitignore                                      # [保持不变]
```