import { createGameState } from "./core/state.js";
import { createEnemy, updateGame } from "./core/systems.js";
import { consumePressed, createInput } from "./input.js";
import { drawGame } from "./render.js";

const canvas = document.querySelector("#game");
const context = canvas.getContext("2d");
const menu = document.querySelector("#menu");
const input = createInput(canvas);

let state = null;
let lastTime = performance.now();

function getAimDirection(currentState) {
  const player = currentState.player;
  const playerX = player.x + player.w / 2;
  const playerY = player.y + player.h / 2;

  return {
    x: input.mouse.worldX - playerX,
    y: input.mouse.worldY - playerY,
  };
}

function start(mode) {
  state = createGameState(mode);
  state.enemies.push(
    createEnemy("normal", 620, 520),
    createEnemy("fast", 940, 526),
    createEnemy("fat", 1280, 508),
    createEnemy("normal", 1680, 520),
  );
  menu.classList.add("hidden");
}

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (state) {
    input.mouse.worldX = state.cameraX + input.mouse.x;
    input.mouse.worldY = input.mouse.y;
    input.aim = getAimDirection(state);

    const pressed = consumePressed(input);

    updateGame(state, input, pressed, dt);
  }

  drawGame(context, canvas, state, input);
  requestAnimationFrame(frame);
}

document.querySelector("#levelMode").addEventListener("click", () => start("level"));
document.querySelector("#endlessMode").addEventListener("click", () => start("endless"));
requestAnimationFrame(frame);
