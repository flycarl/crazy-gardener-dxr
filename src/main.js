import { createGameState } from "./core/state.js";
import { advanceToNextLevel, choosePostBossWeapon, configureBalloonLevel, configureEndlessMode, configureLevel, createEnemy, recordHighScore, restartChallenge, spawnLevelEnemies, updateGame } from "./core/systems.js";
import { consumePressed, createInput } from "./input.js";
import { captureAudioState, createSoundPlayer } from "./audio.js";
import { drawGame } from "./render.js";
import { createMultiplayerClient } from "./multiplayer.js";

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
const createDuelRoomButton = document.querySelector("#createDuelRoom");
const createCoopRoomButton = document.querySelector("#createCoopRoom");
const joinRoomButton = document.querySelector("#joinRoomButton");
const playerNameInput = document.querySelector("#playerNameInput");
const roomCodeInput = document.querySelector("#roomCodeInput");
const multiplayerStatus = document.querySelector("#multiplayerStatus");
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
const cheatShieldBlocks = document.querySelector("#cheatShieldBlocks");
const cheatNormalHealth = document.querySelector("#cheatNormalHealth");
const cheatFastHealth = document.querySelector("#cheatFastHealth");
const cheatFatHealth = document.querySelector("#cheatFatHealth");
const cheatSlimeLowHealth = document.querySelector("#cheatSlimeLowHealth");
const cheatSlimeMidHealth = document.querySelector("#cheatSlimeMidHealth");
const cheatSlimeHighHealth = document.querySelector("#cheatSlimeHighHealth");
const cheatBalloonHealth = document.querySelector("#cheatBalloonHealth");
const cheatTankBossHealth = document.querySelector("#cheatTankBossHealth");
const cheatRangedBossHealth = document.querySelector("#cheatRangedBossHealth");
const cheatBossAddSeconds = document.querySelector("#cheatBossAddSeconds");
const cheatBossAddCount = document.querySelector("#cheatBossAddCount");
const cheatTankChargeSeconds = document.querySelector("#cheatTankChargeSeconds");
const cheatTankEnragedChargeSeconds = document.querySelector("#cheatTankEnragedChargeSeconds");
const cheatRangedBossCooldown = document.querySelector("#cheatRangedBossCooldown");
const cheatRangedBossShots = document.querySelector("#cheatRangedBossShots");
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
const PLAYER_NAME_KEY = "crazyGardenerPlayerName";

let state = null;
let lastTime = performance.now();
let selectedWeapon = "shotgun";
let selectedRifleMode = "single";
let highScore = Number(localStorage.getItem("crazyGardenerHighScore") ?? 0);
let savedLevel = Math.max(1, Number(localStorage.getItem(LEVEL_PROGRESS_KEY) ?? 1) || 1);
let playerName = localStorage.getItem(PLAYER_NAME_KEY) || "";
let selectedCheats = {
  enabled: false,
  invincible: false,
  infiniteAmmo: false,
  damageMultiplier: 1,
  speedMultiplier: 1,
  jumpMultiplier: 1,
  shieldRifleBlocks: 3,
  normalHealthMultiplier: 1,
  fastHealthMultiplier: 1,
  fatHealthMultiplier: 1,
  slimeLowHealthMultiplier: 1,
  slimeMidHealthMultiplier: 1,
  slimeHighHealthMultiplier: 1,
  balloonHealthMultiplier: 1,
  tankBossHealthMultiplier: 1,
  rangedBossHealthMultiplier: 1,
  bossAddSeconds: 5,
  bossAddCount: 1,
  tankChargeSeconds: 7,
  tankEnragedChargeSeconds: 5,
  rangedBossCooldownSeconds: 2.8,
  rangedBossShotMultiplier: 1,
};
let paused = false;
let cheatAppliedSinceOpen = false;
let cheatHealthSetSinceOpen = false;
let remoteInputPacket = null;
let snapshotTimer = 0;

const multiplayer = createMultiplayerClient({
  onStatus: (message) => {
    if (multiplayerStatus) multiplayerStatus.textContent = `联机：${message}`;
  },
  onRoomCode: (roomCode) => {
    if (roomCodeInput) roomCodeInput.value = roomCode;
  },
  onGuestInput: (packet) => {
    remoteInputPacket = packet;
  },
  onSnapshot: (snapshot) => {
    state = snapshot;
    paused = false;
    menu.classList.add("hidden");
    pauseMenuButton.classList.remove("hidden");
  },
  onStart: ({ role, mode }) => {
    if (role === "host") {
      startMultiplayerHost(mode);
    }
  },
  onPeerName: ({ localName, remoteName }) => {
    if (!state?.multiplayer) return;
    if (state.multiplayer.role === "host") {
      state.multiplayer.hostName = localName;
      state.multiplayer.guestName = remoteName;
      if (state.remotePlayers?.[0]) state.remotePlayers[0].name = remoteName;
    } else {
      state.multiplayer.hostName = remoteName;
      state.multiplayer.guestName = localName;
    }
  },
});

if (playerNameInput) playerNameInput.value = playerName;

function getPlayerName() {
  const rawName = (playerNameInput?.value ?? playerName).trim();
  const cleanName = rawName.slice(0, 14) || `玩家${Math.floor(1000 + Math.random() * 9000)}`;
  playerName = cleanName;
  if (playerNameInput) playerNameInput.value = cleanName;
  localStorage.setItem(PLAYER_NAME_KEY, cleanName);
  return cleanName;
}

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

function startMultiplayerHost(mode) {
  sound.unlock();
  sound.play("ui");
  const hostName = getPlayerName();
  const previousGuestName = state?.multiplayer?.guestName || state?.remotePlayers?.[0]?.name || "玩家2";
  const gameMode = mode === "coop" ? "endless" : "duel";
  state = createGameState(gameMode === "duel" ? "level" : gameMode, selectedWeapon, selectedRifleMode);
  state.mode = gameMode;
  state.highScore = highScore;
  state.cheats = { ...selectedCheats, enabled: false, invincible: false, infiniteAmmo: false };
  state.multiplayer = { role: "host", mode, connected: true, hostName, guestName: previousGuestName };
  state.killFeed = [];
  state.remotePlayers = [
    {
      id: "guest",
      name: previousGuestName,
      x: state.player.x + 120,
      y: state.player.y,
      vx: 0,
      vy: 0,
      w: state.player.w,
      h: state.player.h,
      facing: -1,
      health: state.player.maxHealth,
      maxHealth: state.player.maxHealth,
      shotCooldown: 0,
      color: "#6ec6ff",
    },
  ];
  state.remoteShots = [];

  if (mode === "coop") {
    configureEndlessMode(state);
  } else {
    state.enemies = [];
    state.requiredKills = Infinity;
    state.extraction.active = false;
  }

  menu.classList.add("hidden");
  nextLevelPanel.classList.add("hidden");
  failurePanel.classList.add("hidden");
  pausePanel.classList.add("hidden");
  cheatPanel.classList.add("hidden");
  pauseMenuButton.classList.remove("hidden");
  paused = false;
}

function addKillReport(currentState, killerName, victimName) {
  const text = `${killerName} 击杀了 ${victimName}`;
  currentState.killFeed = [{ text, life: 4, side: "right" }, ...(currentState.killFeed ?? []).slice(0, 3)];
  currentState.multiplayer ??= {};
  currentState.multiplayer.killMessage = text;
  currentState.status = "gameover";
}

function updateRemoteAvatar(currentState, packet, dt) {
  if (!currentState?.remotePlayers?.length || !packet?.input) return;
  const avatar = currentState.remotePlayers[0];
  const remote = packet.input;
  const speed = 390;
  avatar.vx = remote.left ? -speed : remote.right ? speed : 0;
  avatar.facing = avatar.vx < 0 ? -1 : avatar.vx > 0 ? 1 : avatar.facing || 1;
  avatar.shotCooldown = Math.max(0, (avatar.shotCooldown ?? 0) - dt);

  if (remote.jumpPressed && avatar.onGround !== false) {
    avatar.vy = -820;
    avatar.onGround = false;
  }

  avatar.vy = Math.min(1300, (avatar.vy ?? 0) + 2200 * dt);
  avatar.x = Math.max(0, Math.min(3600 - avatar.w, avatar.x + avatar.vx * dt));
  avatar.y += avatar.vy * dt;
  if (avatar.y + avatar.h >= 590) {
    avatar.y = 590 - avatar.h;
    avatar.vy = 0;
    avatar.onGround = true;
  }

  if (remote.shootPressed && avatar.shotCooldown === 0) {
    const centerX = avatar.x + avatar.w / 2;
    const centerY = avatar.y + avatar.h / 2;
    const dx = packet.aim?.x ?? avatar.facing;
    const dy = packet.aim?.y ?? 0;
    const length = Math.hypot(dx, dy) || 1;
    currentState.remoteShots ??= [];
    currentState.remoteShots.push({
      x: centerX,
      y: centerY,
      vx: (dx / length) * 980,
      vy: (dy / length) * 980,
      life: 1.4,
      w: 8,
      h: 8,
      damage: currentState.multiplayer?.mode === "coop" ? 14 : 10,
    });
    avatar.shotCooldown = 0.22;
  }
}

function updateRemoteShots(currentState, dt) {
  if (!currentState?.remoteShots?.length) return;
  const remaining = [];

  for (const shot of currentState.remoteShots) {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    let keep = shot.life > 0 && shot.x >= 0 && shot.x <= 3600 && shot.y >= 0 && shot.y <= 720;

    if (keep && currentState.multiplayer?.mode === "coop") {
      const enemy = currentState.enemies.find((target) => target.health > 0 && shot.x >= target.x && shot.x <= target.x + target.w && shot.y >= target.y && shot.y <= target.y + target.h);
      if (enemy) {
        enemy.health = Math.max(0, enemy.health - shot.damage);
        keep = false;
      }
    }

    if (keep && currentState.multiplayer?.mode === "duel") {
      const player = currentState.player;
      if (shot.x >= player.x && shot.x <= player.x + player.w && shot.y >= player.y && shot.y <= player.y + player.h) {
        player.health = Math.max(0, player.health - shot.damage);
        if (player.health === 0) {
          addKillReport(
            currentState,
            currentState.multiplayer.guestName ?? "玩家2",
            currentState.multiplayer.hostName ?? "房主",
          );
        }
        keep = false;
      }
    }

    if (keep) remaining.push(shot);
  }

  currentState.remoteShots = remaining;
}

function updateHostShotsAgainstRemote(currentState) {
  if (currentState?.multiplayer?.mode !== "duel" || currentState.status !== "playing") return;
  const remotePlayer = currentState.remotePlayers?.[0];
  if (!remotePlayer || remotePlayer.health <= 0) return;

  for (const pellet of currentState.pellets) {
    if (pellet.life <= 0) continue;
    const hit =
      pellet.x >= remotePlayer.x &&
      pellet.x <= remotePlayer.x + remotePlayer.w &&
      pellet.y >= remotePlayer.y &&
      pellet.y <= remotePlayer.y + remotePlayer.h;
    if (!hit) continue;

    remotePlayer.health = Math.max(0, remotePlayer.health - (pellet.damage ?? 10));
    pellet.life = 0;
    if (remotePlayer.health === 0) {
      addKillReport(
        currentState,
        currentState.multiplayer.hostName ?? "房主",
        currentState.multiplayer.guestName ?? remotePlayer.name ?? "玩家2",
      );
      break;
    }
  }
}

function updateKillFeed(currentState, dt) {
  if (!currentState?.killFeed?.length) return;
  for (const report of currentState.killFeed) {
    report.life -= dt;
  }
  currentState.killFeed = currentState.killFeed.filter((report) => report.life > 0);
}

function captureGuestInput(pressed) {
  return {
    input: {
      left: input.left,
      right: input.right,
      jumpPressed: pressed.jumpPressed,
      shootPressed: pressed.shootPressed,
    },
    aim: input.aim,
  };
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
  if (state?.multiplayer?.connected) {
    if (multiplayerStatus) multiplayerStatus.textContent = "联机：联机模式不能开作弊。";
    if (cheatEnabled) cheatEnabled.checked = false;
    cheatReminder?.classList.add("hidden");
    return;
  }

  cheatReminder?.classList.add("hidden");
  selectedCheats = {
    enabled: Boolean(cheatEnabled?.checked),
    invincible: Boolean(cheatInvincible?.checked),
    infiniteAmmo: Boolean(cheatInfiniteAmmo?.checked),
    damageMultiplier: readNumber(cheatDamage, 1, 0.1, 20),
    speedMultiplier: readNumber(cheatSpeed, 1, 0.1, 5),
    jumpMultiplier: readNumber(cheatJump, 1, 0.1, 5),
    shieldRifleBlocks: Math.round(readNumber(cheatShieldBlocks, 3, 1, 30)),
    normalHealthMultiplier: readNumber(cheatNormalHealth, 1, 0.1, 20),
    fastHealthMultiplier: readNumber(cheatFastHealth, 1, 0.1, 20),
    fatHealthMultiplier: readNumber(cheatFatHealth, 1, 0.1, 20),
    slimeLowHealthMultiplier: readNumber(cheatSlimeLowHealth, 1, 0.1, 20),
    slimeMidHealthMultiplier: readNumber(cheatSlimeMidHealth, 1, 0.1, 20),
    slimeHighHealthMultiplier: readNumber(cheatSlimeHighHealth, 1, 0.1, 20),
    balloonHealthMultiplier: readNumber(cheatBalloonHealth, 1, 0.1, 20),
    tankBossHealthMultiplier: readNumber(cheatTankBossHealth, 1, 0.1, 20),
    rangedBossHealthMultiplier: readNumber(cheatRangedBossHealth, 1, 0.1, 20),
    bossAddSeconds: readNumber(cheatBossAddSeconds, 5, 0.2, 30),
    bossAddCount: Math.round(readNumber(cheatBossAddCount, 1, 1, 10)),
    tankChargeSeconds: readNumber(cheatTankChargeSeconds, 7, 0.5, 30),
    tankEnragedChargeSeconds: readNumber(cheatTankEnragedChargeSeconds, 5, 0.5, 30),
    rangedBossCooldownSeconds: readNumber(cheatRangedBossCooldown, 2.8, 0.2, 30),
    rangedBossShotMultiplier: readNumber(cheatRangedBossShots, 1, 0.25, 10),
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
  if (cheatShieldBlocks) cheatShieldBlocks.value = String(cheats.shieldRifleBlocks ?? 3);
  if (cheatNormalHealth) cheatNormalHealth.value = String(cheats.normalHealthMultiplier ?? 1);
  if (cheatFastHealth) cheatFastHealth.value = String(cheats.fastHealthMultiplier ?? 1);
  if (cheatFatHealth) cheatFatHealth.value = String(cheats.fatHealthMultiplier ?? 1);
  if (cheatSlimeLowHealth) cheatSlimeLowHealth.value = String(cheats.slimeLowHealthMultiplier ?? 1);
  if (cheatSlimeMidHealth) cheatSlimeMidHealth.value = String(cheats.slimeMidHealthMultiplier ?? 1);
  if (cheatSlimeHighHealth) cheatSlimeHighHealth.value = String(cheats.slimeHighHealthMultiplier ?? 1);
  if (cheatBalloonHealth) cheatBalloonHealth.value = String(cheats.balloonHealthMultiplier ?? 1);
  if (cheatTankBossHealth) cheatTankBossHealth.value = String(cheats.tankBossHealthMultiplier ?? 1);
  if (cheatRangedBossHealth) cheatRangedBossHealth.value = String(cheats.rangedBossHealthMultiplier ?? 1);
  if (cheatBossAddSeconds) cheatBossAddSeconds.value = String(cheats.bossAddSeconds ?? 5);
  if (cheatBossAddCount) cheatBossAddCount.value = String(cheats.bossAddCount ?? 1);
  if (cheatTankChargeSeconds) cheatTankChargeSeconds.value = String(cheats.tankChargeSeconds ?? 7);
  if (cheatTankEnragedChargeSeconds) cheatTankEnragedChargeSeconds.value = String(cheats.tankEnragedChargeSeconds ?? 5);
  if (cheatRangedBossCooldown) cheatRangedBossCooldown.value = String(cheats.rangedBossCooldownSeconds ?? 2.8);
  if (cheatRangedBossShots) cheatRangedBossShots.value = String(cheats.rangedBossShotMultiplier ?? 1);
  if (cheatHealth) cheatHealth.value = String(Math.ceil(state?.player?.health ?? 100));
  if (cheatLevel) cheatLevel.value = String(state?.mode === "level" ? state.level : savedLevel);
}

function openCheatPanel() {
  sound.unlock();
  sound.play("ui");
  if (state?.multiplayer?.connected) {
    if (multiplayerStatus) multiplayerStatus.textContent = "联机：联机模式不能开作弊。";
    cheatPanel.classList.add("hidden");
    return;
  }
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
  const enemy = createEnemy(type, x, undefined, state.cheats);
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
  state.pendingBossTypes = [];
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

  failureTitle.textContent = state.multiplayer?.killMessage ?? (state.mode === "balloon" ? "时间到了！" : "戴夫倒下了");
  retryButton.textContent = state.multiplayer?.connected
    ? multiplayer.getRole() === "host"
      ? "重开房间"
      : "等待房主重开"
    : state.mode === "endless"
      ? "从零开始"
      : "重来本关";
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
  multiplayer.close();
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
    if (multiplayer.getRole() === "guest") {
      multiplayer.sendGuestInput(captureGuestInput(pressed));
      updatePanels();
      drawGame(context, canvas, state, input);
      requestAnimationFrame(frame);
      return;
    }

    if (!paused && !state.awaitingForcedShotgunNotice) {
      const audioBefore = captureAudioState(state);
      const statusBefore = state.status;
      updateGame(state, input, pressed, dt);
      if (statusBefore !== "gameover" && state.status === "gameover" && state.multiplayer?.connected && !state.multiplayer.killMessage) {
        addKillReport(state, "僵尸", state.multiplayer.hostName ?? "房主");
      }
      updateRemoteAvatar(state, remoteInputPacket, dt);
      updateRemoteShots(state, dt);
      updateHostShotsAgainstRemote(state);
      updateKillFeed(state, dt);
      sound.playFromStateChange(audioBefore, state);
      saveHighScore();
    }
    if (multiplayer.getRole() === "host") {
      snapshotTimer += dt;
      if (snapshotTimer >= 1 / 20) {
        snapshotTimer = 0;
        multiplayer.sendSnapshot(state);
      }
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
createDuelRoomButton?.addEventListener("click", () => {
  sound.unlock();
  sound.play("ui");
  multiplayer.createRoom("duel", getPlayerName());
});
createCoopRoomButton?.addEventListener("click", () => {
  sound.unlock();
  sound.play("ui");
  multiplayer.createRoom("coop", getPlayerName());
});
joinRoomButton?.addEventListener("click", () => {
  sound.unlock();
  sound.play("ui");
  multiplayer.joinRoom(roomCodeInput?.value ?? "", getPlayerName());
});
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
    if (state.multiplayer?.connected) {
      if (multiplayer.getRole() === "host") {
        startMultiplayerHost(multiplayer.getMode());
      } else if (multiplayerStatus) {
        multiplayerStatus.textContent = "联机：请让房主点击重来。";
      }
      updatePanels();
      return;
    }
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
