import { POWER_UPS, SHOTGUN, WORLD } from "./core/constants.js";
import { normalize } from "./core/math.js";

const SKY_TOP = "#67a6e8";
const SKY_BOTTOM = "#8fd0ff";
const GROUND = "#7fb95d";
const SOIL = "#563528";
const INK = "#263622";

function screenX(state, worldX) {
  return worldX - (state?.cameraX ?? 0);
}

function screenY(state, worldY) {
  return worldY - (state?.cameraY ?? 0);
}

function roundRect(context, x, y, w, h, radius, fill, stroke = INK, lineWidth = 3) {
  context.beginPath();
  context.roundRect(x, y, w, h, radius);
  context.fillStyle = fill;
  context.fill();
  context.strokeStyle = stroke;
  context.lineWidth = lineWidth;
  context.stroke();
}

function ellipse(context, x, y, rx, ry, rotation, fill, stroke = INK, lineWidth = 3) {
  context.beginPath();
  context.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
  context.fillStyle = fill;
  context.fill();
  context.strokeStyle = stroke;
  context.lineWidth = lineWidth;
  context.stroke();
}

function drawBackground(context, canvas, state) {
  const groundY = screenY(state, WORLD.groundY);
  const sky = context.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, SKY_TOP);
  sky.addColorStop(1, SKY_BOTTOM);
  context.fillStyle = sky;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const cameraX = state?.cameraX ?? 0;

  context.fillStyle = "rgba(27, 63, 79, 0.82)";
  for (let x = -150 - (cameraX * 0.1) % 360; x < canvas.width + 240; x += 360) {
    context.beginPath();
    context.moveTo(x, screenY(state, WORLD.groundY - 176));
    context.lineTo(x + 36, screenY(state, WORLD.groundY - 232));
    context.lineTo(x + 70, screenY(state, WORLD.groundY - 190));
    context.lineTo(x + 112, screenY(state, WORLD.groundY - 250));
    context.lineTo(x + 168, screenY(state, WORLD.groundY - 192));
    context.lineTo(x + 236, screenY(state, WORLD.groundY - 216));
    context.lineTo(x + 330, screenY(state, WORLD.groundY - 180));
    context.lineTo(x + 390, groundY);
    context.lineTo(x - 40, groundY);
    context.closePath();
    context.fill();
  }

  context.fillStyle = "rgba(22, 50, 65, 0.95)";
  for (let x = 120 - (cameraX * 0.07) % 520; x < canvas.width + 260; x += 520) {
    const baseY = screenY(state, WORLD.groundY - 204);
    context.fillRect(x, baseY - 70, 86, 70);
    context.beginPath();
    context.moveTo(x - 10, baseY - 70);
    context.lineTo(x + 43, baseY - 105);
    context.lineTo(x + 96, baseY - 70);
    context.closePath();
    context.fill();
    context.fillStyle = "rgba(129, 183, 229, 0.7)";
    context.fillRect(x + 25, baseY - 52, 11, 11);
    context.fillRect(x + 47, baseY - 49, 11, 11);
    context.fillStyle = "rgba(22, 50, 65, 0.95)";
  }

  context.fillStyle = GROUND;
  context.fillRect(0, groundY, canvas.width, canvas.height - groundY);
  context.fillStyle = "#9bd16c";
  context.fillRect(0, groundY, canvas.width, 12);
  context.fillStyle = SOIL;
  context.fillRect(0, screenY(state, WORLD.groundY + 42), canvas.width, canvas.height - screenY(state, WORLD.groundY + 42));
  context.strokeStyle = "rgba(101, 63, 45, 0.9)";
  context.lineWidth = 3;
  for (let x = -30 - (cameraX * 0.3) % 90; x < canvas.width + 120; x += 90) {
    context.beginPath();
    context.moveTo(x, screenY(state, WORLD.groundY + 76));
    context.quadraticCurveTo(x + 40, screenY(state, WORLD.groundY + 54), x + 92, screenY(state, WORLD.groundY + 84));
    context.stroke();
  }

  for (const gap of WORLD.gaps) {
    const x = screenX(state, gap.x);
    context.fillStyle = "#6aaee9";
    context.fillRect(x, screenY(state, WORLD.groundY - 4), gap.w, canvas.height - screenY(state, WORLD.groundY - 4));
    context.fillStyle = "rgba(38, 53, 31, 0.42)";
    context.fillRect(x - 12, screenY(state, WORLD.groundY + 4), 12, canvas.height - screenY(state, WORLD.groundY));
    context.fillRect(x + gap.w, screenY(state, WORLD.groundY + 4), 12, canvas.height - screenY(state, WORLD.groundY));
  }

  for (const platform of WORLD.platforms) {
    const x = screenX(state, platform.x);
    const y = screenY(state, platform.y);
    roundRect(context, x, y, platform.w, platform.h, 5, "#a84333", "#56251e", 4);
    for (let tileY = y + 4; tileY < y + platform.h - 4; tileY += 34) {
      for (let tileX = x + ((Math.round((tileY - y) / 34) % 2) * 18); tileX < x + platform.w; tileX += 36) {
        const w = Math.min(33, x + platform.w - tileX - 3);
        const h = Math.min(30, y + platform.h - tileY - 3);
        if (w <= 6 || h <= 6) continue;
        roundRect(context, tileX + 2, tileY + 2, w, h, 5, "#d65d3c", "#733024", 2);
        context.fillStyle = "rgba(255, 174, 104, 0.28)";
        context.fillRect(tileX + 7, tileY + 6, Math.max(4, w - 14), 4);
        context.strokeStyle = "rgba(88, 36, 28, 0.5)";
        context.lineWidth = 1.5;
        context.beginPath();
        context.moveTo(tileX + w * 0.22, tileY + h * 0.28);
        context.lineTo(tileX + w * 0.34, tileY + h * 0.44);
        context.lineTo(tileX + w * 0.3, tileY + h * 0.62);
        context.stroke();
      }
    }
  }

  for (const wall of WORLD.walls) {
    const x = screenX(state, wall.x);
    const y = screenY(state, wall.y);
    roundRect(context, x, y, wall.w, wall.h, 5, "#8e392d", "#4d211b", 4);
    for (let tileY = y + 5; tileY < y + wall.h - 7; tileY += 28) {
      for (let tileX = x + 5; tileX < x + wall.w - 6; tileX += 31) {
        roundRect(context, tileX, tileY, Math.min(26, x + wall.w - tileX - 5), 22, 4, "#c55237", "#66291f", 2);
      }
    }
  }

  for (let x = -40 - (cameraX % 180); x < canvas.width + 180; x += 180) {
    context.strokeStyle = "#2f6830";
    context.lineWidth = 4;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(x + 13, screenY(state, WORLD.groundY));
    context.lineTo(x + 12, screenY(state, WORLD.groundY - 34));
    context.moveTo(x + 22, screenY(state, WORLD.groundY));
    context.lineTo(x + 32, screenY(state, WORLD.groundY - 24));
    context.stroke();
    ellipse(context, x + 13, screenY(state, WORLD.groundY - 40), 22, 10, -0.4, "#79bd58", "#316b31", 2);
    ellipse(context, x + 31, screenY(state, WORLD.groundY - 26), 17, 8, 0.5, "#8fd36a", "#316b31", 2);
  }
  context.lineCap = "butt";
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

    context.strokeStyle = "rgba(255, 226, 62, 0.62)";
    context.lineWidth = 4;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(previousX, previousY);
    context.lineTo(x, y);
    context.stroke();

    context.fillStyle = "#ffdf3d";
    context.beginPath();
    context.arc(x, y, pellet.radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(86, 62, 18, 0.8)";
    context.lineWidth = 1.5;
    context.stroke();
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
      context.fillStyle = "#ffdf3d";
      for (let i = 0; i < 9; i += 1) {
        const angle = i * 2.399 + effect.x * 0.03;
        const distance = effect.radius * (1.1 - progress) * (0.8 + (i % 3) * 0.45);
        context.beginPath();
        context.arc(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, 2.4 + (i % 2), 0, Math.PI * 2);
        context.fill();
      }
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
    const jacketColor = enemy.isBoss ? "#68313d" : enemy.type === "fast" ? "#7f3f37" : enemy.type === "fat" ? "#785239" : "#5d6649";
    const skinColor = enemy.isBoss ? "#b17a72" : enemy.type === "fast" ? "#9dbe71" : enemy.type === "fat" ? "#9aaa72" : "#a9bd7c";
    const headRadius = enemy.isBoss ? 26 : enemy.type === "fat" ? 15 : 12;
    const headX = x + enemy.w * 0.52;
    const headY = y + headRadius + 2;

    context.save();
    context.lineJoin = "round";
    context.lineCap = "round";
    context.fillStyle = "rgba(18, 20, 16, 0.22)";
    context.beginPath();
    context.ellipse(x + enemy.w * 0.5, y + enemy.h + 3, enemy.w * 0.42, 6, 0, 0, Math.PI * 2);
    context.fill();

    if (enemy.isSlime) {
      const slimeColor = enemy.type === "slimeHigh" ? "#2ec4b6" : enemy.type === "slimeMid" ? "#57cc99" : "#80ed99";
      context.fillStyle = slimeColor;
      context.beginPath();
      context.ellipse(x + enemy.w / 2, y + enemy.h * 0.68, enemy.w * 0.44, enemy.h * 0.34, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#174c43";
      context.fillRect(x + enemy.w * 0.32, y + enemy.h * 0.55, 5, 5);
      context.fillRect(x + enemy.w * 0.6, y + enemy.h * 0.55, 5, 5);
      roundRect(context, x, y - 13, enemy.w, 7, 4, "rgba(0, 0, 0, 0.45)", "rgba(0, 0, 0, 0.15)", 1);
      context.fillStyle = "#f5d44d";
      context.fillRect(x + 1, y - 12, Math.max(0, enemy.w * healthRatio - 2), 5);
      context.restore();
      continue;
    }

    if (enemy.flying) {
      const balloonX = x + enemy.w / 2;
      const balloonY = y - 34;
      ellipse(context, balloonX, balloonY, 18, 23, 0, "#ef476f", "#5a2633", 4);
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

    context.strokeStyle = INK;
    context.lineWidth = enemy.isBoss ? 13 : 8;
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

    context.strokeStyle = skinColor;
    context.lineWidth = enemy.isBoss ? 8 : 5;
    context.beginPath();
    context.moveTo(x + enemy.w * 0.26, y + enemy.h * 0.42);
    context.lineTo(x + enemy.w * 0.02, y + enemy.h * 0.6);
    context.moveTo(x + enemy.w * 0.72, y + enemy.h * 0.44);
    context.lineTo(x + enemy.w * 0.96, y + enemy.h * 0.57);
    context.stroke();
    context.strokeStyle = "#34402f";
    context.beginPath();
    context.moveTo(x + enemy.w * 0.37, y + enemy.h * 0.76);
    context.lineTo(x + enemy.w * 0.2, y + enemy.h);
    context.moveTo(x + enemy.w * 0.63, y + enemy.h * 0.76);
    context.lineTo(x + enemy.w * 0.82, y + enemy.h);
    context.stroke();

    roundRect(context, x + enemy.w * 0.18, y + enemy.h * 0.3, enemy.w * 0.64, enemy.h * 0.48, enemy.isBoss ? 10 : 6, jacketColor, INK, 4);
    context.fillStyle = "#e5ded0";
    context.beginPath();
    context.moveTo(x + enemy.w * 0.38, y + enemy.h * 0.33);
    context.lineTo(x + enemy.w * 0.57, y + enemy.h * 0.34);
    context.lineTo(x + enemy.w * 0.51, y + enemy.h * 0.7);
    context.lineTo(x + enemy.w * 0.33, y + enemy.h * 0.66);
    context.closePath();
    context.fill();
    context.strokeStyle = "rgba(38, 54, 34, 0.55)";
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = enemy.isBoss ? "#f0b43c" : "#d94a34";
    context.beginPath();
    context.moveTo(x + enemy.w * 0.48, y + enemy.h * 0.38);
    context.lineTo(x + enemy.w * 0.57, y + enemy.h * 0.58);
    context.lineTo(x + enemy.w * 0.47, y + enemy.h * 0.72);
    context.lineTo(x + enemy.w * 0.39, y + enemy.h * 0.56);
    context.closePath();
    context.fill();

    if (enemy.hasShield) {
      const shieldW = Math.max(14, enemy.w * 0.28);
      const shieldH = enemy.h * 0.58;
      const shieldX = enemy.facing >= 0 ? x + enemy.w * 0.66 : x + enemy.w * 0.06;
      const shieldY = y + enemy.h * 0.28;
      roundRect(context, shieldX, shieldY, shieldW, shieldH, 5, enemy.shieldBroken ? "#5f6670" : "#aab4bc", "#2b3034", 4);
      context.fillStyle = "rgba(255, 255, 255, 0.32)";
      context.fillRect(shieldX + 4, shieldY + 6, Math.max(4, shieldW - 8), 5);
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

    ellipse(context, headX, headY, headRadius * 1.08, headRadius * 0.98, -0.08, skinColor, INK, 4);
    context.strokeStyle = INK;
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(headX - headRadius * 0.52, headY - headRadius * 0.78);
    context.lineTo(headX - headRadius * 0.36, headY - headRadius * 1.05);
    context.lineTo(headX - headRadius * 0.14, headY - headRadius * 0.8);
    context.moveTo(headX + headRadius * 0.08, headY - headRadius * 0.78);
    context.lineTo(headX + headRadius * 0.28, headY - headRadius * 1.02);
    context.lineTo(headX + headRadius * 0.42, headY - headRadius * 0.74);
    context.stroke();

    ellipse(context, headX - headRadius * 0.36, headY - headRadius * 0.1, headRadius * 0.24, headRadius * 0.26, 0, "#edf0d7", INK, 2);
    ellipse(context, headX + headRadius * 0.3, headY - headRadius * 0.08, headRadius * 0.24, headRadius * 0.26, 0, "#edf0d7", INK, 2);
    context.fillStyle = "#182017";
    context.beginPath();
    context.arc(headX - headRadius * 0.32, headY - headRadius * 0.08, 2.2, 0, Math.PI * 2);
    context.arc(headX + headRadius * 0.34, headY - headRadius * 0.04, 2.2, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = INK;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(headX - headRadius * 0.35, headY + headRadius * 0.35);
    context.quadraticCurveTo(headX, headY + headRadius * 0.52, headX + headRadius * 0.4, headY + headRadius * 0.28);
    context.stroke();

    roundRect(context, x, y - 13, enemy.w, 7, 4, "rgba(0, 0, 0, 0.45)", "rgba(0, 0, 0, 0.15)", 1);
    context.fillStyle = enemy.isBoss ? "#ff6b6b" : "#f5d44d";
    context.fillRect(x + 1, y - 12, Math.max(0, enemy.w * healthRatio - 2), 5);
    context.restore();
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
    if (corpse.type?.startsWith("slime")) {
      const slimeColor = corpse.type === "slimeHigh" ? "#2ec4b6" : corpse.type === "slimeMid" ? "#57cc99" : "#80ed99";
      context.fillStyle = slimeColor;
      context.beginPath();
      context.ellipse(0, corpse.h * 0.18, corpse.w * 0.44, corpse.h * 0.34, 0, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "rgba(23, 76, 67, 0.75)";
      context.lineWidth = 3;
      context.stroke();
      context.strokeStyle = "#174c43";
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(-corpse.w * 0.24, corpse.h * 0.04);
      context.lineTo(-corpse.w * 0.12, corpse.h * 0.16);
      context.moveTo(-corpse.w * 0.12, corpse.h * 0.04);
      context.lineTo(-corpse.w * 0.24, corpse.h * 0.16);
      context.moveTo(corpse.w * 0.14, corpse.h * 0.04);
      context.lineTo(corpse.w * 0.26, corpse.h * 0.16);
      context.moveTo(corpse.w * 0.26, corpse.h * 0.04);
      context.lineTo(corpse.w * 0.14, corpse.h * 0.16);
      context.stroke();
      context.restore();
      continue;
    }
    const corpseFill = corpse.type === "fast" ? "#7f3f37" : corpse.type === "fat" ? "#785239" : "#5d6649";
    roundRect(context, -corpse.w / 2, -corpse.h / 2, corpse.w, corpse.h, 7, corpseFill, "rgba(28, 37, 25, 0.75)", 3);
    ellipse(context, -corpse.w * 0.1, -corpse.h * 0.23, corpse.w * 0.22, corpse.h * 0.18, 0.15, "#9aaa72", "rgba(28, 37, 25, 0.75)", 2);
    context.strokeStyle = "rgba(255, 217, 64, 0.42)";
    context.lineWidth = 4;
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

  context.save();
  context.lineJoin = "round";
  context.lineCap = "round";
  context.fillStyle = "rgba(18, 20, 16, 0.22)";
  context.beginPath();
  context.ellipse(centerX, y + player.h + 4, player.w * 0.46, 6, 0, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "#24351f";
  context.lineWidth = 6;
  context.beginPath();
  context.moveTo(x + player.w * 0.32, y + player.h * 0.73);
  context.lineTo(x + player.w * 0.18, y + player.h);
  context.moveTo(x + player.w * 0.66, y + player.h * 0.73);
  context.lineTo(x + player.w * 0.84, y + player.h);
  context.stroke();
  context.strokeStyle = "#253a62";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(x + player.w * 0.32, y + player.h * 0.73);
  context.lineTo(x + player.w * 0.18, y + player.h);
  context.moveTo(x + player.w * 0.66, y + player.h * 0.73);
  context.lineTo(x + player.w * 0.84, y + player.h);
  context.stroke();

  roundRect(context, x + 6, y + 25, player.w - 12, player.h - 28, 8, "#f1eee3", INK, 4);
  roundRect(context, x + 10, y + 34, player.w - 20, player.h - 37, 6, "#6aa84f", INK, 3);
  context.fillStyle = "#d6d0c6";
  context.beginPath();
  context.moveTo(x + 13, y + 33);
  context.lineTo(x + player.w * 0.48, y + 46);
  context.lineTo(x + 10, y + 54);
  context.closePath();
  context.fill();
  context.strokeStyle = INK;
  context.lineWidth = 2;
  context.stroke();

  ellipse(context, centerX, y + 20, player.w * 0.37, 18, 0.02, "#f4d0aa", INK, 4);
  context.fillStyle = "#8b4a28";
  context.beginPath();
  context.ellipse(centerX + player.facing * 2, y + 28, player.w * 0.29, 11, 0.12, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = INK;
  context.lineWidth = 2;
  context.stroke();
  context.fillStyle = "#fff8d7";
  context.beginPath();
  context.arc(centerX + player.facing * 9, y + 17, 4, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = "#1f2933";
  context.beginPath();
  context.arc(centerX + player.facing * 10, y + 17, 1.5, 0, Math.PI * 2);
  context.fill();
  roundRect(context, centerX - 14, y - 5, 28, 14, 5, "#c7c1b7", INK, 3);
  context.fillStyle = "rgba(255, 255, 255, 0.32)";
  context.fillRect(centerX - 9, y - 1, 18, 3);

  context.strokeStyle = INK;
  context.lineWidth = 11;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(centerX, centerY + 5);
  context.lineTo(centerX + aim.x * 74, centerY + 5 + aim.y * 74);
  context.stroke();

  context.strokeStyle = "#7a4b25";
  context.lineWidth = 7;
  context.beginPath();
  context.moveTo(centerX - aim.x * 3, centerY + 5 - aim.y * 3);
  context.lineTo(centerX + aim.x * 34, centerY + 5 + aim.y * 34);
  context.stroke();
  context.strokeStyle = "#1f2933";
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(centerX + aim.x * 18, centerY + 5 + aim.y * 18);
  context.lineTo(centerX + aim.x * 90, centerY + 5 + aim.y * 90);
  context.stroke();
  context.restore();

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

export function getBossBarRows(state) {
  return (state?.enemies ?? [])
    .filter((enemy) => enemy.isBoss)
    .map((boss, index) => ({
      label: boss.label,
      health: Math.ceil(boss.health),
      maxHealth: boss.maxHealth,
      ratio: Math.max(0, boss.health / boss.maxHealth),
      y: 48 + index * 40,
    }));
}

function drawBossBar(context, canvas, state) {
  const rows = getBossBarRows(state);
  if (rows.length === 0) return;

  const x = canvas.width / 2 - 260;

  for (const row of rows) {
    const y = row.y;

    context.fillStyle = "rgba(0, 0, 0, 0.58)";
    context.beginPath();
    context.roundRect(x, y, 520, 34, 7);
    context.fill();
    context.fillStyle = "#d7263d";
    context.beginPath();
    context.roundRect(x + 5, y + 7, 510 * row.ratio, 20, 5);
    context.fill();
    context.strokeStyle = "rgba(255, 248, 215, 0.72)";
    context.lineWidth = 2;
    context.strokeRect(x + 5, y + 7, 510, 20);
    context.fillStyle = "#fff8d7";
    context.font = "bold 16px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(`${row.label}  ${row.health}/${row.maxHealth}`, canvas.width / 2, y + 17);
  }
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
      ? "100关全部通关"
      : state.mode === "level"
      ? `第 ${state.level} 关`
      : state.mode === "balloon"
        ? `第 ${state.level} 关 / ${Math.ceil(state.balloonTimer)}秒`
        : `第 ${state.wave} 波`;
  const filledHearts = Math.max(0, Math.min(10, Math.ceil(player.health / 10)));
  const healthHearts = Array.from({ length: 10 }, (_, index) => `<span class="health-heart${index < filledHearts ? " filled" : ""}">♥</span>`).join("");
  const waveLabel = state.mode === "endless" ? `波次：${state.wave}` : state.mode === "balloon" ? `波次：气球 ${state.level}` : `波次：关卡 ${state.level}`;
  const statItems = [
    `弹药：${player.ammo}/${player.magazineSize}`,
    waveLabel,
    `击杀：${state.kills}`,
    `分数：${state.score}`,
    `最高分：${state.highScore ?? 0}`,
  ];
  const statusItems = [
    player.reloading ? `换弹中：${player.reloadTimer.toFixed(1)}秒` : "换弹：准备就绪",
    `模式：${modeLabel}`,
    `武器：${weaponLabel}`,
    progressLabel,
    formatPowerUps(state.activePowerUps, state.permanentPowerUps),
    "A/D 移动",
    "空格跳跃",
    "左键开枪",
    "右键挥枪托",
  ];

  if (state.mode === "level") {
    statusItems.splice(4, 0, state.awaitingNextLevel ? "通关：等待下一关" : `剩余怪物：${state.enemiesRemaining ?? state.enemies.length}`);
    if (state.level % 5 === 0) {
      statusItems.splice(5, 0, state.awaitingWeaponChoice ? "Boss奖励：选择下一关武器" : "Boss关：强制霰弹枪");
    }
  } else if (state.mode === "balloon") {
    statusItems.splice(4, 0, state.awaitingNextLevel ? "通关：等待下一关" : `剩余气球：${state.enemiesRemaining ?? state.enemies.length}`);
  }

  hud.innerHTML = `
    <div class="health-meter" aria-label="生命 ${Math.ceil(player.health)}">
      ${healthHearts}
    </div>
    <div class="hud-stats">
      ${statItems.map((item) => `<span>${item}</span>`).join("")}
    </div>
    <div class="hud-status">
      ${statusItems.map((item) => `<span>${item}</span>`).join("")}
    </div>
  `;
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
