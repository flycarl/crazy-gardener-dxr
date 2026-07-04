import { POWER_UPS, SHOTGUN, WORLD } from "./core/constants.js";
import { normalize } from "./core/math.js";

const SKY_TOP = "#8ecae6";
const SKY_BOTTOM = "#f7f2dc";
const GROUND = "#426b36";
const SOIL = "#26351f";

function screenX(state, worldX) {
  return worldX - (state?.cameraX ?? 0);
}

function screenY(state, worldY) {
  return worldY - (state?.cameraY ?? 0);
}

function drawBackground(context, canvas, state) {
  const groundY = screenY(state, WORLD.groundY);
  const sky = context.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, SKY_TOP);
  sky.addColorStop(1, SKY_BOTTOM);
  context.fillStyle = sky;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const cameraX = state?.cameraX ?? 0;

  context.fillStyle = "rgba(58, 92, 64, 0.22)";
  for (let x = -120 - (cameraX * 0.18) % 320; x < canvas.width + 220; x += 320) {
    context.beginPath();
    context.moveTo(x, groundY);
    context.lineTo(x + 130, screenY(state, WORLD.groundY - 190));
    context.lineTo(x + 280, groundY);
    context.closePath();
    context.fill();
  }

  context.fillStyle = GROUND;
  context.fillRect(0, groundY, canvas.width, canvas.height - groundY);
  context.fillStyle = SOIL;
  context.fillRect(0, screenY(state, WORLD.groundY + 42), canvas.width, canvas.height - screenY(state, WORLD.groundY + 42));

  for (const gap of WORLD.gaps) {
    const x = screenX(state, gap.x);
    context.fillStyle = SKY_BOTTOM;
    context.fillRect(x, screenY(state, WORLD.groundY - 4), gap.w, canvas.height - screenY(state, WORLD.groundY - 4));
    context.fillStyle = "rgba(38, 53, 31, 0.55)";
    context.fillRect(x - 12, screenY(state, WORLD.groundY + 4), 12, canvas.height - screenY(state, WORLD.groundY));
    context.fillRect(x + gap.w, screenY(state, WORLD.groundY + 4), 12, canvas.height - screenY(state, WORLD.groundY));
  }

  for (const platform of WORLD.platforms) {
    const x = screenX(state, platform.x);
    const y = screenY(state, platform.y);
    context.fillStyle = "#a94f33";
    context.fillRect(x, y, platform.w, platform.h);
    context.fillStyle = "#c96543";
    for (let tileX = x + 6; tileX < x + platform.w - 8; tileX += 34) {
      context.fillRect(tileX, y + 4, 28, 7);
      context.fillRect(tileX + 10, y + 14, 28, 7);
    }
    context.strokeStyle = "#6f3326";
    context.lineWidth = 3;
    context.strokeRect(x, y, platform.w, platform.h);
  }

  for (const wall of WORLD.walls) {
    const x = screenX(state, wall.x);
    const y = screenY(state, wall.y);
    context.fillStyle = "#7b4a32";
    context.fillRect(x, y, wall.w, wall.h);
    context.fillStyle = "#a85d3c";
    for (let tileY = y + 6; tileY < y + wall.h - 8; tileY += 18) {
      context.fillRect(x + 5, tileY, wall.w - 10, 6);
    }
    context.strokeStyle = "#4d2f22";
    context.lineWidth = 3;
    context.strokeRect(x, y, wall.w, wall.h);
  }

  for (let x = -40 - (cameraX % 180); x < canvas.width + 180; x += 180) {
    context.fillStyle = "#2e5a30";
    context.fillRect(x + 8, screenY(state, WORLD.groundY - 36), 10, 36);
    context.fillStyle = "#6aa84f";
    context.beginPath();
    context.ellipse(x + 13, screenY(state, WORLD.groundY - 40), 22, 10, -0.4, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.ellipse(x + 28, screenY(state, WORLD.groundY - 25), 18, 8, 0.5, 0, Math.PI * 2);
    context.fill();
  }
}

function drawExtraction(context, state) {
  if (!state?.extraction.active) return;

  const exit = state.extraction;
  const x = screenX(state, exit.x);
  const y = screenY(state, exit.y);
  const pulse = 0.55 + Math.sin(performance.now() / 140) * 0.18;

  context.save();
  context.shadowColor = "#f4d35e";
  context.shadowBlur = 24 + pulse * 16;
  context.fillStyle = "#f4d35e";
  context.fillRect(x, y, exit.w, exit.h);
  context.restore();

  context.fillStyle = "#344e41";
  context.fillRect(x + 16, y + 18, exit.w - 32, exit.h - 18);
  context.fillStyle = "#fff8d7";
  context.fillRect(x + 27, y + 34, exit.w - 54, 12);
  context.strokeStyle = `rgba(255, 248, 215, ${pulse})`;
  context.lineWidth = 4;
  context.strokeRect(x - 8, y - 8, exit.w + 16, exit.h + 16);
}

function drawPickups(context, state) {
  for (const pickup of state.pickups) {
    const x = screenX(state, pickup.x);
    const y = screenY(state, pickup.y);

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
    context.fillText(pickup.id === "health" ? "+" : pickup.id.slice(0, 1).toUpperCase(), x + pickup.w / 2, y + pickup.h / 2 + 1);
  }
}

function drawPellets(context, state) {
  for (const pellet of state.pellets) {
    const x = screenX(state, pellet.x);
    const y = screenY(state, pellet.y);
    const previousX = screenX(state, pellet.previousX ?? pellet.x - pellet.vx * 0.018);
    const previousY = screenY(state, pellet.previousY ?? pellet.y - pellet.vy * 0.018);

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

function drawEnemyProjectiles(context, state) {
  for (const projectile of state.enemyProjectiles) {
    const x = screenX(state, projectile.x);
    const y = screenY(state, projectile.y);
    const radius = Math.max(projectile.w ?? 12, projectile.h ?? 12) / 2;

    context.save();
    context.shadowColor = projectile.color ?? "#d7263d";
    context.shadowBlur = 10;
    context.fillStyle = projectile.color ?? "#d7263d";
    context.beginPath();
    context.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = "rgba(255, 248, 215, 0.75)";
    context.lineWidth = 2;
    context.stroke();
    context.restore();
  }
}

function drawEffects(context, state) {
  for (const effect of state.effects) {
    const progress = effect.life / effect.maxLife;
    const x = screenX(state, effect.x);
    const y = screenY(state, effect.y);

    if (effect.kind === "splatter") {
      context.globalAlpha = Math.max(0, progress);
      context.fillStyle = effect.color;
      context.beginPath();
      context.arc(x, y, effect.radius * (0.55 + progress), 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
      continue;
    }

    if (effect.kind === "stock") {
      context.save();
      context.globalAlpha = Math.max(0, progress * 0.55);
      context.strokeStyle = "rgba(255, 255, 255, 0.92)";
      context.lineWidth = 18;
      context.lineCap = "round";
      context.beginPath();
      context.arc(x, y, effect.radius * (1.18 - progress * 0.14), -1.05, 1.05);
      context.stroke();
      context.strokeStyle = "rgba(216, 249, 87, 0.5)";
      context.lineWidth = 7;
      context.beginPath();
      context.arc(x, y, effect.radius * (1.02 - progress * 0.08), -1.15, 1.15);
      context.stroke();
      context.restore();
      continue;
    }

    if (effect.kind === "muzzle") {
      context.save();
      context.globalAlpha = Math.max(0, progress);
      context.translate(x, y);
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
      context.ellipse(x, y, effect.radius * (1.4 - progress), 9 * (1.2 - progress * 0.4), 0, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
      continue;
    }

    context.globalAlpha = Math.max(0, progress);
    context.strokeStyle = effect.color;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(x, y, effect.radius * (1.15 - progress), 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = 1;
  }
}

function drawEnemies(context, state) {
  for (const enemy of state.enemies) {
    const x = screenX(state, enemy.x);
    const y = screenY(state, enemy.y);
    const healthRatio = Math.max(0, enemy.health / enemy.maxHealth);
    const bodyColor = enemy.isBoss ? "#7a2e3b" : enemy.type === "fast" ? "#b33b34" : enemy.type === "fat" ? "#a0572d" : "#566f45";
    const headRadius = enemy.isBoss ? 26 : enemy.type === "fat" ? 15 : 12;
    const headX = x + enemy.w * 0.52;
    const headY = y + headRadius + 2;

    if (enemy.isSlime) {
      const slimeColor = enemy.type === "slimeHigh" ? "#2ec4b6" : enemy.type === "slimeMid" ? "#57cc99" : "#80ed99";
      context.fillStyle = slimeColor;
      context.beginPath();
      context.ellipse(x + enemy.w / 2, y + enemy.h * 0.68, enemy.w * 0.44, enemy.h * 0.34, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#174c43";
      context.fillRect(x + enemy.w * 0.32, y + enemy.h * 0.55, 5, 5);
      context.fillRect(x + enemy.w * 0.6, y + enemy.h * 0.55, 5, 5);
      context.fillStyle = "rgba(0, 0, 0, 0.45)";
      context.fillRect(x, y - 12, enemy.w, 6);
      context.fillStyle = "#f4d35e";
      context.fillRect(x, y - 12, enemy.w * healthRatio, 6);
      continue;
    }

    if (enemy.flying) {
      const balloonX = x + enemy.w / 2;
      const balloonY = y - 34;
      context.fillStyle = "#ef476f";
      context.beginPath();
      context.ellipse(balloonX, balloonY, 18, 23, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "rgba(255, 255, 255, 0.45)";
      context.beginPath();
      context.ellipse(balloonX - 6, balloonY - 8, 5, 8, -0.4, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "#3d2b1f";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(balloonX, balloonY + 22);
      context.lineTo(headX, headY - headRadius);
      context.stroke();
    }

    context.fillStyle = bodyColor;
    context.beginPath();
    context.roundRect(x + enemy.w * 0.18, y + enemy.h * 0.3, enemy.w * 0.64, enemy.h * 0.48, enemy.isBoss ? 10 : 6);
    context.fill();

    context.strokeStyle = bodyColor;
    context.lineWidth = enemy.isBoss ? 10 : 6;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(x + enemy.w * 0.26, y + enemy.h * 0.42);
    context.lineTo(x + enemy.w * 0.02, y + enemy.h * 0.6);
    context.moveTo(x + enemy.w * 0.72, y + enemy.h * 0.44);
    context.lineTo(x + enemy.w * 0.96, y + enemy.h * 0.57);
    context.moveTo(x + enemy.w * 0.37, y + enemy.h * 0.76);
    context.lineTo(x + enemy.w * 0.2, y + enemy.h);
    context.moveTo(x + enemy.w * 0.63, y + enemy.h * 0.76);
    context.lineTo(x + enemy.w * 0.82, y + enemy.h);
    context.stroke();
    context.lineCap = "butt";

    if (enemy.hasShield) {
      const shieldW = Math.max(14, enemy.w * 0.28);
      const shieldH = enemy.h * 0.58;
      const shieldX = enemy.facing >= 0 ? x + enemy.w * 0.66 : x + enemy.w * 0.06;
      const shieldY = y + enemy.h * 0.28;
      context.fillStyle = enemy.shieldBroken ? "#5f6670" : "#9fb3c8";
      context.strokeStyle = enemy.shieldBroken ? "#30343b" : "#d7e3fc";
      context.lineWidth = 3;
      context.beginPath();
      context.roundRect(shieldX, shieldY, shieldW, shieldH, 4);
      context.fill();
      context.stroke();
      if (enemy.shieldBroken) {
        context.strokeStyle = "#24272d";
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(shieldX + shieldW * 0.25, shieldY + shieldH * 0.2);
        context.lineTo(shieldX + shieldW * 0.72, shieldY + shieldH * 0.55);
        context.lineTo(shieldX + shieldW * 0.35, shieldY + shieldH * 0.85);
        context.stroke();
      }
    }

    context.fillStyle = enemy.type === "fast" ? "#d85a4f" : "#8aa26a";
    context.beginPath();
    context.arc(headX, headY, headRadius, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#24351f";
    context.fillRect(headX - headRadius * 0.45, headY - 3, 5, 5);
    context.fillRect(headX + headRadius * 0.22, headY - 3, 5, 5);
    context.strokeStyle = "#24351f";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(headX - headRadius * 0.35, headY + headRadius * 0.35);
    context.lineTo(headX + headRadius * 0.35, headY + headRadius * 0.28);
    context.stroke();

    context.fillStyle = "rgba(0, 0, 0, 0.45)";
    context.fillRect(x, y - 12, enemy.w, 6);
    context.fillStyle = enemy.isBoss ? "#ff6b6b" : "#f4d35e";
    context.fillRect(x, y - 12, enemy.w * healthRatio, 6);
  }
}

function drawCorpses(context, state) {
  for (const corpse of state.corpses) {
    const x = screenX(state, corpse.x);
    const y = screenY(state, corpse.y);
    const fade = Math.min(1, corpse.life / 0.8);

    context.save();
    context.globalAlpha = Math.max(0, fade);
    context.translate(x + corpse.w / 2, y + corpse.h / 2);
    context.rotate(corpse.rotation);
    context.fillStyle = corpse.type === "fast" ? "#8f2f2a" : corpse.type === "fat" ? "#7c4326" : "#3f5335";
    context.beginPath();
    context.roundRect(-corpse.w / 2, -corpse.h / 2, corpse.w, corpse.h, 5);
    context.fill();
    context.strokeStyle = "rgba(255, 248, 215, 0.35)";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(-corpse.w * 0.25, -corpse.h * 0.1);
    context.lineTo(corpse.w * 0.25, corpse.h * 0.12);
    context.stroke();
    context.restore();
  }
}

function drawFloatTexts(context, state) {
  context.save();
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "bold 18px Arial";

  for (const floatText of state.floatTexts) {
    const progress = Math.max(0, floatText.life / floatText.maxLife);
    const x = screenX(state, floatText.x);
    const y = screenY(state, floatText.y);

    context.globalAlpha = progress;
    context.lineWidth = 4;
    context.strokeStyle = "rgba(0, 0, 0, 0.58)";
    context.strokeText(floatText.text, x, y);
    context.fillStyle = floatText.color;
    context.fillText(floatText.text, x, y);
  }

  context.restore();
  context.globalAlpha = 1;
}

function drawStockArc(context, state) {
  const player = state.player;
  if (player.stockTimer <= 0) return;

  const centerX = screenX(state, player.x + player.w / 2);
  const centerY = screenY(state, player.y + player.h / 2);
  const range = SHOTGUN.stockRange + (Math.max(state.activePowerUps.longStock ?? 0, state.permanentPowerUps?.longStock ?? 0) > 0 ? 42 : 0);
  const progress = 1 - player.stockTimer / SHOTGUN.stockArcSeconds;
  const sweep = 1.7 * Math.max(0.12, progress);
  const start = player.facing >= 0 ? -1.25 : Math.PI + 1.25;
  const end = player.facing >= 0 ? start + sweep : start - sweep;

  context.strokeStyle = "rgba(255, 248, 215, 0.8)";
  context.lineWidth = 12;
  context.lineCap = "round";
  context.beginPath();
  context.arc(centerX, centerY, range, start, end, player.facing < 0);
  context.stroke();
  context.lineCap = "butt";
}

function drawPlayer(context, state, input) {
  const player = state.player;
  const x = screenX(state, player.x);
  const y = screenY(state, player.y);
  const centerX = x + player.w / 2;
  const centerY = y + player.h / 2;
  const baseAim = normalize((input?.mouse?.worldX ?? player.x + player.facing) - (player.x + player.w / 2), (input?.mouse?.worldY ?? player.y + player.h / 2) - (player.y + player.h / 2));
  let aim = baseAim;

  if (player.stockTimer > 0) {
    const progress = 1 - player.stockTimer / SHOTGUN.stockArcSeconds;
    const angle = player.facing >= 0 ? -1.15 + progress * 1.75 : Math.PI + 1.15 - progress * 1.75;
    aim = { x: Math.cos(angle), y: Math.sin(angle) };
  }

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
    context.fillText("换弹", centerX, y - 20);
  }
}

function formatPowerUps(activePowerUps, permanentPowerUps = {}) {
  const activeEntries = Object.entries(activePowerUps);
  const permanentEntries = Object.entries(permanentPowerUps);
  if (activeEntries.length === 0 && permanentEntries.length === 0) return "强化：无";

  const permanentText = permanentEntries.map(([id, count]) => `${POWER_UPS[id]?.label ?? id} 永久x${count}`);
  const activeText = activeEntries.map(([id, time]) => `${POWER_UPS[id]?.label ?? id} ${Math.ceil(time)}s`);

  return `强化：${[...permanentText, ...activeText].join(", ")}`;
}

function drawBossBar(context, canvas, state) {
  const boss = state.enemies.find((enemy) => enemy.isBoss);
  if (!boss) return;

  const ratio = Math.max(0, boss.health / boss.maxHealth);
  const x = canvas.width / 2 - 260;
  const y = 48;

  context.fillStyle = "rgba(0, 0, 0, 0.58)";
  context.beginPath();
  context.roundRect(x, y, 520, 34, 7);
  context.fill();
  context.fillStyle = "#d7263d";
  context.beginPath();
  context.roundRect(x + 5, y + 7, 510 * ratio, 20, 5);
  context.fill();
  context.strokeStyle = "rgba(255, 248, 215, 0.72)";
  context.lineWidth = 2;
  context.strokeRect(x + 5, y + 7, 510, 20);
  context.fillStyle = "#fff8d7";
  context.font = "bold 16px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(`${boss.label}  ${Math.ceil(boss.health)}/${boss.maxHealth}`, canvas.width / 2, y + 17);
}

function updateHud(state) {
  const hud = document.querySelector("#hud");
  if (!hud) return;
  if (!state) {
    hud.innerHTML = "";
    return;
  }

  const player = state.player;
  const modeLabel = state.mode === "level" ? "关卡" : state.mode === "balloon" ? "打气球" : "无尽";
  const weaponLabel = state.weapon === "rifle" ? "步枪" : state.weapon === "pistol" ? "手枪" : "霰弹枪";
  const progressLabel =
    state.status === "victory"
      ? "15关全部通关"
      : state.mode === "level"
      ? `第 ${state.level} 关`
      : state.mode === "balloon"
        ? `第 ${state.level} 关 / ${Math.ceil(state.balloonTimer)}秒`
        : `第 ${state.wave} 波`;
  const items = [
    `生命：${Math.ceil(player.health)}`,
    `弹药：${player.ammo}/${player.magazineSize}`,
    player.reloading ? `换弹中：${player.reloadTimer.toFixed(1)}秒` : "换弹：准备就绪",
    `模式：${modeLabel}`,
    `武器：${weaponLabel}`,
    progressLabel,
    `击杀：${state.kills}`,
    `分数：${state.score}`,
    `最高分：${state.highScore ?? 0}`,
    formatPowerUps(state.activePowerUps, state.permanentPowerUps),
    "A/D 移动",
    "空格跳跃",
    "左键开枪",
    "右键挥枪托",
  ];

  if (state.mode === "level") {
    items.splice(5, 0, state.awaitingNextLevel ? "通关：等待下一关" : `剩余怪物：${state.enemiesRemaining ?? state.enemies.length}`);
    if (state.level % 5 === 0) {
      items.splice(6, 0, state.awaitingWeaponChoice ? "Boss奖励：选择下一关武器" : "Boss关：强制霰弹枪");
    }
  } else if (state.mode === "balloon") {
    items.splice(5, 0, state.awaitingNextLevel ? "通关：等待下一关" : `剩余气球：${state.enemiesRemaining ?? state.enemies.length}`);
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
  drawEnemyProjectiles(context, state);
  drawEffects(context, state);
  drawCorpses(context, state);
  drawEnemies(context, state);
  drawStockArc(context, state);
  drawPlayer(context, state, input);
  drawFloatTexts(context, state);
  drawBossBar(context, canvas, state);
  updateHud(state);
}
