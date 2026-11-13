# Reference refinement · connected city

Archived visual-stage notes. The subsequent [playable café](GAMEPLAY.md) adds
the working door, collision, customer service and in-game POS.

This pass edits the previous city directly. ANTELEO, its rear room/POS, the
original street, florist, skyline, van and pier remain in the same scene.
All nine earlier camera presets remain available at their previous positions.

## Changed from the preceding preview

- Replaced the repeated expansion-house layout with four architectural families:
  curved corner bays, gabled cottages/shops, paired dormer houses and roof-terrace
  buildings. One, two and three storeys are mixed with different footprints,
  glazing, balconies, shutters, awnings and planting. Side and rear façades are
  detailed too; terraces have supported pergolas, roof access and seating.
- The residential road has two clear pavement strips, crosswalks, kerbstones,
  lamps and an actual T connection into the existing branch. The branch and
  foreground continuation clone the original road material and match texture
  density, replacing the lighter, differently colored asphalt.
- Added a small fountain plaza, rose arbor, café courts, planted setbacks, two
  western shopfronts, a market shop behind the florist and two front shops opposite the branch. The western base
  is landscaped; new architecture occupies the formerly sparse paving.
- Added two pavement walkers to the existing core and coastal characters. Their
  routes remain outside the carriageway and shop footprints.
- Added three schools of six modeled fish. Bodies, eyes, fins and articulated
  tails move below the shallower, more transparent water. Two occasional jumpers
  follow gentle arcs and leave fading splash rings. Each jumps for 1.45 seconds
  in a 15-second cycle; their phases are staggered.
- Replaced the rectangular sea boundary with a broad, nonuniform water grid,
  dense near shore and coarse far away. Distant color and highlights blend into
  deeper water. Existing wave animation, moored boat and lighthouse are retained.
- Warmed the curved tile roofs, reduced ambient washout and pushed distance fog
  back. Connected, shaded cumulus lobes replace large blurry cloud patches.
- Added three camera options: new city composition, residential view toward
  ANTELEO, and fish near the pier. Free orbit, WASD, reset, pause and PNG export
  remain available. Total: 12 options.

## Review

- [City and sea](reference-city.png)
- [ANTELEO core](reference-anteleo.png)
- [Residential view toward the café](reference-residential.png)
- [Coast and pier](reference-pier.png)
- [Underwater fish](reference-fish.png)
- [Fish in motion](reference-fish-motion.png)

The supplied image is the composition and style target. These are actual WebGL
renders, not the reference image used as a backdrop. The model is procedural:
individual façades, skyline proportions, street geometry, flower arrangements,
clouds and lighting still differ from the illustration. There is no objective
image-calibration metric in this project, so a verified 95% match is **not**
claimed. The screenshots allow the remaining differences to be reviewed.

The POS remains a visual station; fishing is environmental animation, without a
minigame. Existing van movement and bounded 1.6-second stops are unchanged.

## Validation

- `npm test`: **17 passed**, 0 failed. Includes protected core/annex placement,
  original camera positions, road/pavement connectivity, varied frontage
  footprints, fish trajectory bounds and dynamic fish surviving static batching.
- `npm run build`: successful. Vite reports its non-failing size advisory for
  the approximately 717 kB / 206 kB gzip application bundle.
- Production Chromium: 12 camera choices, reset, POV/WASD/Escape, PNG download
  and portrait layout passed. No JavaScript or shader errors were recorded.
- The jump screenshot advances only the browser test clock by 720 ms while the
  actual scene animation runs; there is no special jump mesh added for the shot.
- Software WebGL initially exceeded a 120-second capture timeout. New roof ribs
  now share cached materials so static batching can merge them; the redundant
  initial paused frame was removed. Review captures completed at 800×500,
  with the final city composition rendered separately. This is not a hardware
  frame-rate benchmark.
- No gameplay, real payment integration, Vercel deployment or environment
  publication was introduced.
