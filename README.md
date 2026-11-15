# Blocky Obby

A small 3D web game built with Three.js. The player is a blocky character, and the goal is to reach the glowing cube at the end of the obby.

## Play locally

Option 1: open `index.html` directly in a browser.

Option 2: run a tiny local server:

```bash
cd blocky-3d-obby
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## Controls

- `W`, `A`, `S`, `D`: move
- `Space`: jump
- Reach the green crystal to win

## Files

- `index.html`: page shell
- `style.css`: HUD and screen styling
- `game.js`: Three.js gameplay logic and level generation

## Notes

This is a lightweight browser game designed for quick play in a GitHub-hosted repo and easy local editing.
