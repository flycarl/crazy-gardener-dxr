const LEFT_KEYS = new Set(["KeyA", "ArrowLeft"]);
const RIGHT_KEYS = new Set(["KeyD", "ArrowRight"]);
const JUMP_KEYS = new Set(["Space", "KeyW", "ArrowUp"]);

function updateMouse(input, canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  input.mouse.x = (event.clientX - rect.left) * scaleX;
  input.mouse.y = (event.clientY - rect.top) * scaleY;
}

export function createInput(canvas) {
  const input = {
    left: false,
    right: false,
    jumpPressed: false,
    shootPressed: false,
    stockPressed: false,
    mouse: { x: canvas.width / 2, y: canvas.height / 2, worldX: canvas.width / 2, worldY: canvas.height / 2 },
  };

  window.addEventListener("keydown", (event) => {
    if (LEFT_KEYS.has(event.code)) input.left = true;
    if (RIGHT_KEYS.has(event.code)) input.right = true;
    if (JUMP_KEYS.has(event.code)) input.jumpPressed = true;
  });

  window.addEventListener("keyup", (event) => {
    if (LEFT_KEYS.has(event.code)) input.left = false;
    if (RIGHT_KEYS.has(event.code)) input.right = false;
  });

  canvas.addEventListener("pointermove", (event) => updateMouse(input, canvas, event));
  canvas.addEventListener("pointerdown", (event) => {
    updateMouse(input, canvas, event);

    if (event.button === 0) input.shootPressed = true;
    if (event.button === 2) input.stockPressed = true;
  });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  return input;
}

export function consumePressed(input) {
  const pressed = {
    jumpPressed: input.jumpPressed,
    shootPressed: input.shootPressed,
    stockPressed: input.stockPressed,
  };

  input.jumpPressed = false;
  input.shootPressed = false;
  input.stockPressed = false;

  return pressed;
}
