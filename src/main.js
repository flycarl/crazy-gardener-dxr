import { WORLD } from "./core/constants.js";
import { createGameState } from "./core/state.js";
import { updateGame } from "./core/systems.js";
import { consumePressed, createInput } from "./input.js";

const canvas = document.querySelector("#game");
const context = canvas.getContext("2d");
const menu = document.querySelector("#menu");
const hud = document.querySelector("#hud");
const input = createInput(canvas);

let state = null;
let lastTime = performance.now();

function getAimDirection(currentState) {
  const player = currentState.player;
  const playerX = player.x + player.w / 2 - currentState.cameraX;
  const playerY = player.y + player.h / 2;

  return {
    x: input.mouse.x - playerX,
    y: input.mouse.y - playerY,
  };
}

function drawPlaceholder(currentState) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#79b45d";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#24351f";
  context.fillRect(0, WORLD.groundY, canvas.width, canvas.height - WORLD.groundY);

  if (!currentState) {
    context.fillStyle = "#fff8d7";
    context.font = "28px Arial";
    context.fillText("Choose a mode to start", 48, 80);
    return;
  }

  const cameraX = currentState.cameraX;
  const player = currentState.player;
  const playerScreenX = player.x - cameraX;

  context.strokeStyle = "#fff8d7";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(player.x + player.w / 2 - cameraX, player.y + player.h / 2);
  context.lineTo(input.mouse.x, input.mouse.y);
  context.stroke();

  context.fillStyle = "#fff8d7";
  context.fillRect(playerScreenX, player.y, player.w, player.h);
  context.fillStyle = "#24351f";
  context.fillRect(playerScreenX + (player.facing > 0 ? player.w - 12 : 4), player.y + 18, 8, 8);

  context.fillStyle = "#f4d35e";
  for (const pellet of currentState.pellets) {
    context.beginPath();
    context.arc(pellet.x - cameraX, pellet.y, pellet.radius, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = "#fff8d7";
  context.font = "20px Arial";
  context.fillText(`Mode: ${currentState.mode}`, 28, 38);
  context.fillText(`Ammo: ${player.ammo}/${player.magazineSize}${player.reloading ? " Reloading" : ""}`, 28, 66);
  context.fillText(`Stock: ${player.stockTimer > 0 ? "active" : "ready"}`, 28, 94);
}

function start(mode) {
  state = createGameState(mode);
  menu.classList.add("hidden");
  hud.innerHTML = `<span>Mode: ${mode}</span><span>Ammo: ${state.player.ammo}/${state.player.magazineSize}</span>`;
}

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (state) {
    const pressed = consumePressed(input);
    const frameInput = {
      left: input.left,
      right: input.right,
      jump: input.jump,
      aim: getAimDirection(state),
      shootPressed: pressed.shootPressed,
      stockPressed: pressed.stockPressed,
    };

    updateGame(state, frameInput, dt);
    hud.innerHTML = `<span>Mode: ${state.mode}</span><span>Ammo: ${state.player.ammo}/${state.player.magazineSize}</span>`;
  }

  drawPlaceholder(state);
  requestAnimationFrame(frame);
}

document.querySelector("#levelMode").addEventListener("click", () => start("level"));
document.querySelector("#endlessMode").addEventListener("click", () => start("endless"));
requestAnimationFrame(frame);
