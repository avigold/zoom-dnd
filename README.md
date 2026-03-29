# Zoom D&D

A battle map app for dungeon masters who run their D&D games over Zoom.

Two windows: one you screenshare to your players showing the hex grid with all tokens, and a private DM window for managing monster HP, initiative order, and notes — so you don't have to scratch it down on a piece of paper.

## Features

- **Hex grid battle map** — full-screen, auto-sized to fill the browser window
- **Player & monster tokens** — color-coded, drag-and-drop placement
- **DM panel** — collapsible, translucent overlay with:
  - Add/edit/remove players and monsters
  - Monster HP tracking with damage, heal, and direct edit
  - Color-coded HP bars (healthy/bloodied/critical/dead)
  - Initiative tracker with turn order and round counter
  - Background map image upload
  - Session notes
  - Reset encounter
- **Cross-tab sync** — both windows stay in sync via BroadcastChannel (no backend needed)
- **LocalStorage persistence** — encounter state survives page refreshes
- **Auto-shrinking labels** — token names scale down to fit within hex boundaries
- **Clean player view** — no UI clutter on the screenshared window

## How it works

1. Open the app in your browser
2. Click the **DM** button (top-right) to open the private DM panel in a second window
3. Add players and monsters from the DM panel toolbar
4. Click empty hexes on the grid to place unpositioned tokens
5. Drag tokens to move them, right-click (or long-press on touch) to remove
6. Screenshare the main window over Zoom — your players see the battle map
7. Use the DM panel to track HP, initiative, and notes privately

## Tech stack

- TypeScript
- React
- HTML Canvas (hex grid rendering)
- Tailwind CSS
- Vite
- Vitest

## Getting started

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`. The DM view is at `/dm`.

## Project structure

```
src/
  app-shell/        # Page components and routing
  dm-panel/         # DM panel UI (token toolbar, HP tracker, initiative, notes)
  encounter-state/  # State management (reducer, context, persistence, sync)
  hex-canvas/       # Hex grid rendering, interaction, and math
```

## License

MIT
