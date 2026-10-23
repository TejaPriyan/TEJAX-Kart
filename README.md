# TEJAX KART — Apex Protocol

Free 3D arcade racing for desktop browsers and an installable mobile web app, with six cars, three circuits, five solo modes and optional LAN multiplayer. TEJAX KART is a racing game website.

## Play

- Public website: https://tejax-kart-apex.greenlarch1024.chatgpt.site/
- Desktop: open the game in the browser. There is no Windows download or installer.
- Mobile: use Install / Add to Home Screen. Open Settings, enable tilt, allow motion access and calibrate. Optional auto-acceleration, sensitivity, inversion and touch pedals are included. Wait for Offline ready before disconnecting.
- This is a web app, not an APK/IPA or app-store release. Motion support varies by device; touch controls remain available. A physical Android/iPhone acceptance check is still recommended before advertising device-specific compatibility.

## Run locally

Use Node.js 22 or newer:

```sh
npm ci
npm run build
npm run check
npm test
npm start
```

Open http://localhost:3000. To test service-worker installation locally, use `http://localhost:3000/?offline-test`. Normal localhost development avoids cache interference.

For 2–6 player LAN sessions, every player opens the same host at `http://YOUR-PC-LAN-IP:3000`. The host creates the room and selects the track. HTTP LAN addresses usually cannot access motion sensors: use touch controls or configure trusted HTTPS. The public static site has no public multiplayer backend; internet play needs a separately hosted WSS server. See SECURITY.md before exposing the Node server outside a trusted LAN.

## Combat update (6.2)

Crimson Canyon now has correctly scaled sandstone formations with measured track clearance. Auto-fire detects visible rivals ahead and leads blaster shots; disable it in Settings for manual fire. E launches a guided missile. Four new pickups add Rapid Fire, Plasma Rounds, Pickup Magnet and Ability Recharge. The eight pickups use different models and labels, with active buffs shown on the HUD. Combat rules and power-up effects are shared with the authoritative LAN server.

## Controls

W/Up accelerates; S/Down brakes or reverses; A/Left steers left; D/Right steers right. Space drifts, Shift boosts, F/E fires blaster/missile, Q/T/G uses mine/EMP/oil, X/Z uses the signature ability, C changes camera, Escape pauses solo play, R restarts solo play. The pit menu never pauses LAN opponents. Mines and oil are unavailable in LAN races.

Race and Time trial disable weapons. Combat is a three-lap race, Elimination is last-driver-standing, and Survival adds enemy waves. Ordered checkpoints prevent shortcut finishes. All cars and paints are unlocked; credits are local career scores, not currency.

## Project and deployment

### GitHub Pages

In repository Settings → Pages, select **GitHub Actions** as the source. `.github/workflows/pages.yml` builds and checks the game, uploads only `dist/`, and publishes it after pushes to `main`. The project URL is https://tejapriyan.github.io/TEJAX-Kart/. For an existing `main / (root)` source, the root `index.html` forwards visitors to the game website in `dist/`, and `.nojekyll` preserves the static files. The Actions source is preferred because it publishes only the game assets.

### Vercel

Import this repository with the repository root as Root Directory. `vercel.json` selects the **Other** framework preset, runs `npm run build && npm run check`, and publishes `dist/` as static files. The existing project domain is https://tejax-kart.vercel.app/. The browser runs the game; the optional LAN `server.js` is excluded from Vercel uploads. Do not configure a catch-all server function or Express preset for this static deployment.

Use this repository description: **Free 3D arcade racing game with automatic combat targeting, six cars, three circuits, and installable mobile tilt controls.** Suggested topics: `racing-game`, `threejs`, `webgl`, `browser-game`, `pwa`, `javascript`.

### Existing Sites publication and SEO

`dist/` is the complete static site. Host it over HTTPS. `.openai/hosting.json` binds this working copy to its existing Sites project; do not create another project for routine updates. Keep the canonical origin in the HTML, sitemap.xml, robots.txt, llms.txt and scripts/check.js aligned if you move domains. Rebuild after any shipped file change: `npm run build` hashes the assets and generates `dist/sw.js`. Users activate new versions with the Update game button between races.

The website includes static guides, factual JSON-LD, canonical and social metadata, sitemap.xml, robots.txt and an optional llms.txt reading aid. These support SEO and clear answers for search/AI systems; none guarantees indexing, rich results or rankings. No Search Console property or sitemap submission is configured by the code. Google guidance: https://developers.google.com/search/docs/appearance/ai-features

GitHub-ready CI, Dependabot, issue templates, pull request template and contribution/security policies are included. Repository: https://github.com/TejaPriyan/TEJAX-Kart

## Validation and limits

`npm test` checks steering direction, motion permission/fallback/calibration, collisions, stored data validation, full simulated races on every track, restart cleanup and real WebSocket room authority. The gameplay harness uses real Three.js objects and a stub renderer; it does not measure GPU performance. Browser checks cover layout, controls, settings and offline installation. Physical phone sensor and installation behavior needs device testing. The optional LAN server bounds movement and owns combat/progress; it is not full authoritative physics or comprehensive anti-cheat.

## License

MIT — see LICENSE. Preserve THIRD_PARTY_NOTICES.md and the bundled Three.js license when redistributing. See CHANGELOG.md and CONTRIBUTING.md for development details.
