export const WORLD = {
  width: 2600,
  height: 720,
  groundY: 590,
  gravity: 2200,
};

export const PLAYER = {
  width: 46,
  height: 76,
  speed: 420,
  jumpVelocity: -860,
  maxHealth: 100,
};

export const SHOTGUN = {
  magazineSize: 8,
  reloadSeconds: 1.35,
  cooldownSeconds: 0.24,
  pelletCount: 6,
  pelletSpeed: 1040,
  pelletLife: 0.34,
  pelletRadius: 5,
  spreadRadians: 0.3,
  recoil: 190,
  downwardRecoil: 640,
  stockRange: 96,
  stockArcSeconds: 0.24,
  stockCooldownSeconds: 0.5,
};

export const ENEMY_TYPES = {
  normal: { label: "普通僵尸", width: 42, height: 70, health: 32, speed: 68, damage: 12, score: 10 },
  fast: { label: "快跑僵尸", width: 38, height: 64, health: 20, speed: 124, damage: 10, score: 15 },
  fat: { label: "胖僵尸", width: 58, height: 82, health: 68, speed: 52, damage: 18, score: 25 },
  tankBoss: { label: "巨型肉盾 Boss", width: 128, height: 150, health: 560, speed: 34, damage: 25, score: 300 },
};

export const LEVELS = [
  { enemies: ["normal", "normal", "normal", "fast", "normal", "fat"] },
  { enemies: ["normal", "fast", "normal", "fat", "fast", "normal", "fat", "normal"] },
  { enemies: ["normal", "fast", "fat"], boss: "tankBoss" },
];

export const POWER_UPS = {
  piercing: { label: "穿透弹", duration: 10 },
  wide: { label: "大扩散", duration: 10 },
  fastReload: { label: "快速换弹", duration: 10 },
  strongRecoil: { label: "强后坐力", duration: 10 },
  longStock: { label: "长枪托", duration: 10 },
};
