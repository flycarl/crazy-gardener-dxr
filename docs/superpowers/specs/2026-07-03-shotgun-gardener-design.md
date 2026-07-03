# Shotgun Gardener Game Design

## Summary

This is a 2D side-scrolling browser action game prototype. The player controls an original "mad gardener" character with a long shotgun, fighting zombies across horizontal stages. The prototype focuses on fast readable action: movement, jumping, shotgun blasts, recoil jumps, close-range stock swings, level exits, power-up drops, and a first boss encounter.

The project is inspired by cartoon garden-versus-zombie energy, but it will use original characters, names, and visual designs.

## Target Platform

- Web browser.
- No install or build step for the first prototype.
- Implement with HTML, CSS, Canvas, and vanilla JavaScript.

## Core Player Fantasy

The player should feel like a reckless gardener using an oversized shotgun as both a firearm and a golf club. The best moments should come from switching between ranged crowd control, risky close-range executions, and airborne recoil tricks.

## Controls

- Move left and right with keyboard input.
- Jump with keyboard input.
- Aim with the mouse.
- Left mouse button fires the shotgun.
- Right mouse button performs a shotgun-stock swing.
- The browser context menu should be disabled during play so right click can be used cleanly.

## Player Movement

The player can move left and right and jump. The movement should feel responsive rather than realistic.

When the player is airborne and fires downward, shotgun recoil applies a strong upward impulse. This recoil jump lets the player dodge attacks, cross over zombies, extend airtime, and make skilled movement plays.

Repeated recoil jumps are allowed if ammunition is available, but their power should be constrained by the 8-round magazine and reload timing.

## Shotgun

The shotgun has an 8-round magazine. Firing consumes one round. When the magazine reaches 0, the weapon automatically reloads after a short delay.

The left-click shot fires multiple pellets in a spread. It is strongest at close range and can clear groups when zombies are clustered. The shot also applies recoil to the player opposite the firing direction, with extra vertical lift when aimed downward in the air.

The weapon should clearly communicate:

- Current ammo.
- Reloading state.
- Shot direction.
- Pellet spread.
- Impact feedback.

## Shotgun-Stock Swing

Right click swings the shotgun like a golf club. The attack range is determined by the visible shotgun length.

The stock swing instantly kills any non-boss zombie it hits. Bosses cannot be instantly killed by this attack, but the swing may cause brief knockback or interrupt feedback.

This attack should be high risk and high reward:

- It requires close positioning.
- It rewards precise timing.
- It gives the player a stylish way to delete tough normal enemies.
- It should visually knock defeated zombies away like a golf shot.

## Game Modes

### Level Mode

Level mode is a horizontal progression mode. Each stage places the player in a side-scrolling map with zombies approaching from ahead and sometimes from behind.

Normal levels end when all required zombies are defeated. After the final zombie dies, an extraction point appears near the right side of the map. The player enters it to move to the next level.

Every third level is a boss level. After the boss is defeated, the extraction point appears.

Boss order for the larger design:

- Level 3: Giant tank boss.
- Level 6: Charging boss.
- Level 9: Ranged boss.
- Later boss levels can loop these archetypes with stronger stats and mixed enemy waves.

For the first playable prototype, implement levels 1 through 3, ending with the giant tank boss.

### Endless Mode

Endless mode uses the same controls and combat systems, but has no extraction point. Zombies spawn in increasingly dangerous waves. Bosses appear by time survived or kill count. The goal is to survive longer, score higher, and collect more power-ups.

Endless mode can reuse the same enemy, power-up, and boss systems from level mode.

## First Prototype Scope

The first playable version should include:

- Main menu with Level Mode and Endless Mode.
- A playable mad gardener character.
- Left/right movement and jumping.
- Mouse aiming.
- Left-click shotgun firing.
- 8-round magazine with automatic reload.
- Airborne downward recoil jump.
- Right-click stock swing that instantly kills non-boss zombies.
- Normal zombie, fast zombie, fat zombie.
- Giant tank boss.
- Level progression through at least three levels.
- Extraction point after level clear or boss defeat.
- Endless mode with escalating waves.
- Temporary power-up drops.
- HUD for health, ammo, mode, level or wave, active power-ups, and extraction prompt.

Deferred from the first prototype:

- Throwing zombie.
- Charging boss.
- Ranged boss.
- Detailed sprite art.
- Persistent upgrades or save data.
- Audio polish.

## Enemies

### Normal Zombie

The basic enemy. It walks toward the player and damages on contact.

### Fast Zombie

Lower health, higher speed. It pressures the player to jump, recoil upward, or use quick close-range attacks.

### Fat Zombie

Higher health, slower speed. It encourages either close-range shotgun bursts or a risky stock swing execution.

### Giant Tank Boss

The first boss is large, slow, and durable. It advances steadily, uses heavy contact pressure, and can summon or be accompanied by normal zombies. The stock swing cannot kill it instantly, but should still produce a satisfying hit reaction.

## Power-Ups

Power-ups drop after a certain number of zombie kills, with some randomness. They are temporary and activate immediately when collected.

Initial power-ups:

- Piercing Shot: pellets can pass through one zombie and hit another behind it.
- Wide Spread: shotgun spread becomes wider for stronger crowd clearing.
- Fast Reload: automatic reload finishes faster.
- Strong Recoil: downward shots launch the player higher.
- Long Stock: stock swing range is longer.

Only a small number of active power-ups should be visible at once, with timers shown in the HUD.

## Level Flow

1. Player starts near the left side of the map.
2. Zombies spawn according to the current level or wave.
3. Player defeats all required enemies.
4. If the level is a boss level, the boss must also be defeated.
5. Extraction point appears.
6. Player enters extraction point.
7. Next level begins.

Endless mode repeats the combat loop without steps 4 through 7 unless a boss wave is active.

## UI

The game screen should show:

- Player health.
- Ammo count out of 8.
- Reloading state.
- Current mode.
- Current level or endless wave.
- Kill count or score.
- Active power-ups and remaining duration.
- Extraction prompt when available.

The UI should be compact and readable during action.

## Visual Direction

The first version uses clear 2D cartoon shapes rather than final art. The player, shotgun, zombies, pellets, power-ups, boss, and extraction point must be easy to identify at a glance.

Important visual feedback:

- Shotgun muzzle flash.
- Pellet trails or impacts.
- Recoil motion.
- Stock swing arc.
- Zombies launched by stock hits.
- Boss hurt feedback.
- Power-up pickup flash.
- Extraction point activation.

## Architecture

The prototype should keep systems separated enough that gameplay can be tuned without rewriting the whole file.

Suggested modules or sections:

- Game loop: frame timing, update, draw, pause, mode switching.
- Input: keyboard, mouse, click handling, context menu prevention.
- Player: movement, health, aim, jump, recoil.
- Weapon: ammo, reload, pellets, stock swing.
- Enemies: shared enemy behavior plus type-specific stats.
- Bosses: boss-specific behavior.
- Levels: level definitions, spawn pacing, extraction.
- Endless: wave scaling and boss timing.
- Power-ups: drop logic, pickup, timers, stat effects.
- UI and rendering: HUD, canvas drawing, menus, overlays.

## Error Handling And Edge Cases

- Right click should not open the browser context menu during gameplay.
- The player should not leave the playable world bounds.
- Reload should not trigger multiple overlapping timers.
- The player should not fire while reloading unless a later design explicitly supports interrupting reloads.
- Extraction should only work after the level clear condition is met.
- Bosses should not be affected by instant-kill stock swing logic.
- Endless mode should recover gracefully if too many enemies are active by limiting spawn count.

## Testing Plan

Because the first prototype is browser-based, testing will combine code checks and manual playtesting.

Manual checks:

- Movement, jump, and world bounds work.
- Left click fires and consumes ammo.
- Auto reload starts at 0 ammo and refills to 8.
- Downward air shot launches the player upward.
- Right click kills normal enemies in shotgun-length range.
- Right click does not instantly kill the boss.
- Normal levels show extraction only after all enemies are defeated.
- Level 3 boss shows extraction only after boss defeat.
- Endless mode keeps spawning waves and scaling pressure.
- Power-ups drop, activate, expire, and update HUD state.

Automated or lightweight checks, if practical:

- Basic lint or syntax validation.
- Small deterministic tests for collision helpers, ammo state, and power-up timers.

## Success Criteria

The prototype succeeds if a player can open the game, choose level mode, clear normal stages, fight the first boss, and understand the signature mechanics without explanation:

- Shotgun clears zombies.
- Stock swing deletes nearby normal zombies.
- Downward air shots launch the player upward.
- Power-ups create temporary spikes in power.
- Extraction appears after clearing a stage.

