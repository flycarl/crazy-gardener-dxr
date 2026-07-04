import test from "node:test";
import assert from "node:assert/strict";
import { ENEMY_TYPES, LEVELS, POWER_UPS, RIFLE, SHOTGUN, WORLD } from "../src/core/constants.js";
import { createGameState, createPlayer, shouldSpawnExtraction } from "../src/core/state.js";
import {
  applyStockHits,
  applyPelletHits,
  completeExtraction,
  configureBalloonLevel,
  configureLevel,
  createEnemy,
  fireShotgun,
  advanceToNextLevel,
  spawnLevelEnemies,
  spawnPowerUp,
  queueDoubleShot,
  restartChallenge,
  startReload,
  swingStock,
  updateGame,
} from "../src/core/systems.js";

test("player starts with two shotgun shells after each reload", () => {
  const player = createPlayer();

  assert.equal(player.ammo, 2);
  assert.equal(player.magazineSize, 2);
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

test("balloon mode starts with eight pistol shots and a thirty second timer", () => {
  const state = createGameState("balloon");
  configureBalloonLevel(state, 1);

  assert.equal(state.mode, "balloon");
  assert.equal(state.player.ammo, 8);
  assert.equal(state.player.magazineSize, 8);
  assert.equal(state.balloonTimer, 30);
  assert.equal(state.requiredKills, 5);
  assert.equal(state.enemies.length, 5);
  assert.equal(state.enemies.every((enemy) => enemy.type === "balloon" && enemy.flying), true);
});

test("rifle weapon starts level mode with thirty rifle rounds", () => {
  const state = createGameState("level", "rifle");

  assert.equal(state.weapon, "rifle");
  assert.equal(state.player.ammo, 30);
  assert.equal(state.player.magazineSize, 30);
});

test("balloon mode keeps the pistol even when rifle is selected", () => {
  const state = createGameState("balloon", "rifle");
  configureBalloonLevel(state, 1);

  assert.equal(state.weapon, "pistol");
  assert.equal(state.player.ammo, 8);
  assert.equal(state.player.magazineSize, 8);
});

test("camera follows the player vertically when Dave launches upward", () => {
  const state = createGameState("level");
  state.player.y = 120;
  state.player.vy = -200;

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.ok(state.cameraY < 0);
});

test("shouldSpawnExtraction only allows cleared level mode states", () => {
  assert.equal(shouldSpawnExtraction({ mode: "level", enemiesRemaining: 0, bossAlive: false }), true);
  assert.equal(shouldSpawnExtraction({ mode: "level", enemiesRemaining: 1, bossAlive: false }), false);
  assert.equal(shouldSpawnExtraction({ mode: "level", enemiesRemaining: 0, bossAlive: true }), false);
  assert.equal(shouldSpawnExtraction({ mode: "endless", enemiesRemaining: 0, bossAlive: false }), false);
});

test("fireShotgun spends one shell and creates five pellets", () => {
  const state = createGameState("level");

  const fired = fireShotgun(state, { x: 1, y: 0 });

  assert.equal(fired, true);
  assert.equal(state.player.ammo, 1);
  assert.equal(state.pellets.length, 5);
});

test("rifle fires one piercing bullet from a thirty round magazine", () => {
  const state = createGameState("level", "rifle");

  const fired = fireShotgun(state, { x: 1, y: 0 });

  assert.equal(fired, true);
  assert.equal(state.player.ammo, 29);
  assert.equal(state.pellets.length, 1);
  assert.equal(state.pellets[0].piercesRemaining, 1);
  assert.equal(state.pellets[0].damage, RIFLE.damage);
});

test("rifle bullet damages a second enemy for reduced piercing damage", () => {
  const state = createGameState("level", "rifle");
  const firstEnemy = createEnemy("fat", 250, state.player.y);
  const secondEnemy = createEnemy("fat", 254, state.player.y);
  state.enemies.push(firstEnemy, secondEnemy);
  state.pellets.push({
    x: 256,
    y: state.player.y + 20,
    vx: 1200,
    vy: 0,
    life: 1,
    radius: 4,
    damage: RIFLE.damage,
    damageFalloff: RIFLE.pierceDamageMultiplier,
    piercesRemaining: 1,
    hitEnemyIds: [],
  });

  applyPelletHits(state);

  const firstDamage = firstEnemy.maxHealth - firstEnemy.health;
  const secondDamage = secondEnemy.maxHealth - secondEnemy.health;
  assert.equal(state.pellets.length, 0);
  assert.equal(firstDamage, RIFLE.damage);
  assert.equal(secondDamage, Math.round(RIFLE.damage * RIFLE.pierceDamageMultiplier));
  assert.ok(secondDamage < firstDamage);
});

test("rapid left clicks fire as fast as the player clicks while ammo remains", () => {
  const state = createGameState("level");
  state.player.ammo = 2;
  state.player.shotCooldown = 0;

  fireShotgun(state, { x: 1, y: 0 });
  fireShotgun(state, { x: 1, y: 0 });

  assert.equal(state.player.ammo, 0);
  assert.equal(state.pellets.length, 10);
});

test("queueDoubleShot fires once immediately and schedules one follow-up blast", () => {
  const state = createGameState("level");

  const queued = queueDoubleShot(state, { x: 1, y: 0 });

  assert.equal(queued, true);
  assert.equal(state.player.ammo, 1);
  assert.equal(state.pellets.length, 5);
  assert.equal(state.player.queuedShots, 1);
  assert.ok(state.player.queuedShotDelay > 0);
});

test("updateGame fires a queued second blast after the combo delay", () => {
  const state = createGameState("level");

  queueDoubleShot(state, { x: 1, y: 0 });
  state.player.shotCooldown = 0;
  state.player.queuedShotDelay = 0;
  updateGame(
    state,
    {
      left: false,
      right: false,
      aim: { x: 1, y: 0 },
      mouse: { worldX: state.player.x + 200, worldY: state.player.y },
    },
    { jumpPressed: false, shootPressed: false, stockPressed: false, doubleShotPressed: false },
    0.2,
  );

  assert.equal(state.player.ammo, 0);
  assert.equal(state.player.reloading, true);
  assert.equal(state.pellets.length, 10);
  assert.equal(state.player.queuedShots, 0);
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

test("falling into a pit costs twenty health and respawns the player", () => {
  const state = createGameState("level");
  state.player.health = 100;
  state.player.y = WORLD.height + 160;

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.equal(state.player.health, 80);
  assert.equal(state.player.onGround, true);
});

test("hurt players get occasional health drops instead of buffs", () => {
  const state = createGameState("level");
  state.player.health = 60;
  state.kills = 4;
  const enemy = createEnemy("normal", 600, 520);
  enemy.health = 0;
  state.enemies.push(enemy);

  applyPelletHits(state);

  assert.equal(state.pickups.length, 1);
  assert.equal(state.pickups[0].id, "health");
});

test("full-health players get occasional buffs instead of health drops", () => {
  const state = createGameState("level");
  state.player.health = state.player.maxHealth;
  state.kills = 6;
  const enemy = createEnemy("normal", 600, 520);
  enemy.health = 0;
  state.enemies.push(enemy);

  applyPelletHits(state);

  assert.equal(state.pickups.length, 1);
  assert.notEqual(state.pickups[0].id, "health");
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

test("stock swing first knocks back a non-boss enemy without killing it", () => {
  const state = createGameState("level");
  const enemy = createEnemy("fat", state.player.x + state.player.w + 18, state.player.y);
  state.enemies.push(enemy);

  swingStock(state);
  applyStockHits(state);

  assert.equal(state.enemies.length, 1);
  assert.equal(state.kills, 0);
  assert.equal(state.enemies[0].stockHits, 1);
  assert.ok(state.enemies[0].vx > 300);
  assert.ok(state.enemies[0].x > state.player.x + state.player.w + 18);
});

test("stock swing kills a non-boss enemy on the second hit", () => {
  const state = createGameState("level");
  const enemy = createEnemy("fat", state.player.x + state.player.w + 18, state.player.y);
  state.enemies.push(enemy);

  swingStock(state);
  applyStockHits(state);
  state.player.stockCooldown = 0;
  swingStock(state);
  applyStockHits(state);

  assert.equal(state.enemies.length, 0);
  assert.equal(state.kills, 1);
  assert.equal(state.corpses.length, 1);
});

test("running stock swing kills a non-boss enemy in one hit", () => {
  const state = createGameState("level");
  const enemy = createEnemy("fat", state.player.x + state.player.w + 18, state.player.y);
  state.player.vx = 430;
  state.enemies.push(enemy);

  swingStock(state);
  applyStockHits(state);

  assert.equal(state.enemies.length, 0);
  assert.equal(state.kills, 1);
  assert.equal(state.corpses.length, 1);
});

test("stock swing has a longer short cooldown", () => {
  assert.ok(SHOTGUN.stockCooldownSeconds >= 0.6);
});

test("spawnPowerUp creates a pickup", () => {
  const state = createGameState("level");

  const pickup = spawnPowerUp(state, "piercing", 200, 300);

  assert.equal(state.pickups.length, 1);
  assert.equal(pickup.id, "piercing");
  assert.equal(pickup.x, 200);
  assert.equal(pickup.y, 300);
});

test("configureLevel prepares every level without boss state", () => {
  const state = createGameState("level");
  state.enemies.push(createEnemy("normal", 400, 520));
  state.pellets.push({ x: 1, y: 1, vx: 0, vy: 0, life: 1, radius: 1 });
  state.pickups.push({ id: "piercing", x: 1, y: 1, w: 26, h: 26 });
  state.effects.push({ id: 1, x: 1, y: 1, life: 1, maxLife: 1, radius: 1 });
  state.extraction.active = true;
  state.bossSpawned = true;

  configureLevel(state, 3);

  assert.equal(state.level, 3);
  assert.ok(state.requiredKills > 0);
  assert.equal(state.bossSpawned, false);
  assert.equal(state.enemies.length, 0);
  assert.equal(state.pellets.length, 0);
  assert.equal(state.pickups.length, 0);
  assert.equal(state.effects.length, 0);
  assert.equal(state.extraction.active, false);
});

test("completeExtraction waits for the next-level button instead of advancing immediately", () => {
  const state = createGameState("level");
  state.level = 1;
  state.extraction.active = true;

  completeExtraction(state);

  assert.equal(state.level, 1);
  assert.equal(state.extraction.active, false);
  assert.equal(state.awaitingNextLevel, true);
  assert.equal(state.nextLevel, 2);
});

test("completeExtraction does not advance endless mode", () => {
  const state = createGameState("endless");
  state.extraction.active = true;

  completeExtraction(state);

  assert.equal(state.level, 1);
  assert.equal(state.wave, 1);
});

test("spawnLevelEnemies uses current level plans without pending bosses", () => {
  const state = createGameState("level");

  configureLevel(state, 2);
  spawnLevelEnemies(state);

  assert.equal(state.enemies.length, LEVELS[1].enemies.length);
  assert.deepEqual(
    state.enemies.map((enemy) => enemy.type),
    LEVELS[1].enemies,
  );

  configureLevel(state, 3);
  spawnLevelEnemies(state);

  assert.deepEqual(
    state.enemies.map((enemy) => enemy.type),
    LEVELS[2].enemies,
  );
  assert.equal(state.enemies.some((enemy) => enemy.isBoss), false);
  assert.equal(state.pendingBoss, false);
  assert.equal(state.pendingBossType, null);
  assert.equal(state.bossSpawned, false);
});

test("level mode has fifteen handcrafted stages with rising zombie counts", () => {
  assert.equal(LEVELS.length, 15);

  const enemyCounts = LEVELS.map((level) => level.enemies.length);
  for (let index = 1; index < enemyCounts.length; index += 1) {
    assert.ok(enemyCounts[index] >= enemyCounts[index - 1]);
  }

  assert.ok(enemyCounts[0] < enemyCounts[7]);
  assert.ok(enemyCounts[7] < enemyCounts[14]);
});

test("later level plans use harder parkour platform routes", () => {
  const state = createGameState("level");
  configureLevel(state, 1);
  const earlyPlatforms = WORLD.platforms.map((platform) => platform.x);

  configureLevel(state, 15);
  const latePlatforms = WORLD.platforms.map((platform) => platform.x);

  assert.ok(latePlatforms.length > earlyPlatforms.length);
  assert.ok(Math.max(...latePlatforms) - Math.min(...latePlatforms) > Math.max(...earlyPlatforms) - Math.min(...earlyPlatforms));
});

test("level enemies spawn across the route and away from the player spawn", () => {
  const state = createGameState("level");
  configureLevel(state, 2);

  spawnLevelEnemies(state);

  const spawnXs = state.enemies.map((enemy) => enemy.x);
  assert.ok(Math.min(...spawnXs) >= 650);
  assert.ok(Math.max(...spawnXs) - Math.min(...spawnXs) >= 900);
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
  assert.equal(state.enemies.some((enemy) => enemy.isBoss), false);
});

test("endless enemies spawn away from the current player position", () => {
  const state = createGameState("endless");
  state.player.x = 1450;
  state.spawnTimer = 0;

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.ok(state.enemies.length > 0);
  assert.equal(state.enemies.every((enemy) => Math.abs(enemy.x - state.player.x) >= 520), true);
});

test("endless mode starts with fewer zombies per wave", () => {
  const state = createGameState("endless");
  state.wave = 1;
  state.spawnTimer = 0;

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.ok(state.enemies.length <= 2);
});

test("normal zombies can climb onto brick platforms", () => {
  const state = createGameState("level");
  const platform = WORLD.platforms[0];
  const enemy = createEnemy("normal", platform.x - 34, WORLD.groundY);
  state.player.x = platform.x + platform.w + 120;
  state.enemies.push(enemy);

  for (let index = 0; index < 55; index += 1) {
    updateGame(
      state,
      { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
      { jumpPressed: false, shootPressed: false, stockPressed: false },
      1 / 60,
    );
  }

  assert.ok(Math.abs(state.enemies[0].y + state.enemies[0].h - platform.y) < 2);
});

test("pits are filled in for the current route", () => {
  assert.deepEqual(WORLD.gaps, []);
});

test("balloon zombies spawn in the air", () => {
  const state = createGameState("level");
  configureLevel(state, 1);

  spawnLevelEnemies(state);

  const balloon = state.enemies.find((enemy) => enemy.type === "balloon");
  assert.ok(balloon);
  assert.equal(balloon.flying, true);
  assert.ok(balloon.y < WORLD.groundY - balloon.h - 80);
});

test("balloon mode zombies drift at fixed per-zombie speeds and heights", () => {
  const state = createGameState("balloon");
  configureBalloonLevel(state, 3);
  const before = state.enemies.map((enemy) => ({ x: enemy.x, y: enemy.y, vx: enemy.vx, driftY: enemy.driftY }));

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1,
  );

  for (let index = 0; index < state.enemies.length; index += 1) {
    assert.equal(state.enemies[index].vx, before[index].vx);
    assert.equal(state.enemies[index].driftY, before[index].driftY);
    assert.notEqual(state.enemies[index].x, before[index].x);
  }
});

test("balloon mode zombies do not damage Dave on contact", () => {
  const state = createGameState("balloon");
  configureBalloonLevel(state, 1);
  state.enemies[0].x = state.player.x;
  state.enemies[0].y = state.player.y;

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.equal(state.player.health, state.player.maxHealth);
  assert.equal(state.player.vx, 0);
});

test("balloon mode bullets only disappear at world boundaries", () => {
  const state = createGameState("balloon");
  configureBalloonLevel(state, 1);

  fireShotgun(state, { x: 1, y: 0 });
  const pelletCount = state.pellets.length;

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1,
  );

  assert.equal(state.pellets.length, pelletCount);
  state.pellets[0].x = WORLD.width + 10;
  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );
  assert.ok(state.pellets.length < pelletCount);
});

test("balloon mode waits for next-level button after five balloon kills", () => {
  const state = createGameState("balloon");
  configureBalloonLevel(state, 1);
  state.enemies = [];
  state.kills = 5;

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.equal(state.awaitingNextLevel, true);
  assert.equal(state.nextLevel, 2);
});

test("balloon mode timer causes game over at zero", () => {
  const state = createGameState("balloon");
  configureBalloonLevel(state, 1);
  state.balloonTimer = 0.01;

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1,
  );

  assert.equal(state.status, "gameover");
});

test("restarting a failed level mode challenge resumes the current level", () => {
  const state = createGameState("level", "rifle");
  configureLevel(state, 7);
  state.status = "gameover";
  state.kills = 4;
  state.player.health = 0;

  restartChallenge(state);

  assert.equal(state.status, "playing");
  assert.equal(state.mode, "level");
  assert.equal(state.level, 7);
  assert.equal(state.weapon, "rifle");
  assert.equal(state.player.health, state.player.maxHealth);
  assert.equal(state.player.ammo, 30);
  assert.ok(state.enemies.length > 0);
});

test("restarting endless mode starts again from wave one", () => {
  const state = createGameState("endless", "rifle");
  state.status = "gameover";
  state.wave = 8;
  state.kills = 19;
  state.player.health = 0;

  restartChallenge(state);

  assert.equal(state.status, "playing");
  assert.equal(state.mode, "endless");
  assert.equal(state.wave, 1);
  assert.equal(state.kills, 0);
  assert.equal(state.weapon, "rifle");
  assert.equal(state.player.ammo, 30);
});

test("restarting balloon mode after timeout keeps the current balloon level", () => {
  const state = createGameState("balloon", "rifle");
  configureBalloonLevel(state, 3);
  state.status = "gameover";
  state.balloonTimer = 0;

  restartChallenge(state);

  assert.equal(state.status, "playing");
  assert.equal(state.mode, "balloon");
  assert.equal(state.level, 3);
  assert.equal(state.weapon, "pistol");
  assert.equal(state.balloonTimer, 30);
  assert.equal(state.enemies.length, 5);
});

test("enemy contact knocks Dave away from the attacker", () => {
  const state = createGameState("level");
  const enemy = createEnemy("normal", state.player.x + state.player.w - 4, state.player.y);
  state.enemies.push(enemy);

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.ok(state.player.vx < -150);
  assert.ok(state.player.vy < 0);
});

test("V2 uses fewer shotgun pellets and Chinese power-up labels", () => {
  assert.equal(SHOTGUN.pelletCount, 5);
  assert.equal(SHOTGUN.magazineSize, 2);
  assert.equal(POWER_UPS.piercing.label, "穿透弹");
  assert.equal(POWER_UPS.wide.label, "大扩散");
  assert.equal(POWER_UPS.fastReload.label, "快速换弹");
  assert.equal(POWER_UPS.strongRecoil.label, "强后坐力");
  assert.equal(POWER_UPS.longStock.label, "长枪托");
});

test("world is longer and keeps lightweight platform terrain", () => {
  assert.ok(WORLD.width >= 3200);
  assert.ok(WORLD.platforms.length >= 2);
  assert.deepEqual(WORLD.gaps, []);
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

test("picking up a power-up creates a Chinese floating pickup message", () => {
  const state = createGameState("level");
  spawnPowerUp(state, "piercing", state.player.x, state.player.y);

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.equal(state.activePowerUps.piercing > 0, true);
  assert.equal(state.floatTexts.some((text) => text.text === "获得：穿透弹"), true);
});

test("running stock-killed non-boss enemies become flying corpses for five seconds", () => {
  const state = createGameState("level");
  state.enemies.push(createEnemy("normal", state.player.x + state.player.w + 18, state.player.y));
  state.player.vx = 430;

  swingStock(state);
  applyStockHits(state);

  assert.equal(state.enemies.length, 0);
  assert.equal(state.corpses.length, 1);
  assert.equal(state.corpses[0].life, 5);
  assert.ok(Math.abs(state.corpses[0].vx) > 300);
  assert.ok(state.corpses[0].vy < 0);
});

test("pellets can hit corpses before they fade out", () => {
  const state = createGameState("level");
  const corpse = {
    id: "corpse-test",
    type: "normal",
    x: 360,
    y: WORLD.groundY - 72,
    w: 48,
    h: 72,
    vx: 0,
    vy: 0,
    life: 4.2,
    rotation: 0,
    spin: 0,
  };
  state.corpses.push(corpse);
  state.pellets.push({
    x: corpse.x + corpse.w / 2,
    y: corpse.y + corpse.h / 2,
    vx: 800,
    vy: 0,
    life: 1,
    radius: 6,
  });

  applyPelletHits(state);

  assert.equal(state.pellets.length, 0);
  assert.equal(state.corpses.length, 1);
  assert.equal(state.kills, 0);
  assert.equal(state.corpses[0].life, 4.2);
  assert.ok(state.corpses[0].vx > 180);
  assert.ok(state.corpses[0].vy < 0);
  assert.ok(state.corpses[0].spin > 0);
  assert.ok(state.effects.length > 0);
});

test("stock swings can hit existing corpses without resetting their fade timer", () => {
  const state = createGameState("level");
  const corpse = {
    id: "corpse-stock-test",
    type: "normal",
    x: state.player.x + state.player.w + 28,
    y: state.player.y,
    w: 48,
    h: 72,
    vx: 0,
    vy: 0,
    life: 3.4,
    rotation: 0,
    spin: 0,
  };
  state.corpses.push(corpse);

  swingStock(state);
  applyStockHits(state);

  assert.equal(state.corpses.length, 1);
  assert.equal(state.kills, 0);
  assert.equal(state.corpses[0].life, 3.4);
  assert.ok(state.corpses[0].vx > 300);
  assert.ok(state.corpses[0].vy < 0);
  assert.ok(state.corpses[0].spin > 0);
});

test("clearing a normal level opens the extraction point instead of advancing immediately", () => {
  const state = createGameState("level");
  configureLevel(state, 1);
  state.requiredKills = 1;
  state.kills = 1;
  state.enemies = [];

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.equal(state.awaitingNextLevel, false);
  assert.equal(state.extraction.active, true);
  assert.ok(state.extraction.x > state.player.x);
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

test("advancing after level fifteen completes level mode instead of starting level sixteen", () => {
  const state = createGameState("level");
  state.level = 15;
  state.awaitingNextLevel = true;
  state.nextLevel = 16;

  const advanced = advanceToNextLevel(state);

  assert.equal(advanced, true);
  assert.equal(state.status, "victory");
  assert.equal(state.level, 15);
  assert.equal(state.awaitingNextLevel, false);
  assert.equal(state.enemies.length, 0);
});

test("boss levels are removed and clearing level three opens extraction", () => {
  const state = createGameState("level");
  configureLevel(state, 3);
  spawnLevelEnemies(state);

  assert.equal(state.enemies.some((enemy) => enemy.isBoss), false);
  assert.equal(state.pendingBoss, false);

  state.enemies = [];
  state.kills = state.requiredKills;
  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.equal(state.enemies.some((enemy) => enemy.isBoss), false);
  assert.equal(state.extraction.active, true);
});
