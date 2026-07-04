# Dave Rush Combat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Dave Rush-inspired focused shooting, double-shot combo input, and stronger melee hit feedback.

**Architecture:** Keep changes inside the existing canvas game modules. Input reports a combo press, systems handles queued double shots and hit reactions, rendering draws richer effects, and tests lock the combat behavior.

**Tech Stack:** Vanilla JavaScript modules, Node test runner, HTML canvas.

---

### Task 1: Focus Shotgun Pellets

**Files:**
- Modify: `src/core/constants.js`
- Modify: `tests/state.test.mjs`

- [ ] Change `SHOTGUN.pelletCount` from `6` to `2`.
- [ ] Update the existing shotgun test to expect 2 pellets.
- [ ] Run `node --test tests/state.test.mjs`.

### Task 2: Double-Shot Combo

**Files:**
- Modify: `src/input.js`
- Modify: `src/core/state.js`
- Modify: `src/core/systems.js`
- Modify: `src/core/constants.js`
- Modify: `tests/state.test.mjs`

- [ ] Add a short combo window constant for double-shot timing.
- [ ] Let input emit `doubleShotPressed` when left and right mouse clicks happen close together.
- [ ] Add player fields for `queuedShots`, `queuedShotDelay`, and `queuedShotAim`.
- [ ] Add `queueDoubleShot(state, aim)` and update `updateGame` to fire the first shot immediately and the second shot after a short delay.
- [ ] Add tests for queue creation and firing the queued second shot.
- [ ] Run `node --test tests/state.test.mjs`.

### Task 3: Reference-Style Hit Feedback

**Files:**
- Modify: `src/core/systems.js`
- Modify: `src/render.js`

- [ ] Make melee kills create stronger corpse launch velocity.
- [ ] Add yellow-green splatter effects on pellet and melee hits.
- [ ] Draw splatter and larger stock swing effects in `drawEffects`.
- [ ] Run `node --test tests/state.test.mjs`.

### Task 4: Manual Verification

**Files:**
- Read: `index.html`
- Read: `src/main.js`

- [ ] Start the local static server.
- [ ] Open the game and confirm normal shots produce 2 pellets.
- [ ] Confirm left+right click performs two quick shots and consumes up to 2 shells.
- [ ] Confirm right-click melee has a larger arc, brighter impact, and thrown corpses.
