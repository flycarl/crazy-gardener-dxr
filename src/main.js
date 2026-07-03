const canvas = document.querySelector("#game");
const context = canvas.getContext("2d");
const menu = document.querySelector("#menu");
const hud = document.querySelector("#hud");

function drawPlaceholder() {
  context.fillStyle = "#79b45d";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#24351f";
  context.fillRect(0, 560, canvas.width, 160);
  context.fillStyle = "#fff8d7";
  context.font = "28px Arial";
  context.fillText("Choose a mode to start", 48, 80);
}

function start(mode) {
  menu.classList.add("hidden");
  hud.innerHTML = `<span>Mode: ${mode}</span><span>Prototype booted</span>`;
  drawPlaceholder();
}

document.querySelector("#levelMode").addEventListener("click", () => start("Level"));
document.querySelector("#endlessMode").addEventListener("click", () => start("Endless"));
drawPlaceholder();
