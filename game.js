import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 42, 145);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 260);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x486078, 1.45));
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(-12, 24, -4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);

const $ = (selector) => document.querySelector(selector);
const coinCountEl = $('#coin-count');
const stageLabel = $('#stage-label');
const progressLabel = $('#progress-label');
const progressBar = $('#progress-bar');
const shopPanel = $('#shop-panel');
const shopItems = $('#shop-items');
const toast = $('#toast');
const finishMessage = $('#message');
const keys = Object.create(null);
const clock = new THREE.Clock();
let toastTimer;
let shopOpen = false;
let finished = false;

// Purchases and collected coins persist in this browser, not on a server.
const saveKey = 'blocky-obby-save-v2';
const saved = (() => {
  try { return JSON.parse(localStorage.getItem(saveKey)) || {}; } catch { return {}; }
})();
const save = {
  coins: Number.isFinite(saved.coins) ? Math.max(0, saved.coins) : 0,
  owned: Array.isArray(saved.owned) ? saved.owned : [],
};
function persist() {
  try { localStorage.setItem(saveKey, JSON.stringify(save)); } catch { /* Saving is optional. */ }
  coinCountEl.textContent = save.coins;
}

const upgrades = [
  { id: 'mint-aura', name: 'Mint Aura', kind: 'Aura', icon: '🟢', cost: 8, color: 0x5ef2c2, speed: 0, jump: 0.25, note: '+0.25 jump height · glowing aura' },
  { id: 'comet-trail', name: 'Comet Trail', kind: 'Trail', icon: '☄️', cost: 12, color: 0x67c7ff, speed: 0.45, jump: 0, note: '+0.45 move speed · comet particles' },
  { id: 'sun-aura', name: 'Sunrise Aura', kind: 'Aura', icon: '🌅', cost: 18, color: 0xffaa55, speed: 0, jump: 0.3, note: '+0.30 jump height · warm glow' },
  { id: 'starlight-trail', name: 'Starlight Trail', kind: 'Trail', icon: '✨', cost: 22, color: 0xc49aff, speed: 0.55, jump: 0, note: '+0.55 move speed · starry trail' },
  { id: 'aurora-aura', name: 'Aurora Aura', kind: 'Aura', icon: '🌈', cost: 30, color: 0x76f6ff, speed: 0, jump: 0.35, note: '+0.35 jump height · aurora glow' },
  { id: 'rainbow-trail', name: 'Rainbow Trail', kind: 'Trail', icon: '🌈', cost: 35, color: 0xff78cb, speed: 0.6, jump: 0, note: '+0.60 move speed · rainbow trail' },
];
function stats() {
  const owned = upgrades.filter((item) => save.owned.includes(item.id));
  return {
    speed: Math.min(1.6, owned.reduce((sum, item) => sum + item.speed, 0)),
    jump: Math.min(0.9, owned.reduce((sum, item) => sum + item.jump, 0)),
  };
}
function showToast(text) {
  toast.textContent = text;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 1900);
}
function renderShop() {
  shopItems.replaceChildren();
  const current = stats();
  for (const item of upgrades) {
    const owned = save.owned.includes(item.id);
    const card = document.createElement('article');
    card.className = 'shop-card';
    const icon = document.createElement('span');
    icon.className = 'item-icon';
    icon.textContent = item.icon;
    icon.style.boxShadow = `inset 0 0 0 1px #${item.color.toString(16).padStart(6, '0')}66`;
    const info = document.createElement('div');
    const title = document.createElement('p');
    title.className = 'item-title';
    title.textContent = `${item.name} · ${item.kind}`;
    const description = document.createElement('p');
    description.className = 'item-description';
    description.textContent = item.note;
    info.append(title, description);
    const button = document.createElement('button');
    button.className = 'buy-button';
    button.type = 'button';
    button.textContent = owned ? 'Owned ✓' : `🪙 ${item.cost}`;
    button.disabled = owned || save.coins < item.cost || (item.speed > 0 && current.speed >= 1.6) || (item.jump > 0 && current.jump >= 0.9);
    button.setAttribute('aria-label', owned ? `${item.name} owned` : `Buy ${item.name} for ${item.cost} coins`);
    button.addEventListener('click', () => {
      if (save.coins < item.cost || save.owned.includes(item.id)) return;
      save.coins -= item.cost;
      save.owned.push(item.id);
      persist();
      renderShop();
      updateEffects();
      showToast(`${item.name} equipped!`);
    });
    card.append(icon, info, button);
    shopItems.append(card);
  }
}
function setShop(open) {
  shopOpen = open;
  shopPanel.hidden = !open;
  if (open) { renderShop(); $('#close-shop').focus(); }
  else { $('#shop-button').focus(); }
}
$('#shop-button').addEventListener('click', () => setShop(true));
$('#close-shop').addEventListener('click', () => setShop(false));
shopPanel.addEventListener('click', (event) => { if (event.target === shopPanel) setShop(false); });
window.addEventListener('keydown', (event) => {
  if (event.code === 'Escape' && shopOpen) setShop(false);
  keys[event.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
});
window.addEventListener('keyup', (event) => { keys[event.code] = false; });

// Color, width, and hazards ramp up as the course advances through four stages.
const stageNames = ['Easy', 'Medium', 'Hard', 'Expert'];
const stageColors = [0x61d98b, 0x53c9d2, 0xffbf55, 0xf27691];
const platforms = [];
const addPlatform = (x, z, w, d, top, stage, checkpoint = false) => {
  const h = 0.75;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: stageColors[stage], roughness: 0.72 }));
  mesh.position.set(x, top - h / 2, z);
  mesh.castShadow = mesh.receiveShadow = true;
  scene.add(mesh);
  platforms.push({ x, z, w, d, top, stage, checkpoint, mesh });
};
addPlatform(0, 0, 13, 13, 0, 0, true);
const route = [
  [0, 10, 9.5, 7.5, 0, 0], [3, 18, 8.5, 7, 0.2, 0], [-2, 26, 8, 7, 0.2, 0], [2, 34, 8, 7, 0.4, 0],
  [6, 42, 7, 6.5, 0.4, 1], [1, 50, 7, 6, 0.7, 1], [-5, 58, 6.5, 6, 0.7, 1], [0, 66, 6.5, 6, 1, 1],
  [-5, 74, 6, 5.5, 1, 2], [2, 82, 5.5, 5.5, 1.25, 2], [7, 90, 5.5, 5, 1.25, 2], [0, 98, 5.5, 5.5, 1.5, 2],
  [6, 106, 5, 5, 1.5, 3], [-1, 114, 4.7, 5, 1.8, 3], [-7, 122, 4.5, 4.8, 1.8, 3], [0, 130, 5, 5, 2, 3],
];
route.forEach(([x, z, w, d, top, stage], index) => addPlatform(x, z, w, d, top, stage, (index + 1) % 4 === 0));
const endPlatform = { x: 0, z: 139, w: 12, d: 12, top: 2, stage: 3 };
addPlatform(endPlatform.x, endPlatform.z, endPlatform.w, endPlatform.d, endPlatform.top, 3, true);

// Simple scenery under/around the course.
const island = new THREE.Mesh(new THREE.BoxGeometry(170, 1, 170), new THREE.MeshStandardMaterial({ color: 0x52667a, roughness: 1 }));
island.position.set(0, -14, 68);
scene.add(island);
const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
for (let i = 0; i < 16; i++) {
  const cloud = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), cloudMaterial);
  cloud.scale.set(2 + (i % 3), 0.55, 1.1 + (i % 2));
  cloud.position.set(Math.sin(i * 2.4) * 23, 12 + (i % 4) * 2, i * 9 - 5);
  scene.add(cloud);
}

// Hazards sit on selected platforms; the final stages have more of them.
const hazards = [];
const hazardSpecs = [
  [1, 0, 0, 1.6], [3, -1.6, 0, 1.5], [5, 0, 0, 1.5], [6, 1.7, 0, 1.5],
  [8, 0, 0, 1.4], [9, -1.2, 0, 1.35], [10, 1.3, 0, 1.3], [12, 0, 0, 1.2], [13, 1, 0, 1.1], [14, -0.8, 0, 1.1],
];
for (const [platformIndex, offsetX, offsetZ, size] of hazardSpecs) {
  const platform = platforms[platformIndex + 1];
  if (!platform) continue;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, 0.9, size), new THREE.MeshStandardMaterial({ color: 0xf04462, emissive: 0x7d1027, emissiveIntensity: 0.5 }));
  mesh.position.set(platform.x + offsetX, platform.top + 0.45, platform.z + offsetZ);
  mesh.castShadow = true;
  scene.add(mesh);
  hazards.push({ mesh, x: mesh.position.x, z: mesh.position.z, radius: size * 0.72 });
}

// Coins are placed along the route, with extra coins after checkpoints.
const coins = [];
const coinGeometry = new THREE.TorusGeometry(0.38, 0.12, 8, 18);
const coinMaterial = new THREE.MeshStandardMaterial({ color: 0xffd34e, emissive: 0x9a5d00, emissiveIntensity: 0.55, metalness: 0.3, roughness: 0.35 });
for (let i = 1; i < platforms.length; i++) {
  const platform = platforms[i];
  const coin = new THREE.Mesh(coinGeometry, coinMaterial);
  coin.position.set(platform.x, platform.top + 1.4, platform.z);
  coin.rotation.x = Math.PI / 2;
  coin.castShadow = true;
  scene.add(coin);
  coins.push({ mesh: coin, collected: false });
}

const goal = new THREE.Mesh(new THREE.OctahedronGeometry(1.2), new THREE.MeshStandardMaterial({ color: 0xa3f55e, emissive: 0x4b9019, emissiveIntensity: 0.8, roughness: 0.3 }));
goal.position.set(0, endPlatform.top + 2.3, endPlatform.z);
goal.castShadow = true;
scene.add(goal);
const goalRing = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.11, 10, 48), new THREE.MeshStandardMaterial({ color: 0xe9ff9d, emissive: 0x83a61d, emissiveIntensity: 0.6 }));
goalRing.position.set(0, endPlatform.top + 1.5, endPlatform.z);
scene.add(goalRing);

const player = new THREE.Group();
const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xffb833, roughness: 0.7 });
const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.05, 0.55), bodyMaterial);
torso.position.y = 1.25;
torso.castShadow = true;
player.add(torso);
const head = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.78, 0.78), new THREE.MeshStandardMaterial({ color: 0xffd9a0, roughness: 0.75 }));
head.position.y = 2.2;
head.castShadow = true;
player.add(head);
const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.035), new THREE.MeshStandardMaterial({ color: 0x24324c }));
eyes.position.set(0, 2.24, 0.405);
player.add(eyes);
const legs = [];
for (const x of [-0.23, 0.23]) {
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.55, 0.34), new THREE.MeshStandardMaterial({ color: 0x4654a4, roughness: 0.8 }));
  leg.position.set(x, 0.48, 0);
  leg.castShadow = true;
  player.add(leg);
  legs.push(leg);
}
scene.add(player);
const aura = new THREE.Mesh(new THREE.SphereGeometry(1.55, 16, 12), new THREE.MeshBasicMaterial({ color: 0x5ef2c2, transparent: true, opacity: 0.16, wireframe: true }));
aura.position.y = 1.2;
aura.visible = false;
player.add(aura);
const trailParticles = [];
const particleGeometry = new THREE.BoxGeometry(0.22, 0.22, 0.22);
const trailColors = [0x67c7ff, 0xc49aff, 0xff78cb];
function updateEffects() {
  const ownedAuras = upgrades.filter((item) => item.kind === 'Aura' && save.owned.includes(item.id));
  const ownedTrails = upgrades.filter((item) => item.kind === 'Trail' && save.owned.includes(item.id));
  aura.visible = ownedAuras.length > 0;
  if (ownedAuras.length) aura.material.color.setHex(ownedAuras[ownedAuras.length - 1].color);
  for (const p of trailParticles) scene.remove(p.mesh);
  trailParticles.length = 0;
  const trail = ownedTrails.at(-1);
  if (trail) {
    const material = new THREE.MeshBasicMaterial({ color: trail.color, transparent: true, opacity: 0.8 });
    for (let i = 0; i < 8; i++) {
      const mesh = new THREE.Mesh(particleGeometry, material.clone());
      mesh.visible = false;
      scene.add(mesh);
      trailParticles.push({ mesh, life: 0 });
    }
  }
}
updateEffects();

let checkpoint = new THREE.Vector3(0, 0.05, 0);
let currentCheckpointIndex = 0;
let velocityY = 0;
let onGround = false;
let jumpWasDown = false;
let elapsed = 0;
player.position.copy(checkpoint);
persist();

function activateCheckpoint(platform, index) {
  if (!platform.checkpoint || index <= currentCheckpointIndex) return;
  currentCheckpointIndex = index;
  checkpoint.set(platform.x, platform.top + 0.05, platform.z);
  showToast('Checkpoint saved!');
}
function respawn() {
  player.position.copy(checkpoint);
  velocityY = 0;
  onGround = false;
}
function collectCoins() {
  for (const coin of coins) {
    if (!coin.collected && player.position.distanceTo(coin.mesh.position) < 1.35) {
      coin.collected = true;
      scene.remove(coin.mesh);
      save.coins += 1;
      persist();
      showToast('+1 coin');
    }
  }
}
function updateProgress() {
  const progress = THREE.MathUtils.clamp(player.position.z / endPlatform.z, 0, 1);
  const percent = Math.floor(progress * 100);
  progressLabel.textContent = `${percent}%`;
  progressBar.style.width = `${percent}%`;
  const stage = Math.min(3, Math.floor(progress * 4));
  const label = stage === 0 ? 'Easy · Warm-up' : stage === 1 ? 'Medium · Narrow jumps' : stage === 2 ? 'Hard · Hazards ahead' : 'Expert · Final stretch';
  stageLabel.textContent = finished ? 'Complete · Champion!' : label;
}
function nearHazard() {
  return hazards.some((hazard) => Math.abs(player.position.x - hazard.x) < hazard.radius + 0.34 && Math.abs(player.position.z - hazard.z) < hazard.radius + 0.34 && player.position.y < hazard.mesh.position.y + 1.5);
}
function updateTrail(delta, moving) {
  for (const particle of trailParticles) {
    particle.life -= delta;
    if (particle.life <= 0 && moving && onGround && Math.random() < 0.16) {
      particle.life = 0.42;
      particle.mesh.position.set(player.position.x + (Math.random() - 0.5) * 0.55, player.position.y + 0.2, player.position.z + 0.3);
      particle.mesh.scale.setScalar(0.8 + Math.random() * 0.7);
    }
    particle.mesh.visible = particle.life > 0;
    if (particle.mesh.visible) {
      particle.mesh.material.opacity = Math.max(0, particle.life / 0.42) * 0.75;
      particle.mesh.position.y += delta * 0.45;
    }
  }
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.035);
  elapsed += delta;
  const previousY = player.position.y;
  let moving = false;
  if (!shopOpen && !finished) {
    let moveX = Number(Boolean(keys.KeyD || keys.ArrowRight)) - Number(Boolean(keys.KeyA || keys.ArrowLeft));
    let moveZ = Number(Boolean(keys.KeyW || keys.ArrowUp)) - Number(Boolean(keys.KeyS || keys.ArrowDown));
    const magnitude = Math.hypot(moveX, moveZ);
    if (magnitude > 0) {
      moveX /= magnitude;
      moveZ /= magnitude;
      const speed = 7.2 + stats().speed;
      player.position.x += moveX * speed * delta;
      player.position.z += moveZ * speed * delta;
      player.rotation.y = Math.atan2(moveX, moveZ);
      moving = true;
      legs.forEach((leg, index) => { leg.rotation.x = Math.sin(elapsed * 12 + index * Math.PI) * 0.45; });
    } else legs.forEach((leg) => { leg.rotation.x *= 0.8; });
    const jumpDown = Boolean(keys.Space || keys.ArrowUp && keys.ShiftLeft);
    if (jumpDown && !jumpWasDown && onGround) {
      velocityY = 8.5 + stats().jump;
      onGround = false;
    }
    jumpWasDown = jumpDown;
    velocityY -= 22 * delta;
    player.position.y += velocityY * delta;
    onGround = false;
    if (velocityY <= 0) {
      for (let i = 0; i < platforms.length; i++) {
        const platform = platforms[i];
        const within = Math.abs(player.position.x - platform.x) < platform.w / 2 - 0.28 && Math.abs(player.position.z - platform.z) < platform.d / 2 - 0.28;
        if (within && previousY >= platform.top - 0.1 && player.position.y <= platform.top) {
          player.position.y = platform.top;
          velocityY = 0;
          onGround = true;
          activateCheckpoint(platform, i);
          break;
        }
      }
    }
    if (nearHazard()) respawn();
    if (player.position.y < -10 || Math.abs(player.position.x) > 40) respawn();
    collectCoins();
    if (player.position.distanceTo(goal.position) < 2.2) {
      finished = true;
      finishMessage.hidden = false;
      stageLabel.textContent = 'Complete · Champion!';
      showToast('Obby complete!');
    }
  }
  updateTrail(delta, moving);
  aura.rotation.y += delta * 0.8;
  aura.scale.setScalar(1 + Math.sin(elapsed * 3) * 0.035);
  goal.rotation.y += delta * 1.2;
  goal.position.y = endPlatform.top + 2.3 + Math.sin(elapsed * 2.5) * 0.18;
  goalRing.rotation.z += delta * 0.55;
  coins.forEach(({ mesh, collected }) => { if (!collected) mesh.rotation.z += delta * 1.8; });
  updateProgress();
  const target = new THREE.Vector3(player.position.x * 0.65, player.position.y + 5.4, player.position.z - 10.5);
  camera.position.lerp(target, 1 - Math.pow(0.0001, delta));
  camera.lookAt(player.position.x, player.position.y + 1.1, player.position.z + 1.5);
  renderer.render(scene, camera);
}
$('#play-again').addEventListener('click', () => {
  finished = false;
  finishMessage.hidden = true;
  currentCheckpointIndex = 0;
  checkpoint.set(0, 0.05, 0);
  respawn();
});
renderer.setAnimationLoop(animate);
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
