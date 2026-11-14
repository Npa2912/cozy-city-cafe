# City clock and day/night lighting

New sessions start at **day 1, 07:00**. One real second advances one game minute;
a full day lasts 24 real minutes. The clock consumes the actual, unclamped frame
delta, independently of the capped NPC/vehicle simulation step. Opening UI does
not add another timer. Hidden tabs and the pause button stop the clock; resuming
resets the frame timestamp so hidden time is not replayed. No offline time is added.

| Game time | Atmosphere |
| --- | --- |
| 05:00–07:00 | Dawn; the sky and sunlight brighten gradually |
| 07:00–11:00 | Mild warm morning sun and blue sky |
| 11:00–14:00 | Strong overhead sunlight, shorter and sharper shadows |
| 14:00–17:00 | Lower, warmer afternoon sun |
| 17:00–19:00 | Soft peach/pink horizon, long shadows, lamps fade on |
| 19:00–05:00 | Deep blue sky, moon/stars, warm shop and street lighting |

The sun travels from map east (+X, the sea side) to west. Existing directional
sunlight and hemisphere lighting are reused; a faint moon light supports night
visibility. Smooth keyframes control light color/intensity, ambient light, fog,
sky gradients, cloud illumination and water colors. Exposure stays fixed rather
than washing out pastel materials to create noon. The sky uses the existing
painted cloud artwork with a world-space dome, sun/moon meshes and small stars.
This changes the scene's lighting and shadow direction, with no screen color overlay.

Existing shop lights and emissive windows/lanterns fade with dusk. A fixed pool
of four unshadowed local lights follows the nearest real luminous fixtures,
including promenade/pier fixtures when the camera moves there. Distant lamps
use emission; they do not each allocate a dynamic point light. Daytime emission
and local street lights turn off. The original café interior lights retain a
small daytime fill and brighten at night. Apartment panes use deterministic lit/unlit material variants; their daytime base colors stay unchanged. Other unlit glass stays dark.

The sea retains its wave, fish, jumping fish and boat animation. Its shallow/deep
palette, horizon haze, crest highlights and view-dependent sun/moon specular
highlights follow the clock. This is an economical procedural water reflection,
not ray-traced reflections of every city object.

## Controls and saves

The small HUD shows day, HH:MM and a period label. It hides while a dialog is open
to keep cashier controls clear. **Tạm dừng** now pauses the active café simulation
as well as the street and clock; **Tiếp tục** resumes them. Clicking **Chơi quán**
starts/resumes the session. Merely opening orders, quests or settings does not
pause time or create new timers. Night and midnight do not cancel orders,
close the business, reset quests or change cash/EXP.

`anteleo.world-clock.v1` stores total game minutes, day (derived from total), and
speed. It is independent of `anteleo.game.v2`; existing café saves are preserved.
The clock saves every five real seconds and on page hide. Invalid/missing clock
data starts at 07:00; storage failures do not crash the scene. Pause is a session
state, not offline catch-up data.

In **Vite development only**, open `/?debugTime=1` to reveal the small developer
panel. It jumps to 06:00, 09:00, 12:00, 16:00, 18:00, 21:00 or 00:00, pauses/resumes
the clock, speeds it up ×10 and restores **1s = 1 minute**. Debug time jumps keep
the current day and do not modify café orders or money. Saved debug speed can be
restored with the standard-speed button. The panel and test bridge are absent
from the production build.

## Implementation

- `src/systems/EnvironmentTimeConfig.js`: ratio, start time, light budget, phases
  and smooth lighting keyframes.
- `src/systems/GameClock.js`: frame-independent time, day rollover and persistence.
- `src/systems/DayNightCycle.js`: sky, sun/moon, existing lights, bounded local
  lights, water bindings, HUD and development controls.
- `src/main.js`: a single clock update in the existing render loop, visibility and
  pause integration, shadow invalidation.
- `src/sea.js`: time-driven water illumination; existing animation stays intact.

The environment creates its geometry, materials and lights once. Existing static
batching excludes celestial objects. Shadows reuse the existing 2048 map and
throttled shadow refresh; local lamp lights do not add shadow maps. No frame-rate
claim is made for all hardware.

## Verification

`npm test` passes 64 tests, including rate equality at 30/60 FPS and irregular
deltas, a 24-minute day, pause/resume, midnight, save/restore, all six periods,
continuous lighting across boundaries and the previous gameplay/collision/fish
suites. `npm run build` produces the Vercel-compatible `dist` output.

Chromium exercised the actual DEV time buttons at **09:00, 12:00, 18:00 and
21:00**, verified noon strength/elevation, night lamps, midnight, persisted day 2,
mobile overflow and café pause/resume. The final production build was also tested
at 18:00 on the street and 21:00 on the coast: no JavaScript/shader errors, no DEV
panel/test bridge, and saved time restored correctly. The existing fish animation
code is unchanged and its unit tests still pass; the production coast verifies
its scene renders with the updated water shader.

[Morning](time-morning.png) · [Noon](time-noon.png) · [Sunset](time-sunset.png) ·
[Night](time-night.png) · [Night coast](time-coast-night.png)

[QA summary](day-night-qa.json). The optional `scripts/check-day-night.cjs` runs these development checks
with Playwright and a local Vite server; Playwright is a QA tool, not an added
application dependency.
