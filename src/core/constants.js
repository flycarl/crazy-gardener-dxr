export const WORLD = {
  width: 3600,
  height: 720,
  groundY: 590,
  gravity: 2200,
  gaps: [],
  walls: [],
  platforms: [
    { x: 690, y: 500, w: 230, h: 24 },
    { x: 1320, y: 470, w: 270, h: 24 },
    { x: 2230, y: 505, w: 250, h: 24 },
  ],
};

export const PLAYER = {
  width: 46,
  height: 76,
  speed: 420,
  jumpVelocity: -860,
  maxHealth: 100,
};

export const SHOTGUN = {
  magazineSize: 2,
  reloadSeconds: 1.35,
  cooldownSeconds: 0.24,
  pelletCount: 5,
  pelletSpeed: 1040,
  pelletLife: 0.34,
  pelletRadius: 5,
  spreadRadians: 0.3,
  recoil: 190,
  downwardRecoil: 640,
  stockRange: 96,
  stockArcSeconds: 0.24,
  stockCooldownSeconds: 0.65,
  doubleShotWindowSeconds: 0.11,
  doubleShotDelaySeconds: 0.13,
};

export const PISTOL = {
  magazineSize: 8,
  reloadSeconds: 1.0,
  bulletSpeed: 1250,
  bulletRadius: 4,
};

export const RIFLE = {
  magazineSize: 30,
  reloadSeconds: 1.55,
  cooldownSeconds: 0.22,
  autoCooldownSeconds: 0.16,
  bulletSpeed: 1320,
  bulletRadius: 4,
  bulletLife: 0.86,
  damage: 24,
  autoDamage: 10,
  pierceDamageMultiplier: 0.5,
  airRecoil: 145,
};

export const BALLOON_MODE = {
  seconds: 30,
  targetKills: 5,
};

export const ENEMY_TYPES = {
  normal: { label: "普通僵尸", width: 42, height: 70, health: 32, speed: 68, damage: 12, score: 10 },
  fast: { label: "快跑僵尸", width: 38, height: 64, health: 20, speed: 124, damage: 10, score: 15 },
  fat: { label: "防爆门僵尸", width: 58, height: 82, health: 68, speed: 52, damage: 18, score: 25, shield: true },
  slimeLow: { label: "小跳史莱姆", width: 42, height: 42, health: 24, speed: 78, damage: 10, score: 18, slime: true, jumpVelocity: 560 },
  slimeMid: { label: "中跳史莱姆", width: 48, height: 48, health: 34, speed: 92, damage: 16, score: 28, slime: true, jumpVelocity: 760 },
  slimeHigh: { label: "高跳史莱姆", width: 54, height: 54, health: 46, speed: 104, damage: 24, score: 42, slime: true, jumpVelocity: 980 },
  balloon: { label: "气球僵尸", width: 40, height: 62, health: 24, speed: 58, damage: 10, score: 20, flying: true },
  tankBoss: { label: "冲锋 Boss", width: 118, height: 142, health: 620, speed: 78, damage: 26, score: 300 },
  rangedBoss: { label: "远程 Boss", width: 104, height: 132, health: 460, speed: 44, damage: 18, score: 320, ranged: true },
};

const BASE_LEVELS = [
  {
    enemies: ["normal", "normal", "balloon", "fast", "normal"],
    platforms: [
      { x: 720, y: 505, w: 250, h: 24 },
      { x: 1470, y: 490, w: 270, h: 24 },
    ],
  },
  {
    enemies: ["normal", "normal", "fast", "normal", "balloon", "fat"],
    platforms: [
      { x: 690, y: 500, w: 230, h: 24 },
      { x: 1320, y: 475, w: 270, h: 24 },
      { x: 2230, y: 505, w: 250, h: 24 },
    ],
  },
  {
    enemies: ["normal", "fast", "normal", "fat", "balloon", "normal", "fast"],
    platforms: [
      { x: 620, y: 505, w: 220, h: 24 },
      { x: 1160, y: 470, w: 245, h: 24 },
      { x: 1880, y: 500, w: 235, h: 24 },
    ],
  },
  {
    enemies: ["normal", "fast", "normal", "fat", "balloon", "normal", "fast", "normal"],
    platforms: [
      { x: 590, y: 500, w: 210, h: 24 },
      { x: 1080, y: 460, w: 230, h: 24 },
      { x: 1690, y: 500, w: 220, h: 24 },
      { x: 2500, y: 475, w: 240, h: 24 },
    ],
  },
  {
    enemies: ["normal", "fast", "fat", "normal", "balloon", "fast", "normal", "fat", "normal"],
    boss: "tankBoss",
    platforms: [
      { x: 560, y: 500, w: 205, h: 24 },
      { x: 1030, y: 455, w: 220, h: 24 },
      { x: 1590, y: 485, w: 210, h: 24 },
      { x: 2280, y: 450, w: 225, h: 24 },
    ],
  },
  {
    enemies: ["normal", "fast", "fat", "normal", "balloon", "normal", "fast", "fat", "normal", "balloon"],
    platforms: [
      { x: 530, y: 505, w: 195, h: 24 },
      { x: 960, y: 450, w: 210, h: 24 },
      { x: 1490, y: 500, w: 205, h: 24 },
      { x: 2100, y: 455, w: 205, h: 24 },
      { x: 2780, y: 500, w: 215, h: 24 },
    ],
  },
  {
    enemies: ["normal", "fast", "fat", "normal", "balloon", "fast", "normal", "fat", "balloon", "normal", "fast"],
    platforms: [
      { x: 510, y: 505, w: 190, h: 24 },
      { x: 910, y: 445, w: 200, h: 24 },
      { x: 1400, y: 490, w: 195, h: 24 },
      { x: 1990, y: 440, w: 205, h: 24 },
      { x: 2670, y: 485, w: 205, h: 24 },
    ],
  },
  {
    enemies: ["normal", "fast", "fat", "balloon", "normal", "fast", "fat", "normal", "balloon", "fast", "normal", "fat"],
    platforms: [
      { x: 500, y: 500, w: 185, h: 24 },
      { x: 870, y: 435, w: 190, h: 24 },
      { x: 1320, y: 480, w: 190, h: 24 },
      { x: 1840, y: 425, w: 195, h: 24 },
      { x: 2460, y: 470, w: 190, h: 24 },
      { x: 3100, y: 440, w: 205, h: 24 },
    ],
  },
  {
    enemies: ["normal", "fast", "fat", "balloon", "normal", "fast", "fat", "normal", "balloon", "fast", "normal", "fat", "normal"],
    platforms: [
      { x: 485, y: 500, w: 180, h: 24 },
      { x: 830, y: 430, w: 185, h: 24 },
      { x: 1250, y: 475, w: 185, h: 24 },
      { x: 1760, y: 420, w: 190, h: 24 },
      { x: 2350, y: 465, w: 185, h: 24 },
      { x: 2980, y: 430, w: 195, h: 24 },
    ],
  },
  {
    enemies: ["normal", "fast", "fat", "balloon", "normal", "fast", "fat", "normal", "balloon", "fast", "fat", "normal", "balloon", "normal"],
    boss: "rangedBoss",
    platforms: [
      { x: 470, y: 500, w: 175, h: 24 },
      { x: 800, y: 425, w: 180, h: 24 },
      { x: 1190, y: 470, w: 180, h: 24 },
      { x: 1660, y: 415, w: 185, h: 24 },
      { x: 2220, y: 455, w: 180, h: 24 },
      { x: 2830, y: 420, w: 190, h: 24 },
      { x: 3260, y: 500, w: 180, h: 24 },
    ],
  },
  {
    enemies: ["normal", "fast", "fat", "balloon", "normal", "fast", "fat", "normal", "balloon", "fast", "fat", "normal", "balloon", "normal", "fast"],
    platforms: [
      { x: 460, y: 500, w: 170, h: 24 },
      { x: 770, y: 420, w: 175, h: 24 },
      { x: 1140, y: 465, w: 175, h: 24 },
      { x: 1580, y: 410, w: 180, h: 24 },
      { x: 2110, y: 450, w: 175, h: 24 },
      { x: 2700, y: 410, w: 185, h: 24 },
      { x: 3210, y: 485, w: 175, h: 24 },
    ],
  },
  {
    enemies: ["normal", "fast", "fat", "balloon", "normal", "fast", "fat", "normal", "balloon", "fast", "fat", "normal", "balloon", "normal", "fast", "fat"],
    platforms: [
      { x: 450, y: 500, w: 168, h: 24 },
      { x: 745, y: 415, w: 170, h: 24 },
      { x: 1100, y: 460, w: 170, h: 24 },
      { x: 1510, y: 405, w: 175, h: 24 },
      { x: 2010, y: 445, w: 170, h: 24 },
      { x: 2570, y: 405, w: 178, h: 24 },
      { x: 3140, y: 475, w: 172, h: 24 },
    ],
  },
  {
    enemies: ["normal", "fast", "fat", "balloon", "normal", "fast", "fat", "normal", "balloon", "fast", "fat", "normal", "balloon", "normal", "fast", "fat", "balloon"],
    platforms: [
      { x: 440, y: 500, w: 165, h: 24 },
      { x: 720, y: 410, w: 168, h: 24 },
      { x: 1060, y: 455, w: 168, h: 24 },
      { x: 1450, y: 400, w: 170, h: 24 },
      { x: 1930, y: 440, w: 168, h: 24 },
      { x: 2470, y: 400, w: 172, h: 24 },
      { x: 3060, y: 468, w: 170, h: 24 },
      { x: 3340, y: 430, w: 165, h: 24 },
    ],
  },
  {
    enemies: ["normal", "fast", "fat", "balloon", "normal", "fast", "fat", "normal", "balloon", "fast", "fat", "normal", "balloon", "normal", "fast", "fat", "balloon", "normal"],
    platforms: [
      { x: 430, y: 500, w: 162, h: 24 },
      { x: 700, y: 405, w: 165, h: 24 },
      { x: 1020, y: 450, w: 165, h: 24 },
      { x: 1390, y: 395, w: 168, h: 24 },
      { x: 1850, y: 435, w: 165, h: 24 },
      { x: 2370, y: 395, w: 170, h: 24 },
      { x: 2960, y: 460, w: 168, h: 24 },
      { x: 3300, y: 420, w: 165, h: 24 },
    ],
  },
  {
    enemies: ["normal", "fast", "fat", "balloon", "normal", "fast", "fat", "normal", "balloon", "fast", "fat", "normal", "balloon", "normal", "fast", "fat", "balloon", "normal", "fat"],
    boss: "tankBoss",
    platforms: [
      { x: 420, y: 500, w: 160, h: 24 },
      { x: 680, y: 400, w: 162, h: 24 },
      { x: 990, y: 445, w: 162, h: 24 },
      { x: 1340, y: 390, w: 165, h: 24 },
      { x: 1780, y: 430, w: 162, h: 24 },
      { x: 2280, y: 390, w: 168, h: 24 },
      { x: 2860, y: 455, w: 165, h: 24 },
      { x: 3230, y: 410, w: 162, h: 24 },
      { x: 3440, y: 485, w: 140, h: 24 },
    ],
  },
];

const LEVEL_ENEMY_RAMP = ["normal", "fast", "fat", "balloon", "slimeLow", "normal", "slimeMid", "fast", "fat", "slimeHigh"];
const EXTRA_PLATFORM_PATTERN = [
  { x: 3520, y: 440, w: 72, h: 24 },
  { x: 300, y: 450, w: 118, h: 24 },
  { x: 2620, y: 372, w: 132, h: 24 },
];

function createLevelPlan(index) {
  const levelNumber = index + 1;
  const base = BASE_LEVELS[Math.min(index, BASE_LEVELS.length - 1)];
  const extraCount = Math.floor(index / 5);
  const enemies = [...base.enemies];

  for (let extraIndex = 0; extraIndex < extraCount; extraIndex += 1) {
    enemies.push(LEVEL_ENEMY_RAMP[(index + extraIndex) % LEVEL_ENEMY_RAMP.length]);
  }

  const platforms = base.platforms.map((platform, platformIndex) => ({
    ...platform,
    y: Math.max(360, platform.y - Math.min(46, Math.floor(index / 10) * 4 + (platformIndex % 2) * 4)),
  }));

  for (let platformIndex = 0; platformIndex < Math.min(3, Math.floor(index / 25)); platformIndex += 1) {
    platforms.push({
      ...EXTRA_PLATFORM_PATTERN[platformIndex],
      y: Math.max(350, EXTRA_PLATFORM_PATTERN[platformIndex].y - Math.floor(index / 20) * 5),
    });
  }

  return {
    enemies,
    platforms,
    ...(levelNumber % 5 === 0 ? { boss: levelNumber % 10 === 0 ? "rangedBoss" : "tankBoss" } : {}),
  };
}

export const LEVELS = Array.from({ length: 100 }, (_, index) => createLevelPlan(index));

export const POWER_UPS = {
  piercing: { label: "穿透弹", duration: 10 },
  wide: { label: "大扩散", duration: 10 },
  fastReload: { label: "快速换弹", duration: 10 },
  strongRecoil: { label: "强后坐力", duration: 10 },
  longStock: { label: "长枪托", duration: 10 },
};
