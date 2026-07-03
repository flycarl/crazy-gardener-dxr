# Shotgun Gardener Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first playable browser prototype of Shotgun Gardener with movement, shotgun combat, stock swings, level mode, endless mode, a first boss, power-ups, and visible HUD feedback.

**Architecture:** Use a dependency-free static web app. Browser code is split into small ES modules for state, constants, game logic, rendering, input, and app startup; pure logic modules are testable with Node's built-in test runner.

**Tech Stack:** HTML, CSS, Canvas 2D, vanilla JavaScript ES modules, Node.js built-in `node:test` for logic checks, local static server for playtesting.

---

## File Structure

- Create `index.html`: Canvas host, HUD shell, main menu, help overlay, script entry.
- Create `src/styles.css`: Full-screen responsive game layout, HUD, menu, buttons.
- Create `src/core/constants.js`: Shared tuning values for player, weapons, enemies, levels, power-ups.
- Create `src/core/math.js`: Clamp, distance, rectangle overlap, circle hit helpers.
- Create `src/core/state.js`: Initial game state factory and state transition helpers.
- Create `src/core/systems.js`: Player physics, weapons, enemies, levels, endless waves, power-ups, collisions.
- Create `src/render.js`: Canvas drawing for world, player, shotgun, enemies, pellets, effects, extraction point.
- Create `src/input.js`: Keyboard and mouse input state, click handling, right-click prevention.
- Create `src/main.js`: App bootstrap, game loop, UI wiring, mode selection.
- Create `tests/math.test.mjs`: Tests for geometry helpers.
- Create `tests/state.test.mjs`: Tests for ammo, reload, stock swing, extraction, and boss immunity.

## Task 1: Static App Shell

**Files:**
- Create: `index.html`
- Create: `src/styles.css`
- Create: `src/main.js`

- [ ] **Step 1: Create the HTML shell**

Create `index.html` with this structure:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Shotgun Gardener</title>
    <link rel="stylesheet" href="src/styles.css">
  </head>
  <body>
    <main class="game-shell">
      <canvas id="game" width="1280" height="720" aria-label="Shotgun Gardener game canvas"></canvas>
      <section id="menu" class="overlay">
        <h1>Shotgun Gardener</h1>
        <div class="menu-actions">
          <button id="levelMode" type="button">Level Mode</button>
          <button id="endlessMode" type="button">Endless Mode</button>
        </div>
      </section>
      <section id="hud" class="hud" aria-live="polite"></section>
    </main>
    <script type="module" src="src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Add responsive visual layout**

Create `src/styles.css`:

```css
* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
  background: #182018;
  color: #f7f2dc;
  font-family: Arial, Helvetica, sans-serif;
  overflow: hidden;
}

.game-shell {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: #203522;
}

#game {
  display: block;
  width: 100vw;
  height: 100vh;
  cursor: crosshair;
}

.overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  gap: 24px;
  background: rgba(11, 18, 14, 0.72);
  text-align: center;
}

.overlay.hidden {
  display: none;
}

.overlay h1 {
  margin: 0;
  font-size: clamp(36px, 7vw, 84px);
  letter-spacing: 0;
}

.menu-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}

button {
  min-width: 148px;
  border: 2px solid #f3d36b;
  border-radius: 6px;
  padding: 12px 18px;
  background: #355c2e;
  color: #fff8d7;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

button:hover,
button:focus-visible {
  background: #487a3e;
  outline: none;
}

.hud {
  position: absolute;
  left: 16px;
  right: 16px;
  top: 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.hud span {
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 6px;
  padding: 6px 9px;
  background: rgba(0, 0, 0, 0.35);
  font-size: 14px;
  line-height: 1.2;
}
```

- [ ] **Step 3: Add a temporary bootstrap**

Create `src/main.js`:

```js
const canvas = document.querySelector("#game");
const context = canvas.getContext("2d");
const menu = document.querySelector("#menu");
const hud = document.querySelector("#hud");

function drawPlaceholder() {
  context.fillStyle = "#79b45d";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#24351f";
  context.fillRect(0, 560, canvas.width, 160);
  context.fillStyle = "#fff8d7";
  context.font = "28px Arial";
  context.fillText("Choose a mode to start", 48, 80);
}

function start(mode) {
  menu.classList.add("hidden");
  hud.innerHTML = `<span>Mode: ${mode}</span><span>Prototype booted</span>`;
  drawPlaceholder();
}

document.querySelector("#levelMode").addEventListener("click", () => start("Level"));
document.querySelector("#endlessMode").addEventListener("click", () => start("Endless"));
drawPlaceholder();
```

- [ ] **Step 4: Verify the shell manually**

Run: `python3 -m http.server 4173`

Open: `http://localhost:4173`

Expected: The page shows a full-screen canvas, a centered title, Level Mode and Endless Mode buttons, and clicking either hides the menu and updates the HUD.

- [ ] **Step 5: Commit the shell**

Run:

```bash
git add index.html src/styles.css src/main.js
git commit -m "feat: add game shell"
```

## Task 2: Core State And Geometry Tests

**Files:**
- Create: `src/core/constants.js`
- Create: `src/core/math.js`
- Create: `src/core/state.js`
- Create: `tests/math.test.mjs`
- Create: `tests/state.test.mjs`

- [ ] **Step 1: Write geometry tests**

Create `tests/math.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { clamp, circleRectOverlap, distance, rectsOverlap } from "../src/core/math.js";

test("clamp constrains a number to a range", () => {
  assert.equal(clamp(4, 0, 10), 4);
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(clamp(11, 0, 10), 10);
});

test("distance returns euclidean distance", () => {
  assert.equal(distance(0, 0, 3, 4), 5);
});

test("rectsOverlap detects rectangle collision", () => {
  assert.equal(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 9, y: 9, w: 10, h: 10 }), true);
  assert.equal(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 20, w: 10, h: 10 }), false);
});

test("circleRectOverlap detects pellet-style hits", () => {
  assert.equal(circleRectOverlap(8, 8, 3, { x: 0, y: 0, w: 10, h: 10 }), true);
  assert.equal(circleRectOverlap(30, 30, 3, { x: 0, y: 0, w: 10, h: 10 }), false);
});
```

- [ ] **Step 2: Write state tests**

Create `tests/state.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createGameState, createPlayer, shouldSpawnExtraction } from "../src/core/state.js";

test("player starts with eight shotgun shells", () => {
  const player = createPlayer();
  assert.equal(player.ammo, 8);
  assert.equal(player.magazineSize, 8);
  assert.equal(player.reloading, false);
});

test("level mode starts on level one without extraction", () => {
  const state = createGameState("level");
  assert.equal(state.mode, "level");
  assert.equal(state.level, 1);
  assert.equal(state.extraction.active, false);
});

test("endless mode starts with wave one and no extraction", () => {
  const state = createGameState("endless");
  assert.equal(state.mode, "endless");
  assert.equal(state.wave, 1);
  assert.equal(state.extraction.active, false);
});

test("extraction appears only in level mode after required enemies and boss are gone", () => {
  assert.equal(shouldSpawnExtraction({ mode: "level", enemiesRemaining: 0, bossAlive: false }), true);
  assert.equal(shouldSpawnExtraction({ mode: "level", enemiesRemaining: 1, bossAlive: false }), false);
  assert.equal(shouldSpawnExtraction({ mode: "level", enemiesRemaining: 0, bossAlive: true }), false);
  assert.equal(shouldSpawnExtraction({ mode: "endless", enemiesRemaining: 0, bossAlive: false }), false);
});
```

- [ ] **Step 3: Run tests to verify they fail before implementation**

Run: `node --test tests/*.test.mjs`

Expected: FAIL because `src/core/math.js` and `src/core/state.js` do not exist yet.

- [ ] **Step 4: Implement constants, math, and state**

Create `src/core/constants.js`:

```js
export const WORLD = {
  width: 2600,
  height: 720,
  groundY: 590,
  gravity: 2200,
};

export const PLAYER = {
  width: 46,
  height: 76,
  speed: 420,
  jumpVelocity: -860,
  maxHealth: 100,
};

export const SHOTGUN = {
  magazineSize: 8,
  reloadSeconds: 1.35,
  cooldownSeconds: 0.22,
  pelletCount: 8,
  pelletSpeed: 1040,
  pelletLife: 0.34,
  pelletRadius: 5,
  spreadRadians: 0.34,
  recoil: 230,
  downwardRecoil: 980,
  stockRange: 96,
  stockArcSeconds: 0.18,
  stockCooldownSeconds: 0.45,
};

export const ENEMY_TYPES = {
  normal: { label: "Normal", width: 42, height: 70, health: 24, speed: 92, damage: 12, score: 10 },
  fast: { label: "Fast", width: 38, height: 64, health: 16, speed: 156, damage: 10, score: 15 },
  fat: { label: "Fat", width: 58, height: 82, health: 58, speed: 62, damage: 18, score: 25 },
  tankBoss: { label: "Tank Boss", width: 128, height: 150, health: 520, speed: 42, damage: 25, score: 300 },
};

export const POWER_UPS = {
  piercing: { label: "Piercing Shot", duration: 10 },
  wide: { label: "Wide Spread", duration: 10 },
  fastReload: { label: "Fast Reload", duration: 10 },
  strongRecoil: { label: "Strong Recoil", duration: 10 },
  longStock: { label: "Long Stock", duration: 10 },
};
```

Create `src/core/math.js`:

```js
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function circleRectOverlap(cx, cy, radius, rect) {
  const nearestX = clamp(cx, rect.x, rect.x + rect.w);
  const nearestY = clamp(cy, rect.y, rect.y + rect.h);
  return distance(cx, cy, nearestX, nearestY) <= radius;
}

export function normalize(x, y) {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}
```

Create `src/core/state.js`:

```js
import { PLAYER, SHOTGUN, WORLD } from "./constants.js";

export function createPlayer() {
  return {
    x: 170,
    y: WORLD.groundY - PLAYER.height,
    vx: 0,
    vy: 0,
    w: PLAYER.width,
    h: PLAYER.height,
    health: PLAYER.maxHealth,
    facing: 1,
    onGround: true,
    ammo: SHOTGUN.magazineSize,
    magazineSize: SHOTGUN.magazineSize,
    reloading: false,
    reloadTimer: 0,
    shotCooldown: 0,
    stockCooldown: 0,
    stockTimer: 0,
  };
}

export function createGameState(mode = "level") {
  return {
    mode,
    status: "playing",
    level: 1,
    wave: 1,
    score: 0,
    kills: 0,
    cameraX: 0,
    player: createPlayer(),
    enemies: [],
    pellets: [],
    pickups: [],
    effects: [],
    activePowerUps: {},
    extraction: { active: false, x: WORLD.width - 220, y: WORLD.groundY - 90, w: 86, h: 90 },
    spawnTimer: 0,
    requiredKills: mode === "level" ? 8 : Infinity,
    bossSpawned: false,
  };
}

export function shouldSpawnExtraction({ mode, enemiesRemaining, bossAlive }) {
  return mode === "level" && enemiesRemaining === 0 && bossAlive === false;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test tests/*.test.mjs`

Expected: PASS for all geometry and state tests.

- [ ] **Step 6: Commit core logic**

Run:

```bash
git add src/core/constants.js src/core/math.js src/core/state.js tests/math.test.mjs tests/state.test.mjs
git commit -m "test: add core game state checks"
```

## Task 3: Input, Player Movement, Weapon Firing

**Files:**
- Create: `src/input.js`
- Create: `src/core/systems.js`
- Modify: `src/main.js`
- Modify: `tests/state.test.mjs`

- [ ] **Step 1: Add weapon behavior tests**

Append to `tests/state.test.mjs`:

```js
import { fireShotgun, startReload, swingStock } from "../src/core/systems.js";

test("firing shotgun consumes one shell and creates pellets", () => {
  const state = createGameState("level");
  fireShotgun(state, { x: 1, y: 0 });
  assert.equal(state.player.ammo, 7);
  assert.equal(state.pellets.length, 8);
});

test("shotgun starts reloading when ammo reaches zero", () => {
  const state = createGameState("level");
  state.player.ammo = 0;
  startReload(state.player);
  assert.equal(state.player.reloading, true);
  assert.ok(state.player.reloadTimer > 0);
});

test("stock swing enters a short active window", () => {
  const state = createGameState("level");
  swingStock(state);
  assert.ok(state.player.stockTimer > 0);
  assert.ok(state.player.stockCooldown > 0);
});
```

- [ ] **Step 2: Run tests to verify weapon functions fail**

Run: `node --test tests/state.test.mjs`

Expected: FAIL because `src/core/systems.js` does not export `fireShotgun`, `startReload`, or `swingStock`.

- [ ] **Step 3: Implement input tracking**

Create `src/input.js`:

```js
export function createInput(canvas) {
  const input = {
    left: false,
    right: false,
    jumpPressed: false,
    shootPressed: false,
    stockPressed: false,
    mouse: { x: 640, y: 360, worldX: 640, worldY: 360 },
  };

  window.addEventListener("keydown", (event) => {
    if (event.code === "KeyA" || event.code === "ArrowLeft") input.left = true;
    if (event.code === "KeyD" || event.code === "ArrowRight") input.right = true;
    if (event.code === "Space" || event.code === "KeyW" || event.code === "ArrowUp") input.jumpPressed = true;
  });

  window.addEventListener("keyup", (event) => {
    if (event.code === "KeyA" || event.code === "ArrowLeft") input.left = false;
    if (event.code === "KeyD" || event.code === "ArrowRight") input.right = false;
  });

  canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    input.mouse.x = (event.clientX - rect.left) * scaleX;
    input.mouse.y = (event.clientY - rect.top) * scaleY;
  });

  canvas.addEventListener("mousedown", (event) => {
    if (event.button === 0) input.shootPressed = true;
    if (event.button === 2) input.stockPressed = true;
  });

  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  return input;
}

export function consumePressed(input) {
  const pressed = {
    jumpPressed: input.jumpPressed,
    shootPressed: input.shootPressed,
    stockPressed: input.stockPressed,
  };
  input.jumpPressed = false;
  input.shootPressed = false;
  input.stockPressed = false;
  return pressed;
}
```

- [ ] **Step 4: Implement movement and weapon systems**

Create `src/core/systems.js` with movement, reload, shotgun, and stock functions:

```js
import { ENEMY_TYPES, PLAYER, POWER_UPS, SHOTGUN, WORLD } from "./constants.js";
import { clamp, circleRectOverlap, normalize, rectsOverlap } from "./math.js";
import { shouldSpawnExtraction } from "./state.js";

export function startReload(player) {
  if (player.reloading || player.ammo === player.magazineSize) return;
  player.reloading = true;
  player.reloadTimer = SHOTGUN.reloadSeconds;
}

export function fireShotgun(state, aim) {
  const player = state.player;
  if (player.reloading || player.shotCooldown > 0 || player.ammo <= 0) {
    if (player.ammo <= 0) startReload(player);
    return false;
  }

  const direction = normalize(aim.x, aim.y);
  const spread = hasPowerUp(state, "wide") ? SHOTGUN.spreadRadians * 1.55 : SHOTGUN.spreadRadians;
  const pelletCount = SHOTGUN.pelletCount;
  const origin = { x: player.x + player.w / 2 + direction.x * 36, y: player.y + player.h * 0.45 + direction.y * 24 };

  for (let index = 0; index < pelletCount; index += 1) {
    const t = pelletCount === 1 ? 0 : index / (pelletCount - 1) - 0.5;
    const angle = Math.atan2(direction.y, direction.x) + t * spread;
    state.pellets.push({
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * SHOTGUN.pelletSpeed,
      vy: Math.sin(angle) * SHOTGUN.pelletSpeed,
      radius: SHOTGUN.pelletRadius,
      life: SHOTGUN.pelletLife,
      pierces: hasPowerUp(state, "piercing") ? 1 : 0,
    });
  }

  player.ammo -= 1;
  player.shotCooldown = SHOTGUN.cooldownSeconds;
  player.vx -= direction.x * SHOTGUN.recoil;
  player.vy -= direction.y * SHOTGUN.recoil;
  if (!player.onGround && direction.y > 0.55) {
    player.vy -= hasPowerUp(state, "strongRecoil") ? SHOTGUN.downwardRecoil * 1.45 : SHOTGUN.downwardRecoil;
  }
  if (player.ammo === 0) startReload(player);
  state.effects.push({ type: "muzzle", x: origin.x, y: origin.y, life: 0.08 });
  return true;
}

export function swingStock(state) {
  const player = state.player;
  if (player.stockCooldown > 0) return false;
  player.stockTimer = SHOTGUN.stockArcSeconds;
  player.stockCooldown = SHOTGUN.stockCooldownSeconds;
  state.effects.push({ type: "stock", x: player.x + player.w / 2, y: player.y + player.h * 0.45, life: SHOTGUN.stockArcSeconds });
  return true;
}

export function updateGame(state, input, pressed, dt) {
  const player = state.player;
  updatePowerUps(state, dt);
  updatePlayer(state, input, pressed, dt);
  updatePellets(state, dt);
  updateEnemies(state, dt);
  updatePickups(state, dt);
  updateEffects(state, dt);
  updateLevelState(state);
}

function updatePlayer(state, input, pressed, dt) {
  const player = state.player;
  player.shotCooldown = Math.max(0, player.shotCooldown - dt);
  player.stockCooldown = Math.max(0, player.stockCooldown - dt);
  player.stockTimer = Math.max(0, player.stockTimer - dt);
  if (player.reloading) {
    const reloadScale = hasPowerUp(state, "fastReload") ? 0.55 : 1;
    player.reloadTimer -= dt / reloadScale;
    if (player.reloadTimer <= 0) {
      player.reloading = false;
      player.reloadTimer = 0;
      player.ammo = player.magazineSize;
    }
  }

  const move = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  player.vx = move * PLAYER.speed;
  if (move !== 0) player.facing = move;
  if (pressed.jumpPressed && player.onGround) {
    player.vy = PLAYER.jumpVelocity;
    player.onGround = false;
  }

  const aim = normalize(input.mouse.worldX - (player.x + player.w / 2), input.mouse.worldY - (player.y + player.h / 2));
  if (pressed.shootPressed) fireShotgun(state, aim);
  if (pressed.stockPressed) swingStock(state);

  player.vy += WORLD.gravity * dt;
  player.x = clamp(player.x + player.vx * dt, 0, WORLD.width - player.w);
  player.y += player.vy * dt;
  if (player.y + player.h >= WORLD.groundY) {
    player.y = WORLD.groundY - player.h;
    player.vy = 0;
    player.onGround = true;
  }
}

function updatePellets(state, dt) {
  for (const pellet of state.pellets) {
    pellet.x += pellet.vx * dt;
    pellet.y += pellet.vy * dt;
    pellet.life -= dt;
  }
  state.pellets = state.pellets.filter((pellet) => pellet.life > 0);
}

export function hasPowerUp(state, id) {
  return Boolean(state.activePowerUps[id] && state.activePowerUps[id] > 0);
}

function updatePowerUps(state, dt) {
  for (const id of Object.keys(state.activePowerUps)) {
    state.activePowerUps[id] -= dt;
    if (state.activePowerUps[id] <= 0) delete state.activePowerUps[id];
  }
}

function updateEnemies() {}
function updatePickups() {}
function updateEffects(state, dt) {
  state.effects = state.effects.filter((effect) => {
    effect.life -= dt;
    return effect.life > 0;
  });
}
function updateLevelState() {}
```

- [ ] **Step 5: Run tests to verify weapon behavior passes**

Run: `node --test tests/*.test.mjs`

Expected: PASS.

- [ ] **Step 6: Wire input and game loop in main**

Replace `src/main.js` with a real loop that imports `createInput`, `consumePressed`, `createGameState`, `updateGame`, and `drawGame`. The exact draw function is introduced in Task 4; until then use a local `drawPlaceholder(state)` that shows player position, ammo, and mode.

- [ ] **Step 7: Commit movement and weapon systems**

Run:

```bash
git add src/input.js src/core/systems.js src/main.js tests/state.test.mjs
git commit -m "feat: add player movement and shotgun systems"
```

## Task 4: Enemies, Combat, Power-Ups, Rendering

**Files:**
- Modify: `src/core/systems.js`
- Create: `src/render.js`
- Modify: `src/main.js`
- Modify: `tests/state.test.mjs`

- [ ] **Step 1: Add combat tests**

Append to `tests/state.test.mjs`:

```js
import { applyStockHits, createEnemy, spawnPowerUp } from "../src/core/systems.js";

test("stock swing kills non-boss enemies in range", () => {
  const state = createGameState("level");
  state.enemies.push(createEnemy("fat", state.player.x + 70, state.player.y));
  swingStock(state);
  applyStockHits(state);
  assert.equal(state.enemies.length, 0);
  assert.equal(state.kills, 1);
});

test("stock swing does not instantly kill boss enemies", () => {
  const state = createGameState("level");
  state.enemies.push(createEnemy("tankBoss", state.player.x + 70, state.player.y - 70));
  swingStock(state);
  applyStockHits(state);
  assert.equal(state.enemies.length, 1);
  assert.equal(state.enemies[0].type, "tankBoss");
});

test("spawnPowerUp creates a timed pickup", () => {
  const state = createGameState("level");
  spawnPowerUp(state, "piercing", 200, 300);
  assert.equal(state.pickups.length, 1);
  assert.equal(state.pickups[0].id, "piercing");
});
```

- [ ] **Step 2: Implement enemy creation, collisions, and power-ups**

Extend `src/core/systems.js` with:

```js
let nextEntityId = 1;

export function createEnemy(type, x, y) {
  const stats = ENEMY_TYPES[type];
  return {
    id: nextEntityId += 1,
    type,
    boss: type === "tankBoss",
    x,
    y,
    vx: 0,
    vy: 0,
    w: stats.width,
    h: stats.height,
    health: stats.health,
    maxHealth: stats.health,
    speed: stats.speed,
    damage: stats.damage,
    score: stats.score,
    hitCooldown: 0,
  };
}

export function spawnPowerUp(state, id, x, y) {
  state.pickups.push({ id, x, y, w: 28, h: 28, vy: -180, life: 12 });
}

export function applyStockHits(state) {
  if (state.player.stockTimer <= 0) return;
  const range = hasPowerUp(state, "longStock") ? SHOTGUN.stockRange * 1.45 : SHOTGUN.stockRange;
  const player = state.player;
  const hitBox = {
    x: player.facing > 0 ? player.x + player.w * 0.5 : player.x + player.w * 0.5 - range,
    y: player.y + 8,
    w: range,
    h: player.h * 0.76,
  };

  for (const enemy of state.enemies) {
    if (!rectsOverlap(hitBox, enemy)) continue;
    if (enemy.boss) {
      enemy.health -= 16;
      enemy.vx += player.facing * 280;
      continue;
    }
    enemy.health = 0;
    enemy.vx = player.facing * 760;
    enemy.vy = -420;
    state.effects.push({ type: "launch", x: enemy.x + enemy.w / 2, y: enemy.y, life: 0.35 });
  }
  removeDeadEnemies(state);
}

function applyPelletHits(state) {
  for (const pellet of state.pellets) {
    for (const enemy of state.enemies) {
      if (circleRectOverlap(pellet.x, pellet.y, pellet.radius, enemy)) {
        enemy.health -= enemy.boss ? 8 : 14;
        enemy.vx += Math.sign(pellet.vx) * 90;
        pellet.life = pellet.pierces > 0 ? pellet.life : 0;
        pellet.pierces -= 1;
        state.effects.push({ type: "hit", x: pellet.x, y: pellet.y, life: 0.12 });
        break;
      }
    }
  }
  removeDeadEnemies(state);
}

function removeDeadEnemies(state) {
  const before = state.enemies.length;
  state.enemies = state.enemies.filter((enemy) => enemy.health > 0 || enemy.y < WORLD.groundY + 260);
  const killed = before - state.enemies.length;
  if (killed > 0) {
    state.kills += killed;
    state.score += killed * 10;
    if (state.kills % 5 === 0) {
      const ids = Object.keys(POWER_UPS);
      spawnPowerUp(state, ids[(state.kills / 5) % ids.length], state.player.x + 120, WORLD.groundY - 120);
    }
  }
}
```

Update internal `updateEnemies`, `updatePickups`, and `updateLevelState` to call these helpers, move enemies toward the player, apply contact damage cooldowns, collect power-ups, and remove defeated enemies.

- [ ] **Step 3: Create renderer**

Create `src/render.js` with exported `drawGame(context, canvas, state, input)`. It should draw sky, ground, parallax garden props, extraction point when active, pickups, pellets, effects, enemies with health bars, the player, shotgun barrel toward the mouse, stock swing arc, and compact HUD text through DOM updates.

- [ ] **Step 4: Wire renderer into main loop**

Update `src/main.js` so it:

```js
import { createInput, consumePressed } from "./input.js";
import { createGameState } from "./core/state.js";
import { updateGame } from "./core/systems.js";
import { drawGame } from "./render.js";
```

It should create state on mode selection, update `input.mouse.worldX` from `cameraX`, call `updateGame`, then call `drawGame`.

- [ ] **Step 5: Run tests and manual combat check**

Run: `node --test tests/*.test.mjs`

Expected: PASS.

Manual expected result: Player can move, jump, aim, shoot pellets, kill normal enemies, right-click stock swing kills normal enemies in range, and power-ups can be collected.

- [ ] **Step 6: Commit enemies and rendering**

Run:

```bash
git add src/core/systems.js src/render.js src/main.js tests/state.test.mjs
git commit -m "feat: add enemies combat and rendering"
```

## Task 5: Level Mode, Boss Level, Endless Mode

**Files:**
- Modify: `src/core/systems.js`
- Modify: `src/core/constants.js`
- Modify: `src/render.js`
- Modify: `tests/state.test.mjs`

- [ ] **Step 1: Add progression tests**

Append to `tests/state.test.mjs`:

```js
import { configureLevel, completeExtraction, spawnLevelEnemies } from "../src/core/systems.js";

test("third level is configured as a boss level", () => {
  const state = createGameState("level");
  configureLevel(state, 3);
  assert.equal(state.level, 3);
  assert.equal(state.requiredKills, 0);
  assert.equal(state.bossSpawned, false);
});

test("completeExtraction advances level mode to the next level", () => {
  const state = createGameState("level");
  state.extraction.active = true;
  completeExtraction(state);
  assert.equal(state.level, 2);
  assert.equal(state.extraction.active, false);
});

test("endless extraction completion does not advance levels", () => {
  const state = createGameState("endless");
  completeExtraction(state);
  assert.equal(state.level, 1);
  assert.equal(state.wave, 1);
});
```

- [ ] **Step 2: Implement level configuration**

Add level definitions to `src/core/constants.js`:

```js
export const LEVELS = [
  { level: 1, enemies: ["normal", "normal", "normal", "fast", "normal", "fat"] },
  { level: 2, enemies: ["normal", "fast", "normal", "fat", "fast", "normal", "fat", "normal"] },
  { level: 3, enemies: ["normal", "fast", "fat"], boss: "tankBoss" },
];
```

Add `configureLevel`, `spawnLevelEnemies`, and `completeExtraction` to `src/core/systems.js`. Level 3 should spawn the tank boss after the opening enemies or immediately if simpler for the prototype. `completeExtraction` should clear combat arrays, increment level, and configure the next level.

- [ ] **Step 3: Implement endless wave spawning**

In `src/core/systems.js`, add endless scaling:

```js
function updateEndlessSpawns(state, dt) {
  if (state.mode !== "endless") return;
  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) return;
  state.spawnTimer = Math.max(0.65, 2.2 - state.wave * 0.08);
  const type = state.wave % 5 === 0 ? "fat" : state.wave % 3 === 0 ? "fast" : "normal";
  const side = Math.random() < 0.5 ? -120 : WORLD.width + 120;
  state.enemies.push(createEnemy(type, side, WORLD.groundY - ENEMY_TYPES[type].height));
  if (state.kills > state.wave * 8) state.wave += 1;
  if (state.wave % 6 === 0 && !state.enemies.some((enemy) => enemy.boss)) {
    state.enemies.push(createEnemy("tankBoss", WORLD.width - 260, WORLD.groundY - ENEMY_TYPES.tankBoss.height));
  }
}
```

- [ ] **Step 4: Add extraction collision**

In `updateLevelState`, activate extraction only when `shouldSpawnExtraction` is true and call `completeExtraction` when the player's rectangle overlaps the active extraction rectangle.

- [ ] **Step 5: Run tests and manual progression check**

Run: `node --test tests/*.test.mjs`

Expected: PASS.

Manual expected result: Level Mode advances from level 1 to 2, level 3 contains the tank boss, and Endless Mode keeps creating waves without showing extraction.

- [ ] **Step 6: Commit mode progression**

Run:

```bash
git add src/core/constants.js src/core/systems.js src/render.js tests/state.test.mjs
git commit -m "feat: add level and endless progression"
```

## Task 6: Polish, Browser Verification, Final Save

**Files:**
- Modify: `src/styles.css`
- Modify: `src/render.js`
- Modify: `src/main.js`
- Modify: `docs/superpowers/specs/2026-07-03-shotgun-gardener-design.md` only if playtesting reveals a spec mismatch that should be documented.

- [ ] **Step 1: Add readable controls overlay**

Add compact non-intrusive control text to the menu or HUD: `A/D move`, `Space jump`, `Mouse aim`, `Left click shoot`, `Right click stock swing`.

- [ ] **Step 2: Improve action feedback**

Tune colors, hit flashes, muzzle flash, pellet trails, stock arc, launch effect, boss health bar, reload text, and extraction glow until each core mechanic is visible while moving.

- [ ] **Step 3: Run syntax and logic tests**

Run: `node --test tests/*.test.mjs`

Expected: PASS.

- [ ] **Step 4: Start local server for playtest**

Run: `python3 -m http.server 4173`

Open: `http://localhost:4173`

Manual checks:

- Level Mode starts and is playable.
- Endless Mode starts and is playable.
- Player cannot leave world bounds.
- Left click consumes ammo and reloads at 0.
- Airborne downward shot launches higher.
- Right click instantly kills non-boss zombies in range.
- Right click does not instantly kill the tank boss.
- Power-ups drop, apply, expire, and show in HUD.
- Extraction appears after normal level clear and after boss defeat.

- [ ] **Step 5: Commit final prototype**

Run:

```bash
git add index.html src tests docs
git commit -m "feat: finish first playable shotgun gardener prototype"
```

## Self-Review

- Spec coverage: This plan covers the approved first prototype scope: static browser app, level and endless modes, movement, jumping, mouse aim, shotgun with 8-round magazine and auto reload, airborne downward recoil jump, right-click stock swing, three normal enemy types, tank boss, extraction, power-ups, HUD, and browser verification.
- Deferred scope remains deferred: throwing zombie, charging boss, ranged boss, detailed sprite art, persistent save data, and audio polish.
- Placeholder scan: No task contains placeholder markers. The only conditional language is limited to manual verification choices and a documented allowed spec-sync edit if playtesting reveals a mismatch.
- Type consistency: Core names are consistent across tasks: `createGameState`, `createPlayer`, `fireShotgun`, `startReload`, `swingStock`, `createEnemy`, `spawnPowerUp`, `applyStockHits`, `configureLevel`, `spawnLevelEnemies`, `completeExtraction`, and `drawGame`.
