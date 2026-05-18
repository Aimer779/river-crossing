# AGENTS.md

## Project Overview 项目概述

《郝哥求生指南》是一款 Web 端单关卡 2D 逻辑解谜小游戏，玩法原型为 Missionaries and Cannibals（传教士与野人）的魔改版。

玩家需要操作 3 个"华强"和 3 个"郝哥"乘船过河。船每次最多坐 2 人，至少 1 人才能开船。核心限制是：任意一岸只要"华强数量 > 郝哥数量"且该岸还有郝哥，游戏失败。目标是在不触发失败的前提下，把所有角色从左岸运送到右岸。

游戏风格为"Q 版市井荒诞风"，表现层围绕玩法做整活包装，但底层规则保持经典逻辑谜题的严谨性。

---

## Tech Stack 技术栈

- **游戏引擎**：Phaser 3
- **开发语言**：TypeScript
- **构建工具**：Vite
- **目标平台**：桌面浏览器、移动端横屏浏览器
- **推荐逻辑画布**：1280 × 720

### 显式依赖（仅使用以下技术，不要直接引入其他依赖除非用户显式说明）

- `phaser` — 游戏引擎，负责场景、动画、输入、音频
- `typescript` — 类型系统
- `vite` — 构建与开发服务器

如需引入额外依赖（如状态管理库、测试框架、UI 组件库等），必须先征得用户同意。

### 核心目录结构（规划）

```
src/
  main.ts
  core/           # 纯逻辑，不依赖 Phaser
    types.ts
    rules.ts
    solver.ts
    history.ts
  scenes/         # Phaser 场景
    BootScene.ts
    TitleScene.ts
    GameScene.ts
    GameOverScene.ts
  components/     # 可复用游戏对象/UI组件
    Character.ts
    Boat.ts
    UIButton.ts
    Toast.ts
    HistoryPanel.ts
  config/         # 配置
    gameConfig.ts
    layout.ts
    assets.ts
    audio.ts
  utils/          # 工具函数
    cloneState.ts
    eventBus.ts
    device.ts
assets/
  images/
  spritesheets/
  audio/
  ui/
docs/             # PRD 文档（见下文）
```

---

## Project Context 项目文档分布说明

项目需求已拆分为多个 PRD 文档，存放于 `docs/` 目录。处理对应模块前，应先阅读相关文档：

| 文档 | 内容 | 对应开发工作 |
|---|---|---|
| `docs/PRD-Overview.md` | 项目概述、核心玩法规则、关键产品决策、优先级 | 所有人优先阅读，了解全貌 |
| `docs/PRD-Core.md` | 状态模型、核心规则函数、BFS 求解器、技术架构、实现重点 | 规则内核开发、状态管理、BFS/提示/AI 逻辑 |
| `docs/PRD-Scenes.md` | BootScene / TitleScene / GameScene / GameOverScene 设计 | 场景搭建、页面流转 |
| `docs/PRD-Flow-Interactions.md` | 游戏主流程、单步流程、上船/下船/开船/撤销/提示/AI 演示交互 | 交互逻辑开发 |
| `docs/PRD-UI.md` | 顶部状态栏、操作按钮、非法提示、历史记录、响应式适配 | UI 布局与控件开发 |
| `docs/PRD-Art-Audio.md` | 视觉风格、角色/船/背景设计、动画需求、音频需求、文案与资产清单 | 美术资源、动画、音频接入 |
| `docs/PRD-Test-Release.md` | 测试用例、验收标准、公开发布注意事项 | 测试、QA、最终验收 |

### 开发阶段参考

文档中的开发优先级划分（来自 `PRD-Overview.md`）：

1. **阶段一：规则内核** — 先完成 `core/` 层，确保规则函数 100% 正确
2. **阶段二：色块原型** — 用 Phaser 搭建可玩的完整流程，可用占位图形
3. **阶段三：视觉替换** — 接入正式美术资源、动画、演出效果
4. **阶段四：音频与整活** — 音效、语音、静音控制
5. **阶段五：测试与部署** — 边界测试、移动端适配、构建部署

### 关键原则（来自 `PRD-Core.md`）

- `core/` 层**不依赖 Phaser**，纯 TypeScript 逻辑
- Phaser 只负责展示、动画、输入和音频
- 所有规则判断调用 `core/rules.ts`
- 提示系统和 AI 演示共用同一个 BFS solver
- 撤销恢复的是完整 `GameState`，不是单独修改角色坐标

---

## Lessons

`LESSON.md` 记录了之前任务中发现的关键洞察、最佳实践和已知陷阱。

- **每次新任务开始前**，先读取 `LESSON.md`。
- **每次任务结束后**，如果有新的发现，追加进 `LESSON.md`。

该文件是项目知识库，持续积累，避免重复踩坑。

