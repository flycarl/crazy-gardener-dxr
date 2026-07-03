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

  context.fillStyle = "#f4d35e";
  context.fillRect(x, exit.y, exit.w, exit.h);
  context.fillStyle = "#344e41";
  context.fillRect(x + 16, exit.y + 18, exit.w - 32, exit.h - 18);
  context.fillStyle = "#fff8d7";
  context.fillRect(x + 27, exit.y + 34, exit.w - 54, 12);
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
  context.fillStyle = "#fff4a3";
  for (const pellet of state.pellets) {
    context.beginPath();
    context.arc(screenX(state, pellet.x), pellet.y, pellet.radius, 0, Math.PI * 2);
    context.fill();
  }
}

function drawEffects(context, state) {
  for (const effect of state.effects) {
    const progress = effect.life / effect.maxLife;

    context.globalAlpha = Math.max(0, progress);
    context.strokeStyle = effect.color;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(screenX(state, effect.x), effect.y, effect.radius * (1.15 - progress), 0, Math.PI * 2);
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
  hud.innerHTML = [
    `Health: ${Math.ceil(player.health)}`,
    `Ammo: ${player.ammo}/${player.magazineSize}`,
    `Reload: ${player.reloading ? `${player.reloadTimer.toFixed(1)}s` : "ready"}`,
    `Mode: ${state.mode}`,
    `Level: ${state.level}`,
    `Wave: ${state.wave}`,
    `Kills: ${state.kills}`,
    `Score: ${state.score}`,
    formatPowerUps(state.activePowerUps),
  ]
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
