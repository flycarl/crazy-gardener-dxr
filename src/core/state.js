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
    corpses: [],
    floatTexts: [],
    activePowerUps: {},
    extraction: { active: false, x: WORLD.width - 220, y: WORLD.groundY - 90, w: 86, h: 90 },
    spawnTimer: 0,
    requiredKills: mode === "level" ? 8 : Infinity,
    bossSpawned: false,
    awaitingNextLevel: false,
    pendingBoss: false,
    pendingBossType: null,
    nextLevel: 1,
  };
}

export function shouldSpawnExtraction({ mode, enemiesRemaining, bossAlive }) {
  return mode === "level" && enemiesRemaining === 0 && bossAlive === false;
}
