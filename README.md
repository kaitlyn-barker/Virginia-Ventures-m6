# Virginia Today: Industry Explorer

Module 6 of *Virginia Ventures: Economic Explorers*, a 5th-grade economics and Virginia history course. A WebXR field trip built with the [Immersive Web SDK (IWSDK)](https://github.com/meta-quest/immersive-web-sdk) for Meta Quest 3S. You stand at a Virginia map with Foreman Fox, point at a glowing marker to travel to one of four modern industries, make the calls that keep it running, and earn a stamped Explorer Report at the end.

Runs in any WebXR-capable browser on desktop (point and click) and enters Immersive VR on a headset.

## The tour

A hub-and-spoke trip, about 30 to 35 minutes. From the map you visit four stops in any order:

1. **Tech Office, Northern Virginia.** Decide where to build a data center using power, internet, and cost. Shows why technology clustered in Northern Virginia.
2. **Port of Virginia, Norfolk.** The signature mini-game: load color-coded shipping containers onto the matching ship before it sails. Shows global trade and why Virginia is a shipping hub.
3. **Tourism Hub, Colonial Williamsburg.** Set the ticket price and balance crowds against preserving the historic site. Shows pricing and tradeoffs.
4. **Modern Farm, Shenandoah Valley.** Read the drone's soil data and water or plant only where it is needed. Shows how farming adapted with technology.

Finishing a stop stamps its marker on the map. Once all four are done, the map rises into an **Explorer Report**: three meters fill one at a time with a 1 to 3 star rating and a line of feedback, a combined Virginia title, and a printable page the teacher can collect.

## The three meters

Each choice moves three scores that accumulate across all four stops:

- **Economic Impact**
- **Innovation Thinking**
- **Problem Solving**

## Play

- **Look:** right-mouse drag on desktop (the headset owns the view in VR)
- **Interact:** left-click markers, cards, containers, and ships (or point and pull the trigger in VR)
- **No walking:** you stand at each stop and the world comes to you. Travel between stops is a gentle map fade, never continuous movement.

## Develop

Requires Node `>=20.19` (or `>=22.12`).

```bash
npm install
npm run dev        # start the IWSDK dev server (HTTPS via mkcert)
npm run typecheck  # tsc --noEmit
npm run build      # production build to dist/
npm run preview    # preview the production build
```

UI panels are authored in `ui/*.uikitml` and compiled to `public/ui/*.json` at build time by the Vite UIKitML plugin. Game logic lives in `src/` (`index.ts` is the world entry point; `environment.ts` provides the scene and 3D primitive helpers, and `sfx.ts` provides the file-free WebAudio sound). All tunable values live in labeled CONSTANTS blocks in `index.ts`.

## Deploy

Pushing to `main` triggers the GitHub Actions workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which builds the project and publishes `dist/` to GitHub Pages. The Vite `base` is set to `'./'` so the site works from a project-page subpath.

## Tech

[IWSDK](https://github.com/meta-quest/immersive-web-sdk) (ECS + reactive signals over Three.js) · [Vite](https://vitejs.dev/) · TypeScript · WebXR.
