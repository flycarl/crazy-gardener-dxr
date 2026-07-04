import { BALLOON_MODE, ENEMY_TYPES, LEVELS, PISTOL, PLAYER, POWER_UPS, RIFLE, SHOTGUN, WORLD } from "./constants.js";
import { circleRectOverlap, clamp, normalize, rectsOverlap } from "./math.js";
import { createGameState, createPlayer } from "./state.js";

const FLOOR_FRICTION = 0.82;
const ENEMY_CONTACT_COOLDOWN = 0.75;
const PELLET_DAMAGE = 18;
const BOSS_STOCK_DAMAGE = 72;
const HEALTH_DROP_INTERVAL = 5;
const POWER_UP_DROP_INTERVAL = 7;
const ENDLESS_MAX_ENEMIES = 18;
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
let nextEnemyId = 1;
let nextPickupId = 1;
let nextEffectId = 1;

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
  for (const platform of WORLD.platforms) {
    if (!rectOverlapsHorizontal(rect, platform)) {
      continue;
    }

    if (previousBottom <= platform.y + 18 && rect.y + rect.h >= platform.y) {
      return platform.y;
    }
  }

  return null;
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

function respawnPlayerAfterFall(state) {
  const player = state.player;
  player.x = Math.max(80, state.cameraX + 120);
  player.y = WORLD.groundY - player.h;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.health = Math.max(0, player.health - 20);
  state.effects.push(makeEffect(player.x + player.w / 2, player.y + player.h / 2, "#8ecae6", 0.28, 26, { kind: "launch" }));

  if (player.health === 0) {
    state.status = "gameover";
  }
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

function updateTimers(player, dt) {
  player.shotCooldown = Math.max(0, player.shotCooldown - dt);
  player.stockCooldown = Math.max(0, player.stockCooldown - dt);
  player.stockTimer = Math.max(0, player.stockTimer - dt);
  player.queuedShotDelay = Math.max(0, (player.queuedShotDelay ?? 0) - dt);

  if (player.reloading) {
    player.reloadTimer = Math.max(0, player.reloadTimer - dt);

    if (player.reloadTimer === 0) {
      player.reloading = false;
      player.ammo = player.magazineSize;
    }
  }
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

  if (horizontal !== 0) {
    player.vx = horizontal * PLAYER.speed;
    player.facing = horizontal;
  } else if (player.onGround) {
    player.vx *= FLOOR_FRICTION;
    if (Math.abs(player.vx) < 1) player.vx = 0;
  }

  if (pressed.jumpPressed && player.onGround) {
    player.vy = PLAYER.jumpVelocity;
    player.onGround = false;
  }

  const previousBottom = player.y + player.h;
  player.vy += WORLD.gravity * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  player.x = clamp(player.x, 0, WORLD.width - player.w);

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

function getSpawnX(state, index) {
  const orderedPoints = SPAWN_POINTS.map((_, pointIndex) => SPAWN_POINTS[(pointIndex + index) % SPAWN_POINTS.length]);
  const safePoint = orderedPoints.find((point) => Math.abs(point - state.player.x) >= MIN_SPAWN_DISTANCE_FROM_PLAYER);
  const fallback = state.player.x < WORLD.width / 2 ? WORLD.width - 260 : 720;

  return clamp(safePoint ?? fallback, 420, WORLD.width - 170);
}

function spawnEnemyList(state, enemyTypes, startIndex = 0) {
  return enemyTypes.map((type, index) => {
    const enemy = createEnemy(type, getSpawnX(state, startIndex + index), WORLD.groundY);
    state.enemies.push(enemy);
    return enemy;
  });
}

function spawnPendingBoss(state) {
  if (!state.pendingBoss || !state.pendingBossType) {
    return null;
  }

  const template = ENEMY_TYPES[state.pendingBossType];
  const direction = state.player.facing >= 0 ? 1 : -1;
  const distance = 600;
  const targetX =
    direction > 0
      ? state.player.x + distance
      : state.player.x - distance - template.width;
  const bossX = clamp(targetX, 80, WORLD.width - template.width - 80);
  const boss = createEnemy(state.pendingBossType, bossX, WORLD.groundY);

  state.enemies.push(boss);
  state.pendingBoss = false;
  state.pendingBossType = null;
  state.bossSpawned = true;
  state.bossAlive = true;
  state.enemiesRemaining = state.enemies.length;

  return boss;
}

function getStockHitbox(state) {
  const player = state.player;
  const range = SHOTGUN.stockRange + (state.activePowerUps.longStock > 0 ? 42 : 0);
  const height = player.h + 42;

  return {
    x: player.facing >= 0 ? player.x + player.w - 4 : player.x - range + 4,
    y: player.y - 20,
    w: range,
    h: height,
  };
}

function updateEnemies(state, dt) {
  const player = state.player;
  const playerCenter = getPlayerCenter(player);

  for (const enemy of state.enemies) {
    const enemyCenter = getRectCenter(enemy);
    const direction = normalize(playerCenter.x - enemyCenter.x, playerCenter.y - enemyCenter.y);
    enemy.hitCooldown = Math.max(0, enemy.hitCooldown - dt);
    enemy.invulnerableTimer = Math.max(0, (enemy.invulnerableTimer ?? 0) - dt);
    if (state.mode !== "balloon") {
      enemy.vx = direction.x * enemy.speed;
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
      const lookAheadX = enemy.x + enemy.w / 2 + moveDirection * (enemy.w / 2 + 52);
      const approachingGap = enemy.onGround && isGapAtX(lookAheadX);
      const climbPlatform = enemy.onGround && enemy.type !== "fast" ? getClimbablePlatformAhead(enemy, moveDirection) : null;

      if (approachingGap && enemy.type !== "fast") {
        enemy.vy = -760;
        enemy.onGround = false;
      }

      if (climbPlatform) {
        enemy.vy = -820;
        enemy.onGround = false;
      }

      const previousBottom = enemy.y + enemy.h;
      enemy.x = clamp(enemy.x + enemy.vx * dt, 0, WORLD.width - enemy.w);

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
      player.health = Math.max(0, player.health - enemy.damage);
      const knockbackDirection = player.x + player.w / 2 < enemy.x + enemy.w / 2 ? -1 : 1;
      player.vx = knockbackDirection * CONTACT_KNOCKBACK_X;
      player.vy = CONTACT_KNOCKBACK_Y;
      player.onGround = false;
      enemy.hitCooldown = ENEMY_CONTACT_COOLDOWN;
      state.effects.push(makeEffect(playerCenter.x, playerCenter.y, "#e45757", 0.22, 18));

      if (player.health === 0) {
        state.status = "gameover";
      }
    }
  }
}

export function applyPelletHits(state) {
  const remainingPellets = [];

  for (const pellet of state.pellets) {
    let keepPellet = true;
    pellet.hitEnemyIds ??= [];
    pellet.piercesRemaining ??= state.activePowerUps.piercing > 0 ? 1 : 0;

    for (const enemy of state.enemies) {
      if (enemy.health <= 0 || pellet.hitEnemyIds.includes(enemy.id)) {
        continue;
      }

      if (!circleRectOverlap(pellet.x, pellet.y, pellet.radius, enemy)) {
        continue;
      }

      const hitIndex = pellet.hitEnemyIds.length;
      const damage = Math.round((pellet.damage ?? PELLET_DAMAGE) * Math.pow(pellet.damageFalloff ?? 1, hitIndex));
      enemy.health -= damage;
      enemy.vx += Math.sign(pellet.vx || 1) * 90;
      pellet.hitEnemyIds.push(enemy.id);
      state.effects.push(makeEffect(pellet.x, pellet.y, enemy.isBoss ? "#f4d35e" : "#ffffff", 0.18, 10));
      addSplatter(state, pellet.x, pellet.y, Math.sign(pellet.vx || 1), enemy.isBoss ? "#ffcf40" : "#d8f957", enemy.isBoss ? 10 : 7);

      if (pellet.piercesRemaining > 0) {
        pellet.piercesRemaining -= 1;
      } else {
        keepPellet = false;
        pellet.life = 0;
        break;
      }
    }

    if (keepPellet && pellet.life > 0) {
      for (const corpse of state.corpses) {
        if (!circleRectOverlap(pellet.x, pellet.y, pellet.radius, corpse)) {
          continue;
        }

        hitCorpse(state, corpse, pellet.vx, 320);
        keepPellet = false;
        pellet.life = 0;
        break;
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

    if (pickup.id === "health") {
      player.health = Math.min(player.maxHealth, player.health + pickup.heal);
      addFloatText(state, `回血 +${pickup.heal}`, player.x + player.w / 2, player.y - 18, pickup.color);
      state.effects.push(makeEffect(pickup.x + pickup.w / 2, pickup.y + pickup.h / 2, pickup.color, 0.36, 24));
      return false;
    }

    state.activePowerUps[pickup.id] = POWER_UPS[pickup.id].duration;
    addFloatText(state, `获得：${POWER_UPS[pickup.id].label}`, player.x + player.w / 2, player.y - 18, pickup.color);
    state.effects.push(makeEffect(pickup.x + pickup.w / 2, pickup.y + pickup.h / 2, pickup.color, 0.36, 24));
    return false;
  });
}

function spawnHealthPickup(state, x, y) {
  const pickup = {
    uid: nextPickupId++,
    id: "health",
    label: "回血",
    x,
    y,
    w: 26,
    h: 26,
    color: "#ff6b8a",
    heal: 25,
  };

  state.pickups.push(pickup);
  return pickup;
}

function maybeDropPickup(state, enemy) {
  if (state.player.health < state.player.maxHealth) {
    if (state.kills % HEALTH_DROP_INTERVAL === 0) {
      spawnHealthPickup(state, enemy.x + enemy.w / 2 - 13, enemy.y + enemy.h / 2 - 13);
    }
    return;
  }

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
    state.effects.push(makeEffect(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, enemy.isBoss ? "#d7263d" : "#f4d35e", 0.45, enemy.isBoss ? 44 : 24));
    if (state.mode !== "balloon") {
      maybeDropPickup(state, enemy);
    }
  }

  state.enemies = survivors;
  state.enemiesRemaining = state.enemies.length;
  state.bossAlive = state.enemies.some((enemy) => enemy.isBoss);
}

function updateLevelBookkeeping(state) {
  state.enemiesRemaining = state.enemies.length;
  state.bossAlive = state.enemies.some((enemy) => enemy.isBoss);

  if (state.mode !== "level" || state.awaitingNextLevel || state.extraction.active) {
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

  state.extraction.active = false;
  state.spawnTimer = Math.max(0, state.spawnTimer - dt);

  if (state.spawnTimer > 0) {
    return;
  }

  const wave = state.wave;
  const count = Math.min(2 + Math.floor(wave / 3), 5);
  const enemyTypes = [];

  for (let index = 0; index < count; index += 1) {
    if (wave >= 3 && index % 4 === 1) {
      enemyTypes.push("fast");
    } else if (wave >= 2 && index % 4 === 3) {
      enemyTypes.push("fat");
    } else {
      enemyTypes.push("normal");
    }
  }

  let remainingCapacity = Math.max(0, ENDLESS_MAX_ENEMIES - state.enemies.length);
  spawnEnemyList(state, enemyTypes.slice(0, remainingCapacity));
  remainingCapacity = Math.max(0, ENDLESS_MAX_ENEMIES - state.enemies.length);

  state.wave += 1;
  state.enemiesRemaining = state.enemies.length;
  state.bossAlive = state.enemies.some((enemy) => enemy.isBoss);
  state.spawnTimer = Math.max(1.25, ENDLESS_SPAWN_SECONDS - Math.min(1.6, wave * 0.12));
}

export function createEnemy(type = "normal", x = 0, y = WORLD.groundY) {
  const template = ENEMY_TYPES[type] ?? ENEMY_TYPES.normal;

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
    health: template.health,
    maxHealth: template.health,
    speed: template.speed,
    damage: template.damage,
    score: template.score,
    isBoss: type === "tankBoss",
    flying: Boolean(template.flying),
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
  state.corpses = [];
  state.floatTexts = [];
  state.extraction.active = false;
  state.bossSpawned = false;
  state.bossAlive = false;
  state.enemiesRemaining = 0;
  state.spawnTimer = 0;
  state.requiredKills = plan.enemies.length;
  state.awaitingNextLevel = false;
  state.pendingBoss = false;
  state.pendingBossType = null;
  state.nextLevel = state.level;
  WORLD.platforms = plan.platforms.map((platform) => ({ ...platform }));

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
  state.corpses = [];
  state.floatTexts = [];
  state.activePowerUps = {};
  state.extraction.active = false;
  state.spawnTimer = 0;
  state.balloonTimer = BALLOON_MODE.seconds;
  state.requiredKills = BALLOON_MODE.targetKills;
  state.awaitingNextLevel = false;
  state.pendingBoss = false;
  state.pendingBossType = null;
  state.bossSpawned = false;
  state.bossAlive = false;
  state.nextLevel = level;
  state.player = createPlayer("balloon", "pistol");

  for (let index = 0; index < BALLOON_MODE.targetKills; index += 1) {
    const enemy = createEnemy("balloon", BALLOON_START_X[index] + level * 24, WORLD.groundY);
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
    state.enemiesRemaining = 0;
  } else {
    state.player = createPlayer("level", state.weapon);
    state.player.health = health;
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
  const level = state.level;
  const fresh = createGameState(mode, weapon);

  if (mode === "balloon") {
    configureBalloonLevel(fresh, level);
  } else if (mode === "level") {
    configureLevel(fresh, level);
    spawnLevelEnemies(fresh);
  } else {
    fresh.spawnTimer = 0;
  }

  Object.assign(state, fresh);
  return state;
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

export function startReload(player, activePowerUps = {}) {
  if (player.reloading || player.ammo >= player.magazineSize) {
    return false;
  }

  player.reloading = true;
  const reloadSeconds = player.weapon === "rifle" ? RIFLE.reloadSeconds : SHOTGUN.reloadSeconds;
  player.reloadTimer = reloadSeconds * (activePowerUps.fastReload > 0 ? FAST_RELOAD_MULTIPLIER : 1);

  return true;
}

export function fireShotgun(state, aim) {
  const player = state.player;

  if (player.reloading) {
    return false;
  }

  if (player.ammo <= 0) {
    startReload(player, state.activePowerUps);
    return false;
  }

  const direction = normalize(aim?.x ?? player.facing, aim?.y ?? 0);
  const origin = getPlayerCenter(player);
  const usingRifle = state.weapon === "rifle" && state.mode !== "balloon";
  const pelletCount = state.mode === "balloon" || usingRifle ? 1 : SHOTGUN.pelletCount;
  const denominator = Math.max(1, pelletCount - 1);
  const spreadRadians = state.mode === "balloon" || usingRifle ? 0 : SHOTGUN.spreadRadians * (state.activePowerUps.wide > 0 ? WIDE_SPREAD_MULTIPLIER : 1);

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
      damage: usingRifle ? RIFLE.damage : PELLET_DAMAGE,
      damageFalloff: usingRifle ? RIFLE.pierceDamageMultiplier : 1,
      piercesRemaining: usingRifle ? 1 : state.activePowerUps.piercing > 0 ? 1 : 0,
      hitEnemyIds: [],
    });
  }

  player.ammo -= 1;
  player.shotCooldown = state.mode === "balloon" ? 0 : usingRifle ? RIFLE.cooldownSeconds : SHOTGUN.cooldownSeconds;
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

  if (state.mode !== "balloon" && !usingRifle && !player.onGround && direction.y > 0.45) {
    const recoil = SHOTGUN.downwardRecoil * (state.activePowerUps.strongRecoil > 0 ? STRONG_RECOIL_MULTIPLIER : 1);
    player.vy -= recoil;
    state.effects.push(makeEffect(origin.x, origin.y + player.h / 2, "#8ecae6", 0.2, 28, { kind: "launch" }));
  }

  if (player.ammo === 0) {
    startReload(player, state.activePowerUps);
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
    if (enemy.lastStockSwingId === player.stockSwingId || !rectsOverlap(hitbox, enemy)) {
      continue;
    }

    hits += 1;
    enemy.lastStockSwingId = player.stockSwingId;
    enemy.vx = player.facing * 520;
    enemy.x = clamp(enemy.x + player.facing * 56, 0, WORLD.width - enemy.w);

    if (enemy.isBoss) {
      enemy.health = Math.max(1, enemy.health - BOSS_STOCK_DAMAGE);
      state.effects.push(makeEffect(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#d7263d", 0.24, 24));
      addSplatter(state, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, player.facing, "#ffcf40", 12);
    } else if (Math.abs(player.vx) >= STOCK_RUN_KILL_SPEED || (enemy.stockHits ?? 0) >= 1) {
      state.corpses.push(createCorpseFromEnemy(enemy, player.facing));
      enemy.health = 0;
      state.effects.push(makeEffect(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#fff8d7", 0.24, 26));
      addSplatter(state, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, player.facing, "#d8f957", 14);
    } else {
      enemy.stockHits = (enemy.stockHits ?? 0) + 1;
      enemy.health = Math.max(1, enemy.health - 8);
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

  const step = Math.min(dt, 1 / 20);
  const player = state.player;

  updateTimers(player, step);
  updatePowerUps(state, step);
  updateEndlessSpawns(state, step);
  updatePlayer(state, input, pressed, step);
  updateQueuedShots(state);

  if (pressed.doubleShotPressed) {
    queueDoubleShot(state, input.aim);
  } else if (pressed.shootPressed) {
    fireShotgun(state, input.aim);
  }

  if (pressed.stockPressed) {
    swingStock(state);
  }

  updatePellets(state, step);
  applyPelletHits(state);
  applyStockHits(state);
  updateEnemies(state, step);
  applyPickupCollisions(state);
  if (state.extraction.active && rectsOverlap(player, state.extraction)) {
    completeExtraction(state);
  }
  updateEffects(state, step);
  updateCorpses(state, step);
  updateFloatTexts(state, step);
  updateLevelBookkeeping(state);
  updateBalloonBookkeeping(state, step);
  const targetCameraX = clamp(player.x + player.w / 2 - 420, 0, Math.max(0, WORLD.width - 1280));
  state.cameraX += (targetCameraX - state.cameraX) * Math.min(1, step * 8);
  const targetCameraY = clamp(player.y + player.h / 2 - 360, -260, 120);
  state.cameraY += (targetCameraY - (state.cameraY ?? 0)) * Math.min(1, step * 8);

  return state;
}
