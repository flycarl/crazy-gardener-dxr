import { BALLOON_MODE, ENEMY_TYPES, LEVELS, PISTOL, PLAYER, POWER_UPS, RIFLE, SHOTGUN, WORLD } from "./constants.js";
import { circleRectOverlap, clamp, normalize, rectsOverlap } from "./math.js";
import { createGameState, createPlayer } from "./state.js";

const FLOOR_FRICTION = 0.82;
const ENEMY_CONTACT_COOLDOWN = 0.75;
const PLAYER_DAMAGE_COOLDOWN = 0.55;
const SHOOT_GUARD_SECONDS = 0.16;
const PELLET_DAMAGE = ENEMY_TYPES.normal.health / SHOTGUN.pelletCount;
const POWER_UP_DROP_INTERVAL = 20;
const PERMANENT_POWER_INCREMENT = 0.5;
const ENDLESS_MAX_ENEMIES = 15;
const ENDLESS_SPAWN_SECONDS = 3.2;
const MIN_SPAWN_DISTANCE_FROM_PLAYER = 560;
const WIDE_SPREAD_MULTIPLIER = 1.65;
const FAST_RELOAD_MULTIPLIER = 0.58;
const STRONG_RECOIL_MULTIPLIER = 1.45;
const SPAWN_POINTS = [720, 1040, 1380, 1740, 2140, 2520, 2880];
const CONTACT_KNOCKBACK_X = 520;
const CONTACT_KNOCKBACK_Y = -360;
const BALLOON_START_X = [620, 980, 1350, 1760, 2220];
const STOCK_RUN_KILL_SPEED = 360;
const REGEN_DELAY_SECONDS = 5;
const REGEN_FILL_SECONDS = 3;
const ENEMY_PROJECTILE_SPEED = 520;
const ENEMY_RANGED_COOLDOWN = 2.8;
const LEVEL_BOSS_ADD_SECONDS = 5;
const LEVEL_BOSS_ADD_LIMIT = 3;
const TANK_BOSS_CHARGE_DURATION = 0.64;
const TANK_BOSS_CHARGE_MULTIPLIER = 4.25;
const TANK_BOSS_CHARGE_SECONDS = 7;
const TANK_BOSS_ENRAGED_CHARGE_SECONDS = 5;
const SHIELD_RIFLE_BLOCKS = 3;
const BALLOON_HITS_TO_POP = 1;
const ENDLESS_BREAK_SECONDS = 10;
const BOSS_ADD_SECONDS = 10;
const BOSS_ADD_TYPES = ["normal", "fast", "fat", "slimeLow", "slimeMid", "slimeHigh"];
const ENDLESS_NEXT_WAVE_REMAINING = 2;
const ENDLESS_PLATFORMS = [
  { x: 620, y: 500, w: 210, h: 24 },
  { x: 1380, y: 462, w: 250, h: 24 },
  { x: 2360, y: 502, w: 220, h: 24 },
];
const ENDLESS_WALLS = [
  { x: 1060, y: WORLD.groundY - 88, w: 40, h: 88 },
  { x: 1880, y: WORLD.groundY - 112, w: 44, h: 112 },
  { x: 3060, y: WORLD.groundY - 96, w: 42, h: 96 },
];
let nextEnemyId = 1;
let nextPickupId = 1;
let nextEffectId = 1;
let nextShotId = 1;

function makeEffect(x, y, color = "#fff8d7", life = 0.28, radius = 14, extras = {}) {
  return {
    id: nextEffectId++,
    x,
    y,
    color,
    life,
    maxLife: life,
    radius,
    ...extras,
  };
}

function addSplatter(state, x, y, direction = 1, color = "#d6ff3f", amount = 8) {
  for (let index = 0; index < amount; index += 1) {
    const spread = (index / Math.max(1, amount - 1) - 0.5) * 1.4;
    const speed = 120 + index * 18;

    state.effects.push(
      makeEffect(x, y, color, 0.34 + index * 0.01, 4 + (index % 3), {
        kind: "splatter",
        vx: direction * (speed + Math.cos(spread) * 60),
        vy: Math.sin(spread) * 150 - 120 - (index % 2) * 40,
      }),
    );
  }
}

function addFloatText(state, text, x, y, color = "#fff8d7") {
  state.floatTexts.push({
    text,
    x,
    y,
    vy: -38,
    life: 1.2,
    maxLife: 1.2,
    color,
  });
}

function getPowerValue(state, id) {
  return Math.max(state?.activePowerUps?.[id] ?? 0, state?.permanentPowerUps?.[id] ?? 0);
}

function hasPower(state, id) {
  return getPowerValue(state, id) > 0;
}

function getCheatMultiplier(state, key) {
  if (!state?.cheats?.enabled) return 1;
  return Math.max(0.1, Number(state.cheats[key] ?? 1) || 1);
}

function getCheatNumber(state, key, fallback, min = 0.1, max = 99) {
  if (!state?.cheats?.enabled) return fallback;
  const value = Number(state.cheats[key] ?? fallback);
  if (!Number.isFinite(value)) return fallback;
  return clamp(value, min, max);
}

function getCheatNumberFromSettings(cheats, key, fallback, min = 0.1, max = 99) {
  if (!cheats?.enabled) return fallback;
  const value = Number(cheats[key] ?? fallback);
  if (!Number.isFinite(value)) return fallback;
  return clamp(value, min, max);
}

function getEnemyHealthMultiplier(type, cheats) {
  return getCheatNumberFromSettings(cheats, `${type}HealthMultiplier`, 1, 0.1, 20);
}

function getShieldRifleBlocks(cheats) {
  return Math.round(getCheatNumberFromSettings(cheats, "shieldRifleBlocks", SHIELD_RIFLE_BLOCKS, 1, 30));
}

function getBossAddSeconds(state, fallback) {
  return getCheatNumber(state, "bossAddSeconds", fallback, 0.2, 30);
}

function getBossAddCount(state, fallback) {
  return Math.round(getCheatNumber(state, "bossAddCount", fallback, 1, 10));
}

function hasCheat(state, key) {
  return Boolean(state?.cheats?.enabled && state.cheats[key]);
}

function attackHitsShieldFront(enemy, attackDirection) {
  return Boolean(enemy.hasShield && !enemy.shieldBroken && enemy.facing === -Math.sign(attackDirection || 1));
}

function blockShieldHit(state, enemy, x, y) {
  state.effects.push(makeEffect(x, y, "#9fb3c8", 0.22, 18));
  addFloatText(state, "防爆门挡住了", enemy.x + enemy.w / 2, enemy.y - 18, "#d7e3fc");
}

function blocksPelletWithShield(state, enemy, pellet) {
  const shotId = pellet.shotId ?? `pellet-${state.pellets.indexOf(pellet)}`;
  if (enemy.blockedShotIds?.includes(shotId)) {
    blockShieldHit(state, enemy, pellet.x, pellet.y);
    return true;
  }

  if (!attackHitsShieldFront(enemy, pellet.vx)) {
    return false;
  }

  if (pellet.weapon === "rifle") {
    enemy.shieldRifleBlocks = Math.max(0, (enemy.shieldRifleBlocks ?? SHIELD_RIFLE_BLOCKS) - 1);
    if (enemy.shieldRifleBlocks === 0) {
      enemy.shieldBroken = true;
    }
  } else {
    enemy.blockedShotIds ??= [];
    enemy.blockedShotIds.push(shotId);
    enemy.shieldBroken = true;
  }

  blockShieldHit(state, enemy, pellet.x, pellet.y);
  return true;
}

function circleCircleOverlap(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const radius = ar + br;
  return dx * dx + dy * dy <= radius * radius;
}

function pelletHitsBalloon(pellet, enemy) {
  if (!enemy.flying || enemy.balloonPopped) {
    return false;
  }

  return circleCircleOverlap(pellet.x, pellet.y, pellet.radius, enemy.x + enemy.w / 2, enemy.y - 34, 23);
}

function popBalloon(state, enemy, pellet) {
  enemy.balloonHits = (enemy.balloonHits ?? 0) + 1;
  state.effects.push(makeEffect(pellet.x, pellet.y, "#ef476f", 0.22, 20));

  if (enemy.balloonHits < BALLOON_HITS_TO_POP) {
    return;
  }

  enemy.flying = false;
  enemy.balloonPopped = true;
  enemy.health = Math.max(1, enemy.maxHealth / 2);
  enemy.vy = 360;
  enemy.onGround = false;
  addFloatText(state, "气球爆了", enemy.x + enemy.w / 2, enemy.y - 42, "#ef476f");
}

function dropRandomPermanentBuffOnDeath(state) {
  const entries = Object.entries(state.permanentPowerUps ?? {}).filter(([, count]) => count > 0);
  if (entries.length === 0) {
    return null;
  }

  const [id, count] = entries[Math.floor(Math.random() * entries.length)];
  if (count <= 1) {
    delete state.permanentPowerUps[id];
  } else {
    state.permanentPowerUps[id] = count - 1;
  }
  return id;
}

function damagePlayer(state, amount) {
  if (hasCheat(state, "invincible")) {
    return false;
  }

  const player = state.player;
  if ((player.damageCooldown ?? 0) > 0) {
    return false;
  }

  const before = player.health;
  player.health = Math.max(0, player.health - amount);

  if (player.health < before) {
    player.damageCooldown = PLAYER_DAMAGE_COOLDOWN;
    player.regenDelay = REGEN_DELAY_SECONDS;
    player.regenTimer = 0;
    player.regenStartHealth = player.health;
  }

  if (player.health === 0) {
    state.status = "gameover";
    if (state.mode === "endless") {
      state.activePowerUps = {};
      state.permanentPowerUps = {};
    } else if (state.mode === "level") {
      dropRandomPermanentBuffOnDeath(state);
    }
  }

  return player.health < before;
}

function createCorpseFromEnemy(enemy, direction) {
  return {
    id: `corpse-${enemy.id}`,
    type: enemy.type,
    x: enemy.x,
    y: enemy.y,
    w: enemy.w,
    h: enemy.h,
    vx: direction * 780,
    vy: -640,
    life: 5,
    rotation: 0,
    spin: direction * 7.4,
  };
}

function hitCorpse(state, corpse, direction, force = 360) {
  const centerX = corpse.x + corpse.w / 2;
  const centerY = corpse.y + corpse.h / 2;
  const hitDirection = Math.sign(direction || 1);

  corpse.vx += hitDirection * force;
  corpse.vy = Math.min(corpse.vy - force * 0.58, -220);
  corpse.spin += hitDirection * (force / 72);
  state.effects.push(makeEffect(centerX, centerY, "#fff8d7", 0.2, 14));
  addSplatter(state, centerX, centerY, hitDirection, "#d8f957", 5);
}

function getPlayerCenter(player) {
  return {
    x: player.x + player.w / 2,
    y: player.y + player.h / 2,
  };
}

function rectOverlapsHorizontal(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x;
}

function isGapAtX(x) {
  return WORLD.gaps.some((gap) => x >= gap.x && x <= gap.x + gap.w);
}

function getPlatformSurface(rect, previousBottom) {
  for (const platform of [...WORLD.platforms, ...WORLD.walls]) {
    if (!rectOverlapsHorizontal(rect, platform)) {
      continue;
    }

    if (previousBottom <= platform.y + 18 && rect.y + rect.h >= platform.y) {
      return platform.y;
    }
  }

  return null;
}

function resolveWallCollisions(rect, previousX) {
  for (const wall of WORLD.walls) {
    const verticalOverlap = rect.y < wall.y + wall.h && rect.y + rect.h > wall.y;
    const crossedFromLeft = previousX + rect.w <= wall.x && rect.x + rect.w >= wall.x;
    const crossedFromRight = previousX >= wall.x + wall.w && rect.x <= wall.x + wall.w;

    if (!verticalOverlap || (!rectsOverlap(rect, wall) && !crossedFromLeft && !crossedFromRight)) {
      continue;
    }

    if (crossedFromLeft || previousX + rect.w <= wall.x) {
      rect.x = wall.x - rect.w;
      rect.vx = Math.min(0, rect.vx);
    } else if (crossedFromRight || previousX >= wall.x + wall.w) {
      rect.x = wall.x + wall.w;
      rect.vx = Math.max(0, rect.vx);
    }
  }
}

function getLevelWalls(level) {
  const offset = Math.min(10, Math.floor((level - 1) / 2));
  return [
    { x: 1040 + offset * 18, y: WORLD.groundY - 82, w: 42, h: 82 },
    { x: 2040 + offset * 24, y: WORLD.groundY - 104, w: 46, h: 104 },
    ...(level >= 8 ? [{ x: 2940, y: WORLD.groundY - 94, w: 42, h: 94 }] : []),
  ];
}

function getGroundSurface(rect) {
  const centerX = rect.x + rect.w / 2;
  return isGapAtX(centerX) ? null : WORLD.groundY;
}

function getTerrainSurface(rect, previousBottom) {
  const platformSurface = getPlatformSurface(rect, previousBottom);

  if (platformSurface !== null) {
    return platformSurface;
  }

  const groundSurface = getGroundSurface(rect);
  return groundSurface !== null && previousBottom <= groundSurface ? groundSurface : null;
}

function getEnemySurface(enemy, previousBottom) {
  return getPlatformSurface(enemy, previousBottom) ?? getGroundSurface(enemy);
}

function getClimbablePlatformAhead(enemy, directionX) {
  const frontX = directionX >= 0 ? enemy.x + enemy.w + 12 : enemy.x - 12;

  return WORLD.platforms.find(
    (platform) =>
      frontX >= platform.x &&
      frontX <= platform.x + platform.w &&
      platform.y < enemy.y + enemy.h &&
      platform.y >= enemy.y + enemy.h - 132,
  );
}

function getWallAhead(enemy, directionX) {
  const frontX = directionX >= 0 ? enemy.x + enemy.w + 10 : enemy.x - 10;

  return WORLD.walls.find(
    (wall) =>
      frontX >= wall.x &&
      frontX <= wall.x + wall.w &&
      enemy.y + enemy.h > wall.y + 12 &&
      enemy.y < wall.y + wall.h,
  );
}

function fireEnemyProjectile(state, enemy, directionOverride = null) {
  const enemyCenter = getRectCenter(enemy);
  const playerCenter = getPlayerCenter(state.player);
  const direction = directionOverride ?? normalize(playerCenter.x - enemyCenter.x, playerCenter.y - enemyCenter.y);

  state.enemyProjectiles.push({
    x: enemyCenter.x,
    y: enemyCenter.y,
    w: 12,
    h: 12,
    vx: direction.x * ENEMY_PROJECTILE_SPEED,
    vy: direction.y * ENEMY_PROJECTILE_SPEED,
    damage: enemy.type === "rangedBoss" ? 16 : 9,
    life: 3.2,
    color: "#d7263d",
  });
  state.effects.push(makeEffect(enemyCenter.x, enemyCenter.y, "#d7263d", 0.18, 12));
}

function fireRangedBossAttack(state, enemy, direction) {
  const enraged = enemy.health <= enemy.maxHealth / 2;
  const shotMultiplier = getCheatNumber(state, "rangedBossShotMultiplier", 1, 0.25, 10);

  if (enraged && !enemy.rangedEnraged) {
    const ringShots = Math.max(1, Math.round(10 * shotMultiplier));
    for (let index = 0; index < ringShots; index += 1) {
      const angle = (Math.PI * 2 * index) / ringShots;
      fireEnemyProjectile(state, enemy, { x: Math.cos(angle), y: Math.sin(angle) });
    }
    enemy.rangedEnraged = true;
    return;
  }

  const minShots = enraged ? 3 : 2;
  const maxShots = enraged ? 4 : 2;
  const baseShotCount = minShots + Math.floor(Math.random() * (maxShots - minShots + 1));
  const shotCount = Math.max(1, Math.round(baseShotCount * shotMultiplier));
  const spread = 0.16;

  for (let index = 0; index < shotCount; index += 1) {
    const offset = index - (shotCount - 1) / 2;
    fireEnemyProjectile(state, enemy, rotate(direction, offset * spread));
  }
}

function respawnPlayerAfterFall(state) {
  const player = state.player;
  player.x = Math.max(80, state.cameraX + 120);
  player.y = WORLD.groundY - player.h;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  damagePlayer(state, 20);
  state.effects.push(makeEffect(player.x + player.w / 2, player.y + player.h / 2, "#8ecae6", 0.28, 26, { kind: "launch" }));
}

function getRectCenter(rect) {
  return {
    x: rect.x + rect.w / 2,
    y: rect.y + rect.h / 2,
  };
}

function rotate(vector, radians) {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos,
  };
}

function segmentIntersectsRect(x1, y1, x2, y2, rect, padding = 0) {
  const minX = rect.x - padding;
  const maxX = rect.x + rect.w + padding;
  const minY = rect.y - padding;
  const maxY = rect.y + rect.h + padding;
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;

  const clip = (p, q) => {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0) {
      if (t > tMax) return false;
      if (t > tMin) tMin = t;
    } else {
      if (t < tMin) return false;
      if (t < tMax) tMax = t;
    }
    return true;
  };

  return clip(-dx, x1 - minX) && clip(dx, maxX - x1) && clip(-dy, y1 - minY) && clip(dy, maxY - y1);
}

function wallBlocksSegment(x1, y1, x2, y2, padding = 0) {
  return WORLD.walls.some((wall) => segmentIntersectsRect(x1, y1, x2, y2, wall, padding));
}

function wallBlocksStockHit(player, enemy) {
  return wallBlocksSegment(player.x + player.w / 2, player.y + player.h / 2, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
}

function updateTimers(player, dt) {
  player.shotCooldown = Math.max(0, player.shotCooldown - dt);
  player.stockCooldown = Math.max(0, player.stockCooldown - dt);
  player.stockTimer = Math.max(0, player.stockTimer - dt);
  player.queuedShotDelay = Math.max(0, (player.queuedShotDelay ?? 0) - dt);
  player.damageCooldown = Math.max(0, (player.damageCooldown ?? 0) - dt);

  if (player.reloading) {
    player.reloadTimer = Math.max(0, player.reloadTimer - dt);

    if (player.reloadTimer === 0) {
      player.reloading = false;
      player.ammo = player.magazineSize;
    }
  }
}

function updatePlayerRegeneration(player, dt) {
  if (player.health <= 0 || player.health >= player.maxHealth) {
    player.regenDelay = 0;
    player.regenTimer = 0;
    player.regenStartHealth = player.health;
    return;
  }

  if (player.regenDelay > 0) {
    player.regenDelay = Math.max(0, player.regenDelay - dt);
    if (player.regenDelay === 0) {
      player.regenTimer = 0;
      player.regenStartHealth = player.health;
    }
    return;
  }

  player.regenTimer = Math.min(REGEN_FILL_SECONDS, player.regenTimer + dt);
  const progress = player.regenTimer / REGEN_FILL_SECONDS;
  player.health = Math.min(player.maxHealth, player.regenStartHealth + (player.maxHealth - player.regenStartHealth) * progress);
  if (player.regenTimer >= REGEN_FILL_SECONDS - 0.0001) {
    player.health = player.maxHealth;
  }
}

function updateEnemyProjectiles(state, dt) {
  const player = state.player;

  for (const projectile of state.enemyProjectiles) {
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.life -= dt;

    if (projectile.life > 0 && rectsOverlap(projectile, player)) {
      const damaged = damagePlayer(state, projectile.damage);
      if (damaged) {
        player.vx = Math.sign(projectile.vx || 1) * CONTACT_KNOCKBACK_X * 0.82;
        player.vy = CONTACT_KNOCKBACK_Y * 0.82;
        player.onGround = false;
      }
      projectile.life = 0;
      state.effects.push(makeEffect(player.x + player.w / 2, player.y + player.h / 2, "#e45757", 0.2, 16));
    }
  }

  state.enemyProjectiles = state.enemyProjectiles.filter(
    (projectile) => projectile.life > 0 && projectile.x >= 0 && projectile.x <= WORLD.width && projectile.y >= 0 && projectile.y <= WORLD.height,
  );
}

function updatePowerUps(state, dt) {
  for (const [id, time] of Object.entries(state.activePowerUps)) {
    const nextTime = Math.max(0, time - dt);

    if (nextTime === 0) {
      delete state.activePowerUps[id];
    } else {
      state.activePowerUps[id] = nextTime;
    }
  }
}

function updatePlayer(state, input, pressed, dt) {
  const player = state.player;
  const horizontal = Number(Boolean(input.right)) - Number(Boolean(input.left));
  const speedMultiplier = getCheatMultiplier(state, "speedMultiplier");
  const jumpMultiplier = getCheatMultiplier(state, "jumpMultiplier");

  if (horizontal !== 0) {
    player.vx = horizontal * PLAYER.speed * speedMultiplier;
    player.facing = horizontal;
  } else if (player.onGround) {
    player.vx *= FLOOR_FRICTION;
    if (Math.abs(player.vx) < 1) player.vx = 0;
  }

  if (pressed.jumpPressed && player.onGround) {
    player.vy = PLAYER.jumpVelocity * jumpMultiplier;
    player.onGround = false;
  }

  const previousX = player.x;
  const previousBottom = player.y + player.h;
  player.vy += WORLD.gravity * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  player.x = clamp(player.x, 0, WORLD.width - player.w);
  resolveWallCollisions(player, previousX);

  const surfaceY = getTerrainSurface(player, previousBottom);
  if (surfaceY !== null && player.vy >= 0 && player.y + player.h >= surfaceY) {
    player.y = surfaceY - player.h;
    player.vy = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  if (player.y > WORLD.height + 140) {
    respawnPlayerAfterFall(state);
  }
}

function updatePellets(state, dt) {
  for (const pellet of state.pellets) {
    pellet.previousX = pellet.x;
    pellet.previousY = pellet.y;
    pellet.x += pellet.vx * dt;
    pellet.y += pellet.vy * dt;
    pellet.life -= dt;
  }

  state.pellets = state.pellets.filter(
    (pellet) =>
      pellet.life > 0 &&
      pellet.x >= 0 &&
      pellet.x <= WORLD.width &&
      pellet.y >= 0 &&
      pellet.y <= WORLD.height,
  );
}

function updateEffects(state, dt) {
  for (const effect of state.effects) {
    if (effect.kind === "splatter") {
      effect.x += (effect.vx ?? 0) * dt;
      effect.y += (effect.vy ?? 0) * dt;
      effect.vy = (effect.vy ?? 0) + WORLD.gravity * 0.42 * dt;
    }

    effect.life -= dt;
  }

  state.effects = state.effects.filter((effect) => effect.life > 0);
}

function updateCorpses(state, dt) {
  for (const corpse of state.corpses) {
    corpse.vy += WORLD.gravity * dt;
    corpse.x = clamp(corpse.x + corpse.vx * dt, 0, WORLD.width - corpse.w);
    corpse.y += corpse.vy * dt;
    corpse.rotation += corpse.spin * dt;
    corpse.life -= dt;

    const floorY = WORLD.groundY - corpse.h;
    if (corpse.y >= floorY) {
      corpse.y = floorY;
      corpse.vy = 0;
      corpse.vx *= 0.84;
      corpse.spin *= 0.84;
    }
  }

  state.corpses = state.corpses.filter((corpse) => corpse.life > 0);
}

function updateFloatTexts(state, dt) {
  for (const floatText of state.floatTexts) {
    floatText.y += floatText.vy * dt;
    floatText.life -= dt;
  }

  state.floatTexts = state.floatTexts.filter((floatText) => floatText.life > 0);
}

function getLevelPlan(level) {
  return LEVELS[clamp(level, 1, LEVELS.length) - 1];
}

function chooseEndlessLevelStyle() {
  return Math.floor(Math.random() * LEVELS.length) + 1;
}

function applyEndlessLevelStyle(state, levelStyle) {
  const style = clamp(levelStyle, 1, LEVELS.length);
  const plan = getLevelPlan(style);
  state.endlessLevelStyle = style;
  WORLD.platforms = plan.platforms.map((platform) => ({ ...platform }));
  WORLD.walls = getLevelWalls(style);
  return plan;
}

function getSpawnX(state, index) {
  const orderedPoints = SPAWN_POINTS.map((_, pointIndex) => SPAWN_POINTS[(pointIndex + index) % SPAWN_POINTS.length]);
  const safePoint = orderedPoints.find((point) => Math.abs(point - state.player.x) >= MIN_SPAWN_DISTANCE_FROM_PLAYER);
  const fallback = state.player.x < WORLD.width / 2 ? WORLD.width - 260 : 720;

  return clamp(safePoint ?? fallback, 420, WORLD.width - 170);
}

function spawnEnemyList(state, enemyTypes, startIndex = 0) {
  return enemyTypes.map((type, index) => {
    const enemy = createEnemy(type, getSpawnX(state, startIndex + index), WORLD.groundY, state.cheats);
    state.enemies.push(enemy);
    return enemy;
  });
}

function spawnBossAdds(state) {
  const remainingCapacity = Math.max(0, ENDLESS_MAX_ENEMIES - state.enemies.length);
  const count = Math.min(getBossAddCount(state, 2), remainingCapacity);
  const enemyTypes = [];

  for (let index = 0; index < count; index += 1) {
    enemyTypes.push(BOSS_ADD_TYPES[(state.wave + state.kills + index) % BOSS_ADD_TYPES.length]);
  }

  return spawnEnemyList(state, enemyTypes, state.wave + state.kills + 11);
}

function spawnLevelBossAdd(state) {
  if ((state.levelBossAddsSpawned ?? 0) >= LEVEL_BOSS_ADD_LIMIT) {
    return [];
  }

  const remainingAdds = Math.max(0, LEVEL_BOSS_ADD_LIMIT - (state.levelBossAddsSpawned ?? 0));
  const count = Math.min(getBossAddCount(state, 1), remainingAdds);
  const types = [];
  for (let index = 0; index < count; index += 1) {
    types.push(BOSS_ADD_TYPES[Math.floor(Math.random() * BOSS_ADD_TYPES.length)]);
  }
  const spawned = spawnEnemyList(state, types, state.level + state.kills + state.enemies.length + 7);
  for (const enemy of spawned) {
    enemy.summonedByBoss = true;
  }
  state.levelBossAddsSpawned = (state.levelBossAddsSpawned ?? 0) + spawned.length;
  return spawned;
}

function spawnPendingBoss(state) {
  const bossTypes = state.pendingBossTypes?.length ? state.pendingBossTypes : state.pendingBossType ? [state.pendingBossType] : [];
  if (!state.pendingBoss || bossTypes.length === 0) {
    return null;
  }

  const bosses = bossTypes.map((bossType, index) => {
    const bossX = getSpawnX(state, state.level + 3 + index);
    return createEnemy(bossType, bossX, WORLD.groundY, state.cheats);
  });

  state.enemies.push(...bosses);
  state.pendingBoss = false;
  state.pendingBossType = null;
  state.pendingBossTypes = [];
  state.bossSpawned = true;
  state.bossAlive = true;
  state.enemiesRemaining = state.enemies.length;

  return bosses[0] ?? null;
}

function getStockHitbox(state) {
  const player = state.player;
  const range = SHOTGUN.stockRange + (hasPower(state, "longStock") ? 42 : 0);
  const height = player.h + 42;

  return {
    x: player.facing >= 0 ? player.x + player.w - 4 : player.x - range + 4,
    y: player.y - 20,
    w: range,
    h: height,
  };
}

function getStandingPlatform(rect) {
  const bottom = rect.y + rect.h;
  return WORLD.platforms.find(
    (platform) => Math.abs(bottom - platform.y) <= 3 && rect.x + rect.w > platform.x && rect.x < platform.x + platform.w,
  );
}

function getPlatformOccupiedByPlayer(player) {
  return getStandingPlatform(player);
}

function getPlatformClimbDirection(enemy, platform) {
  const enemyCenterX = enemy.x + enemy.w / 2;
  const distanceLeft = Math.abs(enemyCenterX - platform.x);
  const distanceRight = Math.abs(enemyCenterX - (platform.x + platform.w));

  return distanceLeft <= distanceRight ? -1 : 1;
}

function getPlatformEdgeDirection(enemy, player, platform) {
  const enemyCenterX = enemy.x + enemy.w / 2;
  const playerCenterX = player.x + player.w / 2;
  if (playerCenterX < platform.x || playerCenterX > platform.x + platform.w) {
    return Math.sign(playerCenterX - enemyCenterX || 1);
  }

  const distanceLeft = Math.abs(enemyCenterX - platform.x);
  const distanceRight = Math.abs(platform.x + platform.w - enemyCenterX);
  return distanceLeft <= distanceRight ? -1 : 1;
}

function stepOffPlatform(enemy, platform, direction) {
  const leftEdge = platform.x - enemy.w - 3;
  const rightEdge = platform.x + platform.w + 3;
  const edgeX = direction < 0 ? leftEdge : rightEdge;
  const enemyCenterX = enemy.x + enemy.w / 2;
  const targetEdgeX = direction < 0 ? platform.x : platform.x + platform.w;

  if (Math.abs(enemyCenterX - targetEdgeX) > enemy.w * 0.75) {
    return false;
  }

  enemy.x = clamp(edgeX, 0, WORLD.width - enemy.w);
  enemy.y += 2;
  enemy.vx = direction * Math.max(enemy.speed, 90);
  enemy.vy = Math.max(enemy.vy, 180);
  enemy.onGround = false;
  return true;
}

function updateSlimeHop(enemy, directionX) {
  if (!enemy.onGround) {
    return false;
  }

  enemy.vx = directionX * enemy.speed;
  enemy.vy = -(enemy.jumpVelocity ?? 650);
  enemy.onGround = false;
  return true;
}

function seekPlayerPlatform(enemy, player) {
  if (!enemy.onGround) {
    return false;
  }

  const platform = getPlatformOccupiedByPlayer(player);
  if (!platform || enemy.y + enemy.h <= platform.y + 20) {
    return false;
  }

  const enemyCenterX = enemy.x + enemy.w / 2;
  const nearPlatform = enemyCenterX >= platform.x - 70 && enemyCenterX <= platform.x + platform.w + 70;
  if (!nearPlatform) {
    return false;
  }

  const direction = getPlatformClimbDirection(enemy, platform);
  enemy.seekingPlatformEdge = true;
  enemy.platformChoice = "climb";
  enemy.vx = direction * Math.max(enemy.speed, 95);
  enemy.vy = -780;
  enemy.onGround = false;
  return true;
}

function updateTankBossCharge(state, enemy, directionX, dt) {
  enemy.chargeTimer = Math.max(0, (enemy.chargeTimer ?? 0) - dt);
  enemy.chargeCooldown = Math.max(0, (enemy.chargeCooldown ?? getCheatNumber(state, "tankChargeSeconds", TANK_BOSS_CHARGE_SECONDS, 0.5, 30)) - dt);

  if (enemy.chargeTimer > 0) {
    enemy.vx = (enemy.chargeDirection || Math.sign(directionX || 1)) * enemy.speed * TANK_BOSS_CHARGE_MULTIPLIER;
    return true;
  }

  if (enemy.chargeCooldown === 0) {
    enemy.chargeDirection = Math.sign(directionX || 1);
    enemy.chargeTimer = TANK_BOSS_CHARGE_DURATION;
    enemy.chargeCooldown =
      enemy.health <= enemy.maxHealth / 2
        ? getCheatNumber(state, "tankEnragedChargeSeconds", TANK_BOSS_ENRAGED_CHARGE_SECONDS, 0.5, 30)
        : getCheatNumber(state, "tankChargeSeconds", TANK_BOSS_CHARGE_SECONDS, 0.5, 30);
    enemy.vx = enemy.chargeDirection * enemy.speed * TANK_BOSS_CHARGE_MULTIPLIER;
    state.effects.push(makeEffect(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#ff6b6b", 0.26, 28, { kind: "launch" }));
    return true;
  }

  return false;
}

function updateEnemies(state, dt) {
  const player = state.player;
  const playerCenter = getPlayerCenter(player);

  for (const enemy of state.enemies) {
    const enemyCenter = getRectCenter(enemy);
    const direction = normalize(playerCenter.x - enemyCenter.x, playerCenter.y - enemyCenter.y);
    enemy.hitCooldown = Math.max(0, enemy.hitCooldown - dt);
    enemy.invulnerableTimer = Math.max(0, (enemy.invulnerableTimer ?? 0) - dt);
    enemy.rangedCooldown = Math.max(0, (enemy.rangedCooldown ?? 0) - dt);
    enemy.wallPauseTimer = Math.max(0, (enemy.wallPauseTimer ?? 0) - dt);
    const charging = enemy.type === "tankBoss" ? updateTankBossCharge(state, enemy, direction.x, dt) : false;

    if (enemy.type === "rangedBoss" && enemy.rangedCooldown === 0 && Math.abs(playerCenter.x - enemyCenter.x) <= 640) {
      fireRangedBossAttack(state, enemy, direction);
      enemy.rangedCooldown = getCheatNumber(state, "rangedBossCooldownSeconds", ENEMY_RANGED_COOLDOWN, 0.2, 30);
    }

    if (state.mode !== "balloon") {
      enemy.vx = charging ? enemy.vx : enemy.wallPauseTimer > 0 ? 0 : direction.x * enemy.speed;
      enemy.facing = direction.x < 0 ? -1 : 1;
    }
    enemy.onGround = Boolean(enemy.onGround ?? true);

    if (enemy.flying) {
      enemy.x = clamp(enemy.x + enemy.vx * dt, 0, WORLD.width - enemy.w);
      if (state.mode === "balloon") {
        enemy.driftTime = (enemy.driftTime ?? 0) + dt;
        enemy.y = enemy.baseY + Math.sin(enemy.driftTime * enemy.driftY) * enemy.floatRange;
        if (enemy.x <= 0 || enemy.x + enemy.w >= WORLD.width) {
          enemy.vx *= -1;
        }
      } else {
        enemy.vy = direction.y * enemy.speed * 0.68;
        enemy.y = clamp(enemy.y + enemy.vy * dt, 90, WORLD.groundY - enemy.h - 55);
      }
    } else {
      const moveDirection = Math.sign(direction.x || 1);
      const standingPlatform = getStandingPlatform(enemy);
      const playerBelowPlatform =
        standingPlatform &&
        player.y + player.h > standingPlatform.y + 28 &&
        player.x + player.w > standingPlatform.x - 40 &&
        player.x < standingPlatform.x + standingPlatform.w + 40;
      const lookAheadX = enemy.x + enemy.w / 2 + moveDirection * (enemy.w / 2 + 52);
      const approachingGap = enemy.onGround && isGapAtX(lookAheadX);
      const climbPlatform = enemy.onGround ? getClimbablePlatformAhead(enemy, moveDirection) : null;
      const wallAhead = enemy.onGround ? getWallAhead(enemy, moveDirection) : null;

      if (playerBelowPlatform) {
        const edgeDirection = getPlatformEdgeDirection(enemy, player, standingPlatform);
        enemy.descendingToPlayer = true;
        enemy.vx = edgeDirection * enemy.speed;
        enemy.platformChoice = "ground";
        stepOffPlatform(enemy, standingPlatform, edgeDirection);
      } else {
        enemy.descendingToPlayer = false;
      }

      const seekingPlayerPlatform = seekPlayerPlatform(enemy, player);

      if (enemy.isSlime) {
        updateSlimeHop(enemy, moveDirection);
      }

      if (!seekingPlayerPlatform && approachingGap) {
        enemy.vy = -760;
        enemy.onGround = false;
      }

      if (climbPlatform) {
        enemy.platformChoice ??= Math.random() < 0.5 ? "ground" : "climb";
      }

      if (!seekingPlayerPlatform && climbPlatform && enemy.platformChoice === "climb") {
        enemy.vy = -820;
        enemy.onGround = false;
      }

      if (wallAhead && !enemy.wallPauseTimer && !enemy.wallJumpQueued) {
        enemy.wallPauseTimer = 0.5;
        enemy.wallJumpQueued = true;
        enemy.vx = 0;
      }

      if (enemy.wallJumpQueued && enemy.wallPauseTimer === 0) {
        enemy.vy = -820;
        enemy.onGround = false;
        enemy.wallJumpQueued = false;
      }

      const previousX = enemy.x;
      const previousBottom = enemy.y + enemy.h;
      enemy.x = clamp(enemy.x + enemy.vx * dt, 0, WORLD.width - enemy.w);
      resolveWallCollisions(enemy, previousX);

      const surfaceY = getEnemySurface(enemy, previousBottom);

      if (surfaceY === null || enemy.y + enemy.h < surfaceY || enemy.vy < 0) {
        enemy.vy += WORLD.gravity * dt;
        enemy.y += enemy.vy * dt;
      } else {
        enemy.y = surfaceY - enemy.h;
        enemy.vy = 0;
        enemy.onGround = true;
      }
    }

    if (state.mode !== "balloon" && enemy.hitCooldown === 0 && rectsOverlap(player, enemy)) {
      damagePlayer(state, enemy.damage);
      const knockbackDirection = player.x + player.w / 2 < enemy.x + enemy.w / 2 ? -1 : 1;
      player.vx = knockbackDirection * CONTACT_KNOCKBACK_X;
      player.vy = CONTACT_KNOCKBACK_Y;
      player.onGround = false;
      enemy.hitCooldown = ENEMY_CONTACT_COOLDOWN;
      state.effects.push(makeEffect(playerCenter.x, playerCenter.y, "#e45757", 0.22, 18));

    }
  }
}

export function applyPelletHits(state) {
  const remainingPellets = [];

  for (const pellet of state.pellets) {
    let keepPellet = true;
    pellet.hitEnemyIds ??= [];
    pellet.piercesRemaining ??= hasPower(state, "piercing") ? 1 : 0;

    if (
      wallBlocksSegment(
        pellet.previousX ?? pellet.x - pellet.vx * 0.018,
        pellet.previousY ?? pellet.y - pellet.vy * 0.018,
        pellet.x,
        pellet.y,
        pellet.radius ?? 0,
      )
    ) {
      pellet.life = 0;
      keepPellet = false;
      state.effects.push(makeEffect(pellet.x, pellet.y, "#a85d3c", 0.16, 10));
    }

    for (const corpse of state.corpses) {
      if (!keepPellet) break;
      if (!circleRectOverlap(pellet.x, pellet.y, pellet.radius, corpse)) {
        continue;
      }

      hitCorpse(state, corpse, pellet.vx, 320);
    }

    const hitBalloons = state.enemies.filter(
      (enemy) => keepPellet && enemy.health > 0 && !pellet.hitEnemyIds.includes(enemy.id) && pelletHitsBalloon(pellet, enemy),
    );

    if (hitBalloons.length > 0) {
      for (const enemy of hitBalloons) {
        popBalloon(state, enemy, pellet);
        pellet.hitEnemyIds.push(enemy.id);
      }
      keepPellet = false;
      pellet.life = 0;
    }

    const hitEnemies = state.enemies.filter(
      (enemy) => keepPellet && enemy.health > 0 && !pellet.hitEnemyIds.includes(enemy.id) && circleRectOverlap(pellet.x, pellet.y, pellet.radius, enemy),
    );

    if (hitEnemies.length > 0) {
      const shieldBlocker = hitEnemies.find((enemy) => blocksPelletWithShield(state, enemy, pellet));
      if (shieldBlocker) {
        for (const enemy of hitEnemies) {
          pellet.hitEnemyIds.push(enemy.id);
        }
        keepPellet = false;
        pellet.life = 0;
      } else {
      const hitIndex = pellet.hitEnemyIds.length;
      const damage = (pellet.damage ?? PELLET_DAMAGE) * Math.pow(pellet.damageFalloff ?? 1, hitIndex) * getCheatMultiplier(state, "damageMultiplier");

      for (const enemy of hitEnemies) {
      enemy.health -= damage;
      if (enemy.health <= 0.0001) {
        enemy.health = 0;
      }
      enemy.vx += Math.sign(pellet.vx || 1) * 90;
      pellet.hitEnemyIds.push(enemy.id);
      state.effects.push(makeEffect(pellet.x, pellet.y, enemy.isBoss ? "#f4d35e" : "#ffffff", 0.18, 10));
      addSplatter(state, pellet.x, pellet.y, Math.sign(pellet.vx || 1), enemy.isBoss ? "#ffcf40" : "#d8f957", enemy.isBoss ? 10 : 7);
      }

      if (pellet.piercesRemaining > 0) {
        pellet.piercesRemaining -= 1;
      } else {
        keepPellet = false;
        pellet.life = 0;
      }
      }
    }

    if (keepPellet && pellet.life > 0) {
      remainingPellets.push(pellet);
    }
  }

  state.pellets = remainingPellets;
  removeDeadEnemies(state);
}

function applyPickupCollisions(state) {
  const player = state.player;

  state.pickups = state.pickups.filter((pickup) => {
    if (!rectsOverlap(player, pickup)) {
      return true;
    }

    state.permanentPowerUps[pickup.id] = (state.permanentPowerUps[pickup.id] ?? 0) + 1;
    const bonusText = pickup.id === "piercing" ? ` +${PERMANENT_POWER_INCREMENT}` : " +1";
    addFloatText(state, `永久强化：${POWER_UPS[pickup.id].label}${bonusText}`, player.x + player.w / 2, player.y - 18, pickup.color);
    state.effects.push(makeEffect(pickup.x + pickup.w / 2, pickup.y + pickup.h / 2, pickup.color, 0.36, 24));
    return false;
  });
}

function maybeDropPickup(state, enemy) {
  if (state.kills % POWER_UP_DROP_INTERVAL !== 0) return;

  const ids = Object.keys(POWER_UPS);
  const id = ids[(state.kills / POWER_UP_DROP_INTERVAL - 1) % ids.length];
  spawnPowerUp(state, id, enemy.x + enemy.w / 2 - 13, enemy.y + enemy.h / 2 - 13);
}

function removeDeadEnemies(state) {
  const survivors = [];

  for (const enemy of state.enemies) {
    if (enemy.health > 0) {
      survivors.push(enemy);
      continue;
    }

    state.kills += 1;
    state.score += enemy.score;
    if (!state.corpses.some((corpse) => corpse.id === `corpse-${enemy.id}`)) {
      state.corpses.push(createCorpseFromEnemy(enemy, Math.sign(enemy.vx || state.player.facing || 1)));
    }
    state.effects.push(makeEffect(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, enemy.isBoss ? "#d7263d" : "#f4d35e", 0.45, enemy.isBoss ? 44 : 24));
    if (state.mode !== "balloon") {
      maybeDropPickup(state, enemy);
    }
  }

  state.enemies = survivors;
  state.enemiesRemaining = state.enemies.length;
  state.bossAlive = state.enemies.some((enemy) => enemy.isBoss);
}

function updateLevelBookkeeping(state, dt) {
  state.enemiesRemaining = state.enemies.length;
  state.bossAlive = state.enemies.some((enemy) => enemy.isBoss);

  if (state.mode !== "level" || state.awaitingNextLevel || state.extraction.active) {
    return;
  }

  if (state.bossAlive && (state.levelBossAddsSpawned ?? 0) < LEVEL_BOSS_ADD_LIMIT) {
    const bossAddSeconds = getBossAddSeconds(state, LEVEL_BOSS_ADD_SECONDS);
    state.bossAddTimer = Math.max(0, (state.bossAddTimer ?? bossAddSeconds) - dt);
    if (state.bossAddTimer === 0) {
      spawnLevelBossAdd(state);
      state.bossAddTimer = bossAddSeconds;
      state.enemiesRemaining = state.enemies.length;
    }
  }

  if (state.pendingBoss && state.enemiesRemaining === 0 && !state.bossAlive) {
    spawnPendingBoss(state);
    return;
  }

  const summonedBossAddsAlive = state.enemies.some((enemy) => enemy.summonedByBoss);
  if (state.bossSpawned && !state.bossAlive && !summonedBossAddsAlive && !state.awaitingWeaponChoice && state.level % 5 === 0) {
    state.awaitingWeaponChoice = true;
    return;
  }

  if (state.awaitingWeaponChoice) {
    return;
  }

  if (state.kills >= state.requiredKills && state.enemiesRemaining === 0 && !state.bossAlive) {
    state.extraction.active = true;
    state.extraction.x = WORLD.width - 190;
    state.extraction.y = WORLD.groundY - state.extraction.h;
    state.nextLevel = state.level + 1;
  }
}

function updateBalloonBookkeeping(state, dt) {
  if (state.mode !== "balloon" || state.awaitingNextLevel) {
    return;
  }

  state.balloonTimer = Math.max(0, state.balloonTimer - dt);
  state.enemiesRemaining = state.enemies.length;

  if (state.kills >= state.requiredKills && state.enemies.length === 0) {
    state.awaitingNextLevel = true;
    state.nextLevel = state.level + 1;
    return;
  }

  if (state.balloonTimer === 0) {
    state.status = "gameover";
  }
}

function updateEndlessSpawns(state, dt) {
  if (state.mode !== "endless") {
    return;
  }

  if (!state.endlessWallsReady) {
    WORLD.platforms = ENDLESS_PLATFORMS.map((platform) => ({ ...platform }));
    WORLD.walls = ENDLESS_WALLS.map((wall) => ({ ...wall }));
    state.endlessWallsReady = true;
  }

  state.extraction.active = false;
  state.spawnTimer = Math.max(0, state.spawnTimer - dt);

  if (state.endlessBossActive) {
    const bossAddSeconds = getBossAddSeconds(state, BOSS_ADD_SECONDS);
    state.bossAddTimer = Math.max(0, (state.bossAddTimer ?? bossAddSeconds) - dt);
    if (state.bossAddTimer === 0) {
      spawnBossAdds(state);
      state.bossAddTimer = bossAddSeconds;
    }

    state.enemiesRemaining = state.enemies.length;
    state.bossAlive = state.enemies.some((enemy) => enemy.isBoss);
    if (!state.bossAlive && state.enemies.length === 0) {
      state.endlessBossActive = false;
      state.wave += 1;
      state.spawnTimer = ENDLESS_SPAWN_SECONDS;
    }
    return;
  }

  if (state.pendingEndlessBoss) {
    state.enemiesRemaining = state.enemies.length;
    state.bossAlive = state.enemies.some((enemy) => enemy.isBoss);
    if (state.enemies.length > 0) {
      return;
    }

    const bossType = state.pendingEndlessBossType ?? (state.wave % 40 === 0 ? "rangedBoss" : "tankBoss");
    const boss = createEnemy(bossType, getSpawnX(state, state.wave + 5), WORLD.groundY, state.cheats);
    state.enemies.push(boss);
    state.pendingEndlessBoss = false;
    state.pendingEndlessBossType = null;
    state.endlessBossActive = true;
    state.bossAddTimer = BOSS_ADD_SECONDS;
    state.bossAlive = true;
    state.enemiesRemaining = state.enemies.length;
    state.spawnTimer = 0;
    return;
  }

  if (state.spawnTimer > 0) {
    return;
  }

  if ((state.endlessWavesSinceBreak ?? 0) >= 3 && state.enemies.length === 0) {
    state.endlessWavesSinceBreak = 0;
    state.spawnTimer = ENDLESS_BREAK_SECONDS;
    state.enemiesRemaining = 0;
    return;
  }

  if (state.enemies.length > ENDLESS_NEXT_WAVE_REMAINING) {
    state.spawnTimer = ENDLESS_SPAWN_SECONDS;
    state.enemiesRemaining = state.enemies.length;
    return;
  }

  const wave = state.wave;
  const levelPlan = applyEndlessLevelStyle(state, chooseEndlessLevelStyle());
  const enemyTypes = levelPlan.enemies;

  let remainingCapacity = Math.max(0, ENDLESS_MAX_ENEMIES - state.enemies.length);
  spawnEnemyList(state, enemyTypes.slice(0, remainingCapacity));
  remainingCapacity = Math.max(0, ENDLESS_MAX_ENEMIES - state.enemies.length);

  if (wave % 20 === 0) {
    state.pendingEndlessBoss = true;
    state.pendingEndlessBossType = wave % 40 === 0 ? "rangedBoss" : "tankBoss";
    state.spawnTimer = 0;
  } else {
    state.wave += 1;
    state.endlessWavesSinceBreak = (state.endlessWavesSinceBreak ?? 0) + 1;
    state.spawnTimer = Math.max(1.25, ENDLESS_SPAWN_SECONDS - Math.min(1.6, wave * 0.12));
  }

  state.enemiesRemaining = state.enemies.length;
  state.bossAlive = state.enemies.some((enemy) => enemy.isBoss);
}

export function createEnemy(type = "normal", x = 0, y = WORLD.groundY, cheats = null) {
  const template = ENEMY_TYPES[type] ?? ENEMY_TYPES.normal;
  const maxHealth = template.health * getEnemyHealthMultiplier(type, cheats);
  const shieldRifleBlocks = template.shield ? getShieldRifleBlocks(cheats) : 0;

  return {
    id: nextEnemyId++,
    type,
    label: template.label,
    x,
    y: template.flying ? WORLD.groundY - template.height - 190 : Math.min(y, WORLD.groundY - template.height),
    vx: 0,
    vy: 0,
    w: template.width,
    h: template.height,
    health: maxHealth,
    maxHealth,
    speed: template.speed,
    damage: template.damage,
    score: template.score,
    isBoss: type === "tankBoss" || type === "rangedBoss",
    ranged: Boolean(template.ranged),
    isSlime: Boolean(template.slime),
    jumpVelocity: template.jumpVelocity ?? 0,
    hasShield: Boolean(template.shield),
    shieldBroken: false,
    shieldRifleBlocks,
    blockedShotIds: [],
    flying: Boolean(template.flying),
    balloonHits: 0,
    balloonPopped: false,
    facing: -1,
    hitCooldown: 0,
    onGround: true,
  };
}

export function configureLevel(state, level) {
  const plan = getLevelPlan(level);

  state.mode = "level";
  state.weapon = state.weapon === "rifle" ? "rifle" : "shotgun";
  state.level = clamp(level, 1, LEVELS.length);
  state.enemies = [];
  state.pellets = [];
  state.pickups = [];
  state.effects = [];
  state.enemyProjectiles = [];
  state.corpses = [];
  state.floatTexts = [];
  state.extraction.active = false;
  state.bossSpawned = false;
  state.bossAlive = false;
  state.bossAddTimer = LEVEL_BOSS_ADD_SECONDS;
  state.levelBossAddsSpawned = 0;
  state.pendingBossTypes = [];
  state.enemiesRemaining = 0;
  state.spawnTimer = 0;
  state.requiredKills = plan.enemies.length;
  state.awaitingNextLevel = false;
  state.awaitingWeaponChoice = false;
  state.awaitingForcedShotgunNotice = false;
  state.pendingBossTypes = Array.isArray(plan.boss) ? [...plan.boss] : plan.boss ? [plan.boss] : [];
  state.pendingBoss = state.pendingBossTypes.length > 0;
  state.pendingBossType = state.pendingBossTypes[0] ?? null;
  if (plan.boss) {
    state.awaitingForcedShotgunNotice = state.weapon === "rifle";
    state.weapon = "shotgun";
    state.rifleMode = "single";
    state.player.weapon = "shotgun";
    state.player.magazineSize = SHOTGUN.magazineSize;
    state.player.ammo = SHOTGUN.magazineSize;
    addFloatText(state, "减益：强制霰弹枪", state.player.x + state.player.w / 2, state.player.y - 24, "#ff6b6b");
  }
  state.nextLevel = state.level;
  WORLD.platforms = plan.platforms.map((platform) => ({ ...platform }));
  WORLD.walls = getLevelWalls(state.level);

  return state;
}

export function configureEndlessMode(state) {
  state.mode = "endless";
  state.extraction.active = false;
  state.spawnTimer = 0;
  state.endlessWavesSinceBreak = 0;
  state.bossAddTimer = BOSS_ADD_SECONDS;
  state.pendingEndlessBoss = false;
  state.pendingEndlessBossType = null;
  state.endlessBossActive = false;
  WORLD.platforms = ENDLESS_PLATFORMS.map((platform) => ({ ...platform }));
  WORLD.walls = ENDLESS_WALLS.map((wall) => ({ ...wall }));
  return state;
}

export function configureBalloonLevel(state, level) {
  state.mode = "balloon";
  state.weapon = "pistol";
  state.level = level;
  state.enemies = [];
  state.pellets = [];
  state.pickups = [];
  state.effects = [];
  state.enemyProjectiles = [];
  state.corpses = [];
  state.floatTexts = [];
  state.activePowerUps = {};
  state.extraction.active = false;
  state.spawnTimer = 0;
  state.balloonTimer = BALLOON_MODE.seconds;
  state.requiredKills = BALLOON_MODE.targetKills;
  state.awaitingNextLevel = false;
  state.awaitingWeaponChoice = false;
  state.awaitingForcedShotgunNotice = false;
  state.pendingBoss = false;
  state.pendingBossType = null;
  state.bossSpawned = false;
  state.bossAlive = false;
  state.nextLevel = level;
  state.player = createPlayer("balloon", "pistol");
  WORLD.walls = [];

  for (let index = 0; index < BALLOON_MODE.targetKills; index += 1) {
    const enemy = createEnemy("balloon", BALLOON_START_X[index] + level * 24, WORLD.groundY, state.cheats);
    enemy.baseY = 115 + ((index * 43 + level * 17) % 170);
    enemy.y = enemy.baseY;
    enemy.vx = (index % 2 === 0 ? 1 : -1) * (42 + level * 7 + index * 9);
    enemy.driftY = 0.9 + level * 0.17 + index * 0.13;
    enemy.floatRange = 12 + ((level + index) % 4) * 7;
    enemy.driftTime = 0;
    state.enemies.push(enemy);
  }

  state.enemiesRemaining = state.enemies.length;
  return state;
}

export function spawnLevelEnemies(state) {
  if (state.mode !== "level") {
    return [];
  }

  const plan = getLevelPlan(state.level);
  const spawned = spawnEnemyList(state, plan.enemies);

  state.enemiesRemaining = state.enemies.length;
  state.bossAlive = state.enemies.some((enemy) => enemy.isBoss);

  return spawned;
}

export function completeExtraction(state) {
  if (state.mode !== "level" || !state.extraction.active) {
    return false;
  }

  state.awaitingNextLevel = true;
  state.nextLevel = state.level + 1;
  state.extraction.active = false;

  return true;
}

export function choosePostBossWeapon(state, weapon = "shotgun", rifleMode = "single") {
  if (!state?.awaitingWeaponChoice) {
    return false;
  }

  state.weapon = weapon === "rifle" ? "rifle" : "shotgun";
  state.rifleMode = state.weapon === "rifle" && rifleMode === "auto" ? "auto" : "single";
  state.awaitingWeaponChoice = false;
  state.extraction.active = true;
  state.extraction.x = WORLD.width - 190;
  state.extraction.y = WORLD.groundY - state.extraction.h;
  state.nextLevel = state.level + 1;
  return true;
}

export function advanceToNextLevel(state) {
  if ((state.mode !== "level" && state.mode !== "balloon") || !state.awaitingNextLevel) {
    return false;
  }

  const health = state.player.health;
  const nextLevel = state.nextLevel;

  if (state.mode === "balloon") {
    configureBalloonLevel(state, nextLevel);
  } else if (nextLevel > LEVELS.length) {
    state.status = "victory";
    state.awaitingNextLevel = false;
    state.extraction.active = false;
    state.enemies = [];
    state.pellets = [];
    state.pickups = [];
    state.effects = [];
    state.enemyProjectiles = [];
    state.enemiesRemaining = 0;
  } else {
    state.player = createPlayer("level", state.weapon);
    state.player.health = state.player.maxHealth;
    configureLevel(state, nextLevel);
    spawnLevelEnemies(state);
  }

  return true;
}

export function restartChallenge(state) {
  if (!state) {
    return null;
  }

  const mode = state.mode;
  const weapon = state.weapon === "rifle" ? "rifle" : "shotgun";
  const rifleMode = state.rifleMode === "auto" ? "auto" : "single";
  const level = state.level;
  const cheats = { ...state.cheats };
  const fresh = createGameState(mode, weapon, rifleMode);

  if (mode === "balloon") {
    configureBalloonLevel(fresh, level);
  } else if (mode === "level") {
    configureLevel(fresh, level);
    spawnLevelEnemies(fresh);
  } else {
    configureEndlessMode(fresh);
  }

  Object.assign(state, fresh);
  state.cheats = cheats;
  return state;
}

export function recordHighScore(state, previousHighScore = 0) {
  const highScore = Math.max(previousHighScore, state?.score ?? 0);
  if (state) {
    state.highScore = highScore;
  }
  return highScore;
}

export function spawnPowerUp(state, id, x, y) {
  if (!POWER_UPS[id]) {
    return null;
  }

  const pickup = {
    uid: nextPickupId++,
    id,
    label: POWER_UPS[id].label,
    x,
    y,
    w: 26,
    h: 26,
    color: id === "piercing" ? "#74d3ae" : id === "longStock" ? "#f4d35e" : "#8ecae6",
  };

  state.pickups.push(pickup);
  return pickup;
}

export function startReload(player, activePowerUps = {}, permanentPowerUps = {}) {
  if (player.reloading || player.ammo >= player.magazineSize) {
    return false;
  }

  player.reloading = true;
  const reloadSeconds = player.weapon === "rifle" ? RIFLE.reloadSeconds : SHOTGUN.reloadSeconds;
  player.reloadTimer = reloadSeconds * (Math.max(activePowerUps.fastReload ?? 0, permanentPowerUps.fastReload ?? 0) > 0 ? FAST_RELOAD_MULTIPLIER : 1);

  return true;
}

export function fireShotgun(state, aim) {
  const player = state.player;

  if (hasCheat(state, "infiniteAmmo")) {
    player.reloading = false;
    player.reloadTimer = 0;
    player.ammo = Math.max(1, player.ammo);
  }

  if (player.reloading) {
    return false;
  }

  if (player.ammo <= 0) {
    startReload(player, state.activePowerUps, state.permanentPowerUps);
    return false;
  }

  const direction = normalize(aim?.x ?? player.facing, aim?.y ?? 0);
  const origin = getPlayerCenter(player);
  const usingRifle = state.weapon === "rifle" && state.mode !== "balloon";
  const rifleMode = state.rifleMode === "auto" ? "auto" : "single";
  const rifleDamage = rifleMode === "auto" ? RIFLE.autoDamage : RIFLE.damage;
  const pelletCount = state.mode === "balloon" || usingRifle ? 1 : SHOTGUN.pelletCount;
  const denominator = Math.max(1, pelletCount - 1);
  const spreadRadians = state.mode === "balloon" || usingRifle ? 0 : SHOTGUN.spreadRadians * (hasPower(state, "wide") ? WIDE_SPREAD_MULTIPLIER : 1);
  const permanentPiercingBonus = (state.permanentPowerUps?.piercing ?? 0) * PERMANENT_POWER_INCREMENT;
  const shotId = nextShotId++;
  const pelletWeapon = state.mode === "balloon" ? "pistol" : usingRifle ? "rifle" : "shotgun";
  const pistolDamage = ENEMY_TYPES.balloon.health / 2;

  for (let index = 0; index < pelletCount; index += 1) {
    const spreadStep = index / denominator - 0.5;
    const pelletDirection = rotate(direction, spreadStep * spreadRadians);
    const speed = state.mode === "balloon" ? PISTOL.bulletSpeed : usingRifle ? RIFLE.bulletSpeed : SHOTGUN.pelletSpeed;

    state.pellets.push({
      x: origin.x,
      y: origin.y,
      previousX: origin.x,
      previousY: origin.y,
      vx: pelletDirection.x * speed,
      vy: pelletDirection.y * speed,
      life: state.mode === "balloon" ? Infinity : usingRifle ? RIFLE.bulletLife : SHOTGUN.pelletLife,
      radius: state.mode === "balloon" ? PISTOL.bulletRadius : usingRifle ? RIFLE.bulletRadius : SHOTGUN.pelletRadius,
      damage: state.mode === "balloon" ? pistolDamage : usingRifle ? rifleDamage : PELLET_DAMAGE,
      damageFalloff: usingRifle ? RIFLE.pierceDamageMultiplier + permanentPiercingBonus : 1 + permanentPiercingBonus,
      piercesRemaining: usingRifle || hasPower(state, "piercing") ? 1 : 0,
      weapon: pelletWeapon,
      shotId,
      hitEnemyIds: [],
    });
  }

  if (hasCheat(state, "infiniteAmmo")) {
    player.ammo = player.magazineSize;
  } else {
    player.ammo -= 1;
  }
  if (state.mode !== "balloon") {
    player.damageCooldown = Math.max(player.damageCooldown ?? 0, SHOOT_GUARD_SECONDS);
  }
  player.shotCooldown = state.mode === "balloon" ? 0 : usingRifle ? (rifleMode === "auto" ? RIFLE.autoCooldownSeconds : RIFLE.cooldownSeconds) : SHOTGUN.cooldownSeconds;
  if (state.mode !== "balloon" && !usingRifle) {
    player.vx -= direction.x * SHOTGUN.recoil;
    player.vy -= direction.y * SHOTGUN.recoil;
  }
  player.facing = direction.x < 0 ? -1 : 1;
  state.effects.push(
    makeEffect(origin.x + direction.x * 78, origin.y + direction.y * 78, "#fff1a8", 0.12, 26, {
      kind: "muzzle",
      angle: Math.atan2(direction.y, direction.x),
    }),
  );

  if (state.mode !== "balloon" && !player.onGround && direction.y > 0.45) {
    const recoil = usingRifle ? RIFLE.airRecoil : SHOTGUN.downwardRecoil * (hasPower(state, "strongRecoil") ? STRONG_RECOIL_MULTIPLIER : 1);
    player.vy -= recoil;
    state.effects.push(makeEffect(origin.x, origin.y + player.h / 2, "#8ecae6", 0.2, usingRifle ? 14 : 28, { kind: "launch" }));
  }

  if (player.ammo === 0) {
    startReload(player, state.activePowerUps, state.permanentPowerUps);
  }

  return true;
}

export function queueDoubleShot(state, aim) {
  const player = state.player;
  const fired = fireShotgun(state, aim);

  if (!fired) {
    return false;
  }

  if (player.ammo > 0 && !player.reloading) {
    player.queuedShots = 1;
    player.queuedShotDelay = SHOTGUN.doubleShotDelaySeconds;
    player.queuedShotAim = { x: aim?.x ?? player.facing, y: aim?.y ?? 0 };
    player.shotCooldown = Math.min(player.shotCooldown, SHOTGUN.doubleShotDelaySeconds);
  }

  return true;
}

function updateQueuedShots(state) {
  const player = state.player;

  if ((player.queuedShots ?? 0) <= 0 || player.queuedShotDelay > 0 || player.shotCooldown > 0) {
    return;
  }

  const fired = fireShotgun(state, player.queuedShotAim ?? { x: player.facing, y: 0 });

  if (fired) {
    player.queuedShots -= 1;
  } else {
    player.queuedShots = 0;
  }

  if (player.queuedShots <= 0) {
    player.queuedShotAim = null;
    player.queuedShotDelay = 0;
  }
}

export function swingStock(state) {
  const player = state.player;

  if (player.stockCooldown > 0) {
    return false;
  }

  player.stockTimer = SHOTGUN.stockArcSeconds;
  player.stockCooldown = SHOTGUN.stockCooldownSeconds;
  player.stockSwingId = (player.stockSwingId ?? 0) + 1;
  state.effects.push(makeEffect(player.x + player.w / 2, player.y + player.h / 2, "#fff8d7", 0.16, SHOTGUN.stockRange, { kind: "stock" }));

  return true;
}

export function applyStockHits(state) {
  const player = state.player;

  if (player.stockTimer <= 0) {
    return 0;
  }

  const hitbox = getStockHitbox(state);
  let hits = 0;

  for (const corpse of state.corpses) {
    if (corpse.lastStockSwingId === player.stockSwingId || !rectsOverlap(hitbox, corpse)) {
      continue;
    }

    corpse.lastStockSwingId = player.stockSwingId;
    hitCorpse(state, corpse, player.facing, 560);
    hits += 1;
  }

  for (const enemy of state.enemies) {
    if (enemy.lastStockSwingId === player.stockSwingId || !rectsOverlap(hitbox, enemy) || wallBlocksStockHit(player, enemy)) {
      continue;
    }

    hits += 1;
    enemy.lastStockSwingId = player.stockSwingId;
    enemy.vx = player.facing * 520;
    enemy.x = clamp(enemy.x + player.facing * 56, 0, WORLD.width - enemy.w);

    if (enemy.isBoss) {
      state.effects.push(makeEffect(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#d7263d", 0.24, 24));
      addFloatText(state, "Boss免疫枪托", enemy.x + enemy.w / 2, enemy.y - 18, "#ffcf40");
      addSplatter(state, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, player.facing, "#ffcf40", 12);
    } else if (attackHitsShieldFront(enemy, player.facing)) {
      enemy.shieldBroken = true;
      blockShieldHit(state, enemy, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
    } else if ((enemy.isSlime && enemy.health <= enemy.maxHealth / 2) || (!enemy.isSlime && (Math.abs(player.vx) >= STOCK_RUN_KILL_SPEED || enemy.health <= enemy.maxHealth / 2))) {
      state.corpses.push(createCorpseFromEnemy(enemy, player.facing));
      enemy.health = 0;
      state.effects.push(makeEffect(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#fff8d7", 0.24, 26));
      addSplatter(state, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, player.facing, "#d8f957", 14);
    } else {
      enemy.stockHits = (enemy.stockHits ?? 0) + 1;
      enemy.health = Math.max(1, enemy.health - enemy.maxHealth / 2);
      state.effects.push(makeEffect(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#fff8d7", 0.2, 18));
      addSplatter(state, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, player.facing, "#d8f957", 6);
    }
  }

  removeDeadEnemies(state);
  return hits;
}

export function updateGame(state, input, pressed, dt) {
  if (!state || state.status !== "playing") {
    return state;
  }

  if (dt > 1 / 20) {
    let remaining = dt;
    let firstStep = true;

    while (remaining > 0) {
      const step = Math.min(remaining, 1 / 20);
      updateGame(
        state,
        input,
        firstStep ? pressed : { jumpPressed: false, shootPressed: false, stockPressed: false, doubleShotPressed: false },
        step,
      );
      firstStep = false;
      remaining -= step;
    }

    return state;
  }

  const step = dt;
  const player = state.player;

  updateTimers(player, step);
  updatePlayerRegeneration(player, dt);
  updatePowerUps(state, step);
  updateEndlessSpawns(state, step);
  updatePlayer(state, input, pressed, step);
  updateQueuedShots(state);

  if (pressed.doubleShotPressed) {
    queueDoubleShot(state, input.aim);
  } else if (pressed.shootPressed || (state.weapon === "rifle" && state.rifleMode === "auto" && input.shootHeld && player.shotCooldown === 0)) {
    fireShotgun(state, input.aim);
  }

  if (pressed.stockPressed) {
    swingStock(state);
  }

  updatePellets(state, step);
  applyPelletHits(state);
  applyStockHits(state);
  updateEnemies(state, step);
  updateEnemyProjectiles(state, step);
  applyPickupCollisions(state);
  if (state.extraction.active && rectsOverlap(player, state.extraction)) {
    completeExtraction(state);
  }
  updateEffects(state, step);
  updateCorpses(state, step);
  updateFloatTexts(state, step);
  updateLevelBookkeeping(state, step);
  updateBalloonBookkeeping(state, step);
  const targetCameraX = clamp(player.x + player.w / 2 - 420, 0, Math.max(0, WORLD.width - 1280));
  state.cameraX += (targetCameraX - state.cameraX) * Math.min(1, step * 8);
  const targetCameraY = clamp(player.y + player.h / 2 - 360, -260, 120);
  state.cameraY += (targetCameraY - (state.cameraY ?? 0)) * Math.min(1, step * 8);

  return state;
}
