# LESSONS.md

> 本文件记录项目开发过程中的关键洞察、最佳实践和已知陷阱。
> 每次新任务开始前先读取本文件；每次任务结束后如有新发现，追加到末尾。

---

## 阶段一复查

### 洞察

- **角色图要先处理成固定透明帧**：AI/设计工具导出的“透明棋盘格”可能已经被烘进 PNG，不能直接进 Phaser。可用 `scripts/prepare-character.ps1` 从边缘 flood fill 扣掉近白/灰背景，再输出固定 `96x128` 透明画布，脚底用 `FootY=116` 对齐；腿缝这类封闭背景需要加 `-CleanInteriorBackground -InteriorCleanupStartY 58` 从身体下半部分清理，避免误删眼白和脸部高光。
- **白色船体素材不要全图清理近白背景**：摩托艇这类素材本体有大面积白色外壳和高光，不能直接使用 `-CleanInteriorBackground`，否则会误删船身；优先只做边缘 flood fill，再人工检查封闭空洞是否明显。
- **音频设置统一走 `config/audio.ts`**：音效/语音/环境音量和静音状态通过 `loadAudioSettings()` / `saveAudioSettings()` 存到 `localStorage`，场景创建和播放前调用 `applyAudioSettings(this.sound)`；单个音效播放时再读取对应 channel 音量。
- **背景音乐要从用户手势启动并防重复**：浏览器会限制自动播放，循环背景音乐应在“开始游戏”等用户点击回调里调用 `startBackgroundMusic(this.sound)`；该函数用全局 sound manager 查询已有 `backgroundMusic` 实例，避免返回标题后再次开始时叠加播放。
- **分场景循环音乐要成对切换**：标题页音乐和非标题页环境音都走 ambience 音量，但进入标题页要停 `backgroundMusic` 并启动 `titleMusic`，进入游戏/结算等非标题页要停 `titleMusic` 并启动 `backgroundMusic`，避免两个循环音源叠播。
- **布局调参会被 localStorage 覆盖默认值**：`?dev=1` 开启开发者布局模式后，按 Enter 会把 `SceneLayout` 保存到 `localStorage`。后续即使代码里的 `defaultSceneLayout` 已更新，本机浏览器仍会优先使用保存值；验证固化布局时需要在开发者模式按 Backspace 清除本地覆盖。
- **船上视觉状态可与核心岸边状态短暂分离**：开船后核心 `GameState` 会立即把乘客计入目标岸，以保证规则、胜负、历史和撤销逻辑仍是单步完成；展示层可以保留 `selectedIds` 并让角色继续显示在船上，直到玩家点击下船。不要把这种视觉停留写回 core 层，否则会破坏当前 `applyMove()` 的状态模型。
- **BFS 验收不能只看结果长度**：当前 solver 能从初始状态找到 11 步解，首步也是 2 华强去右岸；但实现没有复用 `getSafeMoves()`，而是自行枚举并通过 `applyMove()` 扩展状态。由于 `applyMove()` 会允许导致失败的合法移动并返回 `status: 'lose'`，BFS 会短暂把失败状态加入搜索队列，虽不影响当前答案，但不满足 PRD 中“只使用安全移动”的实现约束。
- **核心函数要兜住 Move 边界**：`applyMove()` 已校验 `move.from` 是否等于船所在岸，但还应校验 `move.to` 是否为对岸，避免外部传入畸形 `Move` 时核心层默默纠正而不是明确拒绝。
- **阶段一缺少自动化规则测试**：`tsc` 和 `pnpm build` 只能证明类型和构建通过，不能证明人数守恒、非法原因、失败/胜利、BFS 最短路径等规则不回归。阶段二前应补一组无额外依赖的核心断言脚本，或经确认后引入测试框架。
- **Node 脚本里不要再 spawn `pnpm`**：Windows 下 `execFileSync('pnpm')` / `execFileSync('pnpm.cmd')` 在当前环境会分别遇到 `ENOENT` / `EINVAL`。项目脚本如需临时编译 TS，直接用 `process.execPath` 执行本地 `node_modules/typescript/bin/tsc` 更稳定。
- **中文姓名输入优先用 Phaser DOM 输入框**：排行榜这类需要输入中文的界面不要用键盘事件手搓文本框，IME 组合输入会很麻烦；在 `gameConfig` 里开启 `dom.createContainer` 后用真实 `<input>`，再把保存/读取逻辑隔离到 service 层，后续替换 Supabase 更顺。
- **生产部署资源不要裸写根目录路径**：Vite 开发服务器能读到项目根目录 `assets/`，但生产构建不会自动把根目录资源复制到 `dist/`。Phaser `load.image/audio` 如果写 `'assets/...'`，Vercel 上会 404 并导致缓存 key 缺失。应在配置层用 `../../assets/xxx?url` import，让 Vite 追踪并输出带 hash 的生产 URL；或把静态资源放进 `public/`。
- **移动端点击错位优先查 scale bounds 和视口高度**：固定 1280x720 + `Phaser.Scale.FIT` 本身会等比缩放，但移动端地址栏收起、横竖屏切换、外层 CSS viewport 高度变化后，Phaser 输入坐标可能使用旧 bounds。页面容器应使用 `100dvh`/fixed/inset 布局并禁用默认触摸手势，窗口和 `visualViewport` 尺寸变化后调用 `game.scale.updateBounds()` + `game.scale.refresh()`。

## 初始化阶段

### 洞察

- **PRD 拆分**：1640 行的单文件 PRD 严重阻碍小任务推进。按职责拆分为 7 个文档后（总计 763 行），任务对应性和开发可读性显著提升。拆分时不压缩内容，只压缩排版（合并短列表、去掉冗余空行）。
- **AGENTS.md 结构**：一份好的 AGENTS.md 应同时包含项目概述、技术栈约束（含显式依赖白名单）、文档分布说明、常用命令、以及 Lessons 机制本身。这是后续所有协作者（包括 AI）快速建立上下文的关键入口。
- **规则先行**：`core/` 层（types/rules/solver/history）不依赖 Phaser，纯 TypeScript 实现。骨架搭建时直接把这些核心逻辑写完，后续阶段二~四只是"怎么表现"的问题，大幅降低调试复杂度。
- **提交规范**：使用 Conventional Commits（`type(scope): subject`）。`docs` 用于文档变更，`chore` 用于构建/工具配置，`feat` 用于功能代码。

### 最佳实践

- **手动创建 package.json 而非 `create-vite`**：当目标目录已存在 `.git`、PRD 等文件时，`create-vite` 的交互式提示会被取消。手动写 `package.json` + `tsconfig.json` + `vite.config.ts` 更可控。
- **pnpm 优先**：本项目使用 pnpm 管理依赖，锁文件为 `pnpm-lock.yaml`。AGENTS.md 中应列出常用命令（`dev` / `build` / `preview` / `tsc --noEmit`）。
- **GitHub 仓库创建**：使用 `gh repo create` 可直接关联本地仓库为 origin，省去手动 `git remote add`。

### 已知陷阱

- **TypeScript 5.7 + `moduleResolution: "bundler"`**：
  - `baseUrl` 被标记为弃用，IDE 会对 `tsconfig.json` 标红。
  - 移除 `baseUrl` 后，`paths` 中的值必须改为相对路径（`"./src/*"` 而非 `"src/*"`），否则 `tsc` 报错 `TS5090: Non-relative paths are not allowed when 'baseUrl' is not set`。
- **Windows 换行符**：Git 默认将 LF 替换为 CRLF，提交时会产生大量 `warning: LF will be replaced by CRLF`。这不影响功能，但会污染命令行输出。如需避免，可设置 `git config core.autocrlf false`（团队统一即可）。
- **Vite 构建时 chunk 体积警告**：Phaser 本身约 1.4MB，Vite 构建时会提示 chunk 过大。这是预期行为，MVP 阶段无需处理代码分割。
- **空目录不进入 Git**：`assets/` 下的空子目录（`images/`、`audio/` 等）不会被 Git 追踪。需要时在对应目录下放 `.gitkeep`，或等正式资源放入后自然解决。
- **Phaser 组件字段命名**：`Phaser.GameObjects.Container` 已有 `body` 字段用于物理系统。自定义组件里不要把矩形/船体命名为 `body`，否则 TypeScript 会认为子类覆盖了基类物理字段；用 `hull`、`block` 等更具体的名称。

---
