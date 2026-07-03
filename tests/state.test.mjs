import test from "node:test";
import assert from "node:assert/strict";
import { ENEMY_TYPES, POWER_UPS, SHOTGUN } from "../src/core/constants.js";
import { createGameState, createPlayer, shouldSpawnExtraction } from "../src/core/state.js";
import {
  applyStockHits,
  applyPelletHits,
  completeExtraction,
  configureLevel,
  createEnemy,
  fireShotgun,
  spawnLevelEnemies,
  spawnPowerUp,
  startReload,
  swingStock,
  updateGame,
} from "../src/core/systems.js";

test("player starts with eight shotgun shells", () => {
  const player = createPlayer();

  assert.equal(player.ammo, 8);
  assert.equal(player.magazineSize, 8);
  assert.equal(player.reloading, false);
});

test("level game state starts at level one with extraction hidden", () => {
  const state = createGameState("level");

  assert.equal(state.mode, "level");
  assert.equal(state.level, 1);
  assert.equal(state.extraction.active, false);
});

test("endless game state starts at wave one without extraction", () => {
  const state = createGameState("endless");

  assert.equal(state.mode, "endless");
  assert.equal(state.wave, 1);
  assert.equal(state.extraction.active, false);
});

test("shouldSpawnExtraction only allows cleared level mode states", () => {
  assert.equal(shouldSpawnExtraction({ mode: "level", enemiesRemaining: 0, bossAlive: false }), true);
  assert.equal(shouldSpawnExtraction({ mode: "level", enemiesRemaining: 1, bossAlive: false }), false);
  assert.equal(shouldSpawnExtraction({ mode: "level", enemiesRemaining: 0, bossAlive: true }), false);
  assert.equal(shouldSpawnExtraction({ mode: "endless", enemiesRemaining: 0, bossAlive: false }), false);
});

test("fireShotgun spends one shell and creates six pellets", () => {
  const state = createGameState("level");

  const fired = fireShotgun(state, { x: 1, y: 0 });

  assert.equal(fired, true);
  assert.equal(state.player.ammo, 7);
  assert.equal(state.pellets.length, 6);
});

test("wide power-up makes the shotgun spread wider", () => {
  const normalState = createGameState("level");
  const wideState = createGameState("level");
  wideState.activePowerUps.wide = 10;

  fireShotgun(normalState, { x: 1, y: 0 });
  fireShotgun(wideState, { x: 1, y: 0 });

  const normalMaxVy = Math.max(...normalState.pellets.map((pellet) => Math.abs(pellet.vy)));
  const wideMaxVy = Math.max(...wideState.pellets.map((pellet) => Math.abs(pellet.vy)));

  assert.ok(wideMaxVy > normalMaxVy * 1.4);
});

test("fastReload power-up shortens the reload timer", () => {
  const normalState = createGameState("level");
  const fastState = createGameState("level");
  normalState.player.ammo = 0;
  fastState.player.ammo = 0;
  fastState.activePowerUps.fastReload = 10;

  startReload(normalState.player, normalState.activePowerUps);
  startReload(fastState.player, fastState.activePowerUps);

  assert.ok(fastState.player.reloadTimer < normalState.player.reloadTimer);
});

test("strongRecoil power-up boosts downward air shots higher", () => {
  const normalState = createGameState("level");
  const strongState = createGameState("level");
  normalState.player.onGround = false;
  strongState.player.onGround = false;
  strongState.activePowerUps.strongRecoil = 10;

  fireShotgun(normalState, { x: 0, y: 1 });
  fireShotgun(strongState, { x: 0, y: 1 });

  assert.ok(strongState.player.vy < normalState.player.vy);
});

test("piercing power-up lets a pellet hit two enemies once", () => {
  const state = createGameState("level");
  state.activePowerUps.piercing = 10;
  state.pellets.push({
    x: 250,
    y: state.player.y + 20,
    vx: 800,
    vy: 0,
    life: 1,
    radius: 6,
    piercesRemaining: 1,
    hitEnemyIds: [],
  });
  const firstEnemy = createEnemy("fast", 244, state.player.y);
  const secondEnemy = createEnemy("fast", 250, state.player.y);
  firstEnemy.health = 10;
  secondEnemy.health = 10;
  state.enemies.push(firstEnemy);
  state.enemies.push(secondEnemy);

  applyPelletHits(state);

  assert.equal(state.enemies.length, 0);
  assert.equal(state.kills, 2);
  assert.equal(state.pellets.length, 0);
});

test("startReload begins reload timer when ammo is empty", () => {
  const state = createGameState("level");
  state.player.ammo = 0;

  const started = startReload(state.player);

  assert.equal(started, true);
  assert.equal(state.player.reloading, true);
  assert.ok(state.player.reloadTimer > 0);
});

test("swingStock opens a short active window and starts cooldown", () => {
  const state = createGameState("level");

  const swung = swingStock(state);

  assert.equal(swung, true);
  assert.ok(state.player.stockTimer > 0);
  assert.ok(state.player.stockCooldown > 0);
});

test("stock swing removes a non-boss enemy and records the kill", () => {
  const state = createGameState("level");
  const enemy = createEnemy("fat", state.player.x + state.player.w + 18, state.player.y);
  state.enemies.push(enemy);

  swingStock(state);
  applyStockHits(state);

  assert.equal(state.enemies.length, 0);
  assert.equal(state.kills, 1);
});

test("stock swing damages but does not instantly remove a boss", () => {
  const state = createGameState("level");
  const boss = createEnemy("tankBoss", state.player.x + state.player.w + 18, state.player.y - 74);
  state.enemies.push(boss);

  swingStock(state);
  applyStockHits(state);

  assert.equal(state.enemies.length, 1);
  assert.equal(state.enemies[0].type, "tankBoss");
  assert.ok(state.enemies[0].health > 0);
});

test("spawnPowerUp creates a pickup", () => {
  const state = createGameState("level");

  const pickup = spawnPowerUp(state, "piercing", 200, 300);

  assert.equal(state.pickups.length, 1);
  assert.equal(pickup.id, "piercing");
  assert.equal(pickup.x, 200);
  assert.equal(pickup.y, 300);
});

test("configureLevel prepares a boss level without required kills", () => {
  const state = createGameState("level");
  state.enemies.push(createEnemy("normal", 400, 520));
  state.pellets.push({ x: 1, y: 1, vx: 0, vy: 0, life: 1, radius: 1 });
  state.pickups.push({ id: "piercing", x: 1, y: 1, w: 26, h: 26 });
  state.effects.push({ id: 1, x: 1, y: 1, life: 1, maxLife: 1, radius: 1 });
  state.extraction.active = true;
  state.bossSpawned = true;

  configureLevel(state, 3);

  assert.equal(state.level, 3);
  assert.equal(state.requiredKills, 0);
  assert.equal(state.bossSpawned, false);
  assert.equal(state.enemies.length, 0);
  assert.equal(state.pellets.length, 0);
  assert.equal(state.pickups.length, 0);
  assert.equal(state.effects.length, 0);
  assert.equal(state.extraction.active, false);
});

test("completeExtraction advances level mode and hides extraction", () => {
  const state = createGameState("level");
  state.extraction.active = true;

  completeExtraction(state);

  assert.equal(state.level, 2);
  assert.equal(state.extraction.active, false);
  assert.ok(state.enemies.length > 0);
});

test("completeExtraction does not advance endless mode", () => {
  const state = createGameState("endless");
  state.extraction.active = true;

  completeExtraction(state);

  assert.equal(state.level, 1);
  assert.equal(state.wave, 1);
});

test("spawnLevelEnemies uses current level plans including boss levels", () => {
  const state = createGameState("level");

  configureLevel(state, 2);
  spawnLevelEnemies(state);

  assert.equal(state.enemies.length, 8);
  assert.deepEqual(
    state.enemies.map((enemy) => enemy.type),
    ["normal", "fast", "normal", "fat", "fast", "normal", "fat", "normal"],
  );

  configureLevel(state, 3);
  spawnLevelEnemies(state);

  assert.ok(state.enemies.some((enemy) => enemy.type === "tankBoss"));
  assert.equal(state.bossSpawned, true);
});

test("endless spawning never exceeds the enemy cap when near full", () => {
  const state = createGameState("endless");
  state.wave = 8;
  state.spawnTimer = 0;

  for (let index = 0; index < 17; index += 1) {
    state.enemies.push(createEnemy("normal", 900 + index * 12, 520));
  }

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.ok(state.enemies.length <= 18);
  assert.equal(state.wave, 9);
  assert.ok(state.spawnTimer > 0);
});

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
