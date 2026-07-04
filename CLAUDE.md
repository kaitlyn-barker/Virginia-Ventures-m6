# Virginia Ventures: Module 6 Project Brief

Read this file at the start of every session. It governs all work on this project.

## What this is
"Virginia Today: Industry Explorer" is the Module 6 VR simulation of Virginia Ventures: Economic Explorers, a ten-module 5th-grade economics and Virginia history course. It is a WebXR experience built with IWSDK 0.4.2, played on Meta Quest 3S, deployed to GitHub Pages. This repo began as a copy of the Module 8 "Boss for a Day" build, so the engine, the report system, and the helpers are already here and proven.

## Learning objectives
1. Describe how Virginia's economy shifted from manufacturing and industry to technology and services.
2. Identify the major modern Virginia industries: technology, defense, shipping, and tourism.
3. Explain how the internet and global trade changed the kinds of jobs and businesses in Virginia.

## Shape of the experience (hub and spoke, about 30 to 35 minutes)
- Hub: a Virginia map. The student stands at the map and sees four glowing location markers. Foreman Fox hosts. Pointing at a marker fades the screen and drops the student standing inside that location. Finishing a location returns them to the map, where the visited marker lights up and gets a stamp.
- Four stops, visited in any order:
  1. Tech Office, Northern Virginia. The student decides where to build a data center using power, internet, and cost. Teaches why technology clustered in Northern Virginia. Decision segment.
  2. Port of Virginia, Norfolk. SIGNATURE STOP, a custom mini game (not a decision segment). The student grabs color-coded shipping containers and loads each onto the matching ship before it sails. Teaches global trade and why Virginia is a shipping hub.
  3. Tourism Hub, Colonial Williamsburg. The student sets ticket price and balances crowds against preserving the historic site. Teaches pricing and tradeoffs, and ties back to the course history. Decision segment.
  4. Modern Farm, Shenandoah Valley. The student reads a drone's soil data and waters or plants only where needed. Teaches that farming adapted with technology. Callback to Module 4. Decision segment.
- Explorer Report: the map rises with all four markers stamped. Three meters fill one at a time, each with a 1 to 3 star rating and one sentence of feedback, then a combined title, then Save My Report (a printable page the teacher can collect).

## The three meters (accumulate across all four stops, 0 to 100 each)
- Economic Impact
- Innovation Thinking
- Problem Solving
All tuning for how each choice moves these lives in the CONSTANTS block.

## Reuse from Module 8 (do not rebuild these)
- The accumulate-then-report engine. In Module 8 it ran a multi-part day; here it runs a multi-stop tour. A stop is the analog of a day segment.
- The report card system. Keep the existing element ids so the bar-filling logic keeps working. Reskin only.
- The visible-consequences readouts: color-coded per-meter change, green for gains, red for drops. Reuse for every stop's result.
- The 3D primitive helpers meshBox, meshCyl, meshSphere for all in-headset visuals.
- The setInterval follow-loop pattern for anything that must track the view.

Note: the Module 8 "Money Moves" carcass has been removed (the HUD, the phase machine, the shop system, shops.ts, and 15 dead UI panels are gone; the dead audio and GLTF assets are gone too). A few Module 8 shop-builder functions remain uncalled and inert in environment.ts, pending a focused sweep.

## File map (current source layout)
- src/index.ts — the experience shell and all runtime logic, inside one World.create callback: the world/spawn, onboarding, hub + visit loop, the shared decision runner, the Port mini-game, and the Explorer Report reveal. This is "the shell."
- src/stops-data.ts — all tunable DATA and copy (pure data, no world/scene refs): HUB, STOPS, ONBOARD/ONBOARD_LINES, DECISION_PACKS, the per-stop staging and backdrop tuning, the PORT mini-game config, and the REPORT copy. Adding or tuning a stop should mean editing this file. This is "the data."
- src/environment.ts — the base world (sky, light, floor, boundary) plus the shared in-headset visual helpers: the mesh primitives and the canvas card builders (title, text, button, choice, info, goal, readout, speech bubble, Explorer Report card).
- src/sfx.ts — synthesized WebAudio cues and the per-stop ambient beds (no audio files).
- A deeper split of index.ts into per-feature logic modules (hub / runner / port / report / onboarding) would require refactoring the single World.create closure into injected functions; it is deferred so it does not risk the working experience.

## Content-pack architecture (this is how we stay fast)
Build the stop shell once: arrive, Fox intro line, run the challenge, show the result, return to the map, add the score. Each of the four stops is then DATA: its name, props, Fox line, and challenge config. Three stops share the decision-segment grammar; the Port is the one custom mechanic. Adding or tuning a stop should mean editing data, not the shell.

## Audience rules (apply to all student-facing text)
- 5th-grade reading level, second-person voice, short sentences.
- Every economic term gets a plain-language explanation in the moment.
- Encouraging tone. No fail states. Give partial credit and a gentle retry.
- No em dashes anywhere.
- No SOL codes in student-facing content; teacher-facing materials only.
- Avoid wording that reads as AI generated.

## VR comfort (non-negotiable, these are kids)
- No artificial locomotion. The student stands still at each stop and the world comes to them. Travel between stops is the map fade, never continuous movement.
- Nothing flashes rapidly. Panels sit at comfortable kid height and distance.
- Prefer icons, meters, and short labels over text. In-headset text must be large and readable.

## IWSDK 0.4.2 technical conventions
- Import from @iwsdk/core. Never import directly from three.js.
- requestAnimationFrame pauses in the headset. Use setInterval for every loop, including UI follow loops, at about 33ms.
- DOM elements render only on the laptop, not in the headset. Anything that must be visible in-headset uses 3D primitives.
- All tunable values (positions, prices, thresholds, meter effects, timers) live in one labeled CONSTANTS block. Never hardcode them inline.
- Specify each location's prop placement in z up front. The student spawns near the back at about z plus 7 and looks toward the scene at about z minus 8. The open floor for props is z below 0. Place props beyond the interaction stations toward the storefront, not back at the spawn point.
- A stop counts as complete only when the student actually finishes its challenge, not by walking in and out. Only completion stamps the marker and adds the score.

## Build discipline
- One focused change per prompt. Verify in the headset or a desktop screenshot, then commit, then continue.
- Every prompt states what already exists, what to change, and what not to touch.
