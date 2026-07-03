import test from "node:test";
import assert from "node:assert/strict";
import { createGameState, createPlayer, shouldSpawnExtraction } from "../src/core/state.js";
import { fireShotgun, startReload, swingStock } from "../src/core/systems.js";

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

test("fireShotgun spends one shell and creates eight pellets", () => {
  const state = createGameState("level");

  const fired = fireShotgun(state, { x: 1, y: 0 });

  assert.equal(fired, true);
  assert.equal(state.player.ammo, 7);
  assert.equal(state.pellets.length, 8);
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
