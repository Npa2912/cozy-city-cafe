# Development environment

Use the existing checkout; do not create a worktree for ordinary development.
The cloud task already supplies an isolated workspace.

Node.js 24 and npm 11 are available in the prepared environment. Vite supports
Node.js 20.19+ or 22.12+; prefer Node.js 24 here.

```sh
cd /workspace/cozy-city-cafe
npm ci
npm run dev
```

Production commands and Vercel settings are in README.md. No secrets or other
services are required. Keep TLS and lockfile integrity checks enabled.

Browser validation uses Chromium with WebGL. On headless machines without a
GPU, Chromium's SwiftShader renderer can be used for visual checks. Production
should use the browser's normal hardware acceleration. Camera orbit, reference
reset, WASD pointer lock, PNG download, and portrait layout should be checked
when editing the controls. The architecture is static; the van and pedestrians are animated. Use the
pause button (or reduced-motion emulation) for repeatable visual comparisons.
Run `npm test` for traffic, walking-lane and dynamic-batching checks.
