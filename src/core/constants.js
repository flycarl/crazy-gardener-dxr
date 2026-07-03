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
  cooldownSeconds: 0.22,
  pelletCount: 8,
  pelletSpeed: 1040,
  pelletLife: 0.34,
  pelletRadius: 5,
  spreadRadians: 0.34,
  recoil: 230,
  downwardRecoil: 980,
  stockRange: 96,
  stockArcSeconds: 0.18,
  stockCooldownSeconds: 0.45,
};

export const ENEMY_TYPES = {
  normal: { label: "Normal", width: 42, height: 70, health: 24, speed: 92, damage: 12, score: 10 },
  fast: { label: "Fast", width: 38, height: 64, health: 16, speed: 156, damage: 10, score: 15 },
  fat: { label: "Fat", width: 58, height: 82, health: 58, speed: 62, damage: 18, score: 25 },
  tankBoss: { label: "Tank Boss", width: 128, height: 150, health: 520, speed: 42, damage: 25, score: 300 },
};

export const POWER_UPS = {
  piercing: { label: "Piercing Shot", duration: 10 },
  wide: { label: "Wide Spread", duration: 10 },
  fastReload: { label: "Fast Reload", duration: 10 },
  strongRecoil: { label: "Strong Recoil", duration: 10 },
  longStock: { label: "Long Stock", duration: 10 },
};
