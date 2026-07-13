import { BALLOON_MODE, PISTOL, PLAYER, RIFLE, SHOTGUN, WORLD } from "./constants.js";

export function createPlayer(mode = "level", weapon = "shotgun") {
  const activeWeapon = mode === "balloon" ? "pistol" : weapon;
  const magazineSize = activeWeapon === "pistol" ? PISTOL.magazineSize : activeWeapon === "rifle" ? RIFLE.magazineSize : SHOTGUN.magazineSize;
  return {
    x: 170,
    y: WORLD.groundY - PLAYER.height,
    vx: 0,
    vy: 0,
    w: PLAYER.width,
    h: PLAYER.height,
    maxHealth: PLAYER.maxHealth,
    health: PLAYER.maxHealth,
    regenDelay: 0,
    regenTimer: 0,
    regenStartHealth: PLAYER.maxHealth,
    weapon: activeWeapon,
    facing: 1,
    onGround: true,
    ammo: magazineSize,
    magazineSize,
    reloading: false,
    reloadTimer: 0,
    shotCooldown: 0,
    stockCooldown: 0,
    stockTimer: 0,
    queuedShots: 0,
    queuedShotDelay: 0,
    queuedShotAim: null,
  };
}

export function createGameState(mode = "level", weapon = "shotgun", rifleMode = "single") {
  const activeWeapon = mode === "balloon" ? "pistol" : weapon;

  return {
    mode,
    weapon: activeWeapon,
    rifleMode: activeWeapon === "rifle" ? rifleMode : "single",
    status: "playing",
    level: 1,
    wave: 1,
    score: 0,
    highScore: 0,
    kills: 0,
    cameraX: 0,
    cameraY: 0,
    player: createPlayer(mode, activeWeapon),
    enemies: [],
    pellets: [],
    enemyProjectiles: [],
    pickups: [],
    effects: [],
    corpses: [],
    floatTexts: [],
    activePowerUps: {},
    permanentPowerUps: {},
    extraction: { active: false, x: WORLD.width - 220, y: WORLD.groundY - 90, w: 86, h: 90 },
    spawnTimer: 0,
    balloonTimer: mode === "balloon" ? BALLOON_MODE.seconds : 0,
    requiredKills: mode === "level" ? 8 : mode === "balloon" ? BALLOON_MODE.targetKills : Infinity,
    bossSpawned: false,
    awaitingNextLevel: false,
    awaitingWeaponChoice: false,
    awaitingForcedShotgunNotice: false,
    pendingBoss: false,
    pendingBossType: null,
    pendingEndlessBoss: false,
    pendingEndlessBossType: null,
    endlessBossActive: false,
    endlessWavesSinceBreak: 0,
    bossAddTimer: 5,
    nextLevel: 1,
    cheats: {
      enabled: false,
      invincible: false,
      infiniteAmmo: false,
      damageMultiplier: 1,
      speedMultiplier: 1,
      jumpMultiplier: 1,
    },
  };
}

export function shouldSpawnExtraction({ mode, enemiesRemaining, bossAlive }) {
  return mode === "level" && enemiesRemaining === 0 && bossAlive === false;
}
