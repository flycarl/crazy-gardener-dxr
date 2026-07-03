import { POWER_UPS, SHOTGUN, WORLD } from "./core/constants.js";
import { normalize } from "./core/math.js";

const SKY_TOP = "#8ecae6";
const SKY_BOTTOM = "#f7f2dc";
const GROUND = "#426b36";
const SOIL = "#26351f";

function screenX(state, worldX) {
  return worldX - (state?.cameraX ?? 0);
}

function drawBackground(context, canvas, state) {
  const sky = context.createLinearGradient(0, 0, 0, WORLD.groundY);
  sky.addColorStop(0, SKY_TOP);
  sky.addColorStop(1, SKY_BOTTOM);
  context.fillStyle = sky;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const cameraX = state?.cameraX ?? 0;

  context.fillStyle = "rgba(58, 92, 64, 0.22)";
  for (let x = -120 - (cameraX * 0.18) % 320; x < canvas.width + 220; x += 320) {
    context.beginPath();
    context.moveTo(x, WORLD.groundY);
    context.lineTo(x + 130, WORLD.groundY - 190);
    context.lineTo(x + 280, WORLD.groundY);
    context.closePath();
    context.fill();
  }

  context.fillStyle = GROUND;
  context.fillRect(0, WORLD.groundY, canvas.width, canvas.height - WORLD.groundY);
  context.fillStyle = SOIL;
  context.fillRect(0, WORLD.groundY + 42, canvas.width, canvas.height - WORLD.groundY - 42);

  for (let x = -40 - (cameraX % 180); x < canvas.width + 180; x += 180) {
    context.fillStyle = "#2e5a30";
    context.fillRect(x + 8, WORLD.groundY - 36, 10, 36);
    context.fillStyle = "#6aa84f";
    context.beginPath();
    context.ellipse(x + 13, WORLD.groundY - 40, 22, 10, -0.4, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.ellipse(x + 28, WORLD.groundY - 25, 18, 8, 0.5, 0, Math.PI * 2);
    context.fill();
  }
}

function drawExtraction(context, state) {
  if (!state?.extraction.active) return;

  const exit = state.extraction;
  const x = screenX(state, exit.x);
  const pulse = 0.55 + Math.sin(performance.now() / 140) * 0.18;

  context.save();
  context.shadowColor = "#f4d35e";
  context.shadowBlur = 24 + pulse * 16;
  context.fillStyle = "#f4d35e";
  context.fillRect(x, exit.y, exit.w, exit.h);
  context.restore();

  context.fillStyle = "#344e41";
  context.fillRect(x + 16, exit.y + 18, exit.w - 32, exit.h - 18);
  context.fillStyle = "#fff8d7";
  context.fillRect(x + 27, exit.y + 34, exit.w - 54, 12);
  context.strokeStyle = `rgba(255, 248, 215, ${pulse})`;
  context.lineWidth = 4;
  context.strokeRect(x - 8, exit.y - 8, exit.w + 16, exit.h + 16);
}

function drawPickups(context, state) {
  for (const pickup of state.pickups) {
    const x = screenX(state, pickup.x);
    const y = pickup.y;

    context.fillStyle = pickup.color;
    context.beginPath();
    context.roundRect(x, y, pickup.w, pickup.h, 6);
    context.fill();
    context.strokeStyle = "#1b1b1b";
    context.lineWidth = 2;
    context.stroke();

    context.fillStyle = "#1b1b1b";
    context.font = "bold 15px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(pickup.id.slice(0, 1).toUpperCase(), x + pickup.w / 2, y + pickup.h / 2 + 1);
  }
}

function drawPellets(context, state) {
  for (const pellet of state.pellets) {
    const x = screenX(state, pellet.x);
    const y = pellet.y;
    const previousX = screenX(state, pellet.previousX ?? pellet.x - pellet.vx * 0.018);
    const previousY = pellet.previousY ?? pellet.y - pellet.vy * 0.018;

    context.strokeStyle = "rgba(255, 244, 163, 0.55)";
    context.lineWidth = 3;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(previousX, previousY);
    context.lineTo(x, y);
    context.stroke();

    context.fillStyle = "#fff4a3";
    context.beginPath();
    context.arc(x, y, pellet.radius, 0, Math.PI * 2);
    context.fill();
  }

  context.lineCap = "butt";
}

function drawEffects(context, state) {
  for (const effect of state.effects) {
    const progress = effect.life / effect.maxLife;
    const x = screenX(state, effect.x);

    if (effect.kind === "muzzle") {
      context.save();
      context.globalAlpha = Math.max(0, progress);
      context.translate(x, effect.y);
      context.rotate(effect.angle ?? 0);
      context.fillStyle = effect.color;
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(effect.radius * 1.35, -effect.radius * 0.38);
      context.lineTo(effect.radius * 0.92, 0);
      context.lineTo(effect.radius * 1.35, effect.radius * 0.38);
      context.closePath();
      context.fill();
      context.restore();
      continue;
    }

    if (effect.kind === "launch") {
      context.globalAlpha = Math.max(0, progress * 0.7);
      context.fillStyle = effect.color;
      context.beginPath();
      context.ellipse(x, effect.y, effect.radius * (1.4 - progress), 9 * (1.2 - progress * 0.4), 0, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
      continue;
    }

    context.globalAlpha = Math.max(0, progress);
    context.strokeStyle = effect.color;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(x, effect.y, effect.radius * (1.15 - progress), 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = 1;
  }
}

function drawEnemies(context, state) {
  for (const enemy of state.enemies) {
    const x = screenX(state, enemy.x);
    const y = enemy.y;
    const healthRatio = Math.max(0, enemy.health / enemy.maxHealth);

    context.fillStyle = enemy.isBoss ? "#7a2e3b" : enemy.type === "fast" ? "#7b9e46" : enemy.type === "fat" ? "#a0572d" : "#566f45";
    context.beginPath();
    context.roundRect(x, y, enemy.w, enemy.h, enemy.isBoss ? 8 : 5);
    context.fill();

    context.fillStyle = "#24351f";
    context.fillRect(x + enemy.w * 0.22, y + enemy.h * 0.22, 8, 8);
    context.fillRect(x + enemy.w * 0.62, y + enemy.h * 0.22, 8, 8);

    context.fillStyle = "rgba(0, 0, 0, 0.45)";
    context.fillRect(x, y - 12, enemy.w, 6);
    context.fillStyle = enemy.isBoss ? "#ff6b6b" : "#f4d35e";
    context.fillRect(x, y - 12, enemy.w * healthRatio, 6);
  }
}

function drawStockArc(context, state) {
  const player = state.player;
  if (player.stockTimer <= 0) return;

  const centerX = screenX(state, player.x + player.w / 2);
  const centerY = player.y + player.h / 2;
  const range = SHOTGUN.stockRange + (state.activePowerUps.longStock > 0 ? 42 : 0);
  const start = player.facing >= 0 ? -0.75 : Math.PI - 0.75;
  const end = player.facing >= 0 ? 0.75 : Math.PI + 0.75;

  context.strokeStyle = "rgba(255, 248, 215, 0.8)";
  context.lineWidth = 12;
  context.lineCap = "round";
  context.beginPath();
  context.arc(centerX, centerY, range, start, end);
  context.stroke();
  context.lineCap = "butt";
}

function drawPlayer(context, state, input) {
  const player = state.player;
  const x = screenX(state, player.x);
  const y = player.y;
  const centerX = x + player.w / 2;
  const centerY = y + player.h / 2;
  const aim = normalize((input?.mouse?.worldX ?? player.x + player.facing) - (player.x + player.w / 2), (input?.mouse?.worldY ?? centerY) - (player.y + player.h / 2));

  context.fillStyle = "#fff8d7";
  context.beginPath();
  context.roundRect(x, y, player.w, player.h, 7);
  context.fill();

  context.fillStyle = "#6aa84f";
  context.fillRect(x + 7, y + 26, player.w - 14, player.h - 28);

  context.fillStyle = "#24351f";
  context.fillRect(x + (player.facing >= 0 ? player.w - 14 : 6), y + 17, 8, 8);

  context.strokeStyle = "#3d2b1f";
  context.lineWidth = 8;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(centerX, centerY + 5);
  context.lineTo(centerX + aim.x * 74, centerY + 5 + aim.y * 74);
  context.stroke();

  context.strokeStyle = "#1f2933";
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(centerX + aim.x * 18, centerY + 5 + aim.y * 18);
  context.lineTo(centerX + aim.x * 90, centerY + 5 + aim.y * 90);
  context.stroke();
  context.lineCap = "butt";

  if (player.reloading) {
    context.fillStyle = "rgba(27, 27, 27, 0.74)";
    context.beginPath();
    context.roundRect(x - 12, y - 30, player.w + 24, 20, 5);
    context.fill();
    context.fillStyle = "#fff8d7";
    context.font = "bold 13px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("RELOAD", centerX, y - 20);
  }
}

function formatPowerUps(activePowerUps) {
  const entries = Object.entries(activePowerUps);
  if (entries.length === 0) return "Power-ups: none";

  return `Power-ups: ${entries
    .map(([id, time]) => `${POWER_UPS[id]?.label ?? id} ${Math.ceil(time)}s`)
    .join(", ")}`;
}

function updateHud(state) {
  const hud = document.querySelector("#hud");
  if (!hud || !state) return;

  const player = state.player;
  const boss = state.enemies.find((enemy) => enemy.isBoss);
  const objective =
    state.mode === "level"
      ? state.extraction.active
        ? "Extraction: ready"
        : `Enemies: ${state.enemiesRemaining ?? state.enemies.length}`
      : `Next wave: ${Math.ceil(state.spawnTimer)}s`;

  const items = [
    `Health: ${Math.ceil(player.health)}`,
    `Ammo: ${player.ammo}/${player.magazineSize}`,
    player.reloading ? `Reloading ${player.reloadTimer.toFixed(1)}s` : "Reload: ready",
    `Mode: ${state.mode}`,
    `Level: ${state.level}`,
    `Wave: ${state.wave}`,
    objective,
    `Kills: ${state.kills}`,
    `Score: ${state.score}`,
    formatPowerUps(state.activePowerUps),
    "A/D move",
    "Space jump",
    "Mouse aim",
    "Left click shoot",
    "Right click stock swing",
  ];

  if (boss) {
    items.splice(7, 0, `Boss: ${Math.ceil(boss.health)}/${boss.maxHealth}`);
  }

  hud.innerHTML = items
    .map((item) => `<span>${item}</span>`)
    .join("");
}

export function drawGame(context, canvas, state, input) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground(context, canvas, state);

  if (!state) {
    updateHud(state);
    return;
  }

  drawExtraction(context, state);
  drawPickups(context, state);
  drawPellets(context, state);
  drawEffects(context, state);
  drawEnemies(context, state);
  drawStockArc(context, state);
  drawPlayer(context, state, input);
  updateHud(state);
}
