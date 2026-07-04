import { SHOTGUN } from "./core/constants.js";

const LEFT_KEYS = new Set(["KeyA", "ArrowLeft"]);
const RIGHT_KEYS = new Set(["KeyD", "ArrowRight"]);
const JUMP_KEYS = new Set(["Space", "KeyW", "ArrowUp"]);

const COMBO_WINDOW_MS = SHOTGUN.doubleShotWindowSeconds * 1000;

function updateMouse(input, canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  input.mouse.x = (event.clientX - rect.left) * scaleX;
  input.mouse.y = (event.clientY - rect.top) * scaleY;
}

export function createInput(canvas) {
  const jumpHeld = new Set();
  const input = {
    left: false,
    right: false,
    jumpPressed: false,
    shootPressed: false,
    stockPressed: false,
    doubleShotPressed: false,
    lastShootPressedAt: -Infinity,
    lastStockPressedAt: -Infinity,
    mouse: { x: canvas.width / 2, y: canvas.height / 2, worldX: canvas.width / 2, worldY: canvas.height / 2 },
  };

  window.addEventListener("keydown", (event) => {
    if (LEFT_KEYS.has(event.code)) input.left = true;
    if (RIGHT_KEYS.has(event.code)) input.right = true;

    if (JUMP_KEYS.has(event.code) && !jumpHeld.has(event.code)) {
      if (jumpHeld.size === 0) input.jumpPressed = true;
      jumpHeld.add(event.code);
    }
  });

  window.addEventListener("keyup", (event) => {
    if (LEFT_KEYS.has(event.code)) input.left = false;
    if (RIGHT_KEYS.has(event.code)) input.right = false;
    if (JUMP_KEYS.has(event.code)) jumpHeld.delete(event.code);
  });

  canvas.addEventListener("pointermove", (event) => updateMouse(input, canvas, event));
  canvas.addEventListener("pointerdown", (event) => {
    updateMouse(input, canvas, event);

    const now = performance.now();

    if (event.button === 0) {
      input.shootPressed = true;
      input.lastShootPressedAt = now;

      if (now - input.lastStockPressedAt <= COMBO_WINDOW_MS) {
        input.doubleShotPressed = true;
        input.shootPressed = false;
        input.stockPressed = false;
      }
    }

    if (event.button === 2) {
      input.stockPressed = true;
      input.lastStockPressedAt = now;

      if (now - input.lastShootPressedAt <= COMBO_WINDOW_MS) {
        input.doubleShotPressed = true;
        input.shootPressed = false;
        input.stockPressed = false;
      }
    }
  });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  return input;
}

export function consumePressed(input) {
  const pressed = {
    jumpPressed: input.jumpPressed,
    shootPressed: input.shootPressed,
    stockPressed: input.stockPressed,
    doubleShotPressed: input.doubleShotPressed,
  };

  if (pressed.doubleShotPressed) {
    input.lastShootPressedAt = -Infinity;
    input.lastStockPressedAt = -Infinity;
  } else {
    if (pressed.shootPressed) input.lastShootPressedAt = -Infinity;
    if (pressed.stockPressed) input.lastStockPressedAt = -Infinity;
  }

  input.jumpPressed = false;
  input.shootPressed = false;
  input.stockPressed = false;
  input.doubleShotPressed = false;

  return pressed;
}
