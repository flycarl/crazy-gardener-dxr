# Dave Rush Combat Design

## Goal

Bring the combat closer to the provided Dave Rush reference video: shots feel more focused, close-range hits feel like a big arcing strike, and defeated zombies pop with bright impact feedback and strong knockback.

## Gameplay Changes

- Normal shotgun fire uses 2 pellets per shot instead of 6.
- A near-simultaneous left-click and right-click triggers a double shot.
- The double shot fires two shotgun blasts with a short built-in delay, consuming up to 2 shells.
- If only 1 shell is available, the double shot becomes a single shot and then reload behavior continues normally.
- Right-click keeps the existing melee role, but its visuals and hit reaction should read more like the reference: a large pale swing arc, yellow-green splatter, and bodies thrown backward.

## Implementation Shape

- Add a short combo input window in the input layer so left and right clicks in quick succession can be consumed as one double-shot command.
- Track a queued second shot on the player. The first blast fires immediately, and the second blast fires after a small delay if ammo and cooldown allow it.
- Keep the existing ammo magazine size unchanged.
- Update tests that assume 6 pellets per shot and add coverage for the double-shot queue.
- Expand rendering of melee and hit effects using the existing canvas effect system.

## Verification

- Unit tests should pass.
- Manual play should confirm normal shots create 2 pellets, double-shot consumes 2 shells and creates two bursts, and right-click kills throw zombies with stronger video-like feedback.
