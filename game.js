import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

const $ = (selector) => document.querySelector(selector);
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

const keys = Object.create(null);
const clock = new THREE.Clock();
const coinCountEl = $('#coin-count');
const stageLabel = $('#stage-label');
const progressLabel = $('#progress-label');
const progressBar = $('#progress-bar');
const shopPanel = $('#shop-panel');
const shopItems = $('#shop-items');
const toast = $('#toast');
const finishMessage = $('#message');
let toastTimer;
let shopOpen = false;
let finished = false;
const saveKey = 'blocky-obby-save-v2';
let saved = {};
try { saved = JSON.parse(localStorage.getItem(saveKey)) || {}; } catch { /* Local saves are optional. */ }
const save = { coins: Number.isFinite(saved.coins) ? Math.max(0, saved.coins) : 0, owned: Array.isArray(saved.owned) ? saved.owned : [] };
function persist() {
  try { localStorage.setItem(saveKey, JSON.stringify(save)); } catch { /* Saving is optional. */ }
  coinCountEl.textContent = save.coins;
}
function showToast(text) {
  toast.textContent = text;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 1900);
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
  return { speed: Math.min(1.6, owned.reduce((sum, item) => sum + item.speed, 0)), jump: Math.min(0.9, owned.reduce((sum, item) => sum + item.jump, 0)) };
}

const stageColors = [0x61d98b, 0x53c9d2, 0xffbf55, 0xf27691];
const platforms = [];
function addPlatform(x, z, w, d, top, stage, checkpoint = false) {
  const h = 0.75;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: stageColors[stage], roughness: 0.72 }));
  mesh.position.set(x, top - h / 2, z);
  mesh.castShadow = mesh.receiveShadow = true;
  scene.add(mesh);
  platforms.push({ x, z, w, d, top, stage, checkpoint, mesh });
}
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

const hazards = [];
const hazardSpecs = [[1, 0, 0, 1.6], [3, -1.6, 0, 1.5], [5, 0, 0, 1.5], [6, 1.7, 0, 1.5], [8, 0, 0, 1.4], [9, -1.2, 0, 1.35], [10, 1.3, 0, 1.3], [12, 0, 0, 1.2], [13, 1, 0, 1.1], [14, -0.8, 0, 1.1]];
for (const [platformIndex, offsetX, offsetZ, size] of hazardSpecs) {
  const platform = platforms[platformIndex + 1];
  if (!platform) continue;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, 0.9, size), new THREE.MeshStandardMaterial({ color: 0xf04462, emissive: 0x7d1027, emissiveIntensity: 0.5 }));
  mesh.position.set(platform.x + offsetX, platform.top + 0.45, platform.z + offsetZ);
  mesh.castShadow = true;
  scene.add(mesh);
  hazards.push({ mesh, x: mesh.position.x, z: mesh.position.z, radius: size * 0.72 });
}

function makeCharacter(name, color, skinColor, legColor, addNameplate = false) {
  const character = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.02, 0.55), new THREE.MeshStandardMaterial({ color, roughness: 0.72 }));
  torso.position.y = 1.22;
  torso.castShadow = true;
  character.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.76, 0.76), new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.75 }));
  head.position.y = 2.16;
  head.castShadow = true;
  character.add(head);
  const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.035), new THREE.MeshStandardMaterial({ color: 0x24324c }));
  eyes.position.set(0, 2.19, 0.395);
  character.add(eyes);
  const handMaterial = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8 });
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.68, 0.21), handMaterial);
  leftArm.position.set(-0.58, 1.3, 0);
  leftArm.castShadow = true;
  character.add(leftArm);
  const rightArm = leftArm.clone();
  rightArm.position.x = 0.58;
  character.add(rightArm);
  const legs = [];
  for (const x of [-0.22, 0.22]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.54, 0.34), new THREE.MeshStandardMaterial({ color: legColor, roughness: 0.8 }));
    leg.position.set(x, 0.47, 0);
    leg.castShadow = true;
    character.add(leg);
    legs.push(leg);
  }
  if (addNameplate) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const context = canvas.getContext('2d');
    context.fillStyle = 'rgba(14, 25, 47, 0.82)';
    context.beginPath(); context.roundRect(4, 4, 248, 56, 16); context.fill();
    context.fillStyle = '#fff'; context.font = 'bold 30px system-ui, sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(name, 128, 33);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false }));
    label.position.y = 3.05; label.scale.set(2.4, 0.6, 1); character.add(label);
  }
  scene.add(character);
  return { group: character, legs, arms: [leftArm, rightArm] };
}

const botRoster = [
  { name: 'Milo', color: 0x39c5dc, speed: 6.1, delay: 0.7, lane: -1.4 },
  { name: 'Nova', color: 0xa879ff, speed: 6.4, delay: 1.5, lane: 0 },
  { name: 'Rex', color: 0xff687d, speed: 5.8, delay: 2.4, lane: 1.4 },
];
const bots = botRoster.map((settings) => {
  const avatar = makeCharacter(settings.name, settings.color, 0xffd9a0, 0x4654a4, true);
  avatar.group.position.set(settings.lane, 0.05, -2.2);
  return { ...settings, ...avatar, velocityY: 0, onGround: false, currentPlatform: 0, checkpointIndex: 0, checkpointX: settings.lane, checkpointZ: -2.2, phase: 'approach', phaseTimer: settings.delay, finished: false };
});
function directionalRadius(platform, dx, dz) {
  const rx = Math.abs(dx) < 0.001 ? Infinity : platform.w / 2 / Math.abs(dx);
  const rz = Math.abs(dz) < 0.001 ? Infinity : platform.d / 2 / Math.abs(dz);
  return Math.min(rx, rz);
}
function botRespawn(bot) {
  bot.group.position.set(bot.checkpointX, platforms[bot.checkpointIndex].top + 0.05, bot.checkpointZ);
  bot.currentPlatform = bot.checkpointIndex; bot.velocityY = 0; bot.onGround = false; bot.phase = 'approach'; bot.phaseTimer = 0.35 + Math.random() * 0.5;
}
function updateBots(delta, active) {
  for (const bot of bots) {
    if (bot.finished || !active) continue;
    bot.phaseTimer -= delta;
    if (bot.phaseTimer > 0) continue;
    const p = bot.group.position;
    const current = platforms[bot.currentPlatform];
    const next = platforms[Math.min(bot.currentPlatform + 1, platforms.length - 1)];
    const dx = next.x - current.x, dz = next.z - current.z;
    const length = Math.hypot(dx, dz) || 1, dirX = dx / length, dirZ = dz / length;
    const startDist = Math.max(0.5, directionalRadius(current, dirX, dirZ) - 0.75);
    const landDist = Math.max(0.45, directionalRadius(next, dirX, dirZ) - 0.85);
    const targetX = bot.phase === 'approach' ? current.x + dirX * startDist : next.x - dirX * landDist;
    const targetZ = bot.phase === 'approach' ? current.z + dirZ * startDist : next.z - dirZ * landDist;
    const toX = targetX - p.x, toZ = targetZ - p.z, distance = Math.hypot(toX, toZ);
    let moving = false;
    if (distance > 0.22) {
      const step = Math.min(distance, bot.speed * delta);
      p.x += toX / distance * step; p.z += toZ / distance * step;
      bot.group.rotation.y = Math.atan2(toX, toZ); moving = true;
    }
    const previousY = p.y;
    if (bot.phase === 'approach' && distance <= 0.35 && bot.onGround) {
      bot.phase = 'land'; bot.velocityY = 8.1 + Math.random() * 0.35; bot.onGround = false;
    }
    bot.velocityY -= 22 * delta; p.y += bot.velocityY * delta; bot.onGround = false;
    if (bot.velocityY <= 0) {
      for (let i = 0; i < platforms.length; i++) {
        const platform = platforms[i];
        const within = Math.abs(p.x - platform.x) < platform.w / 2 - 0.28 && Math.abs(p.z - platform.z) < platform.d / 2 - 0.28;
        if (within && previousY >= platform.top - 0.1 && p.y <= platform.top) {
          p.y = platform.top; bot.velocityY = 0; bot.onGround = true;
          if (i >= bot.currentPlatform) bot.currentPlatform = i;
          bot.phase = 'approach';
          if (platform.checkpoint && i > bot.checkpointIndex) { bot.checkpointIndex = i; bot.checkpointX = platform.x; bot.checkpointZ = platform.z; }
          if (i === platforms.length - 1) bot.finished = true;
          if (Math.random() < 0.28) bot.phaseTimer = 0.12 + Math.random() * 0.3;
          break;
        }
      }
    }
    const hit = hazards.some((h) => Math.abs(p.x - h.x) < h.radius + 0.34 && Math.abs(p.z - h.z) < h.radius + 0.34 && p.y < h.mesh.position.y + 1.5);
    if (hit || p.y < -10 || Math.abs(p.x) > 40) botRespawn(bot);
    bot.legs.forEach((leg, i) => { leg.rotation.x = moving ? Math.sin(clock.elapsedTime * 11 + i * Math.PI) * 0.42 : leg.rotation.x * 0.82; });
    bot.arms.forEach((arm, i) => { arm.rotation.x = moving ? -Math.sin(clock.elapsedTime * 11 + i * Math.PI) * 0.6 : arm.rotation.x * 0.82; });
  }
}

// A real coin has a thick gold body, bright face, raised border and embossed star.
// Each coin floats and spins around its upright axis, like a dropped game item.
const coins = [];
const coinBodyGeometry = new THREE.CylinderGeometry(0.44, 0.44, 0.12, 32, 1);
const coinGold = new THREE.MeshStandardMaterial({ color: 0xe7a91b, metalness: 0.82, roughness: 0.24 });
const coinFace = new THREE.MeshStandardMaterial({ color: 0xffd95a, metalness: 0.72, roughness: 0.2, emissive: 0x5c3500, emissiveIntensity: 0.18 });
const coinDetail = new THREE.MeshStandardMaterial({ color: 0xfff0a3, metalness: 0.74, roughness: 0.18 });
const starShape = new THREE.Shape();
for (let i = 0; i < 10; i++) {
  const radius = i % 2 === 0 ? 0.19 : 0.085;
  const angle = Math.PI / 2 + i * Math.PI / 5;
  const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
  if (i === 0) starShape.moveTo(x, y); else starShape.lineTo(x, y);
}
starShape.closePath();
const starGeometry = new THREE.ShapeGeometry(starShape);
function addCoin(platform) {
  const coin = new THREE.Group();
  const body = new THREE.Mesh(coinBodyGeometry, coinGold);
  body.rotation.x = Math.PI / 2;
  body.castShadow = true;
  coin.add(body);
  for (const side of [-1, 1]) {
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.355, 32), coinFace);
    face.position.z = side * 0.063;
    if (side < 0) face.rotation.y = Math.PI;
    coin.add(face);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.345, 0.035, 8, 32), coinDetail);
    rim.position.z = side * 0.075;
    coin.add(rim);
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.265, 0.012, 6, 32), coinGold);
    innerRing.position.z = side * 0.076;
    coin.add(innerRing);
    const emblem = new THREE.Mesh(starGeometry, coinDetail);
    emblem.position.z = side * 0.078;
    if (side < 0) emblem.rotation.y = Math.PI;
    coin.add(emblem);
  }
  coin.position.set(platform.x, platform.top + 1.35, platform.z);
  // Start face-on, then rotate about world-up for the floating dropped-item look.
  coin.rotation.x = 0.12;
  scene.add(coin);
  coins.push({ mesh: coin, collected: false, baseY: coin.position.y, phase: Math.random() * Math.PI * 2 });
}
for (let i = 1; i < platforms.length; i++) addCoin(platforms[i]);

const goal = new THREE.Mesh(new THREE.OctahedronGeometry(1.2), new THREE.MeshStandardMaterial({ color: 0xa3f55e, emissive: 0x4b9019, emissiveIntensity: 0.8, roughness: 0.3 }));
goal.position.set(0, endPlatform.top + 2.3, endPlatform.z); goal.castShadow = true; scene.add(goal);
const goalRing = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.11, 10, 48), new THREE.MeshStandardMaterial({ color: 0xe9ff9d, emissive: 0x83a61d, emissiveIntensity: 0.6 }));
goalRing.position.set(0, endPlatform.top + 1.5, endPlatform.z); scene.add(goalRing);

const playerAvatar = makeCharacter('You', 0xffb833, 0xffd9a0, 0x4654a4);
const player = playerAvatar.group;
const legs = playerAvatar.legs;
const arms = playerAvatar.arms;
const aura = new THREE.Mesh(new THREE.SphereGeometry(1.55, 16, 12), new THREE.MeshBasicMaterial({ color: 0x5ef2c2, transparent: true, opacity: 0.16, wireframe: true }));
aura.position.y = 1.2; aura.visible = false; player.add(aura);
const trailParticles = [];
const particleGeometry = new THREE.BoxGeometry(0.22, 0.22, 0.22);
function updateEffects() {
  const ownedAuras = upgrades.filter((item) => item.kind === 'Aura' && save.owned.includes(item.id));
  const ownedTrails = upgrades.filter((item) => item.kind === 'Trail' && save.owned.includes(item.id));
  aura.visible = ownedAuras.length > 0;
  if (ownedAuras.length) aura.material.color.setHex(ownedAuras.at(-1).color);
  for (const p of trailParticles) scene.remove(p.mesh);
  trailParticles.length = 0;
  const trail = ownedTrails.at(-1);
  if (trail) for (let i = 0; i < 8; i++) {
    const mesh = new THREE.Mesh(particleGeometry, new THREE.MeshBasicMaterial({ color: trail.color, transparent: true, opacity: 0.8 }));
    mesh.visible = false; scene.add(mesh); trailParticles.push({ mesh, life: 0 });
  }
}
function renderShop() {
  shopItems.replaceChildren();
  const current = stats();
  for (const item of upgrades) {
    const owned = save.owned.includes(item.id);
    const card = document.createElement('article'); card.className = 'shop-card';
    const icon = document.createElement('span'); icon.className = 'item-icon'; icon.textContent = item.icon;
    icon.style.boxShadow = `inset 0 0 0 1px #${item.color.toString(16).padStart(6, '0')}66`;
    const info = document.createElement('div');
    const title = document.createElement('p'); title.className = 'item-title'; title.textContent = `${item.name} · ${item.kind}`;
    const description = document.createElement('p'); description.className = 'item-description'; description.textContent = item.note;
    info.append(title, description);
    const button = document.createElement('button'); button.className = 'buy-button'; button.type = 'button'; button.textContent = owned ? 'Owned ✓' : `🪙 ${item.cost}`;
    button.disabled = owned || save.coins < item.cost || (item.speed > 0 && current.speed >= 1.6) || (item.jump > 0 && current.jump >= 0.9);
    button.addEventListener('click', () => {
      if (save.coins < item.cost || save.owned.includes(item.id)) return;
      save.coins -= item.cost; save.owned.push(item.id); persist(); renderShop(); updateEffects(); showToast(`${item.name} equipped!`);
    });
    card.append(icon, info, button); shopItems.append(card);
  }
}
function setShop(open) {
  shopOpen = open; shopPanel.hidden = !open;
  if (open) { Object.keys(keys).forEach((code) => { keys[code] = false; }); renderShop(); $('#close-shop').focus(); }
  else $('#shop-button').focus();
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
window.addEventListener('blur', () => { Object.keys(keys).forEach((code) => { keys[code] = false; }); });
for (const button of document.querySelectorAll('#touch-controls [data-code]')) {
  const code = button.dataset.code;
  const release = () => { keys[code] = false; button.classList.remove('pressed'); if (button.hasPointerCapture?.(button._pointerId)) button.releasePointerCapture(button._pointerId); };
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault(); if (shopOpen || finished) return;
    button._pointerId = event.pointerId; button.setPointerCapture(event.pointerId); keys[code] = true; button.classList.add('pressed');
  });
  button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', () => { keys[code] = false; button.classList.remove('pressed'); });
  button.addEventListener('contextmenu', (event) => event.preventDefault());
}

let checkpoint = new THREE.Vector3(0, 0.05, 0);
let currentCheckpointIndex = 0;
let velocityY = 0;
let onGround = false;
let jumpWasDown = false;
let elapsed = 0;
player.position.copy(checkpoint);
persist();
updateEffects();
function activateCheckpoint(platform, index) {
  if (!platform.checkpoint || index <= currentCheckpointIndex) return;
  currentCheckpointIndex = index; checkpoint.set(platform.x, platform.top + 0.05, platform.z); showToast('Checkpoint saved!');
}
function respawn() {
  player.position.copy(checkpoint); velocityY = 0; onGround = false;
  player.userData.moveVelocityX = 0; player.userData.moveVelocityZ = 0;
}
function collectCoins() {
  for (const coin of coins) if (!coin.collected && player.position.distanceTo(coin.mesh.position) < 1.35) {
    coin.collected = true; scene.remove(coin.mesh); save.coins += 1; persist(); showToast('+1 coin');
  }
}
function nearHazard() {
  return hazards.some((h) => Math.abs(player.position.x - h.x) < h.radius + 0.34 && Math.abs(player.position.z - h.z) < h.radius + 0.34 && player.position.y < h.mesh.position.y + 1.5);
}
function updateTrail(delta, moving) {
  for (const particle of trailParticles) {
    particle.life -= delta;
    if (particle.life <= 0 && moving && onGround && Math.random() < 0.16) {
      particle.life = 0.42; particle.mesh.position.set(player.position.x + (Math.random() - 0.5) * 0.55, player.position.y + 0.2, player.position.z + 0.3); particle.mesh.scale.setScalar(0.8 + Math.random() * 0.7);
    }
    particle.mesh.visible = particle.life > 0;
    if (particle.mesh.visible) { particle.mesh.material.opacity = Math.max(0, particle.life / 0.42) * 0.75; particle.mesh.position.y += delta * 0.45; }
  }
}
function updateProgress() {
  const progress = THREE.MathUtils.clamp(player.position.z / endPlatform.z, 0, 1);
  const percent = Math.floor(progress * 100); progressLabel.textContent = `${percent}%`; progressBar.style.width = `${percent}%`;
  const stage = Math.min(3, Math.floor(progress * 4));
  const labels = ['Easy · Warm-up', 'Medium · Narrow jumps', 'Hard · Hazards ahead', 'Expert · Final stretch'];
  stageLabel.textContent = finished ? 'Complete · Champion!' : labels[stage];
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.035);
  elapsed += delta;
  const previousY = player.position.y;
  let moving = false;
  if (!shopOpen && !finished) {
    const inputX = Number(Boolean(keys.KeyD || keys.ArrowRight)) - Number(Boolean(keys.KeyA || keys.ArrowLeft));
    const inputZ = Number(Boolean(keys.KeyW || keys.ArrowUp)) - Number(Boolean(keys.KeyS || keys.ArrowDown));
    const inputLength = Math.hypot(inputX, inputZ);
    const scale = inputLength > 1 ? 1 / inputLength : 1;
    const speed = 7.2 + stats().speed;
    const targetX = inputX * scale * speed, targetZ = inputZ * scale * speed;
    player.userData.moveVelocityX = THREE.MathUtils.damp(player.userData.moveVelocityX || 0, targetX, inputLength ? 14 : 19, delta);
    player.userData.moveVelocityZ = THREE.MathUtils.damp(player.userData.moveVelocityZ || 0, targetZ, inputLength ? 14 : 19, delta);
    player.position.x += player.userData.moveVelocityX * delta;
    player.position.z += player.userData.moveVelocityZ * delta;
    moving = Math.hypot(player.userData.moveVelocityX, player.userData.moveVelocityZ) > 0.15;
    if (moving) {
      const angle = Math.atan2(player.userData.moveVelocityX, player.userData.moveVelocityZ);
      const turn = THREE.MathUtils.euclideanModulo(angle - player.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
      player.rotation.y += turn * (1 - Math.exp(-12 * delta));
      legs.forEach((leg, i) => { leg.rotation.x = Math.sin(elapsed * 11 + i * Math.PI) * 0.42; });
      arms.forEach((arm, i) => { arm.rotation.x = -Math.sin(elapsed * 11 + i * Math.PI) * 0.48; });
    } else {
      legs.forEach((leg) => { leg.rotation.x *= 0.78; }); arms.forEach((arm) => { arm.rotation.x *= 0.78; });
    }
    const jumpDown = Boolean(keys.Space);
    if (jumpDown && !jumpWasDown && onGround) { velocityY = 8.5 + stats().jump; onGround = false; }
    jumpWasDown = jumpDown;
    velocityY -= 22 * delta; player.position.y += velocityY * delta; onGround = false;
    if (velocityY <= 0) for (let i = 0; i < platforms.length; i++) {
      const platform = platforms[i];
      const within = Math.abs(player.position.x - platform.x) < platform.w / 2 - 0.28 && Math.abs(player.position.z - platform.z) < platform.d / 2 - 0.28;
      if (within && previousY >= platform.top - 0.1 && player.position.y <= platform.top) {
        player.position.y = platform.top; velocityY = 0; onGround = true; activateCheckpoint(platform, i); break;
      }
    }
    if (nearHazard() || player.position.y < -10 || Math.abs(player.position.x) > 40) respawn();
    collectCoins();
    if (player.position.distanceTo(goal.position) < 2.2) {
      finished = true; Object.keys(keys).forEach((code) => { keys[code] = false; }); finishMessage.hidden = false; showToast('Obby complete!');
    }
  } else {
    player.userData.moveVelocityX = 0; player.userData.moveVelocityZ = 0; jumpWasDown = false;
  }
  updateBots(delta, !shopOpen && !finished);
  updateTrail(delta, moving);
  aura.rotation.y += delta * 0.8; aura.scale.setScalar(1 + Math.sin(elapsed * 3) * 0.035);
  goal.rotation.y += delta * 1.2; goal.position.y = endPlatform.top + 2.3 + Math.sin(elapsed * 2.5) * 0.18; goalRing.rotation.z += delta * 0.55;
  for (const coin of coins) if (!coin.collected) {
    const t = elapsed * 2.8 + coin.phase;
    coin.mesh.rotation.y += delta * 2.8;
    coin.mesh.rotation.x = 0.12 + Math.sin(t * 0.65) * 0.045;
    coin.mesh.position.y = coin.baseY + Math.sin(t * 1.7) * 0.13;
  }
  updateProgress();
  const target = new THREE.Vector3(player.position.x * 0.65, player.position.y + 5.4, player.position.z - 10.5);
  camera.position.lerp(target, 1 - Math.pow(0.0001, delta));
  camera.lookAt(player.position.x, player.position.y + 1.1, player.position.z + 1.5);
  renderer.render(scene, camera);
}
$('#play-again').addEventListener('click', () => {
  finished = false; finishMessage.hidden = true; currentCheckpointIndex = 0; checkpoint.set(0, 0.05, 0); respawn();
  for (const bot of bots) {
    bot.finished = false; bot.checkpointIndex = 0; bot.checkpointX = bot.lane; bot.checkpointZ = -2.2; bot.currentPlatform = 0;
    bot.group.position.set(bot.lane, 0.05, -2.2); bot.phase = 'approach'; bot.phaseTimer = bot.delay;
  }
});
renderer.setAnimationLoop(animate);
window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
