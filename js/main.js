const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const minimap = document.getElementById("minimap");
const mctx = minimap.getContext("2d");

const menu = document.getElementById("menu");
const game = document.getElementById("game");
const gameover = document.getElementById("gameover");
const accountModal = document.getElementById("accountModal");
const infoModal = document.getElementById("infoModal");

const playBtn = document.getElementById("playBtn");
const retryBtn = document.getElementById("retryBtn");
const menuBtn = document.getElementById("menuBtn");
const quitBtn = document.getElementById("quitBtn");
const skinsBtn = document.getElementById("skinsBtn");
const soundBtn = document.getElementById("soundBtn");
const settingsBtn = document.getElementById("settingsBtn");
const accountBtn = document.getElementById("accountBtn");
const missionsBtn = document.getElementById("missionsBtn");
const rewardsBtn = document.getElementById("rewardsBtn");
const rankInfoBtn = document.getElementById("rankInfoBtn");
const closeAccountBtn = document.getElementById("closeAccountBtn");
const saveAccountBtn = document.getElementById("saveAccountBtn");
const closeInfoBtn = document.getElementById("closeInfoBtn");

const nameInput = document.getElementById("playerName");
const colorPicker = document.getElementById("colorPicker");
const previewPaper = document.getElementById("previewPaper");
const gameoverPaper = document.getElementById("gameoverPaper");

const hudName = document.getElementById("hudName");
const territoryEl = document.getElementById("territory");
const killsEl = document.getElementById("kills");
const coinsEl = document.getElementById("coins");
const menuCoins = document.getElementById("menuCoins");
const bestScoreEl = document.getElementById("bestScore");
const bestKillsEl = document.getElementById("bestKills");
const finalScoreEl = document.getElementById("finalScore");
const finalKillsEl = document.getElementById("finalKills");
const earnedCoinsEl = document.getElementById("earnedCoins");
const leaderboardList = document.getElementById("leaderboardList");
const dangerText = document.getElementById("dangerText");
const toastEl = document.getElementById("toast");
const accountNameEl = document.getElementById("accountName");
const avatarMini = document.getElementById("avatarMini");
const rankBadge = document.getElementById("rankBadge");
const rankNameEl = document.getElementById("rankName");
const rankPointsEl = document.getElementById("rankPoints");
const rankProgressEl = document.getElementById("rankProgress");
const rankNextEl = document.getElementById("rankNext");
const accountAvatar = document.getElementById("accountAvatar");
const accountPseudo = document.getElementById("accountPseudo");
const accountLevel = document.getElementById("accountLevel");
const accountGames = document.getElementById("accountGames");
const accountKills = document.getElementById("accountKills");
const finalRank = document.getElementById("finalRank");
const rankDeltaEl = document.getElementById("rankDelta");
const infoTitle = document.getElementById("infoTitle");
const infoBody = document.getElementById("infoBody");

const TAU = Math.PI * 2;

const WORLD_RADIUS = 1500;
const CELL = 22;
const GRID = Math.ceil((WORLD_RADIUS * 2) / CELL);
const PLAYER_SPEED = 206;
const BOT_COUNT = 9;
const START_RADIUS = 112;

const COLORS = [
  "#ffd84d",
  "#4ca8ff",
  "#ff596f",
  "#62d990",
  "#a96cff",
  "#ff914d",
  "#35d6cc",
  "#f36fc8"
];

const BOT_NAMES = [
  "Nova", "Milo", "Lumi", "Rex", "Kiro",
  "Vega", "Pico", "Astra", "Byte", "Nox",
  "Zen", "Flux", "Mika", "Jinx"
];

let W = innerWidth;
let H = innerHeight;
let dpr = 1;
let running = false;
let last = 0;

let keys = Object.create(null);
let pointerActive = false;
let pointerId = null;

let camera = { x: 0, y: 0, zoom: 1 };

let profile = window.PTPProfile.load();
let selectedColor = localStorage.getItem("ptpColor") || COLORS[0];
let totalCoins = Number(localStorage.getItem("ptpCoins") || profile.coins || 0);
let bestScore = Number(localStorage.getItem("ptpBest") || profile.bestTerritory || 0);
let bestKills = Number(localStorage.getItem("ptpBestKills") || 0);
let soundEnabled = localStorage.getItem("ptpSound") !== "0";
let botDifficulty = window.PTPProfile.botDifficulty(profile.rankPoints);

nameInput.value = profile.name || "Player";

let ownerGrid = null;
let playableMask = null;
let playableCells = 0;

let entities = [];
let player = null;
let coins = [];
let particles = [];

let territoryCounts = [];
let currentEarned = 0;
let kills = 0;
let playerPercent = 0;
let toastTimer = 0;
let leaderboardTimer = 0;

const audio = { ctx: null };

function resize() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth;
  H = innerHeight;

  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

addEventListener("resize", resize);
resize();

function show(screenEl) {
  [menu, game, gameover, accountModal, infoModal].forEach((s) => s.classList.remove("active"));
  screenEl.classList.add("active");
}

function initPalette() {
  colorPicker.innerHTML = "";

  for (const color of COLORS) {
    const button = document.createElement("button");
    button.className = "color-choice" + (color === selectedColor ? " active" : "");
    button.style.background = color;
    button.setAttribute("aria-label", "Choisir cette couleur");

    button.onclick = () => {
      selectedColor = color;
      localStorage.setItem("ptpColor", color);
      updatePreviewColor();
      initPalette();
      tone(640, 0.04, "square", 0.018);
    };

    colorPicker.appendChild(button);
  }

  updatePreviewColor();
}

function updatePreviewColor() {
  previewPaper.style.background = selectedColor;
  gameoverPaper.style.background = selectedColor;
}

function updateMenuStats() {
  const rank = window.PTPProfile.getRank(profile.rankPoints);
  botDifficulty = window.PTPProfile.botDifficulty(profile.rankPoints);

  menuCoins.textContent = totalCoins;
  bestScoreEl.textContent = bestScore.toFixed(1) + "%";
  bestKillsEl.textContent = bestKills;
  soundBtn.textContent = soundEnabled ? "🔊" : "🔇";

  accountNameEl.textContent = profile.name || "Player";
  nameInput.value = profile.name || nameInput.value || "Player";
  avatarMini.style.background = selectedColor;
  accountAvatar.style.background = selectedColor;

  rankBadge.textContent = rank.name.charAt(0).toUpperCase();
  rankBadge.style.background = rank.color;
  rankNameEl.textContent = rank.name;
  rankPointsEl.textContent = profile.rankPoints + " RP";
  rankProgressEl.style.width = Math.round(rank.progress * 100) + "%";
  rankNextEl.textContent = rank.next
    ? "Prochain rang à " + rank.next.min + " RP"
    : "Rang maximum";

  accountPseudo.value = profile.name || "Player";
  accountLevel.textContent = profile.level;
  accountGames.textContent = profile.games;
  accountKills.textContent = profile.totalKills;
}

initPalette();
updateMenuStats();

function tone(freq = 440, duration = 0.05, type = "sine", gain = 0.025) {
  if (!soundEnabled) return;

  try {
    audio.ctx ||= new (window.AudioContext || window.webkitAudioContext)();

    const osc = audio.ctx.createOscillator();
    const vol = audio.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    vol.gain.value = gain;

    osc.connect(vol);
    vol.connect(audio.ctx.destination);

    osc.start();
    vol.gain.exponentialRampToValueAtTime(
      0.001,
      audio.ctx.currentTime + duration
    );
    osc.stop(audio.ctx.currentTime + duration);
  } catch {}
}

function buildWorld() {
  ownerGrid = new Int16Array(GRID * GRID);
  ownerGrid.fill(-1);

  playableMask = new Uint8Array(GRID * GRID);
  playableCells = 0;

  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const i = gridIndex(gx, gy);
      const p = gridToWorld(gx, gy);
      const inside =
        p.x * p.x + p.y * p.y <=
        (WORLD_RADIUS - CELL * 0.65) ** 2;

      if (inside) {
        playableMask[i] = 1;
        playableCells++;
      }
    }
  }
}

function gridIndex(gx, gy) {
  if (gx < 0 || gy < 0 || gx >= GRID || gy >= GRID) return -1;
  return gy * GRID + gx;
}

function worldToGrid(x, y) {
  return {
    gx: Math.floor((x + WORLD_RADIUS) / CELL),
    gy: Math.floor((y + WORLD_RADIUS) / CELL)
  };
}

function gridToWorld(gx, gy) {
  return {
    x: (gx + 0.5) * CELL - WORLD_RADIUS,
    y: (gy + 0.5) * CELL - WORLD_RADIUS
  };
}

function isPlayable(gx, gy) {
  const i = gridIndex(gx, gy);
  return i >= 0 && playableMask[i] === 1;
}

function ownerAt(x, y) {
  const { gx, gy } = worldToGrid(x, y);
  const i = gridIndex(gx, gy);

  if (i < 0 || !playableMask[i]) return -99;
  return ownerGrid[i];
}

function makeEntity(id, name, color, x, y, isBot) {
  const angle = Math.random() * TAU;

  return {
    id,
    name,
    color,
    x,
    y,
    radius: 15,
    angle,
    dirX: Math.cos(angle),
    dirY: Math.sin(angle),
    speed: isBot
      ? 158 + botDifficulty * 48 + Math.random() * (16 - botDifficulty * 6)
      : PLAYER_SPEED,
    isBot,
    alive: true,
    outside: false,
    trail: [],
    trailCells: new Set(),
    respawn: 0,
    invuln: isBot ? 1.2 : 0,
    aiTimer: 0,
    desiredAngle: angle,
    preferredLoop: Math.round(
      12 + (1 - botDifficulty) * 18 + Math.random() * (20 - botDifficulty * 10)
    )
  };
}

function paintCircle(entity, radius) {
  const center = worldToGrid(entity.x, entity.y);
  const cells = Math.ceil(radius / CELL);

  for (let gy = center.gy - cells; gy <= center.gy + cells; gy++) {
    for (let gx = center.gx - cells; gx <= center.gx + cells; gx++) {
      if (!isPlayable(gx, gy)) continue;

      const p = gridToWorld(gx, gy);

      if (Math.hypot(p.x - entity.x, p.y - entity.y) <= radius) {
        const i = gridIndex(gx, gy);
        ownerGrid[i] = entity.id;
      }
    }
  }
}

function rebuildTerritoryCounts() {
  territoryCounts = new Array(entities.length).fill(0);

  for (let i = 0; i < ownerGrid.length; i++) {
    const owner = ownerGrid[i];
    if (owner >= 0 && owner < territoryCounts.length) {
      territoryCounts[owner]++;
    }
  }

  playerPercent = ((territoryCounts[0] || 0) / playableCells) * 100;
}

function findSpawn(index) {
  if (index === 0) return { x: 0, y: 0 };

  const angle = (index / BOT_COUNT) * TAU + Math.random() * 0.26;
  const radius = 660 + Math.random() * 560;

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius
  };
}

function resetGame() {
  buildWorld();

  entities = [];
  particles = [];
  coins = [];

  kills = 0;
  currentEarned = 0;
  playerPercent = 0;
  toastTimer = 0;
  leaderboardTimer = 0;

  const name = (nameInput.value.trim() || profile.name || "Player").slice(0, 14);
  profile.name = name;
  window.PTPProfile.save(profile);
  botDifficulty = window.PTPProfile.botDifficulty(profile.rankPoints);

  player = makeEntity(0, name, selectedColor, 0, 0, false);
  player.angle = 0;
  player.dirX = 1;
  player.dirY = 0;

  entities.push(player);
  paintCircle(player, START_RADIUS);

  const botColors = COLORS.filter((c) => c !== selectedColor);

  for (let i = 1; i <= BOT_COUNT; i++) {
    const spawn = findSpawn(i);

    const bot = makeEntity(
      i,
      BOT_NAMES[(i - 1) % BOT_NAMES.length],
      botColors[(i - 1) % botColors.length],
      spawn.x,
      spawn.y,
      true
    );

    entities.push(bot);
    paintCircle(bot, 92 + Math.random() * 28);
  }

  rebuildTerritoryCounts();

  for (let i = 0; i < 90; i++) coins.push(spawnCoin());

  camera.x = player.x;
  camera.y = player.y;
  camera.zoom = 1;

  hudName.textContent = player.name;
  gameoverPaper.style.background = player.color;

  running = true;
  last = performance.now();

  updateHud(true);
}

function spawnCoin() {
  const a = Math.random() * TAU;
  const r = Math.sqrt(Math.random()) * (WORLD_RADIUS - 50);

  return {
    x: Math.cos(a) * r,
    y: Math.sin(a) * r,
    spin: Math.random() * TAU
  };
}

function startGame() {
  resetGame();
  show(game);
  tone(530, 0.07, "square", 0.02);
  requestAnimationFrame(loop);
}

function loop(now) {
  if (!running) return;

  const dt = Math.min((now - last) / 1000, 0.032);
  last = now;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

function update(dt) {
  if (player.alive) readKeyboard();

  for (const entity of entities) {
    if (!entity.alive) {
      if (entity.isBot) {
        entity.respawn -= dt;
        if (entity.respawn <= 0) respawnBot(entity);
      }
      continue;
    }

    if (entity.invuln > 0) entity.invuln -= dt;

    if (entity.isBot) updateBot(entity, dt);

    moveEntity(entity, dt);
  }

  resolveTrailCuts();
  resolveBodyCollisions();
  updateCoins(dt);
  updateParticles(dt);

  camera.x += (player.x - camera.x) * Math.min(1, dt * 6);
  camera.y += (player.y - camera.y) * Math.min(1, dt * 6);

  const targetZoom = player.outside ? 0.91 : 1;
  camera.zoom += (targetZoom - camera.zoom) * Math.min(1, dt * 2.6);

  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) toastEl.classList.remove("show");
  }

  leaderboardTimer -= dt;
  updateHud(leaderboardTimer <= 0);

  if (leaderboardTimer <= 0) leaderboardTimer = 0.25;
}

function readKeyboard() {
  let x = 0;
  let y = 0;

  if (keys.arrowleft || keys.a || keys.q) x -= 1;
  if (keys.arrowright || keys.d) x += 1;
  if (keys.arrowup || keys.w || keys.z) y -= 1;
  if (keys.arrowdown || keys.s) y += 1;

  if (x || y) setDirection(player, x, y);
}

function setDirection(entity, x, y) {
  const length = Math.hypot(x, y) || 1;
  const nx = x / length;
  const ny = y / length;

  if (
    entity.outside &&
    entity.trail.length > 4 &&
    nx * entity.dirX + ny * entity.dirY < -0.84
  ) {
    return;
  }

  entity.dirX = nx;
  entity.dirY = ny;
  entity.angle = Math.atan2(ny, nx);
}

function updateBot(bot, dt) {
  bot.aiTimer -= dt;

  if (bot.aiTimer <= 0) {
    const reaction = 0.58 - botDifficulty * 0.38;
    bot.aiTimer = reaction + Math.random() * (0.28 - botDifficulty * 0.12);

    const distanceFromCenter = Math.hypot(bot.x, bot.y);
    const edgeDistance = WORLD_RADIUS - distanceFromCenter;

    if (edgeDistance < 145) {
      bot.desiredAngle =
        Math.atan2(-bot.y, -bot.x) + (Math.random() - 0.5) * 0.38;
    } else if (bot.outside && bot.trail.length > bot.preferredLoop) {
      const home = nearestOwnedCell(bot);
      bot.desiredAngle =
        Math.atan2(home.y - bot.y, home.x - bot.x) +
        (Math.random() - 0.5) * 0.22;
    } else {
      const trailTarget = findNearbyEnemyTrail(bot);

      const huntChance = 0.24 + botDifficulty * 0.66;
      if (trailTarget && Math.random() < huntChance) {
        bot.desiredAngle = Math.atan2(
          trailTarget.y - bot.y,
          trailTarget.x - bot.x
        );
      } else {
        bot.desiredAngle += (Math.random() - 0.5) * 0.95;
      }

      if (!bot.outside && Math.random() < 0.3) {
        const randomSpan = Math.max(8, 30 - botDifficulty * 18);
        bot.preferredLoop = Math.round(
          11 + (1 - botDifficulty) * 16 + Math.random() * randomSpan
        );
      }
    }
  }

  let delta = normalizeAngle(bot.desiredAngle - bot.angle);
  const maxTurn = (1.45 + botDifficulty * 1.5) * dt;

  delta = Math.max(-maxTurn, Math.min(maxTurn, delta));

  bot.angle += delta;
  bot.dirX = Math.cos(bot.angle);
  bot.dirY = Math.sin(bot.angle);
}

function normalizeAngle(value) {
  while (value > Math.PI) value -= TAU;
  while (value < -Math.PI) value += TAU;
  return value;
}

function nearestOwnedCell(entity) {
  const center = worldToGrid(entity.x, entity.y);

  for (let radius = 2; radius < 28; radius += 3) {
    let best = null;
    let bestDistance = Infinity;

    for (let gy = center.gy - radius; gy <= center.gy + radius; gy++) {
      for (let gx = center.gx - radius; gx <= center.gx + radius; gx++) {
        const i = gridIndex(gx, gy);

        if (i < 0 || ownerGrid[i] !== entity.id) continue;

        const p = gridToWorld(gx, gy);
        const d = (p.x - entity.x) ** 2 + (p.y - entity.y) ** 2;

        if (d < bestDistance) {
          bestDistance = d;
          best = p;
        }
      }
    }

    if (best) return best;
  }

  return { x: 0, y: 0 };
}

function findNearbyEnemyTrail(bot) {
  let best = null;
  let bestDistance = 290 * 290;

  for (const entity of entities) {
    if (!entity.alive || entity.id === bot.id || entity.trail.length < 2) {
      continue;
    }

    for (let i = 0; i < entity.trail.length; i += 3) {
      const p = entity.trail[i];
      const d = (p.x - bot.x) ** 2 + (p.y - bot.y) ** 2;

      if (d < bestDistance) {
        bestDistance = d;
        best = p;
      }
    }
  }

  return best;
}

function moveEntity(entity, dt) {
  entity.x += entity.dirX * entity.speed * dt;
  entity.y += entity.dirY * entity.speed * dt;

  const distance = Math.hypot(entity.x, entity.y);
  const maxDistance = WORLD_RADIUS - entity.radius - 8;

  if (distance > maxDistance) {
    const nx = entity.x / distance;
    const ny = entity.y / distance;

    entity.x = nx * maxDistance;
    entity.y = ny * maxDistance;

    if (entity.isBot) {
      entity.angle =
        Math.atan2(-entity.y, -entity.x) + (Math.random() - 0.5) * 0.35;
      entity.dirX = Math.cos(entity.angle);
      entity.dirY = Math.sin(entity.angle);
    } else {
      setDirection(entity, -entity.x, -entity.y);
    }
  }

  const onOwnTerritory = ownerAt(entity.x, entity.y) === entity.id;

  if (!onOwnTerritory) {
    if (!entity.outside) {
      entity.outside = true;
      entity.trail = [];
      entity.trailCells.clear();
    }

    appendTrail(entity);
  } else if (entity.outside) {
    if (entity.trail.length >= 3) captureTerritory(entity);

    entity.outside = false;
    entity.trail = [];
    entity.trailCells.clear();
  }

  if (entity === player) {
    dangerText.classList.toggle(
      "show",
      entity.outside && entity.trail.length > 17
    );
  }
}

function appendTrail(entity) {
  const { gx, gy } = worldToGrid(entity.x, entity.y);
  const index = gridIndex(gx, gy);

  if (index < 0 || !playableMask[index]) return;

  const key = gx + "," + gy;

  if (entity.trailCells.has(key)) return;

  const p = gridToWorld(gx, gy);

  entity.trail.push({
    x: p.x,
    y: p.y,
    gx,
    gy,
    index
  });

  entity.trailCells.add(key);

  if (entity.trail.length > 7) {
    for (let i = 0; i < entity.trail.length - 5; i++) {
      const t = entity.trail[i];

      if (Math.hypot(entity.x - t.x, entity.y - t.y) < CELL * 0.7) {
        killEntity(entity, null);
        return;
      }
    }
  }
}

function captureTerritory(entity) {
  const before = territoryCounts[entity.id] || 0;

  const wall = new Uint8Array(ownerGrid.length);

  for (let i = 0; i < ownerGrid.length; i++) {
    if (ownerGrid[i] === entity.id) wall[i] = 1;
  }

  for (const t of entity.trail) {
    wall[t.index] = 1;

    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (Math.abs(ox) + Math.abs(oy) !== 1) continue;

        const ni = gridIndex(t.gx + ox, t.gy + oy);
        if (ni >= 0 && playableMask[ni]) wall[ni] = 1;
      }
    }
  }

  const reachable = new Uint8Array(ownerGrid.length);
  const queue = new Int32Array(ownerGrid.length);
  let head = 0;
  let tail = 0;

  function push(index) {
    if (
      index < 0 ||
      reachable[index] ||
      wall[index] ||
      !playableMask[index]
    ) {
      return;
    }

    reachable[index] = 1;
    queue[tail++] = index;
  }

  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const index = gridIndex(gx, gy);

      if (!playableMask[index]) continue;

      const p = gridToWorld(gx, gy);
      const edge =
        Math.hypot(p.x, p.y) >
        WORLD_RADIUS - CELL * 2.2;

      if (edge) push(index);
    }
  }

  while (head < tail) {
    const index = queue[head++];
    const gx = index % GRID;
    const gy = Math.floor(index / GRID);

    push(gridIndex(gx + 1, gy));
    push(gridIndex(gx - 1, gy));
    push(gridIndex(gx, gy + 1));
    push(gridIndex(gx, gy - 1));
  }

  for (let i = 0; i < ownerGrid.length; i++) {
    if (!playableMask[i]) continue;

    if (wall[i] || !reachable[i]) {
      ownerGrid[i] = entity.id;
    }
  }

  rebuildTerritoryCounts();

  const gained = Math.max(0, (territoryCounts[entity.id] || 0) - before);

  if (gained > 0) {
    burst(entity.x, entity.y, entity.color, Math.min(30, 10 + gained / 8));

    if (entity === player) {
      const pct = (gained / playableCells) * 100;

      if (pct >= 0.05) {
        toast("+" + pct.toFixed(1) + "% territoire");
      }

      tone(690, 0.08, "triangle", 0.03);
    }
  }
}

function resolveTrailCuts() {
  for (const attacker of entities) {
    if (!attacker.alive || attacker.invuln > 0) continue;

    for (const victim of entities) {
      if (
        !victim.alive ||
        victim.id === attacker.id ||
        victim.trail.length === 0
      ) {
        continue;
      }

      for (let i = 0; i < victim.trail.length; i += 1) {
        const t = victim.trail[i];

        if (
          Math.hypot(attacker.x - t.x, attacker.y - t.y) <
          attacker.radius + CELL * 0.35
        ) {
          killEntity(victim, attacker);
          break;
        }
      }
    }
  }
}

function resolveBodyCollisions() {
  for (let i = 0; i < entities.length; i++) {
    const a = entities[i];

    if (!a.alive || a.invuln > 0) continue;

    for (let j = i + 1; j < entities.length; j++) {
      const b = entities[j];

      if (!b.alive || b.invuln > 0) continue;

      if (
        Math.hypot(a.x - b.x, a.y - b.y) <
        a.radius + b.radius - 3
      ) {
        if (a.outside && !b.outside) {
          killEntity(a, b);
        } else if (b.outside && !a.outside) {
          killEntity(b, a);
        }
      }
    }
  }
}

function killEntity(victim, killer) {
  if (!victim.alive) return;

  victim.alive = false;
  burst(victim.x, victim.y, victim.color, 34);

  if (killer && killer.alive && killer === player && victim !== player) {
    kills++;
    currentEarned += 3;
    toast("Élimination +3 pièces");
    tone(250, 0.12, "square", 0.03);
  }

  if (victim === player) {
    endGame();
    return;
  }

  clearTerritory(victim.id);
  victim.trail = [];
  victim.trailCells.clear();
  victim.outside = false;
  victim.respawn = 1.2 + Math.random() * 1.7;

  rebuildTerritoryCounts();
}

function clearTerritory(id) {
  for (let i = 0; i < ownerGrid.length; i++) {
    if (ownerGrid[i] === id) ownerGrid[i] = -1;
  }
}

function respawnBot(bot) {
  const a = Math.random() * TAU;
  const r = 560 + Math.random() * 720;

  bot.x = Math.cos(a) * r;
  bot.y = Math.sin(a) * r;
  bot.angle = Math.random() * TAU;
  bot.dirX = Math.cos(bot.angle);
  bot.dirY = Math.sin(bot.angle);
  bot.desiredAngle = bot.angle;

  bot.alive = true;
  bot.outside = false;
  bot.trail = [];
  bot.trailCells.clear();
  bot.invuln = 1.25;

  paintCircle(bot, 88 + Math.random() * 24);
  rebuildTerritoryCounts();
}

function updateCoins(dt) {
  for (const coin of coins) coin.spin += dt * 4.5;

  for (let i = coins.length - 1; i >= 0; i--) {
    const coin = coins[i];

    if (
      player.alive &&
      Math.hypot(player.x - coin.x, player.y - coin.y) <
        player.radius + 11
    ) {
      coins.splice(i, 1);
      currentEarned++;
      burst(coin.x, coin.y, "#ffd242", 7);
      tone(920, 0.04, "sine", 0.014);
    }
  }

  while (coins.length < 90) coins.push(spawnCoin());
}

function burst(x, y, color, count) {
  const safeCount = Math.min(45, Math.max(0, Math.floor(count)));

  for (let i = 0; i < safeCount; i++) {
    const a = Math.random() * TAU;
    const speed = 40 + Math.random() * 155;

    particles.push({
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: 0.35 + Math.random() * 0.45,
      maxLife: 0.8,
      color,
      size: 2 + Math.random() * 4
    });
  }
}

function updateParticles(dt) {
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.965;
    p.vy *= 0.965;
    p.life -= dt;
  }

  particles = particles.filter((p) => p.life > 0);
}

function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add("show");
  toastTimer = 1.35;
}

function endGame() {
  if (!running) return;

  running = false;
  dangerText.classList.remove("show");

  const earned = currentEarned + Math.floor(playerPercent * 0.6);

  totalCoins += earned;
  bestScore = Math.max(bestScore, playerPercent);
  bestKills = Math.max(bestKills, kills);

  const rankResult = window.PTPProfile.recordMatch(profile, {
    territory: playerPercent,
    kills
  });

  profile.coins = totalCoins;
  profile.name = player.name;
  window.PTPProfile.save(profile);

  finalRank.textContent = rankResult.rank.name;
  rankDeltaEl.textContent =
    (rankResult.delta >= 0 ? "+" : "") + rankResult.delta + " RP";
  rankDeltaEl.style.color = rankResult.delta >= 0 ? "#438a61" : "#c24f5a";

  localStorage.setItem("ptpCoins", String(totalCoins));
  localStorage.setItem("ptpBest", bestScore.toFixed(2));
  localStorage.setItem("ptpBestKills", String(bestKills));
  profile.bestTerritory = Math.max(profile.bestTerritory || 0, bestScore);
  window.PTPProfile.save(profile);

  finalScoreEl.textContent = playerPercent.toFixed(1) + "%";
  finalKillsEl.textContent = kills;
  earnedCoinsEl.textContent = earned;

  updateMenuStats();

  setTimeout(() => show(gameover), 170);
}

function updateHud(updateLeaderboard) {
  territoryEl.textContent = playerPercent.toFixed(1) + "%";
  killsEl.textContent = kills;
  coinsEl.textContent = totalCoins + currentEarned;

  if (!updateLeaderboard) return;

  const ranking = entities
    .filter((e) => e.alive)
    .map((e) => ({
      id: e.id,
      name: e.name,
      score: ((territoryCounts[e.id] || 0) / playableCells) * 100
    }))
    .sort((a, b) => b.score - a.score);

  leaderboardList.innerHTML = ranking
    .slice(0, 10)
    .map(
      (r) =>
        '<li class="' +
        (r.id === 0 ? "me" : "") +
        '">' +
        escapeHtml(r.name) +
        " <b>" +
        r.score.toFixed(1) +
        "%</b></li>"
    )
    .join("");
}

function escapeHtml(value) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[char]
  );
}

function toScreen(x, y) {
  return {
    x: (x - camera.x) * camera.zoom + W / 2,
    y: (y - camera.y) * camera.zoom + H / 2
  };
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#c8e8ef";
  ctx.fillRect(0, 0, W, H);

  const center = toScreen(0, 0);

  ctx.save();
  ctx.beginPath();
  ctx.arc(center.x, center.y, WORLD_RADIUS * camera.zoom, 0, TAU);
  ctx.clip();

  ctx.fillStyle = "#eef4f5";
  ctx.fillRect(
    center.x - WORLD_RADIUS * camera.zoom,
    center.y - WORLD_RADIUS * camera.zoom,
    WORLD_RADIUS * 2 * camera.zoom,
    WORLD_RADIUS * 2 * camera.zoom
  );

  drawGroundPattern();
  drawOwnedCells();
  drawCoins();
  drawTrails();
  drawEntities();
  drawParticles();

  ctx.restore();

  ctx.beginPath();
  ctx.arc(center.x, center.y, WORLD_RADIUS * camera.zoom, 0, TAU);
  ctx.lineWidth = 8;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(center.x, center.y, WORLD_RADIUS * camera.zoom + 4, 0, TAU);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#99b5be";
  ctx.stroke();

  drawMinimap();

  const vignette = ctx.createRadialGradient(
    W / 2,
    H / 2,
    Math.min(W, H) * 0.2,
    W / 2,
    H / 2,
    Math.max(W, H) * 0.72
  );

  vignette.addColorStop(0, "#00000000");
  vignette.addColorStop(1, "#213b4d22");

  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}

function drawGroundPattern() {
  const step = 88;
  ctx.strokeStyle = "#9fb4ba22";
  ctx.lineWidth = 1;

  for (let x = -WORLD_RADIUS; x <= WORLD_RADIUS; x += step) {
    const a = toScreen(x, -WORLD_RADIUS);
    const b = toScreen(x, WORLD_RADIUS);

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  for (let y = -WORLD_RADIUS; y <= WORLD_RADIUS; y += step) {
    const a = toScreen(-WORLD_RADIUS, y);
    const b = toScreen(WORLD_RADIUS, y);

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

function drawOwnedCells() {
  const size = CELL * camera.zoom + 1.4;

  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const index = gridIndex(gx, gy);
      const owner = ownerGrid[index];

      if (owner < 0 || !entities[owner]) continue;

      const p = gridToWorld(gx, gy);
      const screen = toScreen(p.x - CELL / 2, p.y - CELL / 2);

      if (
        screen.x + size < -10 ||
        screen.y + size < -10 ||
        screen.x > W + 10 ||
        screen.y > H + 10
      ) {
        continue;
      }

      ctx.globalAlpha = 0.84;
      ctx.fillStyle = entities[owner].color;
      ctx.fillRect(screen.x, screen.y, size, size);
    }
  }

  ctx.globalAlpha = 1;
}

function drawTrails() {
  for (const entity of entities) {
    if (!entity.alive || entity.trail.length === 0) continue;

    ctx.beginPath();

    const first = toScreen(entity.trail[0].x, entity.trail[0].y);
    ctx.moveTo(first.x, first.y);

    for (let i = 1; i < entity.trail.length; i++) {
      const point = toScreen(entity.trail[i].x, entity.trail[i].y);
      ctx.lineTo(point.x, point.y);
    }

    const current = toScreen(entity.x, entity.y);
    ctx.lineTo(current.x, current.y);

    ctx.strokeStyle = entity.color;
    ctx.lineWidth = CELL * 0.72 * camera.zoom;
    ctx.lineCap = "square";
    ctx.lineJoin = "round";
    ctx.globalAlpha = 0.9;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawCoins() {
  for (const coin of coins) {
    const p = toScreen(coin.x, coin.y);

    if (p.x < -20 || p.y < -20 || p.x > W + 20 || p.y > H + 20) {
      continue;
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(0.6 + Math.abs(Math.cos(coin.spin)) * 0.4, 1);

    ctx.beginPath();
    ctx.arc(0, 0, 7.5 * camera.zoom, 0, TAU);
    ctx.fillStyle = "#ffd242";
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#f2ae16";
    ctx.stroke();

    ctx.restore();
  }
}

function drawEntities() {
  for (const entity of entities) {
    if (!entity.alive) continue;

    const p = toScreen(entity.x, entity.y);
    const radius = entity.radius * camera.zoom;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(entity.angle);

    if (entity.invuln > 0 && Math.floor(entity.invuln * 14) % 2 === 0) {
      ctx.globalAlpha = 0.35;
    }

    ctx.fillStyle = entity.color;
    ctx.shadowColor = "#0000002f";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    roundedRectPath(
      ctx,
      -radius,
      -radius,
      radius * 2,
      radius * 2,
      radius * 0.32
    );
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = "#fff";

    roundedRectPath(
      ctx,
      radius * 0.05,
      -radius * 0.5,
      radius * 0.42,
      radius * 0.38,
      radius * 0.12
    );
    ctx.fill();

    roundedRectPath(
      ctx,
      radius * 0.05,
      radius * 0.12,
      radius * 0.42,
      radius * 0.38,
      radius * 0.12
    );
    ctx.fill();

    ctx.restore();

    ctx.font = "900 " + Math.max(10, 11 * camera.zoom) + "px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#31444b";
    ctx.fillText(entity.name, p.x, p.y - radius - 8);
  }
}

function roundedRectPath(context, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);

  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + w, y, x + w, y + h, radius);
  context.arcTo(x + w, y + h, x, y + h, radius);
  context.arcTo(x, y + h, x, y, radius);
  context.arcTo(x, y, x + w, y, radius);
  context.closePath();
}

function drawParticles() {
  for (const p of particles) {
    const screen = toScreen(p.x, p.y);

    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(screen.x, screen.y, p.size, p.size);
  }

  ctx.globalAlpha = 1;
}

function drawMinimap() {
  const width = minimap.width;
  const height = minimap.height;
  const cx = width / 2;
  const cy = height / 2;
  const scale = (width * 0.46) / WORLD_RADIUS;

  mctx.clearRect(0, 0, width, height);

  mctx.save();
  mctx.beginPath();
  mctx.arc(cx, cy, width * 0.48, 0, TAU);
  mctx.clip();

  mctx.fillStyle = "#eef4f5";
  mctx.fillRect(0, 0, width, height);

  const skip = 4;

  for (let gy = 0; gy < GRID; gy += skip) {
    for (let gx = 0; gx < GRID; gx += skip) {
      const owner = ownerGrid[gridIndex(gx, gy)];

      if (owner < 0 || !entities[owner]) continue;

      const p = gridToWorld(gx, gy);

      mctx.globalAlpha = 0.85;
      mctx.fillStyle = entities[owner].color;
      mctx.fillRect(
        cx + p.x * scale,
        cy + p.y * scale,
        CELL * scale * skip + 1,
        CELL * scale * skip + 1
      );
    }
  }

  mctx.globalAlpha = 1;

  for (const entity of entities) {
    if (!entity.alive) continue;

    mctx.beginPath();
    mctx.arc(
      cx + entity.x * scale,
      cy + entity.y * scale,
      entity === player ? 4 : 2.3,
      0,
      TAU
    );
    mctx.fillStyle = entity.color;
    mctx.fill();
  }

  mctx.restore();
}

addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  keys[key] = true;

  if (
    key === "arrowup" ||
    key === "arrowdown" ||
    key === "arrowleft" ||
    key === "arrowright"
  ) {
    event.preventDefault();
  }
});

addEventListener("keyup", (event) => {
  keys[event.key.toLowerCase()] = false;
});

canvas.addEventListener("pointerdown", (event) => {
  pointerActive = true;
  pointerId = event.pointerId;

  try {
    canvas.setPointerCapture(event.pointerId);
  } catch {}

  steerPointer(event);
});

canvas.addEventListener("pointermove", (event) => {
  if (pointerActive && event.pointerId === pointerId) {
    steerPointer(event);
  }
});

function endPointer(event) {
  if (event.pointerId === pointerId) {
    pointerActive = false;
    pointerId = null;
  }
}

canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);

function steerPointer(event) {
  if (!player || !player.alive) return;

  const dx = event.clientX - W / 2;
  const dy = event.clientY - H / 2;

  if (Math.hypot(dx, dy) < 18) return;

  setDirection(player, dx, dy);
}

playBtn.onclick = startGame;
retryBtn.onclick = startGame;

menuBtn.onclick = () => {
  running = false;
  show(menu);
};

quitBtn.onclick = () => {
  running = false;
  show(menu);
};

skinsBtn.onclick = () => {
  colorPicker.classList.toggle("hidden");
};

soundBtn.onclick = () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem("ptpSound", soundEnabled ? "1" : "0");
  updateMenuStats();

  if (soundEnabled) tone(620, 0.05, "square", 0.02);
};

settingsBtn.onclick = () => {
  const ok = confirm("Réinitialiser le profil, le rang, les records et les pièces de PaperTaPeur ?");

  if (!ok) return;

  totalCoins = 0;
  bestScore = 0;
  bestKills = 0;

  localStorage.removeItem("ptpCoins");
  localStorage.removeItem("ptpBest");
  localStorage.removeItem("ptpBestKills");

  profile = window.PTPProfile.reset();
  profile.name = "Player";
  window.PTPProfile.save(profile);

  updateMenuStats();
};

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && running) {
    last = performance.now();
  }
});


accountBtn.onclick = () => {
  accountPseudo.value = profile.name || "Player";
  updateMenuStats();
  show(accountModal);
};

closeAccountBtn.onclick = () => {
  updateMenuStats();
  show(menu);
};

saveAccountBtn.onclick = () => {
  const nextName = (accountPseudo.value.trim() || "Player").slice(0, 14);
  profile.name = nextName;
  nameInput.value = nextName;
  window.PTPProfile.save(profile);
  updateMenuStats();
  show(menu);
};

function openInfo(title, html) {
  infoTitle.textContent = title;
  infoBody.innerHTML = html;
  show(infoModal);
}

closeInfoBtn.onclick = () => show(menu);

rankInfoBtn.onclick = () => {
  const rank = window.PTPProfile.getRank(profile.rankPoints);
  openInfo(
    "RANG " + rank.name.toUpperCase(),
    "<strong>" + profile.rankPoints + " RP</strong><br>" +
    "Plus ton rang monte, plus les bots réagissent vite, visent mieux les traces, prennent moins de décisions au hasard et rentrent plus intelligemment dans leur territoire.<br><br>" +
    "Difficulté IA actuelle : <strong>" + Math.round(botDifficulty * 100) + "%</strong>."
  );
};

missionsBtn.onclick = () => {
  openInfo(
    "MISSIONS",
    "<strong>Objectifs de partie</strong><br>" +
    "• Capturer 5% de territoire<br>" +
    "• Éliminer 2 adversaires<br>" +
    "• Ramasser 10 pièces<br><br>" +
    "Le vrai système de missions et récompenses sera relié au profil dans une prochaine version."
  );
};

rewardsBtn.onclick = () => {
  openInfo(
    "RÉCOMPENSES",
    "<strong>Progression</strong><br>" +
    "Les pièces gagnées et ton rang sont déjà sauvegardés. Les coffres, skins déblocables et récompenses de niveau pourront être ajoutés ici."
  );
};
