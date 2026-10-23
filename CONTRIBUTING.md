# Contributing

Use Node.js 22 or newer. Run `npm ci`, `npm run build`, `npm run check`, and `npm test`. Start the game with `npm start` and open http://localhost:3000.

Keep changes focused and include reproduction steps for bug fixes. Test keyboard steering from the chase-camera view, both phone orientations, denied motion permission, pause/resume, race restart and offline updates when affected. Never commit secrets, `node_modules`, generated archives or personal data. Rebuild `dist/sw.js` after changing shipped assets.

For pull requests, describe user-visible behavior, relevant validation and known limitations. Changes are contributed under the project's MIT license. Use the issue templates for bugs and feature proposals. Do not post sensitive security reports as public issues; see SECURITY.md.

## Code layout

`dist/game.js` contains the fixed-step simulation, `core.js` shared math/validation, `tilt.js` motion control, `ui.js` settings, `net.js` networking, and `server.js` optional LAN rooms. `dist/index.html`, `site.css`, `site.js` and `models.js` implement the website. Guides are static HTML. `scripts/build.js` regenerates the offline cache manifest using content hashes.
