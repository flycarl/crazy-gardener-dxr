import { createGameState } from "./core/state.js";
import { advanceToNextLevel, choosePostBossWeapon, configureBalloonLevel, configureEndlessMode, configureLevel, createEnemy, recordHighScore, restartChallenge, spawnLevelEnemies, updateGame } from "./core/systems.js";
import { consumePressed, createInput } from "./input.js";
import { captureAudioState, createSoundPlayer } from "./audio.js";
import { drawGame } from "./render.js";

const canvas = document.querySelector("#game");
const context = canvas.getContext("2d");
const menu = document.querySelector("#menu");
const nextLevelPanel = document.querySelector("#nextLevelPanel");
const nextLevelTitle = document.querySelector(".next-level-title");
const nextLevelButton = document.querySelector("#nextLevelButton");
const postBossWeaponChoices = document.querySelector("#postBossWeaponChoices");
const postBossRifleModeChoices = document.querySelector("#postBossRifleModeChoices");
const chooseRifleButton = document.querySelector("#chooseRifleButton");
const chooseShotgunButton = document.querySelector("#chooseShotgunButton");
const chooseRifleSingleButton = document.querySelector("#chooseRifleSingleButton");
const chooseRifleAutoButton = document.querySelector("#chooseRifleAutoButton");
const failurePanel = document.querySelector("#failurePanel");
const failureTitle = document.querySelector(".failure-title");
const retryButton = document.querySelector("#retryButton");
const mainMenuButton = document.querySelector("#mainMenuButton");
const pauseMenuButton = document.querySelector("#pauseMenuButton");
const pausePanel = document.querySelector("#pausePanel");
const resumeButton = document.querySelector("#resumeButton");
const pauseMainMenuButton = document.querySelector("#pauseMainMenuButton");
const pauseCheatButton = document.querySelector("#pauseCheatButton");
const rifleToggle = document.querySelector("#rifleToggle");
const rifleFireModeToggle = document.querySelector("#rifleFireModeToggle");
const rifleModeHint = document.querySelector("#rifleModeHint");
const levelModeButton = document.querySelector("#levelMode");
const cheatMenuButton = document.querySelector("#cheatMenuButton");
const cheatPanel = document.querySelector("#cheatPanel");
const cheatEnabled = document.querySelector("#cheatEnabled");
const cheatInvincible = document.querySelector("#cheatInvincible");
const cheatInfiniteAmmo = document.querySelector("#cheatInfiniteAmmo");
const cheatDamage = document.querySelector("#cheatDamage");
const cheatSpeed = document.querySelector("#cheatSpeed");
const cheatJump = document.querySelector("#cheatJump");
const cheatHealth = document.querySelector("#cheatHealth");
const cheatLevel = document.querySelector("#cheatLevel");
const cheatReminder = document.querySelector("#cheatReminder");
const cheatApplyButton = document.querySelector("#cheatApplyButton");
const cheatHealButton = document.querySelector("#cheatHealButton");
const cheatAmmoButton = document.querySelector("#cheatAmmoButton");
const cheatLevelButton = document.querySelector("#cheatLevelButton");
const cheatSpawnNormalButton = document.querySelector("#cheatSpawnNormalButton");
const cheatSpawnFatButton = document.querySelector("#cheatSpawnFatButton");
const cheatSpawnSlimeButton = document.querySelector("#cheatSpawnSlimeButton");
const cheatClearButton = document.querySelector("#cheatClearButton");
const cheatCloseButton = document.querySelector("#cheatCloseButton");
const input = createInput(canvas);
const sound = createSoundPlayer();

const LEVEL_PROGRESS_KEY = "crazyGardenerLevelProgress";

let state = null;
let lastTime = performance.now();
let selectedWeapon = "shotgun";
let selectedRifleMode = "single";
let highScore = Number(localStorage.getItem("crazyGardenerHighScore") ?? 0);
let savedLevel = Math.max(1, Number(localStorage.getItem(LEVEL_PROGRESS_KEY) ?? 1) || 1);
let selectedCheats = {
  enabled: false,
  invincible: false,
  infiniteAmmo: false,
  damageMultiplier: 1,
  speedMultiplier: 1,
  jumpMultiplier: 1,
};
let paused = false;
let cheatAppliedSinceOpen = false;
let cheatHealthSetSinceOpen = false;

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
  sound.unlock();
  sound.play("ui");
  state = createGameState(mode, selectedWeapon, selectedRifleMode);
  state.highScore = highScore;
  state.cheats = { ...selectedCheats };

  if (mode === "balloon") {
    configureBalloonLevel(state, 1);
  } else if (mode === "level") {
    configureLevel(state, savedLevel);
    spawnLevelEnemies(state);
  } else {
    configureEndlessMode(state);
  }

  menu.classList.add("hidden");
  nextLevelPanel.classList.add("hidden");
  failurePanel.classList.add("hidden");
  pausePanel.classList.add("hidden");
  cheatPanel.classList.add("hidden");
  pauseMenuButton.classList.remove("hidden");
  pauseMenuButton.setAttribute("aria-expanded", "false");
  paused = false;
}

function saveLevelProgress(level) {
  savedLevel = Math.max(1, Number(level) || 1);
  localStorage.setItem(LEVEL_PROGRESS_KEY, String(savedLevel));
  updateLevelModeButton();
}

function saveCurrentLevelProgress() {
  if (state?.mode !== "level") return;
  saveLevelProgress(state.awaitingNextLevel ? state.nextLevel : state.level);
}

function readNumber(inputElement, fallback, min, max) {
  const value = Number(inputElement?.value ?? fallback);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function applyCheatSettings() {
  cheatReminder?.classList.add("hidden");
  selectedCheats = {
    enabled: Boolean(cheatEnabled?.checked),
    invincible: Boolean(cheatInvincible?.checked),
    infiniteAmmo: Boolean(cheatInfiniteAmmo?.checked),
    damageMultiplier: readNumber(cheatDamage, 1, 0.1, 20),
    speedMultiplier: readNumber(cheatSpeed, 1, 0.1, 5),
    jumpMultiplier: readNumber(cheatJump, 1, 0.1, 5),
  };

  if (state) {
    state.cheats = { ...selectedCheats };
    if (state.cheats.enabled && state.cheats.infiniteAmmo) {
      state.player.reloading = false;
      state.player.reloadTimer = 0;
      state.player.ammo = state.player.magazineSize;
    }
  }
}

function updateCheatInputs() {
  const cheats = state?.cheats ?? selectedCheats;
  if (cheatEnabled) cheatEnabled.checked = Boolean(cheats.enabled);
  if (cheatInvincible) cheatInvincible.checked = Boolean(cheats.invincible);
  if (cheatInfiniteAmmo) cheatInfiniteAmmo.checked = Boolean(cheats.infiniteAmmo);
  if (cheatDamage) cheatDamage.value = String(cheats.damageMultiplier ?? 1);
  if (cheatSpeed) cheatSpeed.value = String(cheats.speedMultiplier ?? 1);
  if (cheatJump) cheatJump.value = String(cheats.jumpMultiplier ?? 1);
  if (cheatHealth) cheatHealth.value = String(Math.ceil(state?.player?.health ?? 100));
  if (cheatLevel) cheatLevel.value = String(state?.mode === "level" ? state.level : savedLevel);
}

function openCheatPanel() {
  sound.unlock();
  sound.play("ui");
  cheatAppliedSinceOpen = false;
  cheatHealthSetSinceOpen = false;
  cheatReminder?.classList.add("hidden");
  updateCheatInputs();
  cheatPanel.classList.remove("hidden");
  if (state?.status === "playing") {
    paused = true;
    pausePanel.classList.add("hidden");
    pauseMenuButton.setAttribute("aria-expanded", "true");
  }
}

function closeCheatPanel() {
  sound.play("ui");
  if (!cheatAppliedSinceOpen || !cheatHealthSetSinceOpen) {
    cheatReminder?.classList.remove("hidden");
    return;
  }

  cheatPanel.classList.add("hidden");
  if (state?.status === "playing") {
    paused = false;
  }
  pauseMenuButton.setAttribute("aria-expanded", "false");
}

function setCheatHealth() {
  cheatHealthSetSinceOpen = true;
  cheatReminder?.classList.add("hidden");
  if (!state) return;
  const health = readNumber(cheatHealth, state.player.health, 1, 999);
  state.player.maxHealth = Math.max(state.player.maxHealth, health);
  state.player.health = health;
  state.player.regenDelay = 0;
  state.player.regenTimer = 0;
  state.player.regenStartHealth = health;
}

function refillCheatAmmo() {
  if (!state) return;
  state.player.reloading = false;
  state.player.reloadTimer = 0;
  state.player.ammo = state.player.magazineSize;
}

function jumpToCheatLevel() {
  const level = Math.round(readNumber(cheatLevel, savedLevel, 1, 100));
  saveLevelProgress(level);
  if (!state || state.mode !== "level") return;
  configureLevel(state, level);
  state.cheats = { ...selectedCheats };
  spawnLevelEnemies(state);
  updatePanels();
}

function spawnCheatEnemy(type) {
  if (!state) return;
  const x = Math.min(state.player.x + 560, 3380);
  const enemy = createEnemy(type, x);
  state.enemies.push(enemy);
  state.enemiesRemaining = state.enemies.length;
}

function clearCheatEnemies() {
  if (!state) return;
  state.enemies = [];
  state.enemyProjectiles = [];
  state.pellets = [];
  state.bossAlive = false;
  state.pendingBoss = false;
  state.enemiesRemaining = 0;
  if (state.mode === "level" || state.mode === "balloon") {
    state.kills = Math.max(state.kills, state.requiredKills);
  }
}

function updateNextLevelPanel() {
  if (state?.status === "victory") {
    nextLevelTitle.textContent = "全部通关！";
    nextLevelButton.textContent = "主菜单";
    nextLevelButton.disabled = false;
    postBossWeaponChoices.classList.add("hidden");
    postBossRifleModeChoices.classList.add("hidden");
    nextLevelPanel.classList.remove("hidden");
    return;
  }

  if (state?.awaitingForcedShotgunNotice) {
    nextLevelTitle.textContent = "Boss关：强制霰弹枪";
    nextLevelButton.textContent = "知道了";
    nextLevelButton.disabled = false;
    nextLevelButton.classList.remove("hidden");
    postBossWeaponChoices.classList.add("hidden");
    postBossRifleModeChoices.classList.add("hidden");
    nextLevelPanel.classList.remove("hidden");
    return;
  }

  if (state?.awaitingWeaponChoice) {
    nextLevelTitle.textContent = "Boss 已击败！选择下一关武器";
    nextLevelButton.classList.add("hidden");
    postBossWeaponChoices.classList.remove("hidden");
    if (!postBossRifleModeChoices.dataset.choosing) {
      postBossRifleModeChoices.classList.add("hidden");
    }
    nextLevelPanel.classList.remove("hidden");
    return;
  }

  if (!state || !state.awaitingNextLevel) {
    nextLevelPanel.classList.add("hidden");
    return;
  }

  nextLevelTitle.textContent = "通关！";
  nextLevelButton.textContent = "下一关";
  nextLevelButton.disabled = false;
  nextLevelButton.classList.remove("hidden");
  postBossWeaponChoices.classList.add("hidden");
  postBossRifleModeChoices.classList.add("hidden");
  delete postBossRifleModeChoices.dataset.choosing;
  nextLevelPanel.classList.remove("hidden");
}

function updateFailurePanel() {
  if (!state || state.status !== "gameover") {
    failurePanel.classList.add("hidden");
    return;
  }

  failureTitle.textContent = state.mode === "balloon" ? "时间到了！" : "戴夫倒下了";
  retryButton.textContent = state.mode === "endless" ? "从零开始" : "重来本关";
  failurePanel.classList.remove("hidden");
}

function updatePanels() {
  updateNextLevelPanel();
  updateFailurePanel();
  pauseMenuButton.classList.toggle("hidden", !state || state.status === "gameover" || state.status === "victory");
  if (!state || state.status === "gameover" || state.status === "victory" || state.awaitingNextLevel || state.awaitingWeaponChoice || state.awaitingForcedShotgunNotice) {
    paused = false;
    pausePanel.classList.add("hidden");
    pauseMenuButton.setAttribute("aria-expanded", "false");
  }
}

function returnToMenu() {
  sound.play("ui");
  saveCurrentLevelProgress();
  state = null;
  paused = false;
  menu.classList.remove("hidden");
  nextLevelPanel.classList.add("hidden");
  nextLevelButton.classList.remove("hidden");
  postBossWeaponChoices.classList.add("hidden");
  postBossRifleModeChoices.classList.add("hidden");
  delete postBossRifleModeChoices.dataset.choosing;
  failurePanel.classList.add("hidden");
  pausePanel.classList.add("hidden");
  cheatPanel.classList.add("hidden");
  pauseMenuButton.classList.add("hidden");
  pauseMenuButton.setAttribute("aria-expanded", "false");
}

function openPauseMenu() {
  if (!state || state.status !== "playing") return;
  sound.play("ui");
  paused = true;
  pausePanel.classList.remove("hidden");
  pauseMenuButton.setAttribute("aria-expanded", "true");
}

function closePauseMenu() {
  sound.play("ui");
  paused = false;
  pausePanel.classList.add("hidden");
  pauseMenuButton.setAttribute("aria-expanded", "false");
}

function updateRifleToggle() {
  rifleToggle.textContent = selectedWeapon === "rifle" ? "步枪模式：开" : "步枪模式：关";
  rifleFireModeToggle.hidden = selectedWeapon !== "rifle";
  rifleModeHint.hidden = selectedWeapon !== "rifle";
  rifleFireModeToggle.textContent = selectedRifleMode === "auto" ? "步枪射击：连发" : "步枪射击：单发";
  rifleModeHint.textContent = selectedRifleMode === "auto" ? "连发伤害低一些，但速度更快。" : "单发伤害更高。";
}

function updateLevelModeButton() {
  if (!levelModeButton) return;
  levelModeButton.textContent = savedLevel > 1 ? `关卡模式：第 ${savedLevel} 关` : "关卡模式";
}

function saveHighScore() {
  if (!state) return;
  highScore = recordHighScore(state, highScore);
  localStorage.setItem("crazyGardenerHighScore", String(highScore));
}

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (state) {
    input.mouse.worldX = state.cameraX + input.mouse.x;
    input.mouse.worldY = (state.cameraY ?? 0) + input.mouse.y;
    input.aim = getAimDirection(state);

    const pressed = consumePressed(input);

    if (!paused && !state.awaitingForcedShotgunNotice) {
      const audioBefore = captureAudioState(state);
      updateGame(state, input, pressed, dt);
      sound.playFromStateChange(audioBefore, state);
      saveHighScore();
    }
    updatePanels();
    sound.updateAmbient(state, paused);
  }

  drawGame(context, canvas, state, input);
  requestAnimationFrame(frame);
}

levelModeButton?.addEventListener("click", () => start("level"));
document.querySelector("#endlessMode")?.addEventListener("click", () => start("endless"));
document.querySelector("#balloonMode")?.addEventListener("click", () => start("balloon"));
rifleToggle.addEventListener("click", () => {
  sound.unlock();
  sound.play("ui");
  selectedWeapon = selectedWeapon === "rifle" ? "shotgun" : "rifle";
  updateRifleToggle();
});
chooseRifleButton.addEventListener("click", () => {
  sound.unlock();
  sound.play("ui");
  if (state) {
    nextLevelTitle.textContent = "选择步枪射击方式";
    postBossRifleModeChoices.dataset.choosing = "true";
    postBossRifleModeChoices.classList.remove("hidden");
  }
});
chooseShotgunButton.addEventListener("click", () => {
  sound.unlock();
  sound.play("ui");
  if (state) {
    choosePostBossWeapon(state, "shotgun");
    selectedWeapon = "shotgun";
    updateRifleToggle();
    updatePanels();
  }
});
chooseRifleSingleButton.addEventListener("click", () => {
  sound.unlock();
  sound.play("ui");
  if (state) {
    choosePostBossWeapon(state, "rifle", "single");
    selectedWeapon = "rifle";
    selectedRifleMode = "single";
    postBossRifleModeChoices.classList.add("hidden");
    delete postBossRifleModeChoices.dataset.choosing;
    updateRifleToggle();
    updatePanels();
  }
});
chooseRifleAutoButton.addEventListener("click", () => {
  sound.unlock();
  sound.play("ui");
  if (state) {
    choosePostBossWeapon(state, "rifle", "auto");
    selectedWeapon = "rifle";
    selectedRifleMode = "auto";
    postBossRifleModeChoices.classList.add("hidden");
    delete postBossRifleModeChoices.dataset.choosing;
    updateRifleToggle();
    updatePanels();
  }
});
rifleFireModeToggle.addEventListener("click", () => {
  sound.unlock();
  sound.play("ui");
  selectedRifleMode = selectedRifleMode === "auto" ? "single" : "auto";
  updateRifleToggle();
});
nextLevelButton.addEventListener("click", () => {
  sound.unlock();
  sound.play("ui");
  if (state) {
    if (state.awaitingForcedShotgunNotice) {
      state.awaitingForcedShotgunNotice = false;
      updatePanels();
      return;
    }

    if (state.status === "victory") {
      returnToMenu();
      return;
    }

    const advanced = advanceToNextLevel(state);
    if (advanced && state.mode === "level" && state.status !== "victory") {
      saveLevelProgress(state.level);
    }
    updatePanels();
  }
});
retryButton.addEventListener("click", () => {
  sound.unlock();
  sound.play("ui");
  if (state) {
    restartChallenge(state);
    updatePanels();
  }
});
mainMenuButton.addEventListener("click", returnToMenu);
pauseMenuButton.addEventListener("click", () => {
  sound.unlock();
  if (paused) {
    closePauseMenu();
  } else {
    openPauseMenu();
  }
});
resumeButton.addEventListener("click", closePauseMenu);
pauseMainMenuButton.addEventListener("click", returnToMenu);
cheatMenuButton.addEventListener("click", openCheatPanel);
pauseCheatButton.addEventListener("click", openCheatPanel);
cheatApplyButton.addEventListener("click", () => {
  sound.play("ui");
  cheatAppliedSinceOpen = true;
  applyCheatSettings();
});
cheatHealButton.addEventListener("click", () => {
  sound.play("pickup");
  applyCheatSettings();
  setCheatHealth();
});
cheatAmmoButton.addEventListener("click", () => {
  sound.play("reloadReady");
  applyCheatSettings();
  refillCheatAmmo();
});
cheatLevelButton.addEventListener("click", () => {
  sound.play("clear");
  applyCheatSettings();
  jumpToCheatLevel();
});
cheatSpawnNormalButton.addEventListener("click", () => {
  sound.play("zombieGroan");
  applyCheatSettings();
  spawnCheatEnemy("normal");
});
cheatSpawnFatButton.addEventListener("click", () => {
  sound.play("shieldBlock");
  applyCheatSettings();
  spawnCheatEnemy("fat");
});
cheatSpawnSlimeButton.addEventListener("click", () => {
  sound.play("slimeHop");
  applyCheatSettings();
  spawnCheatEnemy("slimeMid");
});
cheatClearButton.addEventListener("click", () => {
  sound.play("clear");
  clearCheatEnemies();
});
cheatCloseButton.addEventListener("click", closeCheatPanel);
document.addEventListener("pointerdown", () => sound.unlock(), { once: true });
updateRifleToggle();
updateLevelModeButton();
requestAnimationFrame(frame);
