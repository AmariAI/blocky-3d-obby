# Blocky Obby

A browser-based 3D obstacle course made with Three.js. Run, jump, collect coins, unlock small aura and trail boosts, race three friendly local AI bots, and tackle a course that ramps from Easy to Expert.

## Play

Run a local web server from the project folder (the game imports Three.js as an ES module):

```bash
python -m http.server 8000
```

Open <http://localhost:8000> in your browser. You can also publish the repository with GitHub Pages.

## Controls

- **Desktop:** WASD or arrow keys to move; Space to jump
- **Mobile/tablet:** use the on-screen direction pad to move and the Jump button to hop; hold multiple controls together to move and jump
- **Shop:** open the upgrade panel; press Escape or × to close
- Collect coins along the route, and use checkpoints to save your place

## AI racers

Three local NPC bots navigate the same platform route as the player. They approach platform edges, time jumps, react at different speeds, can hit hazards, and use checkpoints when they fall. They are simulated in this browser session; there is no online multiplayer or player tracking.

## Upgrades and difficulty

Coins buy visual auras and trails with modest movement bonuses. Aura upgrades increase jump power; trail upgrades increase movement speed. Across all upgrades, bonuses are capped at +18% speed and +12% jump height. The course grows more demanding in four stages: wider Easy platforms, narrower Medium jumps, Hard hazards, then the narrow Expert finish.

Coin balance and purchased upgrades are saved in the current browser using local storage. This is a local game save, not an online account.

## Project files

- `index.html` — game HUD, shop panel, touch controls, and win screen
- `style.css` — responsive interface styles
- `game.js` — Three.js scene, AI racers, course, controls, coins, shop, and upgrades
