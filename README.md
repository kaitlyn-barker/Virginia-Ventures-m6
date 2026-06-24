# Money Moves

A walkable WebXR financial-literacy game built with the [Immersive Web SDK (IWSDK)](https://github.com/meta-quest/immersive-web-sdk). Pick a shop, run it for a day across three stages of money decisions — pricing, saving, investing, and spreading funds around — guided by a mentor and tracked by three live meters. At close, a daily report reflects your choices back as a "money personality."

Runs in any WebXR-capable browser on desktop (mouse + keyboard) and enters Immersive VR on a headset.

## Play

- **Walk:** `WASD` / arrow keys (or thumbstick in VR)
- **Look:** right-mouse drag (the headset owns the view in VR)
- **Interact:** left-click panels and cards (or point-and-trigger in VR)

Walk up to Gus and the shop stations to trigger each stage. The three meters — Customer Satisfaction, Business Profit, and Owner's Instinct — respond to your decisions.

## Develop

Requires Node `>=20.19` (or `>=22.12`).

```bash
npm install
npm run dev        # start the IWSDK dev server (HTTPS via mkcert)
npm run typecheck  # tsc --noEmit
npm run build      # production build to dist/
npm run preview    # preview the production build
```

UI panels are authored in `ui/*.uikitml` and compiled to `public/ui/*.json` at build time by the Vite UIKitML plugin. Game logic lives in `src/` (`index.ts` is the world entry point; `environment.ts`, `shops.ts`, and `sfx.ts` provide the scene, shop packs, and audio).

## Deploy

Pushing to `main` triggers the GitHub Actions workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which builds the project and publishes `dist/` to GitHub Pages. The Vite `base` is set to `'./'` so the site works from a project-page subpath.

## Tech

[IWSDK](https://github.com/meta-quest/immersive-web-sdk) (ECS + reactive signals over Three.js) · [Vite](https://vitejs.dev/) · TypeScript · WebXR.
