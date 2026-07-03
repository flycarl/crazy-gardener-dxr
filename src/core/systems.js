import { PLAYER, SHOTGUN, WORLD } from "./constants.js";
import { clamp, normalize } from "./math.js";

const FLOOR_FRICTION = 0.82;

function getPlayerCenter(player) {
  return {
    x: player.x + player.w / 2,
    y: player.y + player.h / 2,
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

function updatePlayer(state, input, dt) {
  const player = state.player;
  const horizontal = Number(Boolean(input.right)) - Number(Boolean(input.left));

  if (horizontal !== 0) {
    player.vx = horizontal * PLAYER.speed;
    player.facing = horizontal;
  } else if (player.onGround) {
    player.vx *= FLOOR_FRICTION;
    if (Math.abs(player.vx) < 1) player.vx = 0;
  }

  if (input.jump && player.onGround) {
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

export function startReload(state) {
  const player = state.player;

  if (player.reloading || player.ammo >= player.magazineSize) {
    return false;
  }

  player.reloading = true;
  player.reloadTimer = SHOTGUN.reloadSeconds;

  return true;
}

export function fireShotgun(state, aim) {
  const player = state.player;

  if (player.reloading || player.shotCooldown > 0) {
    return false;
  }

  if (player.ammo <= 0) {
    startReload(state);
    return false;
  }

  const direction = normalize(aim?.x ?? player.facing, aim?.y ?? 0);
  const origin = getPlayerCenter(player);
  const denominator = Math.max(1, SHOTGUN.pelletCount - 1);

  for (let index = 0; index < SHOTGUN.pelletCount; index += 1) {
    const spreadStep = index / denominator - 0.5;
    const pelletDirection = rotate(direction, spreadStep * SHOTGUN.spreadRadians);

    state.pellets.push({
      x: origin.x,
      y: origin.y,
      vx: pelletDirection.x * SHOTGUN.pelletSpeed,
      vy: pelletDirection.y * SHOTGUN.pelletSpeed,
      life: SHOTGUN.pelletLife,
      radius: SHOTGUN.pelletRadius,
    });
  }

  player.ammo -= 1;
  player.shotCooldown = SHOTGUN.cooldownSeconds;
  player.vx -= direction.x * SHOTGUN.recoil;
  player.vy -= direction.y * SHOTGUN.recoil;
  player.facing = direction.x < 0 ? -1 : 1;

  if (!player.onGround && direction.y > 0.45) {
    player.vy -= SHOTGUN.downwardRecoil;
  }

  if (player.ammo === 0) {
    startReload(state);
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

  return true;
}

export function updateGame(state, input, dt) {
  if (!state || state.status !== "playing") {
    return state;
  }

  const step = Math.min(dt, 1 / 20);
  const player = state.player;

  updateTimers(player, step);
  updatePlayer(state, input, step);

  if (input.shootPressed) {
    fireShotgun(state, input.aim);
  }

  if (input.stockPressed) {
    swingStock(state);
  }

  updatePellets(state, step);
  state.cameraX = clamp(player.x + player.w / 2 - 420, 0, Math.max(0, WORLD.width - 1280));

  return state;
}
