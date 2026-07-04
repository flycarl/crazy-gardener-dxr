export const WORLD = {
  width: 3600,
  height: 720,
  groundY: 590,
  gravity: 2200,
  gaps: [],
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
  cooldownSeconds: 0.08,
  bulletSpeed: 1320,
  bulletRadius: 4,
  bulletLife: 0.86,
  damage: 28,
  pierceDamageMultiplier: 0.5,
};

export const BALLOON_MODE = {
  seconds: 30,
  targetKills: 5,
};

export const ENEMY_TYPES = {
  normal: { label: "普通僵尸", width: 42, height: 70, health: 32, speed: 68, damage: 12, score: 10 },
  fast: { label: "快跑僵尸", width: 38, height: 64, health: 20, speed: 124, damage: 10, score: 15 },
  fat: { label: "胖僵尸", width: 58, height: 82, health: 68, speed: 52, damage: 18, score: 25 },
  balloon: { label: "气球僵尸", width: 40, height: 62, health: 24, speed: 58, damage: 10, score: 20, flying: true },
  tankBoss: { label: "巨型肉盾 Boss", width: 128, height: 150, health: 560, speed: 34, damage: 25, score: 300 },
};

export const LEVELS = [
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

export const POWER_UPS = {
  piercing: { label: "穿透弹", duration: 10 },
  wide: { label: "大扩散", duration: 10 },
  fastReload: { label: "快速换弹", duration: 10 },
  strongRecoil: { label: "强后坐力", duration: 10 },
  longStock: { label: "长枪托", duration: 10 },
};
