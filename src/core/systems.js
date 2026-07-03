import { ENEMY_TYPES, LEVELS, PLAYER, POWER_UPS, SHOTGUN, WORLD } from "./constants.js";
import { circleRectOverlap, clamp, normalize, rectsOverlap } from "./math.js";

const FLOOR_FRICTION = 0.82;
const ENEMY_CONTACT_COOLDOWN = 0.75;
const PELLET_DAMAGE = 18;
const BOSS_STOCK_DAMAGE = 72;
const POWER_UP_DROP_INTERVAL = 4;
const ENDLESS_MAX_ENEMIES = 18;
const ENDLESS_SPAWN_SECONDS = 3.2;
const WIDE_SPREAD_MULTIPLIER = 1.65;
const FAST_RELOAD_MULTIPLIER = 0.58;
const STRONG_RECOIL_MULTIPLIER = 1.45;
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
    vx: direction * 620,
    vy: -520,
    life: 5,
    rotation: 0,
    spin: direction * 5.5,
  };
}

function getPlayerCenter(player) {
  return {
    x: player.x + player.w / 2,
    y: player.y + player.h / 2,
  };
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

  player.vy += WORLD.gravity * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  player.x = clamp(player.x, 0, WORLD.width - player.w);

  const floorY = WORLD.groundY - player.h;
  if (player.y >= floorY) {
    player.y = floorY;
    player.vy = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
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
  if (level % 3 === 0) {
    return LEVELS[2];
  }

  return LEVELS[(level - 1) % 2];
}

function getSpawnX(state, index, spacing = 190) {
  const playerLead = state.player.x + 520 + index * spacing;
  const rightLane = WORLD.width - 760 + index * spacing;

  return clamp(Math.max(playerLead, rightLane), 420, WORLD.width - 170);
}

function spawnEnemyList(state, enemyTypes, startIndex = 0) {
  return enemyTypes.map((type, index) => {
    const enemy = createEnemy(type, getSpawnX(state, startIndex + index), WORLD.groundY);
    state.enemies.push(enemy);
    return enemy;
  });
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
    enemy.vx = direction.x * enemy.speed;
    enemy.x = clamp(enemy.x + enemy.vx * dt, 0, WORLD.width - enemy.w);

    if (enemy.y + enemy.h < WORLD.groundY) {
      enemy.vy += WORLD.gravity * dt;
      enemy.y += enemy.vy * dt;
    } else {
      enemy.y = WORLD.groundY - enemy.h;
      enemy.vy = 0;
    }

    if (enemy.hitCooldown === 0 && rectsOverlap(player, enemy)) {
      player.health = Math.max(0, player.health - enemy.damage);
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

      enemy.health -= PELLET_DAMAGE;
      enemy.vx += Math.sign(pellet.vx || 1) * 90;
      pellet.hitEnemyIds.push(enemy.id);
      state.effects.push(makeEffect(pellet.x, pellet.y, enemy.isBoss ? "#f4d35e" : "#ffffff", 0.18, 10));

      if (pellet.piercesRemaining > 0) {
        pellet.piercesRemaining -= 1;
      } else {
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

    state.activePowerUps[pickup.id] = POWER_UPS[pickup.id].duration;
    addFloatText(state, `获得：${POWER_UPS[pickup.id].label}`, player.x + player.w / 2, player.y - 18, pickup.color);
    state.effects.push(makeEffect(pickup.x + pickup.w / 2, pickup.y + pickup.h / 2, pickup.color, 0.36, 24));
    return false;
  });
}

function maybeDropPowerUp(state, enemy) {
  if (state.kills % POWER_UP_DROP_INTERVAL !== 0) {
    return;
  }

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
    maybeDropPowerUp(state, enemy);
  }

  state.enemies = survivors;
  state.enemiesRemaining = state.enemies.length;
  state.bossAlive = state.enemies.some((enemy) => enemy.isBoss);
}

function updateLevelBookkeeping(state) {
  state.enemiesRemaining = state.enemies.length;
  state.bossAlive = state.enemies.some((enemy) => enemy.isBoss);

  if (state.mode === "level" && !state.extraction.active && state.kills >= state.requiredKills && state.enemiesRemaining === 0 && !state.bossAlive) {
    state.extraction.active = true;
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
  const count = Math.min(3 + Math.floor(wave / 2), 8);
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

  if (remainingCapacity > 0 && wave > 0 && wave % 5 === 0 && !state.enemies.some((enemy) => enemy.isBoss)) {
    const boss = createEnemy("tankBoss", clamp(WORLD.width - 260, 420, WORLD.width - ENEMY_TYPES.tankBoss.width), WORLD.groundY);
    state.enemies.push(boss);
    state.bossSpawned = true;
  }

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
    y: Math.min(y, WORLD.groundY - template.height),
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
    hitCooldown: 0,
  };
}

export function configureLevel(state, level) {
  const plan = getLevelPlan(level);

  state.mode = "level";
  state.level = level;
  state.enemies = [];
  state.pellets = [];
  state.pickups = [];
  state.effects = [];
  state.extraction.active = false;
  state.bossSpawned = false;
  state.bossAlive = false;
  state.enemiesRemaining = 0;
  state.spawnTimer = 0;
  state.requiredKills = level % 3 === 0 ? 0 : plan.enemies.length;

  return state;
}

export function spawnLevelEnemies(state) {
  if (state.mode !== "level") {
    return [];
  }

  const plan = getLevelPlan(state.level);
  const spawned = spawnEnemyList(state, plan.enemies);

  if (plan.boss && !state.bossSpawned) {
    const bossTemplate = ENEMY_TYPES[plan.boss];
    const boss = createEnemy(plan.boss, WORLD.width - bossTemplate.width - 160, WORLD.groundY);
    state.enemies.push(boss);
    spawned.push(boss);
    state.bossSpawned = true;
  }

  state.enemiesRemaining = state.enemies.length;
  state.bossAlive = state.enemies.some((enemy) => enemy.isBoss);

  return spawned;
}

export function completeExtraction(state) {
  if (state.mode !== "level" || !state.extraction.active) {
    return false;
  }

  configureLevel(state, state.level + 1);
  spawnLevelEnemies(state);

  return true;
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
  player.reloadTimer = SHOTGUN.reloadSeconds * (activePowerUps.fastReload > 0 ? FAST_RELOAD_MULTIPLIER : 1);

  return true;
}

export function fireShotgun(state, aim) {
  const player = state.player;

  if (player.reloading || player.shotCooldown > 0) {
    return false;
  }

  if (player.ammo <= 0) {
    startReload(player, state.activePowerUps);
    return false;
  }

  const direction = normalize(aim?.x ?? player.facing, aim?.y ?? 0);
  const origin = getPlayerCenter(player);
  const denominator = Math.max(1, SHOTGUN.pelletCount - 1);
  const spreadRadians = SHOTGUN.spreadRadians * (state.activePowerUps.wide > 0 ? WIDE_SPREAD_MULTIPLIER : 1);

  for (let index = 0; index < SHOTGUN.pelletCount; index += 1) {
    const spreadStep = index / denominator - 0.5;
    const pelletDirection = rotate(direction, spreadStep * spreadRadians);

    state.pellets.push({
      x: origin.x,
      y: origin.y,
      previousX: origin.x,
      previousY: origin.y,
      vx: pelletDirection.x * SHOTGUN.pelletSpeed,
      vy: pelletDirection.y * SHOTGUN.pelletSpeed,
      life: SHOTGUN.pelletLife,
      radius: SHOTGUN.pelletRadius,
      piercesRemaining: state.activePowerUps.piercing > 0 ? 1 : 0,
      hitEnemyIds: [],
    });
  }

  player.ammo -= 1;
  player.shotCooldown = SHOTGUN.cooldownSeconds;
  player.vx -= direction.x * SHOTGUN.recoil;
  player.vy -= direction.y * SHOTGUN.recoil;
  player.facing = direction.x < 0 ? -1 : 1;
  state.effects.push(
    makeEffect(origin.x + direction.x * 78, origin.y + direction.y * 78, "#fff1a8", 0.12, 26, {
      kind: "muzzle",
      angle: Math.atan2(direction.y, direction.x),
    }),
  );

  if (!player.onGround && direction.y > 0.45) {
    const recoil = SHOTGUN.downwardRecoil * (state.activePowerUps.strongRecoil > 0 ? STRONG_RECOIL_MULTIPLIER : 1);
    player.vy -= recoil;
    state.effects.push(makeEffect(origin.x, origin.y + player.h / 2, "#8ecae6", 0.2, 28, { kind: "launch" }));
  }

  if (player.ammo === 0) {
    startReload(player, state.activePowerUps);
  }

  return true;
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

  for (const enemy of state.enemies) {
    if (enemy.lastStockSwingId === player.stockSwingId || !rectsOverlap(hitbox, enemy)) {
      continue;
    }

    hits += 1;
    enemy.lastStockSwingId = player.stockSwingId;
    enemy.vx = player.facing * 360;

    if (enemy.isBoss) {
      enemy.health = Math.max(1, enemy.health - BOSS_STOCK_DAMAGE);
      enemy.x = clamp(enemy.x + player.facing * 24, 0, WORLD.width - enemy.w);
      state.effects.push(makeEffect(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#d7263d", 0.24, 24));
    } else {
      state.corpses.push(createCorpseFromEnemy(enemy, player.facing));
      enemy.health = 0;
      enemy.x = clamp(enemy.x + player.facing * 34, 0, WORLD.width - enemy.w);
      state.effects.push(makeEffect(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#fff8d7", 0.24, 20));
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

  if (pressed.shootPressed) {
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
  state.cameraX = clamp(player.x + player.w / 2 - 420, 0, Math.max(0, WORLD.width - 1280));

  return state;
}
