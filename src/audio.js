const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;

function createEnvelope(context, startTime, volume, attack, duration) {
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), startTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  return gain;
}

function tone(context, output, frequency, duration, options = {}) {
  const startTime = context.currentTime + (options.delay ?? 0);
  const oscillator = context.createOscillator();
  const envelope = createEnvelope(context, startTime, options.volume ?? 0.12, options.attack ?? 0.006, duration);

  oscillator.type = options.type ?? "square";
  oscillator.frequency.setValueAtTime(frequency, startTime);
  if (options.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, startTime + duration);
  }

  oscillator.connect(envelope);
  envelope.connect(output);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.03);
}

function noise(context, output, duration, options = {}) {
  const sampleCount = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const data = buffer.getChannelData(0);

  for (let index = 0; index < sampleCount; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / sampleCount);
  }

  const startTime = context.currentTime + (options.delay ?? 0);
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const envelope = createEnvelope(context, startTime, options.volume ?? 0.12, 0.002, duration);

  filter.type = options.filterType ?? "lowpass";
  filter.frequency.setValueAtTime(options.frequency ?? 900, startTime);
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(output);
  source.start(startTime);
  source.stop(startTime + duration + 0.03);
}

function totalPowerUps(powerUps = {}) {
  return Object.values(powerUps).reduce((sum, value) => sum + value, 0);
}

function poppedBalloonCount(enemies = []) {
  return enemies.filter((enemy) => enemy.balloonPopped).length;
}

function shieldBlockCount(floatTexts = []) {
  return floatTexts.filter((floatText) => floatText.text === "防爆门挡住了").length;
}

function bossAlive(enemies = []) {
  return enemies.some((enemy) => enemy.isBoss);
}

function jumpingSlimeCount(enemies = []) {
  return enemies.filter((enemy) => enemy.isSlime && !enemy.onGround && enemy.vy < -120).length;
}

export function captureAudioState(state) {
  if (!state) return null;

  return {
    ammo: state.player.ammo,
    reloading: state.player.reloading,
    health: state.player.health,
    stockTimer: state.player.stockTimer,
    pellets: state.pellets.length,
    splatters: state.effects.filter((effect) => effect.kind === "splatter").length,
    enemyProjectiles: state.enemyProjectiles.length,
    shieldBlocks: shieldBlockCount(state.floatTexts),
    poppedBalloons: poppedBalloonCount(state.enemies),
    bossAlive: bossAlive(state.enemies),
    jumpingSlimes: jumpingSlimeCount(state.enemies),
    pickups: state.pickups.length,
    permanentPowerUps: totalPowerUps(state.permanentPowerUps),
    kills: state.kills,
    status: state.status,
    awaitingNextLevel: state.awaitingNextLevel,
    awaitingWeaponChoice: state.awaitingWeaponChoice,
  };
}

export function createSoundPlayer() {
  let context = null;
  let master = null;
  let nextMusicTime = 0;
  let musicStep = 0;
  let nextGroanTime = 0;
  const lastPlayed = new Map();

  function ensureContext() {
    if (!AudioContextClass) return null;
    if (!context) {
      context = new AudioContextClass();
      master = context.createGain();
      master.gain.value = 0.38;
      master.connect(context.destination);
    }
    return context;
  }

  function unlock() {
    const audioContext = ensureContext();
    if (audioContext?.state === "suspended") {
      audioContext.resume();
    }
  }

  function throttle(name, seconds = 0.04) {
    const audioContext = ensureContext();
    if (!audioContext) return false;

    const lastTime = lastPlayed.get(name) ?? -Infinity;
    if (audioContext.currentTime - lastTime < seconds) {
      return false;
    }

    lastPlayed.set(name, audioContext.currentTime);
    return true;
  }

  function play(name) {
    const audioContext = ensureContext();
    if (!audioContext || !master || !throttle(name, name === "hit" ? 0.035 : 0.08)) return;

    if (name === "shotgun") {
      noise(audioContext, master, 0.035, { volume: 0.42, frequency: 5200, filterType: "highpass" });
      noise(audioContext, master, 0.18, { delay: 0.012, volume: 0.28, frequency: 950 });
      noise(audioContext, master, 0.34, { delay: 0.05, volume: 0.11, frequency: 360 });
      tone(audioContext, master, 74, 0.2, { volume: 0.23, endFrequency: 38, type: "sawtooth" });
      return;
    }

    if (name === "rifle") {
      noise(audioContext, master, 0.026, { volume: 0.3, frequency: 6800, filterType: "highpass" });
      noise(audioContext, master, 0.09, { delay: 0.008, volume: 0.16, frequency: 1500 });
      tone(audioContext, master, 118, 0.1, { volume: 0.13, endFrequency: 62, type: "sawtooth" });
      return;
    }

    if (name === "pistol") {
      noise(audioContext, master, 0.03, { volume: 0.28, frequency: 5600, filterType: "highpass" });
      noise(audioContext, master, 0.105, { delay: 0.008, volume: 0.14, frequency: 1250 });
      tone(audioContext, master, 150, 0.08, { volume: 0.11, endFrequency: 82, type: "sawtooth" });
      return;
    }

    if (name === "reload") {
      tone(audioContext, master, 180, 0.05, { volume: 0.08, type: "triangle" });
      tone(audioContext, master, 260, 0.06, { delay: 0.08, volume: 0.08, type: "triangle" });
      return;
    }

    if (name === "reloadReady") {
      tone(audioContext, master, 520, 0.08, { volume: 0.08, type: "triangle" });
      return;
    }

    if (name === "stock") {
      noise(audioContext, master, 0.08, { volume: 0.1, frequency: 680 });
      tone(audioContext, master, 180, 0.08, { volume: 0.06, endFrequency: 120, type: "triangle" });
      return;
    }

    if (name === "stockHit") {
      noise(audioContext, master, 0.12, { volume: 0.21, frequency: 260 });
      tone(audioContext, master, 88, 0.18, { volume: 0.2, endFrequency: 54, type: "sine" });
      noise(audioContext, master, 0.055, { delay: 0.035, volume: 0.08, frequency: 900 });
      return;
    }

    if (name === "hit") {
      tone(audioContext, master, 360, 0.045, { volume: 0.07, endFrequency: 180, type: "sawtooth" });
      noise(audioContext, master, 0.052, { volume: 0.09, frequency: 700 });
      return;
    }

    if (name === "balloonPop") {
      noise(audioContext, master, 0.035, { volume: 0.22, frequency: 3600, filterType: "highpass" });
      tone(audioContext, master, 620, 0.055, { volume: 0.08, endFrequency: 360, type: "triangle" });
      return;
    }

    if (name === "zombieGroan") {
      tone(audioContext, master, 55, 1.12, { volume: 0.08, endFrequency: 39, type: "sawtooth", attack: 0.16 });
      tone(audioContext, master, 73, 0.95, { delay: 0.08, volume: 0.055, endFrequency: 51, type: "sawtooth", attack: 0.18 });
      tone(audioContext, master, 42, 0.78, { delay: 0.26, volume: 0.05, endFrequency: 36, type: "sine", attack: 0.1 });
      noise(audioContext, master, 0.92, { delay: 0.04, volume: 0.06, frequency: 170 });
      return;
    }

    if (name === "slimeHop") {
      tone(audioContext, master, 180, 0.08, { volume: 0.08, endFrequency: 420, type: "sine", attack: 0.003 });
      tone(audioContext, master, 360, 0.1, { delay: 0.025, volume: 0.055, endFrequency: 520, type: "triangle", attack: 0.004 });
      noise(audioContext, master, 0.035, { volume: 0.035, frequency: 420 });
      return;
    }

    if (name === "musicLead") {
      tone(audioContext, master, 440, 0.12, { volume: 0.035, type: "triangle", attack: 0.02 });
      return;
    }

    if (name === "musicBass") {
      tone(audioContext, master, 110, 0.16, { volume: 0.038, type: "sine", attack: 0.02 });
      return;
    }

    if (name === "hurt") {
      tone(audioContext, master, 140, 0.16, { volume: 0.13, endFrequency: 70, type: "sawtooth" });
      return;
    }

    if (name === "playerProjectileHit") {
      tone(audioContext, master, 330, 0.05, { volume: 0.08, endFrequency: 160, type: "sawtooth" });
      noise(audioContext, master, 0.055, { volume: 0.08, frequency: 760 });
      tone(audioContext, master, 120, 0.11, { delay: 0.015, volume: 0.06, endFrequency: 82, type: "sine" });
      return;
    }

    if (name === "pickup") {
      tone(audioContext, master, 520, 0.08, { volume: 0.1, type: "triangle" });
      tone(audioContext, master, 780, 0.11, { delay: 0.07, volume: 0.1, type: "triangle" });
      return;
    }

    if (name === "clear") {
      tone(audioContext, master, 440, 0.09, { volume: 0.09, type: "triangle" });
      tone(audioContext, master, 660, 0.1, { delay: 0.08, volume: 0.09, type: "triangle" });
      tone(audioContext, master, 880, 0.13, { delay: 0.17, volume: 0.1, type: "triangle" });
      return;
    }

    if (name === "gameover") {
      tone(audioContext, master, 220, 0.14, { volume: 0.1, type: "triangle" });
      tone(audioContext, master, 155, 0.18, { delay: 0.12, volume: 0.1, type: "triangle" });
      tone(audioContext, master, 92, 0.28, { delay: 0.26, volume: 0.1, type: "triangle" });
      return;
    }

    if (name === "bossDefeated") {
      tone(audioContext, master, 196, 0.14, { volume: 0.11, type: "sawtooth" });
      tone(audioContext, master, 293.66, 0.13, { delay: 0.11, volume: 0.1, type: "triangle" });
      tone(audioContext, master, 392, 0.16, { delay: 0.23, volume: 0.11, type: "triangle" });
      noise(audioContext, master, 0.28, { delay: 0.08, volume: 0.1, frequency: 1300 });
      return;
    }

    if (name === "shieldBlock") {
      noise(audioContext, master, 0.018, { volume: 0.18, frequency: 7200, filterType: "highpass" });
      tone(audioContext, master, 1840, 0.16, { volume: 0.18, endFrequency: 1420, type: "square", attack: 0.001 });
      tone(audioContext, master, 2760, 0.12, { delay: 0.012, volume: 0.13, endFrequency: 1980, type: "triangle", attack: 0.001 });
      tone(audioContext, master, 620, 0.18, { delay: 0.018, volume: 0.08, endFrequency: 430, type: "sawtooth", attack: 0.001 });
      noise(audioContext, master, 0.07, { delay: 0.025, volume: 0.055, frequency: 3600, filterType: "highpass" });
      return;
    }

    if (name === "bossShoot") {
      tone(audioContext, master, 523.25, 0.12, { volume: 0.06, endFrequency: 783.99, type: "sine", attack: 0.035 });
      tone(audioContext, master, 659.25, 0.18, { delay: 0.035, volume: 0.055, endFrequency: 987.77, type: "triangle", attack: 0.04 });
      tone(audioContext, master, 880, 0.16, { delay: 0.1, volume: 0.045, endFrequency: 1320, type: "sine", attack: 0.03 });
      noise(audioContext, master, 0.14, { delay: 0.04, volume: 0.035, frequency: 1800 });
      return;
    }

    tone(audioContext, master, 360, 0.04, { volume: 0.06, type: "triangle" });
  }

  function playFromStateChange(before, after) {
    if (!before || !after) return;

    if (after.player.ammo < before.ammo || after.pellets.length > before.pellets) {
      play(after.weapon === "rifle" && after.mode !== "balloon" ? "rifle" : after.mode === "balloon" ? "pistol" : "shotgun");
    }
    if (!before.reloading && after.player.reloading) play("reload");
    if (before.reloading && !after.player.reloading) play("reloadReady");
    if (after.player.stockTimer > 0 && before.stockTimer <= 0) play("stock");
    if (!before.bossAlive && bossAlive(after.enemies)) {
      lastPlayed.set("bossDefeated", -Infinity);
    }
    if (before.bossAlive && !bossAlive(after.enemies)) play("bossDefeated");
    if (shieldBlockCount(after.floatTexts) > before.shieldBlocks) play("shieldBlock");
    if (jumpingSlimeCount(after.enemies) > before.jumpingSlimes) play("slimeHop");
    if (after.player.health < before.health) {
      play(after.enemyProjectiles.length < before.enemyProjectiles ? "playerProjectileHit" : "hurt");
    }
    if (poppedBalloonCount(after.enemies) > before.poppedBalloons) play("balloonPop");
    if (after.effects.filter((effect) => effect.kind === "splatter").length > before.splatters) {
      play(before.stockTimer > 0 || after.player.stockTimer > 0 ? "stockHit" : "hit");
    }
    if (after.pickups.length < before.pickups || totalPowerUps(after.permanentPowerUps) > before.permanentPowerUps) play("pickup");
    if (after.enemyProjectiles.length > before.enemyProjectiles) play("bossShoot");
    if (before.status !== "gameover" && after.status === "gameover") play("gameover");
    if (!before.awaitingNextLevel && after.awaitingNextLevel) play("clear");
    if (!before.awaitingWeaponChoice && after.awaitingWeaponChoice) play("clear");
  }

  function updateAmbient(state, paused = false) {
    if (!context || !master || !state || state.status !== "playing" || paused) {
      return;
    }

    const now = context.currentTime;
    const melody = [146.83, 196, 220, 246.94, 220, 196, 174.61, 196, 146.83, 196, 261.63, 246.94, 220, 196, 174.61, 164.81];
    const bass = [73.42, 73.42, 98, 73.42, 65.41, 65.41, 87.31, 65.41];
    const pulse = [0.02, 0.012, 0.026, 0.012, 0.02, 0.014, 0.03, 0.012];

    if (now >= nextMusicTime) {
      const leadFrequency = melody[musicStep % melody.length];
      const bassFrequency = bass[musicStep % bass.length];
      tone(context, master, leadFrequency, 0.11, { volume: 0.03 + pulse[musicStep % pulse.length], type: "triangle", attack: 0.008 });
      tone(context, master, leadFrequency * 2, 0.055, { delay: 0.035, volume: 0.012, type: "sine", attack: 0.004 });
      if (musicStep % 2 === 0) {
        tone(context, master, bassFrequency, 0.16, { volume: 0.05, type: "sawtooth", attack: 0.008 });
        noise(context, master, 0.028, { volume: 0.018, frequency: 1300, filterType: "highpass" });
      }
      if (musicStep % 8 === 7) {
        tone(context, master, 293.66, 0.18, { volume: 0.026, type: "square", attack: 0.01 });
      }
      musicStep += 1;
      nextMusicTime = now + 0.18;
    }

    if (state.enemies.length === 0) {
      nextGroanTime = now + 1.2;
      return;
    }

    if (now >= nextGroanTime) {
      play("zombieGroan");
      nextGroanTime = now + 3.4 + Math.random() * 4.2;
    }
  }

  return {
    unlock,
    play,
    playFromStateChange,
    updateAmbient,
  };
}
