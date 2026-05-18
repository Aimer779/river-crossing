# PRD-Core：状态模型、规则内核与技术架构

---

## 1. 状态模型

规则逻辑必须独立于 Phaser，放在 `src/core/rules.ts`。

推荐类型：

```ts
type Side = 'left' | 'right';

type BankState = {
  huaqiang: number;
  haoge: number;
};

type GameStatus = 'playing' | 'win' | 'lose';

type GameState = {
  left: BankState;
  right: BankState;
  boatSide: Side;
  boat: BankState;
  status: GameStatus;
  steps: number;
};

type Move = {
  huaqiang: number;
  haoge: number;
  from: Side;
  to: Side;
};
```

初始状态：

```ts
const initialState: GameState = {
  left: { huaqiang: 3, haoge: 3 },
  right: { huaqiang: 0, haoge: 0 },
  boatSide: 'left',
  boat: { huaqiang: 0, haoge: 0 },
  status: 'playing',
  steps: 0
};
```

---

## 2. 核心规则函数

### 2.1 判断某岸是否安全

```ts
function isBankSafe(bank: BankState): boolean
```

逻辑：郝哥数量为 0 → 安全；华强数量 ≤ 郝哥数量 → 安全；否则不安全。

### 2.2 判断整个状态是否安全

```ts
function isStateSafe(state: GameState): boolean
```

逻辑：左岸安全且右岸安全 → 安全；任意一岸不安全 → 不安全。

### 2.3 判断是否胜利

```ts
function isWin(state: GameState): boolean
```

条件：左岸华强 = 0，左岸郝哥 = 0，右岸华强 = 3，右岸郝哥 = 3，船在右岸。

### 2.4 判断是否失败

```ts
function isLose(state: GameState): boolean
```

条件：左岸不安全，或右岸不安全。

### 2.5 获取当前可执行移动

```ts
function getPossibleMoves(state: GameState): Move[]
```

返回船当前所在岸理论上可执行的移动，不判断移动后是否失败。

可能组合：`{1,0} / {0,1} / {2,0} / {0,2} / {1,1}`（huaqiang, haoge）。

需过滤：船当前岸人数不足的组合、空组合、超容量组合。

### 2.6 获取安全移动

```ts
function getSafeMoves(state: GameState): Move[]
```

返回移动后不会失败的移动。用途：提示系统、AI 自动演示、BFS 求解器。

### 2.7 应用移动

```ts
function applyMove(state: GameState, move: Move): ApplyMoveResult
```

推荐返回结构：

```ts
type ApplyMoveResult = {
  ok: boolean;
  state?: GameState;
  reason?: IllegalReason;
};

type IllegalReason =
  | 'EMPTY_BOAT'
  | 'OVER_CAPACITY'
  | 'NOT_ENOUGH_PEOPLE'
  | 'WRONG_SIDE'
  | 'GAME_NOT_PLAYING'
  | 'BOAT_MOVING';
```

注意：`applyMove` 不直接修改原始 state，必须返回新对象；总人数守恒；船移动后船上人数清零；船位置切换到对岸；steps +1。

### 2.8 BFS 求解器

```ts
function solveByBFS(state: GameState): Move[]
```

要求：从当前状态搜索最短胜利路径；只使用安全移动；返回一组 Move；无解返回空数组；不允许硬编码答案。

用途：提示按钮、AI 自动演示、自动化测试、确认规则可解。

---

## 3. 标准可行路径

以下路径仅用于测试，不应硬编码进游戏逻辑。

初始：左岸 3 华强 + 3 郝哥，右岸 0 华强 + 0 郝哥，船在左岸。

1. 2 华强 → 右岸
2. 1 华强 ← 左岸
3. 2 华强 → 右岸
4. 1 华强 ← 左岸
5. 2 郝哥 → 右岸
6. 1 华强 + 1 郝哥 ← 左岸
7. 2 郝哥 → 右岸
8. 1 华强 ← 左岸
9. 2 华强 → 右岸
10. 1 华强 ← 左岸
11. 2 华强 → 右岸

验收：BFS 从初始状态能找到 11 步解；AI 演示应能按 BFS 结果通关；提示系统第一步应推荐"2 华强去右岸"。

---

## 4. 技术架构建议

推荐目录结构：

```
src/
  main.ts
  core/
    types.ts
    rules.ts
    solver.ts
    history.ts
  scenes/
    BootScene.ts
    TitleScene.ts
    GameScene.ts
    GameOverScene.ts
  components/
    Character.ts
    Boat.ts
    UIButton.ts
    Toast.ts
    HistoryPanel.ts
  config/
    gameConfig.ts
    layout.ts
    assets.ts
    audio.ts
  utils/
    cloneState.ts
    eventBus.ts
    device.ts
assets/
  images/
  spritesheets/
  audio/
  ui/
```

核心原则：
- `core` 层不依赖 Phaser。
- Phaser 只负责展示、动画、输入和音频。
- 所有规则判断都调用 `core/rules.ts`。
- 提示和 AI 演示调用同一个 BFS solver。
- 撤销恢复的是完整 GameState，不是单独修改角色坐标。

---

## 5. 实现重点

项目最重要的不是 Phaser 动画，而是规则内核。请优先完成：

```ts
isBankSafe()
isStateSafe()
isWin()
isLose()
getPossibleMoves()
getSafeMoves()
applyMove()
solveByBFS()
```

所有游戏表现都围绕这些函数展开。

不要把规则散落写在 GameScene里；不要让动画直接决定规则状态；不要硬编码最优解；不要让提示系统和 AI 演示各写一套逻辑；不要让 UI 显示的数据和真实 GameState 分离。

正确结构：规则内核负责判断；GameScene 负责调用；动画系统负责表现；UI 负责显示；BFS 负责提示和自动演示；历史栈负责撤销。

**一句话原则：先做一个完全正确的规则游戏，再把它包装成一个好笑的整活游戏。**
