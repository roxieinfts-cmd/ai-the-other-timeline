# AFTER SCHOOL

A buildless HTML/CSS/JavaScript interactive narrative prototype.

## Run locally

Serve this folder with any static web server. The game has no build step and no backend.

## Content

- `content.js` contains locations, daily activities, story events, choices and endings.
- `game.js` contains the five-day exploration loop, state, routing, save/load and ending logic.
- `styles.css` contains the responsive pixel-campus interface.
- The PNG files contain the original generated scene art.
- `activity-atlas.png` is the original 4×4 character portrait and activity-scene atlas used by dialogue, phone, and result screens.

## Current vertical slice

- Monday–Friday exploration, with a fresh daily route
- Five freely selectable locations: library, basketball court, canteen, bus stop/MRT and home
- Multiple location activities per day, plus optional and main story events
- Every activity includes a second decision about AI use; library and basketball offer expanded assist/learn/replace paths
- Full-delegation choices reclaim the current hour for one activity at a different location; reclaimed hours cannot be delegated again
- The phone publishes a new Maya group-project task and Jay basketball task each day, each with AI-use decisions and relationship consequences
- Tuesday–Friday begin with the phone's daily task briefing; Singapore school-life language and pixel-map landmarks ground the setting
- The MRT route leads to social and enrichment outings: mall time with friends, cinema, and tuition, each with contextual AI choices
- After 8:40 PM, only home activities remain; one final hour ends automatically at 9:40 PM with mandatory sleep
- The final HDB visit offers one remaining original home activity before forced sleep; scene-specific procedural chiptune BGM and button sounds share the SOUND toggle
- Five one-hour activity blocks per day, daily activity limits, closing times and a Friday deadline safeguard
- Time, project, connection and personal state
- Delayed consequences and six ending routes
- Browser-local save state
- Desktop and mobile layouts

The story and its numerical effects are fictional design assumptions. No live AI or real student assessment is used.
