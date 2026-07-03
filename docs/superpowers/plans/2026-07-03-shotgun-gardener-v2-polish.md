# 疯狂园丁 V2 手感与表现升级实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把第一版网页原型升级为中文界面、关卡流程更清晰、镜头跟随更自然、枪托挥杆和尸体击飞更有表现力的 V2 原型。

**Architecture:** 继续使用现有静态网页架构。核心状态和玩法逻辑放在 `src/core/*`，Canvas 绘制和 HUD 放在 `src/render.js`，DOM 按钮和主循环放在 `src/main.js`；所有关键行为先补 Node 测试再实现。

**Tech Stack:** HTML、CSS、Canvas 2D、原生 JavaScript ES modules、Node.js `node:test`。

---

## 文件结构

- 修改 `index.html`：菜单中文化，加入下一关面板和按钮。
- 修改 `src/styles.css`：下一关面板样式，中文按钮和覆盖层样式。
- 修改 `src/core/constants.js`：中文标签、敌人数值、散弹数量、后坐力。
- 修改 `src/core/state.js`：新增下一关等待、尸体、浮动文字等初始状态。
- 修改 `src/core/systems.js`：新增尸体、浮动文字、Boss 延迟生成、下一关推进、平滑镜头、数值效果。
- 修改 `src/render.js`：中文 HUD、Boss 顶部大血条、挥杆动画、尸体、浮动文字、下一关状态。
- 修改 `src/main.js`：绑定“下一关”按钮，更新鼠标世界坐标。
- 修改 `tests/state.test.mjs`：新增 V2 行为测试。

## Task 1: 数值、中文标签和基础状态

**Files:**
- Modify: `src/core/constants.js`
- Modify: `src/core/state.js`
- Modify: `tests/state.test.mjs`

- [ ] **Step 1: 写失败测试**

在 `tests/state.test.mjs` 追加：

```js
import { ENEMY_TYPES, POWER_UPS, SHOTGUN } from "../src/core/constants.js";

test("V2 uses fewer shotgun pellets and Chinese power-up labels", () => {
  assert.equal(SHOTGUN.pelletCount, 6);
  assert.equal(POWER_UPS.piercing.label, "穿透弹");
  assert.equal(POWER_UPS.wide.label, "大扩散");
  assert.equal(POWER_UPS.fastReload.label, "快速换弹");
  assert.equal(POWER_UPS.strongRecoil.label, "强后坐力");
  assert.equal(POWER_UPS.longStock.label, "长枪托");
});

test("V2 slows zombies while increasing normal zombie health", () => {
  assert.ok(ENEMY_TYPES.normal.speed <= 70);
  assert.ok(ENEMY_TYPES.normal.health >= 30);
  assert.ok(ENEMY_TYPES.fast.speed <= 130);
  assert.ok(ENEMY_TYPES.fat.health >= 66);
});

test("new game state includes corpses floating texts and next-level flow flags", () => {
  const state = createGameState("level");
  assert.deepEqual(state.corpses, []);
  assert.deepEqual(state.floatTexts, []);
  assert.equal(state.awaitingNextLevel, false);
  assert.equal(state.pendingBoss, false);
});
```

- [ ] **Step 2: 确认测试失败**

Run: `node --test tests/state.test.mjs`

Expected: FAIL，因为常量和状态字段尚未改为 V2。

- [ ] **Step 3: 实现常量和状态**

修改 `src/core/constants.js`：

```js
export const SHOTGUN = {
  magazineSize: 8,
  reloadSeconds: 1.35,
  cooldownSeconds: 0.24,
  pelletCount: 6,
  pelletSpeed: 1040,
  pelletLife: 0.34,
  pelletRadius: 5,
  spreadRadians: 0.3,
  recoil: 190,
  downwardRecoil: 640,
  stockRange: 96,
  stockArcSeconds: 0.24,
  stockCooldownSeconds: 0.5,
};

export const ENEMY_TYPES = {
  normal: { label: "普通僵尸", width: 42, height: 70, health: 32, speed: 68, damage: 12, score: 10 },
  fast: { label: "快跑僵尸", width: 38, height: 64, health: 20, speed: 124, damage: 10, score: 15 },
  fat: { label: "胖僵尸", width: 58, height: 82, health: 68, speed: 52, damage: 18, score: 25 },
  tankBoss: { label: "巨型肉盾 Boss", width: 128, height: 150, health: 560, speed: 34, damage: 25, score: 300 },
};

export const POWER_UPS = {
  piercing: { label: "穿透弹", duration: 10 },
  wide: { label: "大扩散", duration: 10 },
  fastReload: { label: "快速换弹", duration: 10 },
  strongRecoil: { label: "强后坐力", duration: 10 },
  longStock: { label: "长枪托", duration: 10 },
};
```

修改 `src/core/state.js`，在 `createGameState` 返回值中加入：

```js
corpses: [],
floatTexts: [],
awaitingNextLevel: false,
pendingBoss: false,
pendingBossType: null,
nextLevel: 1,
```

- [ ] **Step 4: 确认测试通过**

Run: `node --test tests/*.test.mjs`

Expected: PASS。

- [ ] **Step 5: 提交**

Run:

```bash
git add src/core/constants.js src/core/state.js tests/state.test.mjs
git commit -m "feat: tune V2 combat constants"
```

## Task 2: 强化提示、尸体和枪托击飞

**Files:**
- Modify: `src/core/systems.js`
- Modify: `tests/state.test.mjs`

- [ ] **Step 1: 写失败测试**

在 `tests/state.test.mjs` 追加：

```js
import { updateGame } from "../src/core/systems.js";

test("picking up a power-up creates a Chinese floating pickup message", () => {
  const state = createGameState("level");
  spawnPowerUp(state, "piercing", state.player.x, state.player.y);
  updateGame(state, { left: false, right: false, mouse: { worldX: 0, worldY: 0 } }, {}, 1 / 60);
  assert.equal(state.activePowerUps.piercing > 0, true);
  assert.equal(state.floatTexts.some((text) => text.text === "获得：穿透弹"), true);
});

test("stock-killed non-boss enemies become flying corpses for five seconds", () => {
  const state = createGameState("level");
  state.enemies.push(createEnemy("normal", state.player.x + 60, state.player.y));
  swingStock(state);
  applyStockHits(state);
  assert.equal(state.enemies.length, 0);
  assert.equal(state.corpses.length, 1);
  assert.equal(state.corpses[0].life, 5);
  assert.ok(Math.abs(state.corpses[0].vx) > 300);
  assert.ok(state.corpses[0].vy < 0);
});
```

- [ ] **Step 2: 确认测试失败**

Run: `node --test tests/state.test.mjs`

Expected: FAIL，因为还没有 `floatTexts` 生成和尸体生成。

- [ ] **Step 3: 实现提示和尸体**

在 `src/core/systems.js` 中增加：

```js
function addFloatText(state, text, x, y, color = "#fff8d7") {
  state.floatTexts.push({ text, x, y, vy: -38, life: 1.2, maxLife: 1.2, color });
}

function createCorpseFromEnemy(enemy, direction) {
  return {
    id: `corpse-${enemy.id}`,
    type: enemy.type,
    x: enemy.x,
    y: enemy.y,
    w: enemy.w,
    h: enemy.h,
    vx: direction * 620,
    vy: -520,
    life: 5,
    rotation: 0,
    spin: direction * 5.5,
  };
}
```

拾取强化时调用：

```js
addFloatText(state, `获得：${POWER_UPS[pickup.id].label}`, player.x + player.w / 2, player.y - 18, pickup.color);
```

枪托秒杀普通敌人时加入尸体：

```js
state.corpses.push(createCorpseFromEnemy(enemy, player.facing));
```

新增 `updateCorpses` 和 `updateFloatTexts`，在 `updateGame` 中调用，尸体受重力影响，5 秒后移除。

- [ ] **Step 4: 确认测试通过**

Run: `node --test tests/*.test.mjs`

Expected: PASS。

- [ ] **Step 5: 提交**

Run:

```bash
git add src/core/systems.js tests/state.test.mjs
git commit -m "feat: add V2 pickup text and flying corpses"
```

## Task 3: 下一关流程和 Boss 延迟生成

**Files:**
- Modify: `index.html`
- Modify: `src/main.js`
- Modify: `src/core/systems.js`
- Modify: `tests/state.test.mjs`

- [ ] **Step 1: 写失败测试**

在 `tests/state.test.mjs` 追加：

```js
import { advanceToNextLevel } from "../src/core/systems.js";

test("clearing a normal level waits for next-level confirmation instead of instantly extracting", () => {
  const state = createGameState("level");
  configureLevel(state, 1);
  state.requiredKills = 1;
  state.kills = 1;
  state.enemies = [];
  updateGame(state, { left: false, right: false, mouse: { worldX: 0, worldY: 0 } }, {}, 1 / 60);
  assert.equal(state.awaitingNextLevel, true);
  assert.equal(state.extraction.active, false);
});

test("advanceToNextLevel returns player to spawn and starts the next level", () => {
  const state = createGameState("level");
  state.awaitingNextLevel = true;
  state.nextLevel = 2;
  state.player.x = 900;
  state.player.ammo = 0;
  advanceToNextLevel(state);
  assert.equal(state.level, 2);
  assert.equal(state.player.x, 170);
  assert.equal(state.player.ammo, state.player.magazineSize);
  assert.equal(state.awaitingNextLevel, false);
  assert.ok(state.enemies.length > 0);
});

test("boss levels spawn the boss only after pre-boss enemies are cleared", () => {
  const state = createGameState("level");
  configureLevel(state, 3);
  spawnLevelEnemies(state);
  assert.equal(state.enemies.some((enemy) => enemy.isBoss), false);
  state.enemies = [];
  updateGame(state, { left: false, right: false, mouse: { worldX: 0, worldY: 0 } }, {}, 1 / 60);
  assert.equal(state.enemies.some((enemy) => enemy.isBoss), true);
});
```

- [ ] **Step 2: 确认测试失败**

Run: `node --test tests/state.test.mjs`

Expected: FAIL，因为尚未实现等待下一关和 Boss 延迟生成。

- [ ] **Step 3: 实现系统流程**

在 `src/core/systems.js` 中：

- 导出 `advanceToNextLevel(state)`。
- `configureLevel` 设置 `state.nextLevel = level`，重置 `awaitingNextLevel`。
- Boss 关 `spawnLevelEnemies` 只生成 `plan.enemies`，设置 `pendingBoss=true` 和 `pendingBossType=plan.boss`，不立即生成 Boss。
- `updateLevelBookkeeping` 中：
  - 普通关清完后设置 `awaitingNextLevel=true` 和 `nextLevel=state.level + 1`。
  - Boss 关小怪清完且 `pendingBoss=true` 时生成 Boss，位置为玩家面向方向 600 像素附近。
  - Boss 死亡后设置 `awaitingNextLevel=true`。
- `completeExtraction` 可以保留兼容测试，但内部改为调用 `advanceToNextLevel`。

- [ ] **Step 4: 实现按钮绑定**

在 `index.html` 加入：

```html
<section id="nextLevelPanel" class="next-level-panel hidden">
  <div>通关！</div>
  <button id="nextLevelButton" type="button">下一关</button>
</section>
```

在 `src/main.js` 中：

```js
import { advanceToNextLevel, configureLevel, spawnLevelEnemies, updateGame } from "./core/systems.js";

const nextLevelPanel = document.querySelector("#nextLevelPanel");
document.querySelector("#nextLevelButton").addEventListener("click", () => {
  if (state) advanceToNextLevel(state);
});
```

每帧根据 `state.awaitingNextLevel` 显示/隐藏面板。

- [ ] **Step 5: 确认测试通过**

Run: `node --test tests/*.test.mjs`

Expected: PASS。

- [ ] **Step 6: 提交**

Run:

```bash
git add index.html src/main.js src/core/systems.js tests/state.test.mjs
git commit -m "feat: add V2 level flow"
```

## Task 4: 中文 HUD、Boss 血条、镜头和挥杆表现

**Files:**
- Modify: `src/render.js`
- Modify: `src/styles.css`
- Modify: `src/core/systems.js`
- Modify: `src/main.js`

- [ ] **Step 1: 实现平滑镜头**

在 `src/core/systems.js` 的 `updateGame` 末尾，将硬切镜头改为插值：

```js
const targetCameraX = clamp(player.x + player.w / 2 - 420, 0, Math.max(0, WORLD.width - 1280));
state.cameraX += (targetCameraX - state.cameraX) * Math.min(1, step * 8);
```

确保 `main.js` 每帧仍用 `input.mouse.worldX = state.cameraX + input.mouse.x`。

- [ ] **Step 2: 实现中文 HUD**

在 `src/render.js` 中把 HUD 文本改为中文：

```js
`生命：${Math.ceil(player.health)}`
`弹药：${player.ammo}/${player.magazineSize}`
`换弹：${player.reloading ? `${player.reloadTimer.toFixed(1)}秒` : "准备就绪"}`
`第 ${state.level} 关`
`第 ${state.wave} 波`
`剩余怪物：${state.enemiesRemaining ?? state.enemies.length}`
`击杀：${state.kills}`
`分数：${state.score}`
```

无尽模式不输出“剩余怪物”。

- [ ] **Step 3: 实现 Boss 顶部大血条**

在 `src/render.js` 新增 `drawBossBar(context, canvas, state)`：

```js
const boss = state.enemies.find((enemy) => enemy.isBoss);
if (!boss) return;
const ratio = Math.max(0, boss.health / boss.maxHealth);
context.fillStyle = "rgba(0, 0, 0, 0.55)";
context.fillRect(canvas.width / 2 - 260, 18, 520, 28);
context.fillStyle = "#d7263d";
context.fillRect(canvas.width / 2 - 256, 22, 512 * ratio, 20);
context.fillStyle = "#fff8d7";
context.font = "bold 16px Arial";
context.textAlign = "center";
context.fillText(boss.label, canvas.width / 2, 39);
```

在绘制末尾调用。

- [ ] **Step 4: 绘制尸体、浮动文字和挥杆动画**

在 `src/render.js`：

- 新增 `drawCorpses`，使用 `corpse.rotation` 旋转绘制死亡僵尸矩形。
- 新增 `drawFloatTexts`，按 `life / maxLife` 透明淡出。
- 改 `drawStockArc`：根据 `player.stockTimer / SHOTGUN.stockArcSeconds` 计算挥杆进度，让弧线从身后扫到身前。
- 改 `drawPlayer`：枪管方向在挥杆时跟随挥杆角度偏转。

- [ ] **Step 5: 样式与中文菜单**

在 `index.html` 中把标题和按钮改为中文：

```html
<h1>疯狂园丁</h1>
<button id="levelMode" type="button">关卡模式</button>
<button id="endlessMode" type="button">无尽模式</button>
```

在 `src/styles.css` 中确保 `next-level-panel` 居中但不遮挡 HUD，按钮焦点仍可见。

- [ ] **Step 6: 手动验证**

Run: `node --test tests/*.test.mjs`

Expected: PASS。

Run: `python3 -m http.server 4173`

Manual expected:

- 菜单和 HUD 中文。
- 镜头跟随玩家。
- Boss 出现后顶部大血条显示。
- 强化拾取文字出现。
- 枪托挥杆和尸体可见。

- [ ] **Step 7: 提交**

Run:

```bash
git add index.html src/styles.css src/render.js src/core/systems.js src/main.js
git commit -m "feat: localize and polish V2 presentation"
```

## Task 5: 最终验证

**Files:**
- Modify: none unless verification finds a bug.

- [ ] **Step 1: 运行自动测试**

Run: `node --test tests/*.test.mjs`

Expected: PASS，全部测试通过。

- [ ] **Step 2: 检查空白和语法**

Run: `git diff --check`

Expected: no output, exit 0。

- [ ] **Step 3: 运行本地服务**

Run: `python3 -m http.server 4173`

Open: `http://127.0.0.1:4173/`

Manual checklist:

- 关卡模式可开始。
- 无尽模式可开始。
- 关卡模式显示剩余怪物，无尽模式不显示。
- 第 3 关小怪清完后 Boss 在中等距离生成。
- Boss 顶部大血条显示。
- 清关后出现“下一关”按钮，点击后回出生点。
- 右键挥杆能击飞尸体，尸体约 5 秒消失。
- 强化拾取有中文提示。
- 后坐力不再过高，弹丸数量明显更少。

- [ ] **Step 4: 最终提交**

如果 Task 5 发现并修复了问题：

```bash
git add index.html src tests docs
git commit -m "fix: verify V2 polish flow"
```

如果没有改动，不创建空提交。

## 自检

- 规格覆盖：计划覆盖中文化、强化提示、镜头跟随、下一关按钮、敌人数值、挥杆、尸体、后坐力、弹丸数、剩余怪物、Boss 大血条、Boss 延迟生成。
- 完整性检查：计划不包含待填内容；每个任务都有明确文件、测试、实现方向和验证命令。
- 类型一致性：新增字段统一使用 `corpses`、`floatTexts`、`awaitingNextLevel`、`pendingBoss`、`pendingBossType`、`nextLevel`；新增函数统一使用 `advanceToNextLevel`。
