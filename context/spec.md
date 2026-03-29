---
title: Zoom DnD
type: spec
has_ui: true
features:
  - Hex grid battle map with drag-and-drop tokens
  - Player and monster token placement
  - Screen-share-friendly public view
  - Private DM window for monster hit point tracking
  - Simple and fast — no learning curve
---

# Zoom DnD — Simple Battle Map for Screen-Sharing DMs

## Overview

A web app for dungeon masters who run D&D games over Zoom. Two windows: a **public battle map** that gets screen-shared to players, and a **private DM panel** for tracking monster hit points and notes. The whole point is simplicity — existing D&D apps are overbuilt and hard to use. This should take 30 seconds to set up a combat encounter.

## Core Concept

The DM opens the app, gets two views:

1. **Battle Map** (shareable) — a hex grid where tokens can be dragged around. Players see this via screen share. Clean, clear, no UI clutter on this view.

2. **DM Panel** (private) — shows the same encounter but with monster HP tracking, initiative order, and notes. This window stays on the DM's screen, not shared.

Both views stay in sync. When the DM drags a token on either view, it moves on both.

## Battle Map (Public View)

### The Grid
- Hex-based grid (classic D&D hex map feel)
- Configurable size (sensible default: 20x15 hexes)
- Optional background image (the DM can upload a dungeon map)
- Grid lines visible but subtle — the tokens are the focus

### Tokens
- **Player tokens**: coloured circles with a 1-3 letter label (e.g., "Ari", "Dok", "Val")
- **Monster tokens**: red-tinted circles with a label (e.g., "Gob1", "Gob2", "Ogre")
- Drag and drop to move tokens on the grid
- Right-click or long-press to remove a token from the map
- Tokens snap to hex centres
- Dead monsters get a visual indicator (greyed out, X overlay) but stay on the map

### Adding Tokens
- Simple toolbar at the top (only visible to DM, hidden when screen sharing just the grid area)
- "Add Player" button — prompts for name and colour
- "Add Monster" button — prompts for name, quantity, and max HP
- Adding multiple monsters auto-numbers them (Goblin 1, Goblin 2, etc.)

### Visual Design
- Dark background (easy on the eyes for long sessions, looks good on screen share)
- High contrast tokens
- No animations or effects — clarity over flash
- Large enough to read on a Zoom screen share at 720p

## DM Panel (Private View)

### Monster HP Tracker
- List of all monsters currently on the map
- Each row: name, current HP / max HP, quick damage/heal buttons
- Click on HP to type a number directly
- "Take Damage" button: enter a number, HP decreases
- "Heal" button: enter a number, HP increases
- When HP hits 0: monster is marked dead, token greys out on the battle map
- Colour coding: green (healthy), yellow (bloodied / below 50%), red (critical / below 25%)

### Initiative Tracker
- Simple ordered list
- DM types in initiative values for each token
- Current turn highlighted
- "Next Turn" button advances the tracker
- Round counter

### Notes
- Free-text area for the DM to jot encounter notes
- Persists for the session (localStorage, no backend needed)

## Technical Approach

This is a **single-page app with no backend**. All state lives in the browser (localStorage for persistence across page reloads). The two views (battle map and DM panel) can be:

- Two separate browser windows/tabs on the same machine, synced via BroadcastChannel API or localStorage events
- Or a single window with the DM panel as a collapsible sidebar

The DM shares only the battle map tab/area via Zoom screen share.

### No accounts, no server, no database
- Open the app, start placing tokens
- State saves to localStorage automatically
- Export/import encounter as JSON file for backup

## Pages

### `/` — Main View
- Full-screen hex grid (the battle map)
- Toolbar at top for adding tokens (can be hidden)
- This is what gets screen-shared

### `/dm` — DM Panel
- Split view: battle map on left, HP tracker + initiative + notes on right
- Or: the DM panel opens as a separate window via `window.open()`
- Syncs with the main view in real time

## Non-Functional Requirements

- Must work in Chrome and Firefox (Zoom screen share targets)
- Must be readable at 720p screen share resolution
- Must feel instant — no loading spinners, no server calls
- Touch-friendly for DMs using tablets
- Total bundle size under 500KB (no heavy frameworks)
- Works offline once loaded (no backend dependency)
