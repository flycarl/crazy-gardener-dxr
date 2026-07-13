import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ENEMY_TYPES, LEVELS, POWER_UPS, RIFLE, SHOTGUN, WORLD } from "../src/core/constants.js";
import { createGameState, createPlayer, shouldSpawnExtraction } from "../src/core/state.js";
import {
  applyStockHits,
  applyPelletHits,
  completeExtraction,
  configureBalloonLevel,
  configureEndlessMode,
  configureLevel,
  createEnemy,
  fireShotgun,
  advanceToNextLevel,
  recordHighScore,
  choosePostBossWeapon,
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

test("balloon mode pistol kills one balloon zombie with two body shots", () => {
  const state = createGameState("balloon");
  configureBalloonLevel(state, 1);
  const enemy = state.enemies[0];
  state.enemies = [enemy];

  for (let index = 0; index < 2; index += 1) {
    fireShotgun(state, { x: 1, y: 0 });
    assert.equal(state.pellets[0].damage, ENEMY_TYPES.balloon.health / 2);
    state.pellets[0].x = enemy.x + enemy.w / 2;
    state.pellets[0].y = enemy.y + enemy.h / 2;
    applyPelletHits(state);
    state.player.shotCooldown = 0;
  }

  assert.equal(state.enemies.length, 0);
  assert.equal(state.kills, 1);
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

test("cheat mode infinite ammo keeps the magazine full", () => {
  const state = createGameState("level");
  state.cheats.enabled = true;
  state.cheats.infiniteAmmo = true;

  const fired = fireShotgun(state, { x: 1, y: 0 });

  assert.equal(fired, true);
  assert.equal(state.player.ammo, state.player.magazineSize);
  assert.equal(state.player.reloading, false);
});

test("cheat mode damage multiplier boosts pellet damage", () => {
  const state = createGameState("level");
  const enemy = createEnemy("normal", 500, WORLD.groundY);
  state.enemies.push(enemy);
  state.cheats.enabled = true;
  state.cheats.damageMultiplier = 2;
  state.pellets.push({
    x: enemy.x + enemy.w / 2,
    y: enemy.y + enemy.h / 2,
    previousX: enemy.x + enemy.w / 2 - 5,
    previousY: enemy.y + enemy.h / 2,
    vx: 900,
    vy: 0,
    life: 1,
    radius: 5,
    damage: 5,
    damageFalloff: 1,
    weapon: "shotgun",
    piercesRemaining: 0,
    hitEnemyIds: [],
  });

  applyPelletHits(state);

  assert.equal(enemy.health, enemy.maxHealth - 10);
});

test("cheat mode invincible prevents contact damage", () => {
  const state = createGameState("level");
  const enemy = createEnemy("normal", state.player.x, state.player.y);
  state.enemies.push(enemy);
  state.cheats.enabled = true;
  state.cheats.invincible = true;

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.equal(state.player.health, state.player.maxHealth);
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

test("rifle single-shot mode hits harder than automatic mode", () => {
  const singleState = createGameState("level", "rifle", "single");
  const autoState = createGameState("level", "rifle", "auto");

  fireShotgun(singleState, { x: 1, y: 0 });
  fireShotgun(autoState, { x: 1, y: 0 });

  assert.equal(singleState.rifleMode, "single");
  assert.equal(autoState.rifleMode, "auto");
  assert.ok(singleState.pellets[0].damage > autoState.pellets[0].damage);
  assert.ok(autoState.player.shotCooldown < singleState.player.shotCooldown);
});

test("rifle is weaker and automatic fire has a slower realistic cadence", () => {
  assert.ok(RIFLE.damage < 28);
  assert.ok(RIFLE.autoDamage <= 10);
  assert.ok(RIFLE.autoCooldownSeconds >= 0.16);
  assert.ok(RIFLE.airRecoil > 115);
});

test("automatic rifle fires repeatedly while the trigger is held", () => {
  const state = createGameState("level", "rifle", "auto");

  updateGame(
    state,
    { right: false, left: false, shootHeld: true, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    0.1,
  );

  assert.equal(state.player.ammo, 29);
  assert.equal(state.pellets.length, 1);
});

test("rifle gives Dave a small air recoil boost when shooting downward", () => {
  const rifleState = createGameState("level", "rifle");
  const shotgunState = createGameState("level");
  rifleState.player.onGround = false;
  shotgunState.player.onGround = false;
  rifleState.player.vy = 0;
  shotgunState.player.vy = 0;

  fireShotgun(rifleState, { x: 0, y: 1 });
  fireShotgun(shotgunState, { x: 0, y: 1 });

  assert.ok(rifleState.player.vy < 0);
  assert.ok(Math.abs(rifleState.player.vy) < Math.abs(shotgunState.player.vy));
});

test("Dave starts regenerating five seconds after damage and fills health over three seconds", () => {
  const state = createGameState("level");
  state.player.health = 40;
  state.player.regenDelay = 5;

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    5,
  );

  assert.equal(state.player.health, 40);

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1.5,
  );
  assert.ok(state.player.health > 65 && state.player.health < 75);

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1.5,
  );
  assert.equal(state.player.health, state.player.maxHealth);
});

test("rifle bullet damages a second enemy for reduced piercing damage", () => {
  const state = createGameState("level", "rifle");
  const firstEnemy = createEnemy("normal", 250, state.player.y);
  const secondEnemy = createEnemy("normal", 254, state.player.y);
  state.enemies.push(firstEnemy);
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
  state.pellets = [];

  state.enemies.push(secondEnemy);
  state.pellets.push({
    x: 256,
    y: state.player.y + 20,
    vx: 1200,
    vy: 0,
    life: 1,
    radius: 4,
    damage: RIFLE.damage,
    damageFalloff: RIFLE.pierceDamageMultiplier,
    piercesRemaining: 0,
    hitEnemyIds: [firstEnemy.id],
  });

  applyPelletHits(state);

  const firstDamage = firstEnemy.maxHealth - firstEnemy.health;
  const secondDamage = secondEnemy.maxHealth - secondEnemy.health;
  assert.equal(state.pellets.length, 0);
  assert.equal(firstDamage, RIFLE.damage);
  assert.equal(secondDamage, Math.round(RIFLE.damage * RIFLE.pierceDamageMultiplier));
  assert.ok(secondDamage < firstDamage);
});

test("one bullet damages all zombies that are overlapping at the hit point", () => {
  const state = createGameState("level");
  const firstEnemy = createEnemy("normal", 250, state.player.y);
  const secondEnemy = createEnemy("fast", 250, state.player.y);
  state.enemies.push(firstEnemy, secondEnemy);
  state.pellets.push({
    x: 260,
    y: state.player.y + 20,
    vx: 900,
    vy: 0,
    life: 1,
    radius: 5,
    damage: 8,
    damageFalloff: 1,
    piercesRemaining: 0,
    hitEnemyIds: [],
  });

  applyPelletHits(state);

  assert.equal(firstEnemy.health, firstEnemy.maxHealth - 8);
  assert.equal(secondEnemy.health, secondEnemy.maxHealth - 8);
});

test("bullets can hit enemies through platforms", () => {
  const state = createGameState("level");
  configureLevel(state, 1);
  const platform = WORLD.platforms[0];
  const enemy = createEnemy("normal", platform.x + platform.w / 2, platform.y - 90);
  state.enemies.push(enemy);
  state.pellets.push({
    x: enemy.x + enemy.w / 2,
    y: enemy.y + enemy.h / 2,
    previousX: enemy.x + enemy.w / 2,
    previousY: platform.y + platform.h + 40,
    vx: 0,
    vy: -900,
    life: 1,
    radius: 5,
    damage: 8,
    damageFalloff: 1,
    piercesRemaining: 0,
    hitEnemyIds: [],
  });

  applyPelletHits(state);

  assert.equal(enemy.health, enemy.maxHealth - 8);
});

test("walls block bullets from hitting enemies behind them", () => {
  const state = createGameState("level");
  configureLevel(state, 4);
  const wall = WORLD.walls[0];
  const enemy = createEnemy("normal", wall.x + wall.w + 20, wall.y + wall.h);
  enemy.y = wall.y + wall.h - enemy.h;
  state.enemies.push(enemy);
  state.pellets.push({
    x: enemy.x + enemy.w / 2,
    y: enemy.y + enemy.h / 2,
    previousX: wall.x - 80,
    previousY: enemy.y + enemy.h / 2,
    vx: 900,
    vy: 0,
    life: 1,
    radius: 5,
    damage: 20,
    damageFalloff: 1,
    piercesRemaining: 0,
    hitEnemyIds: [],
  });

  applyPelletHits(state);

  assert.equal(enemy.health, enemy.maxHealth);
  assert.equal(state.pellets.length, 0);
});

test("five shotgun pellets kill a normal zombie when all pellets hit", () => {
  const state = createGameState("level");
  const enemy = createEnemy("normal", 250, state.player.y);
  state.enemies.push(enemy);

  for (let index = 0; index < SHOTGUN.pelletCount; index += 1) {
    state.pellets.push({
      x: enemy.x + enemy.w / 2,
      y: enemy.y + enemy.h / 2,
      vx: 900,
      vy: 0,
      life: 1,
      radius: SHOTGUN.pelletRadius,
      damage: ENEMY_TYPES.normal.health / SHOTGUN.pelletCount,
      damageFalloff: 1,
      piercesRemaining: 0,
      hitEnemyIds: [],
    });
  }

  applyPelletHits(state);

  assert.equal(state.enemies.length, 0);
  assert.equal(state.kills, 1);
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
    damage: 10,
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
  assert.equal(state.pellets.length, 1);
  assert.equal(state.pellets[0].piercesRemaining, 0);
});

test("gun-killed zombies leave corpses", () => {
  const state = createGameState("level", "rifle");
  const enemy = createEnemy("fast", 250, state.player.y);
  enemy.health = 10;
  state.enemies.push(enemy);
  state.pellets.push({
    x: enemy.x + enemy.w / 2,
    y: enemy.y + enemy.h / 2,
    vx: 1200,
    vy: 0,
    life: 1,
    radius: 4,
    damage: 20,
    hitEnemyIds: [],
  });

  applyPelletHits(state);

  assert.equal(state.enemies.length, 0);
  assert.equal(state.corpses.length, 1);
  assert.equal(state.corpses[0].id, `corpse-${enemy.id}`);
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

test("hurt players no longer get health drops before the twenty-kill buff mark", () => {
  const state = createGameState("level");
  state.player.health = 60;
  state.kills = 4;
  const enemy = createEnemy("normal", 600, 520);
  enemy.health = 0;
  state.enemies.push(enemy);

  applyPelletHits(state);

  assert.equal(state.pickups.length, 0);
});

test("full-health players get permanent buffs on every twentieth kill", () => {
  const state = createGameState("level");
  state.player.health = state.player.maxHealth;
  state.kills = 19;
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
  const enemy = createEnemy("normal", state.player.x + state.player.w + 18, state.player.y);
  state.enemies.push(enemy);

  swingStock(state);
  applyStockHits(state);

  assert.equal(state.enemies.length, 1);
  assert.equal(state.kills, 0);
  assert.equal(state.enemies[0].stockHits, 1);
  assert.equal(state.enemies[0].health, state.enemies[0].maxHealth / 2);
  assert.ok(state.enemies[0].vx > 300);
  assert.ok(state.enemies[0].x > state.player.x + state.player.w + 18);
});

test("stock swing kills a non-boss enemy on the second hit", () => {
  const state = createGameState("level");
  const enemy = createEnemy("normal", state.player.x + state.player.w + 18, state.player.y);
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
  const enemy = createEnemy("normal", state.player.x + state.player.w + 18, state.player.y);
  state.player.vx = 430;
  state.enemies.push(enemy);

  swingStock(state);
  applyStockHits(state);

  assert.equal(state.enemies.length, 0);
  assert.equal(state.kills, 1);
  assert.equal(state.corpses.length, 1);
});

test("running stock swing still needs two hits to kill a slime", () => {
  const state = createGameState("level");
  const slime = createEnemy("slimeMid", state.player.x + state.player.w + 18, state.player.y);
  state.player.vx = 430;
  state.enemies.push(slime);

  swingStock(state);
  applyStockHits(state);

  assert.equal(state.enemies.length, 1);
  assert.equal(slime.health, slime.maxHealth / 2);

  state.player.stockCooldown = 0;
  swingStock(state);
  applyStockHits(state);

  assert.equal(state.enemies.length, 0);
  assert.equal(state.kills, 1);
});

test("stock swing cannot damage bosses", () => {
  const state = createGameState("level");
  const boss = createEnemy("tankBoss", state.player.x + state.player.w + 18, state.player.y);
  state.enemies.push(boss);

  swingStock(state);
  applyStockHits(state);

  assert.equal(boss.health, boss.maxHealth);
  assert.equal(state.enemies.length, 1);
});

test("stock swing can chain again as soon as the swing finishes", () => {
  const state = createGameState("level");

  assert.equal(swingStock(state), true);
  updateGame(
    state,
    { left: false, right: false, jump: false, shootHeld: false, aim: { x: 500, y: 500 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    SHOTGUN.stockArcSeconds,
  );

  assert.equal(swingStock(state), true);
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

test("advancing a level restores Dave to full health", () => {
  const state = createGameState("level");
  state.awaitingNextLevel = true;
  state.nextLevel = 2;
  state.player.health = 35;

  advanceToNextLevel(state);

  assert.equal(state.player.health, state.player.maxHealth);
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

test("level mode has one hundred staged levels with rising zombie counts", () => {
  assert.equal(LEVELS.length, 100);

  const enemyCounts = LEVELS.map((level) => level.enemies.length);
  for (let index = 1; index < enemyCounts.length; index += 1) {
    assert.ok(enemyCounts[index] >= enemyCounts[index - 1]);
  }

  assert.ok(enemyCounts[0] < enemyCounts[49]);
  assert.ok(enemyCounts[49] < enemyCounts[99]);
  assert.equal(LEVELS[4].boss, "tankBoss");
  assert.equal(LEVELS[9].boss, "rangedBoss");
  assert.ok(LEVELS[99].boss);
});

test("later level plans use harder parkour platform routes", () => {
  const state = createGameState("level");
  configureLevel(state, 1);
  const earlyPlatforms = WORLD.platforms.map((platform) => platform.x);

  configureLevel(state, 100);
  const latePlatforms = WORLD.platforms.map((platform) => platform.x);

  assert.ok(latePlatforms.length > earlyPlatforms.length);
  assert.ok(Math.max(...latePlatforms) - Math.min(...latePlatforms) > Math.max(...earlyPlatforms) - Math.min(...earlyPlatforms));
});

test("level mode adds wall obstacles to the route", () => {
  const state = createGameState("level");

  configureLevel(state, 4);

  assert.ok(WORLD.walls.length > 0);
  assert.ok(WORLD.walls.every((wall) => wall.h > 0 && wall.w > 0));
});

test("level enemies spawn across the route and away from the player spawn", () => {
  const state = createGameState("level");
  configureLevel(state, 2);

  spawnLevelEnemies(state);

  const spawnXs = state.enemies.map((enemy) => enemy.x);
  assert.ok(Math.min(...spawnXs) >= 650);
  assert.ok(Math.max(...spawnXs) - Math.min(...spawnXs) >= 900);
});

test("endless spawning pauses instead of adding a fourth active wave", () => {
  const state = createGameState("endless");
  state.wave = 8;
  state.spawnTimer = 0;

  for (let index = 0; index < 3; index += 1) {
    state.enemies.push(createEnemy("normal", 900 + index * 12, 520));
  }

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.equal(state.enemies.length, 3);
  assert.equal(state.wave, 8);
  assert.ok(state.spawnTimer > 0);
  assert.equal(state.enemies.some((enemy) => enemy.isBoss), false);
});

test("endless mode starts the next wave when only two enemies remain", () => {
  const state = createGameState("endless");
  configureEndlessMode(state);
  state.wave = 8;
  state.spawnTimer = 0;
  state.enemies = [
    createEnemy("normal", 900, WORLD.groundY),
    createEnemy("fast", 1040, WORLD.groundY),
  ];

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.equal(state.wave, 9);
  assert.ok(state.enemies.length > 2);
});

test("endless mode randomly borrows a level plan from levels one to one hundred", () => {
  const originalRandom = Math.random;
  Math.random = () => 0.99;
  try {
    const state = createGameState("endless");
    configureEndlessMode(state);
    state.wave = 3;
    state.spawnTimer = 0;
    state.enemies = [];

    updateGame(
      state,
      { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
      { jumpPressed: false, shootPressed: false, stockPressed: false },
      1 / 60,
    );

    assert.equal(state.endlessLevelStyle, 100);
    assert.deepEqual(WORLD.platforms, LEVELS[99].platforms);
    assert.deepEqual(state.enemies.map((enemy) => enemy.type), LEVELS[99].enemies.slice(0, 15));
  } finally {
    Math.random = originalRandom;
  }
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

test("endless mode keeps each borrowed wave within the active enemy cap", () => {
  const state = createGameState("endless");
  state.wave = 1;
  state.spawnTimer = 0;

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.ok(state.enemies.length <= 15);
  assert.ok(state.endlessLevelStyle >= 1);
  assert.ok(state.endlessLevelStyle <= 100);
});

test("endless mode adds walls and limits active zombies to three waves", () => {
  const state = createGameState("endless");
  configureEndlessMode(state);
  state.wave = 12;
  state.spawnTimer = 0;

  for (let index = 0; index < 15; index += 1) {
    state.enemies.push(createEnemy("normal", 900 + index * 10, 520));
  }

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.ok(WORLD.walls.length > 0);
  assert.ok(state.enemies.length <= 15);
  assert.equal(state.wave, 12);
});

test("wall obstacles block Dave's horizontal movement", () => {
  const state = createGameState("level");
  configureLevel(state, 4);
  const wall = WORLD.walls[0];
  state.player.x = wall.x - state.player.w - 2;
  state.player.y = wall.y + wall.h - state.player.h;

  updateGame(
    state,
    { right: true, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    0.2,
  );

  assert.ok(state.player.x + state.player.w <= wall.x + 1);
});

test("all ground zombies can jump toward platforms", () => {
  for (const type of ["normal", "fast", "fat"]) {
    const state = createGameState("level");
    const platform = WORLD.platforms[0];
    const enemy = createEnemy(type, platform.x - 34, WORLD.groundY);
    enemy.platformChoice = "climb";
    state.player.x = platform.x + platform.w + 120;
    state.enemies.push(enemy);

    updateGame(
      state,
      { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
      { jumpPressed: false, shootPressed: false, stockPressed: false },
      1 / 60,
    );

    assert.ok(state.enemies[0].vy < 0);
  }
});

test("zombies pause at walls before jumping over them", () => {
  const state = createGameState("level");
  configureLevel(state, 4);
  const wall = WORLD.walls[0];
  const enemy = createEnemy("normal", wall.x - 46, WORLD.groundY);
  state.player.x = wall.x + 300;
  state.enemies.push(enemy);

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );
  assert.ok(state.enemies[0].wallPauseTimer > 0);

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    0.5,
  );
  assert.ok(state.enemies[0].vy < 0);
});

test("normal zombies can climb onto brick platforms", () => {
  const state = createGameState("level");
  const platform = WORLD.platforms[0];
  const enemy = createEnemy("normal", platform.x - 34, WORLD.groundY);
  enemy.platformChoice = "climb";
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

test("balloon pops after one balloon hit and the zombie falls with half health", () => {
  const state = createGameState("level");
  const enemy = createEnemy("balloon", 650, WORLD.groundY);
  state.enemies.push(enemy);

  state.pellets.push({
    x: enemy.x + enemy.w / 2,
    y: enemy.y - 34,
    vx: 900,
    vy: 0,
    life: 1,
    radius: 5,
    damage: 999,
    damageFalloff: 1,
    weapon: "shotgun",
    piercesRemaining: 0,
    hitEnemyIds: [],
  });
  applyPelletHits(state);

  assert.equal(enemy.flying, false);
  assert.equal(enemy.balloonPopped, true);
  assert.equal(enemy.health, enemy.maxHealth / 2);
  assert.ok(enemy.vy > 0);
  assert.equal(state.enemies.length, 1);
});

test("platform zombies move toward an edge when Dave is underneath", () => {
  const state = createGameState("level");
  const platform = WORLD.platforms[0];
  const enemy = createEnemy("normal", platform.x + platform.w / 2, platform.y);
  enemy.y = platform.y - enemy.h;
  enemy.onGround = true;
  state.player.x = platform.x + platform.w / 2 - state.player.w / 2;
  state.player.y = WORLD.groundY - state.player.h;
  state.enemies.push(enemy);

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.equal(enemy.descendingToPlayer, true);
  assert.ok(Math.abs(enemy.vx) > 0);
});

test("platform zombies step off the edge instead of sticking above Dave", () => {
  const state = createGameState("level");
  const platform = WORLD.platforms[0];
  const enemy = createEnemy("normal", platform.x + 3, platform.y);
  enemy.y = platform.y - enemy.h;
  enemy.onGround = true;
  state.player.x = platform.x + platform.w / 2;
  state.player.y = WORLD.groundY - state.player.h;
  state.enemies.push(enemy);

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.equal(enemy.onGround, false);
  assert.ok(enemy.vy > 0);
});

test("ground zombies seek a platform edge and jump up when Dave stands above them", () => {
  const state = createGameState("level");
  configureLevel(state, 1);
  const platform = WORLD.platforms[0];
  const enemy = createEnemy("normal", platform.x + platform.w / 2, WORLD.groundY);
  enemy.onGround = true;
  state.player.x = platform.x + platform.w / 2 - state.player.w / 2;
  state.player.y = platform.y - state.player.h;
  state.enemies.push(enemy);

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.equal(enemy.seekingPlatformEdge, true);
  assert.notEqual(enemy.vx, 0);
  assert.ok(enemy.vy < 0);
  assert.equal(enemy.onGround, false);
});

test("slimes hop with increasing jump height and damage tiers", () => {
  const state = createGameState("level");
  configureLevel(state, 1);
  const low = createEnemy("slimeLow", 1120, WORLD.groundY);
  const mid = createEnemy("slimeMid", 1180, WORLD.groundY);
  const high = createEnemy("slimeHigh", 1240, WORLD.groundY);
  state.player.x = 1700;
  state.enemies.push(low, mid, high);

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.ok(low.vy < 0);
  assert.ok(mid.vy < low.vy);
  assert.ok(high.vy < mid.vy);
  assert.ok(low.damage < mid.damage);
  assert.ok(mid.damage < high.damage);
});

test("slimes keep jumping again after being knocked back", () => {
  const state = createGameState("level");
  const slime = createEnemy("slimeMid", 700, WORLD.groundY);
  slime.vx = -500;
  slime.vy = 0;
  slime.onGround = true;
  state.player.x = 1200;
  state.enemies.push(slime);

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.ok(slime.vy < 0);
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

test("restarting after death keeps cheat settings", () => {
  const state = createGameState("level", "rifle");
  state.status = "gameover";
  state.cheats = {
    enabled: true,
    invincible: true,
    infiniteAmmo: true,
    damageMultiplier: 3,
    speedMultiplier: 1.7,
    jumpMultiplier: 1.4,
  };

  restartChallenge(state);

  assert.deepEqual(state.cheats, {
    enabled: true,
    invincible: true,
    infiniteAmmo: true,
    damageMultiplier: 3,
    speedMultiplier: 1.7,
    jumpMultiplier: 1.4,
  });
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

test("recordHighScore keeps the best score reached", () => {
  const state = createGameState("endless");
  state.score = 120;

  assert.equal(recordHighScore(state, 90), 120);
  state.score = 80;
  assert.equal(recordHighScore(state, 120), 120);
});

test("shield door zombies do not use ranged attacks while keeping melee contact damage", () => {
  const state = createGameState("level");
  const enemy = createEnemy("fat", state.player.x + 260, state.player.y);
  enemy.rangedCooldown = 0;
  state.enemies.push(enemy);

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.equal(state.enemyProjectiles.length, 0);
  assert.equal(enemy.damage > 0, true);
});

test("shield door blocks one frontal stock hit before taking stock damage", () => {
  const state = createGameState("level");
  const enemy = createEnemy("fat", state.player.x + state.player.w + 18, state.player.y);
  enemy.facing = -1;
  state.enemies.push(enemy);

  swingStock(state);
  applyStockHits(state);

  assert.equal(state.enemies.length, 1);
  assert.equal(enemy.health, enemy.maxHealth);
  assert.equal(enemy.shieldBroken, true);

  state.player.stockCooldown = 0;
  swingStock(state);
  applyStockHits(state);

  assert.equal(enemy.health, enemy.maxHealth / 2);
});

test("walls block stock swings from hitting enemies behind them", () => {
  const state = createGameState("level");
  configureLevel(state, 4);
  const wall = WORLD.walls[0];
  const enemy = createEnemy("normal", wall.x + wall.w + 12, wall.y + wall.h);
  enemy.y = wall.y + wall.h - enemy.h;
  state.player.x = wall.x - state.player.w - 8;
  state.player.y = enemy.y;
  state.player.facing = 1;
  state.enemies.push(enemy);

  swingStock(state);
  applyStockHits(state);

  assert.equal(enemy.health, enemy.maxHealth);
  assert.equal(enemy.stockHits ?? 0, 0);
});

test("shield door blocks a full frontal shotgun blast once", () => {
  const state = createGameState("level");
  const enemy = createEnemy("fat", 250, state.player.y);
  enemy.facing = -1;
  state.enemies.push(enemy);

  for (let index = 0; index < SHOTGUN.pelletCount; index += 1) {
    state.pellets.push({
      x: enemy.x + enemy.w / 2,
      y: enemy.y + enemy.h / 2,
      vx: 900,
      vy: 0,
      life: 1,
      radius: SHOTGUN.pelletRadius,
      damage: 20,
      damageFalloff: 1,
      weapon: "shotgun",
      shotId: 777,
      piercesRemaining: 0,
      hitEnemyIds: [],
    });
  }

  applyPelletHits(state);

  assert.equal(enemy.health, enemy.maxHealth);
  assert.equal(enemy.shieldBroken, true);
  assert.equal(state.pellets.length, 0);

  state.pellets.push({
    x: enemy.x + enemy.w / 2,
    y: enemy.y + enemy.h / 2,
    vx: 900,
    vy: 0,
    life: 1,
    radius: SHOTGUN.pelletRadius,
    damage: 12,
    damageFalloff: 1,
    weapon: "shotgun",
    shotId: 778,
    piercesRemaining: 0,
    hitEnemyIds: [],
  });

  applyPelletHits(state);

  assert.equal(enemy.health, enemy.maxHealth - 12);
});

test("shield door blocks three frontal rifle bullets before breaking", () => {
  const state = createGameState("level");
  const enemy = createEnemy("fat", 250, state.player.y);
  enemy.facing = -1;
  state.enemies.push(enemy);

  for (let index = 0; index < 3; index += 1) {
    state.pellets.push({
      x: enemy.x + enemy.w / 2,
      y: enemy.y + enemy.h / 2,
      vx: 900,
      vy: 0,
      life: 1,
      radius: 4,
      damage: 10,
      damageFalloff: 1,
      weapon: "rifle",
      piercesRemaining: 0,
      hitEnemyIds: [],
    });
    applyPelletHits(state);
  }

  assert.equal(enemy.health, enemy.maxHealth);
  assert.equal(enemy.shieldBroken, true);

  state.pellets.push({
    x: enemy.x + enemy.w / 2,
    y: enemy.y + enemy.h / 2,
    vx: 900,
    vy: 0,
    life: 1,
    radius: 4,
    damage: 10,
    damageFalloff: 1,
    weapon: "rifle",
    piercesRemaining: 0,
    hitEnemyIds: [],
  });
  applyPelletHits(state);

  assert.equal(enemy.health, enemy.maxHealth - 10);
});

test("shield door only blocks attacks from the front", () => {
  const state = createGameState("level");
  const enemy = createEnemy("fat", 250, state.player.y);
  enemy.facing = 1;
  state.enemies.push(enemy);
  state.pellets.push({
    x: enemy.x + enemy.w / 2,
    y: enemy.y + enemy.h / 2,
    vx: 900,
    vy: 0,
    life: 1,
    radius: 4,
    damage: 10,
    damageFalloff: 1,
    weapon: "rifle",
    piercesRemaining: 0,
    hitEnemyIds: [],
  });

  applyPelletHits(state);

  assert.equal(enemy.health, enemy.maxHealth - 10);
  assert.equal(enemy.shieldBroken, false);
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

test("stacked zombies can only deal one contact hit during Dave's damage cooldown", () => {
  const state = createGameState("endless");
  state.player.health = 100;
  state.enemies.push(createEnemy("normal", state.player.x, state.player.y));
  state.enemies.push(createEnemy("fat", state.player.x, state.player.y));

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.equal(state.player.health, 88);
  assert.ok(state.player.damageCooldown > 0);
});

test("shooting gives Dave a brief same-frame guard against contact damage", () => {
  const state = createGameState("endless");
  state.player.health = 10;
  state.player.regenDelay = 5;
  state.player.regenStartHealth = 10;
  state.enemies.push(createEnemy("normal", state.player.x, state.player.y));

  updateGame(
    state,
    { right: false, left: false, aim: { x: -1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: true, stockPressed: false },
    1 / 60,
  );

  assert.equal(state.status, "playing");
  assert.equal(state.player.health, 10);
  assert.ok(state.player.damageCooldown > 0);
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
  assert.deepEqual(state.permanentPowerUps, {});
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

  assert.equal(state.permanentPowerUps.piercing, 1);
  assert.equal(state.floatTexts.some((text) => text.text.includes("永久强化：穿透弹")), true);
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

test("pellets knock corpses away while continuing through them", () => {
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
  const enemy = createEnemy("normal", corpse.x + 18, corpse.y);
  enemy.health = 10;
  state.enemies.push(enemy);
  state.pellets.push({
    x: corpse.x + corpse.w / 2,
    y: corpse.y + corpse.h / 2,
    vx: 800,
    vy: 0,
    life: 1,
    radius: 6,
    damage: 10,
  });

  applyPelletHits(state);

  assert.equal(state.pellets.length, 0);
  assert.equal(state.enemies.length, 0);
  assert.equal(state.corpses.length, 2);
  assert.equal(state.kills, 1);
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

test("advancing after level one hundred completes level mode instead of starting level one hundred one", () => {
  const state = createGameState("level");
  state.level = 100;
  state.awaitingNextLevel = true;
  state.nextLevel = 101;

  const advanced = advanceToNextLevel(state);

  assert.equal(advanced, true);
  assert.equal(state.status, "victory");
  assert.equal(state.level, 100);
  assert.equal(state.awaitingNextLevel, false);
  assert.equal(state.enemies.length, 0);
});

test("boss levels spawn a far-away boss only after smaller enemies are cleared", () => {
  const state = createGameState("level", "rifle");
  configureLevel(state, 5);
  spawnLevelEnemies(state);

  assert.equal(state.weapon, "shotgun");
  assert.equal(state.pendingBoss, true);
  assert.equal(state.enemies.some((enemy) => enemy.isBoss), false);

  state.player.x = 1450;
  state.enemies = [];
  state.kills = state.requiredKills;

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  const boss = state.enemies.find((enemy) => enemy.isBoss);
  assert.ok(boss);
  assert.ok(Math.abs(boss.x - state.player.x) >= 560);
});

test("boss clears ask for the next weapon before continuing", () => {
  const state = createGameState("level");
  configureLevel(state, 5);
  state.pendingBoss = false;
  state.bossSpawned = true;
  state.enemies = [];
  state.kills = state.requiredKills + 1;

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.equal(state.awaitingWeaponChoice, true);
  assert.equal(state.extraction.active, false);

  choosePostBossWeapon(state, "rifle", "auto");

  assert.equal(state.weapon, "rifle");
  assert.equal(state.rifleMode, "auto");
  assert.equal(state.extraction.active, true);
});

test("boss clears wait for summoned small zombies before asking for weapon choice", () => {
  const state = createGameState("level");
  configureLevel(state, 5);
  const add = createEnemy("normal", 1200, WORLD.groundY);
  add.summonedByBoss = true;
  state.pendingBoss = false;
  state.bossSpawned = true;
  state.enemies = [add];
  state.kills = state.requiredKills + 1;

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.equal(state.awaitingWeaponChoice, false);

  add.health = 0;
  applyPelletHits(state);
  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.equal(state.awaitingWeaponChoice, true);
});

test("boss levels show a forced shotgun warning beside Dave", () => {
  const state = createGameState("level", "rifle");

  configureLevel(state, 5);

  assert.equal(state.weapon, "shotgun");
  assert.equal(state.awaitingForcedShotgunNotice, true);
  assert.ok(state.floatTexts.some((text) => text.text.includes("强制霰弹枪")));
  assert.ok(state.floatTexts.some((text) => Math.abs(text.x - (state.player.x + state.player.w / 2)) < 1));
});

test("boss levels only pause for a forced shotgun notice when rifle was selected", () => {
  const state = createGameState("level", "shotgun");

  configureLevel(state, 5);

  assert.equal(state.weapon, "shotgun");
  assert.equal(state.awaitingForcedShotgunNotice, false);
});

test("level bosses summon one random small zombie every five seconds", () => {
  const state = createGameState("level");
  configureLevel(state, 5);
  const boss = createEnemy("tankBoss", 1800, WORLD.groundY);
  state.enemies = [boss];
  state.bossAlive = true;
  state.bossSpawned = true;
  state.bossAddTimer = 0;
  state.player.x = 400;

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.equal(state.enemies.filter((enemy) => !enemy.isBoss).length, 1);
  assert.equal(state.enemies.find((enemy) => !enemy.isBoss).summonedByBoss, true);
  assert.ok(state.bossAddTimer > 4.9);
  assert.equal(state.enemies.every((enemy) => enemy.isBoss || Math.abs(enemy.x - state.player.x) >= 520), true);
});

test("a level boss can summon at most three small zombies", () => {
  const state = createGameState("level");
  configureLevel(state, 5);
  const boss = createEnemy("tankBoss", 1800, WORLD.groundY);
  state.enemies = [boss];
  state.bossAlive = true;
  state.bossSpawned = true;
  state.player.x = 400;

  for (let index = 0; index < 5; index += 1) {
    state.bossAddTimer = 0;
    updateGame(
      state,
      { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
      { jumpPressed: false, shootPressed: false, stockPressed: false },
      1 / 60,
    );
  }

  assert.equal(state.enemies.filter((enemy) => enemy.summonedByBoss).length, 3);
  assert.equal(state.levelBossAddsSpawned, 3);
});

test("configureLevel resets boss summon timer to five seconds after endless mode", () => {
  const state = createGameState("endless");
  configureEndlessMode(state);

  configureLevel(state, 5);

  assert.equal(state.bossAddTimer, 5);
});

test("tank boss charges every seven seconds and every five seconds under half health", () => {
  const state = createGameState("level");
  const boss = createEnemy("tankBoss", 1200, WORLD.groundY);
  boss.chargeCooldown = 0;
  state.enemies = [boss];
  state.player.x = 400;

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.ok(Math.abs(boss.vx) > boss.speed * 3);
  assert.ok(boss.chargeCooldown > 6.9);

  boss.health = boss.maxHealth / 2 - 1;
  boss.chargeCooldown = 0;
  boss.chargeTimer = 0;

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.ok(Math.abs(boss.vx) > boss.speed * 3);
  assert.ok(boss.chargeCooldown > 4.9);
  assert.ok(boss.chargeCooldown < 5.1);
});

test("ranged boss fires volleys and enrages into a ten shot ring under half health", () => {
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    const state = createGameState("level");
    const boss = createEnemy("rangedBoss", 900, WORLD.groundY);
    boss.rangedCooldown = 0;
    state.enemies = [boss];
    state.player.x = 1280;

    updateGame(
      state,
      { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
      { jumpPressed: false, shootPressed: false, stockPressed: false },
      1 / 60,
    );

    assert.equal(state.enemyProjectiles.length, 2);

    state.enemyProjectiles = [];
    boss.health = boss.maxHealth / 2 - 1;
    boss.rangedCooldown = 0;

    updateGame(
      state,
      { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
      { jumpPressed: false, shootPressed: false, stockPressed: false },
      1 / 60,
    );

    assert.equal(state.enemyProjectiles.length, 10);
    assert.equal(boss.rangedEnraged, true);

    Math.random = () => 0.99;
    state.enemyProjectiles = [];
    boss.rangedCooldown = 0;

    updateGame(
      state,
      { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
      { jumpPressed: false, shootPressed: false, stockPressed: false },
      1 / 60,
    );

    assert.equal(state.enemyProjectiles.length, 4);
  } finally {
    Math.random = originalRandom;
  }
});

test("zombies drop only permanent buffs every twenty kills", () => {
  const state = createGameState("level");
  state.kills = 19;
  state.player.health = 40;
  state.enemies = [createEnemy("normal", 620, WORLD.groundY)];
  state.enemies[0].health = 0;

  applyPelletHits(state, 1 / 60);

  assert.equal(state.kills, 20);
  assert.equal(state.pickups.length, 1);
  assert.notEqual(state.pickups[0].id, "health");
});

test("picked up buffs become permanent upgrades instead of timed buffs", () => {
  const state = createGameState("level");
  spawnPowerUp(state, "piercing", state.player.x, state.player.y);

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.equal(state.pickups.length, 0);
  assert.equal(state.permanentPowerUps.piercing, 1);
  assert.equal(state.activePowerUps.piercing, undefined);
});

test("permanent piercing improves bullet damage after piercing", () => {
  const state = createGameState("level", "rifle");
  state.permanentPowerUps.piercing = 1;
  state.player.ammo = 30;

  fireShotgun(state, { x: 1, y: 0 });

  assert.equal(state.pellets[0].piercesRemaining, 1);
  assert.equal(state.pellets[0].damageFalloff, RIFLE.pierceDamageMultiplier + 0.5);
});

test("endless mode clears permanent buffs when Dave dies", () => {
  const state = createGameState("endless");
  state.permanentPowerUps.piercing = 2;
  state.player.health = 5;
  state.player.regenDelay = 10;
  state.player.regenStartHealth = 5;
  state.enemyProjectiles.push({
    x: state.player.x + 10,
    y: state.player.y + 10,
    w: 12,
    h: 12,
    vx: 0,
    vy: 0,
    damage: 10,
    life: 1,
  });

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.equal(state.status, "gameover");
  assert.deepEqual(state.permanentPowerUps, {});
});

test("level mode death randomly drops one permanent buff stack", () => {
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    const state = createGameState("level");
    state.permanentPowerUps.piercing = 2;
    state.permanentPowerUps.wide = 1;
    state.player.health = 5;
    state.player.regenDelay = 10;
    state.player.regenStartHealth = 5;
    state.enemyProjectiles.push({
      x: state.player.x + 10,
      y: state.player.y + 10,
      w: 12,
      h: 12,
      vx: 0,
      vy: 0,
      damage: 10,
      life: 1,
    });

    updateGame(
      state,
      { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
      { jumpPressed: false, shootPressed: false, stockPressed: false },
      1 / 60,
    );

    assert.equal(state.status, "gameover");
    assert.equal(state.permanentPowerUps.piercing, 1);
    assert.equal(state.permanentPowerUps.wide, 1);
  } finally {
    Math.random = originalRandom;
  }
});

test("endless boss waves wait for small zombies, then hold the wave until the boss dies", () => {
  const state = createGameState("endless");
  configureEndlessMode(state);
  state.wave = 20;
  state.spawnTimer = 0;

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.equal(state.wave, 20);
  assert.equal(state.pendingEndlessBoss, true);
  assert.equal(state.enemies.some((enemy) => enemy.isBoss), false);

  state.enemies = [];
  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  const boss = state.enemies.find((enemy) => enemy.isBoss);
  assert.ok(boss);
  assert.equal(state.wave, 20);

  boss.health = 0;
  applyPelletHits(state, 1 / 60);

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.equal(state.wave, 21);
  assert.equal(state.endlessBossActive, false);
});

test("endless mode waits ten seconds after every three cleared waves", () => {
  const state = createGameState("endless");
  configureEndlessMode(state);
  state.wave = 4;
  state.spawnTimer = 0;
  state.endlessWavesSinceBreak = 3;
  state.enemies = [];

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.equal(state.enemies.length, 0);
  assert.ok(state.spawnTimer >= 9.9);
  assert.equal(state.endlessWavesSinceBreak, 0);
});

test("endless bosses call in two random small zombies every ten seconds", () => {
  const state = createGameState("endless");
  configureEndlessMode(state);
  const boss = createEnemy("tankBoss", 1200, WORLD.groundY);
  state.enemies = [boss];
  state.endlessBossActive = true;
  state.bossAddTimer = 0;

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.equal(state.enemies.filter((enemy) => !enemy.isBoss).length, 2);
  assert.ok(state.bossAddTimer > 9.9);
});

test("ranged boss projectiles are red", () => {
  const state = createGameState("level");
  const boss = createEnemy("rangedBoss", state.player.x + 260, state.player.y);
  boss.rangedCooldown = 0;
  state.enemies = [boss];

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.ok(state.enemyProjectiles.length >= 2);
  assert.ok(state.enemyProjectiles.length <= 3);
  assert.equal(state.enemyProjectiles.every((projectile) => projectile.color === "#d7263d"), true);
});

test("enemy projectiles knock Dave back when they hit", () => {
  const state = createGameState("level");
  const player = state.player;
  player.damageCooldown = 0;
  state.enemyProjectiles.push({
    x: player.x,
    y: player.y + player.h / 2,
    w: 12,
    h: 12,
    vx: 520,
    vy: 0,
    damage: 16,
    life: 3.2,
    color: "#d7263d",
  });

  updateGame(
    state,
    { right: false, left: false, aim: { x: 1, y: 0 }, mouse: { worldX: 0, worldY: 0 } },
    { jumpPressed: false, shootPressed: false, stockPressed: false },
    1 / 60,
  );

  assert.equal(player.health, player.maxHealth - 16);
  assert.ok(player.vx > 0);
  assert.ok(player.vy < 0);
});

test("endless mode separates walls from platforms", () => {
  const state = createGameState("endless");
  configureEndlessMode(state);

  for (const wall of WORLD.walls) {
    for (const platform of WORLD.platforms) {
      const overlap =
        wall.x < platform.x + platform.w &&
        wall.x + wall.w > platform.x &&
        wall.y < platform.y + platform.h &&
        wall.y + wall.h > platform.y;

      assert.equal(overlap, false);
    }
  }
});

test("menu explains balloon mode uses pistol and ignores shotgun and rifle settings", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /打气球模式：手枪/);
  assert.match(html, /不受霰弹枪和步枪影响/);
});

test("page includes an in-game pause menu with resume and main menu actions", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /id="pauseMenuButton"/);
  assert.match(html, /id="resumeButton"/);
  assert.match(html, /id="pauseMainMenuButton"/);
  assert.match(html, /id="pauseCheatButton"/);
  assert.match(html, />继续</);
  assert.match(html, />主菜单</);
});

test("page includes a cheat panel for tuning game parameters", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const main = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");

  assert.match(html, /id="cheatMenuButton"/);
  assert.match(html, /id="cheatPanel"/);
  assert.match(html, /id="cheatDamage"/);
  assert.match(html, /id="cheatReminder"/);
  assert.match(html, /danger-action/);
  assert.match(html, /id="cheatLevelButton"/);
  assert.match(html, /生成史莱姆/);
  assert.match(main, /applyCheatSettings/);
  assert.match(main, /cheatAppliedSinceOpen/);
  assert.match(main, /cheatHealthSetSinceOpen/);
  assert.match(main, /spawnCheatEnemy/);
});

test("hud styles promote red health hearts and a left-side stats column", () => {
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.match(css, /\.health-heart\.filled/);
  assert.match(css, /#e52f39/);
  assert.match(css, /\.hud-stats/);
  assert.match(css, /justify-items: start/);
});

test("main game entry wires browser-generated sound effects", () => {
  const main = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
  const audio = readFileSync(new URL("../src/audio.js", import.meta.url), "utf8");

  assert.match(main, /crazyGardenerLevelProgress/);
  assert.match(main, /saveCurrentLevelProgress/);
  assert.match(main, /关卡模式：第/);
  assert.match(main, /createSoundPlayer/);
  assert.match(main, /playFromStateChange/);
  assert.match(main, /updateAmbient/);
  assert.match(main, /Boss关：强制霰弹枪/);
  assert.match(main, /知道了/);
  assert.match(audio, /AudioContext/);
  assert.match(audio, /shotgun/);
  assert.match(audio, /balloonPop/);
  assert.match(audio, /zombieGroan/);
  assert.match(audio, /slimeHop/);
  assert.match(audio, /stockHit/);
  assert.match(audio, /bossDefeated/);
  assert.match(audio, /shieldBlock/);
  assert.match(audio, /playerProjectileHit/);
  assert.match(audio, /pickup/);
});
