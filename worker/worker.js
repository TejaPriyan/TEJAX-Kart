// TEJAX KART — Global Cloudflare Workers + SQLite Durable Objects Multiplayer & Leaderboard Backend
import { DurableObject } from 'cloudflare:workers';

const TRACK_PTS = [
  // 0: Neo City
  [[0,0.5,0],[160,2.5,-20],[300,5.5,60],[330,4,200],[220,1.5,300],[60,3.5,250],[-40,6.5,340],[-200,5,300],[-260,2,160],[-150,0.8,60],[-100,1.5,-80]],
  // 1: Crimson Canyon
  [[0,1,0],[140,6.5,-60],[260,14,-30],[320,9.5,120],[250,3,220],[120,8.5,180],[30,15,290],[-100,10.5,350],[-220,4.5,270],[-280,8.5,130],[-180,3.5,30],[-90,1.5,-40]],
  // 2: Glacier Ridge
  [[0,1.5,0],[130,3,-80],[250,8.5,-40],[290,14,80],[200,17.5,190],[90,12,170],[-20,6,220],[-140,3.5,250],[-230,9,180],[-260,15,70],[-160,8.5,-20],[-60,3,-50]],
  // 3: Obsidian Caldera
  [[0,2,0],[150,5,-45],[290,13,20],[340,21,150],[250,15,280],[110,8,240],[-10,16,330],[-160,22,300],[-280,12,190],[-250,5,50],[-140,3,-65]],
  // 4: Orbital Skyway
  [[0,10,0],[180,16,-30],[330,26,55],[360,22,210],[240,12,330],[70,18,295],[-80,28,365],[-245,24,285],[-310,14,140],[-210,9,10],[-120,11,-85]]
];
const ARM = [0.8, 1.6, 0.7, 1, 0.75, 1.25];
const ABILITY = [0, 1, 2, 3, 4, 5];
const DURATION = [2.5, 4, 4.5, 5, 3.5, 4.5];
const COOLDOWN = [20, 22, 20, 24, 22, 23];
const POWERS = [
  { field: 'hp', value: 40 },
  { field: 'bo', value: 100 },
  { field: 'sh', value: 7 },
  { field: 'ms', value: 0 },
  { field: 'rapid', value: 10 },
  { field: 'plasma', value: 8 },
  { field: 'magnet', value: 12 },
  { field: 'ultCd', value: 0 }
];
const QUICK_CHATS = ['🏁 Ready!', '🔥 Let\'s race!', '🚀 Watch out!', '🛡️ Shield up!', '👏 Good race!', '🔄 Rematch?'];

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6D2B79F5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function segmentDistance(ax, ay, az, bx, by, bz, x, y, z) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, d = dx * dx + dy * dy + dz * dz;
  const t = d ? clamp(((x - ax) * dx + (y - ay) * dy + (z - az) * dz) / d, 0, 1) : 0;
  return Math.hypot(x - ax - t * dx, y - ay - t * dy, z - az - t * dz);
}
function validCar(c) { return Number.isInteger(c) && c >= 0 && c < 6; }
function validState(m) {
  return ['x', 'z', 'h', 'vf', 'vl', 'lap', 'idx'].every(k => Number.isFinite(m[k])) &&
    Math.abs(m.x) < 1200 && Math.abs(m.z) < 1200 &&
    Math.abs(m.vf) <= 200 && Math.abs(m.vl) <= 200 &&
    Number.isInteger(m.idx) && m.idx >= 0 && m.idx < 500 &&
    Number.isInteger(m.lap) && m.lap >= 0 && m.lap <= 3 &&
    (m.st === undefined || (Number.isFinite(m.st) && Math.abs(m.st) <= 1.05));
}

// Pure JS closed centripetal/uniform Catmull-Rom curve matching Three.js CatmullRomCurve3(pts, true, 'catmullrom', 0.5).getSpacedPoints(500)
function catmullPoint(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  const c = (a, b, c2, d) => 0.5 * ((2 * b) + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t2 + (-a + 3 * b - 3 * c2 + d) * t3);
  return { x: c(p0[0], p1[0], p2[0], p3[0]), y: c(p0[1], p1[1], p2[1], p3[1]), z: c(p0[2], p1[2], p2[2], p3[2]) };
}
function sampleTrack(pts, count = 500) {
  const n = pts.length, dense = 2000, raw = [], lens = [0];
  let total = 0;
  for (let i = 0; i <= dense; i++) {
    const u = (i / dense) * n;
    const seg = Math.floor(u) % n;
    const frac = u - Math.floor(u);
    const p = catmullPoint(pts[(seg - 1 + n) % n], pts[seg], pts[(seg + 1) % n], pts[(seg + 2) % n], frac);
    if (i > 0) {
      const prev = raw[i - 1];
      total += Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z);
      lens.push(total);
    }
    raw.push(p);
  }
  const out = [];
  let cursor = 0;
  for (let k = 0; k < count; k++) {
    const target = (k / count) * total;
    while (cursor < dense - 1 && lens[cursor + 1] < target) cursor++;
    const segLen = lens[cursor + 1] - lens[cursor] || 1;
    const f = (target - lens[cursor]) / segLen;
    const a = raw[cursor], b = raw[cursor + 1];
    out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f });
  }
  return out;
}
const TRACKS = TRACK_PTS.map(pts => sampleTrack(pts, 500));

function eligible(shooter, target, range = 115, cone = 0.48) {
  if (target === shooter || target.dead || target.cloaked) return false;
  const dx = target.x - shooter.x, dz = target.z - shooter.z, d = Math.hypot(dx, dz);
  const a = Math.atan2(Math.sin(Math.atan2(dx, dz) - shooter.h), Math.cos(Math.atan2(dx, dz) - shooter.h));
  return d > 3 && d <= range && Math.abs(a) <= cone && Math.abs((target.y || 0) - (shooter.y || 0)) < 24;
}
function clearShot(a, b, points, halfWidth = 14) {
  const distance = Math.hypot(b.x - a.x, b.z - a.z), steps = Math.max(2, Math.ceil(distance / 8));
  for (let j = 1; j < steps; j++) {
    const t = j / steps, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, y = a.y + (b.y - a.y) * t;
    for (let i = 0; i < points.length; i += 2) {
      const p = points[i];
      if ((x - p.x) ** 2 + (z - p.z) ** 2 < halfWidth * halfWidth && p.y + 0.15 > y) return false;
    }
  }
  return true;
}
function acquire(shooter, targets, points) {
  let best = null, score = Infinity;
  for (const t of targets) {
    if (!eligible(shooter, t) || !clearShot(shooter, t, points)) continue;
    const angle = Math.abs(Math.atan2(Math.sin(Math.atan2(t.x - shooter.x, t.z - shooter.z) - shooter.h), Math.cos(Math.atan2(t.x - shooter.x, t.z - shooter.z) - shooter.h)));
    const s = angle * 100 + Math.hypot(t.x - shooter.x, t.z - shooter.z) * 0.12;
    if (s < score) { best = t; score = s; }
  }
  return best;
}
function aimAt(shooter, target, speed) {
  if (!target) return { a: shooter.h, vy: 0 };
  const dx = target.x - shooter.x, dz = target.z - shooter.z, vx = target.vx || 0, vz = target.vz || 0;
  const A = vx * vx + vz * vz - speed * speed, B = 2 * (dx * vx + dz * vz), C = dx * dx + dz * dz, D = B * B - 4 * A * C;
  let time = Math.sqrt(C) / speed;
  if (D >= 0 && Math.abs(A) > 1e-8) {
    const roots = [(-B - Math.sqrt(D)) / (2 * A), (-B + Math.sqrt(D)) / (2 * A)].filter(v => v > 0);
    if (roots.length) time = Math.min(...roots);
  }
  time = clamp(time, 0.02, 0.65);
  const x = dx + vx * time, z = dz + vz * time, travel = Math.max(0.02, Math.hypot(x, z) / speed);
  return { a: Math.atan2(x, z), vy: clamp(((target.y || 0) - (shooter.y || 0)) / travel, -160, 160) };
}
function applyPower(car, type) {
  const p = POWERS[type];
  if (!p) return false;
  if (type === 0) car.hp = Math.min(100, car.hp + 40);
  else car[p.field] = p.value;
  return true;
}

function isAllowedOrigin(origin, env) {
  if (!origin) return true;
  const extra = String(env?.ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean);
  if (extra.includes(origin)) return true;
  try {
    const u = new URL(origin);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    if (['localhost', '127.0.0.1', '[::1]', '::1'].includes(u.hostname.toLowerCase())) return true;
    if (u.hostname.endsWith('.vercel.app') && u.hostname.includes('tejax-kart')) return true;
    if (u.hostname === 'tejapriyan.github.io') return true;
    return false;
  } catch { return false; }
}

function corsHeaders(origin, env) {
  const allow = origin && isAllowedOrigin(origin, env) ? origin : 'https://tejax-kart.vercel.app';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

function makeRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = 'TK-';
  for (let i = 0; i < 6; i++) out += chars[bytes[i] % chars.length];
  return out;
}

function cleanName(raw) {
  return String(raw || 'Racer').replace(/[<>&"'\x00-\x1f]/g, '').trim().slice(0, 16) || 'Racer';
}

/* ============================================================================
 * MATCHMAKER & GLOBAL LEADERBOARD DURABLE OBJECT (SQLite-backed)
 * ==========================================================================*/
export class Matchmaker extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS public_rooms (
          code TEXT PRIMARY KEY,
          host_name TEXT NOT NULL,
          track INTEGER NOT NULL DEFAULT 0,
          mode INTEGER NOT NULL DEFAULT 1,
          players INTEGER NOT NULL DEFAULT 1,
          max_players INTEGER NOT NULL DEFAULT 6,
          live INTEGER NOT NULL DEFAULT 0,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS leaderboard (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          track INTEGER NOT NULL,
          name TEXT NOT NULL,
          car INTEGER NOT NULL,
          paint TEXT NOT NULL,
          time_ms INTEGER NOT NULL,
          best_lap_ms INTEGER NOT NULL,
          ghost TEXT,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_lb_track_time ON leaderboard(track, time_ms ASC);
      `);
    });
  }

  pruneRooms() {
    const cutoff = Date.now() - 10 * 60 * 1000;
    this.ctx.storage.sql.exec('DELETE FROM public_rooms WHERE updated_at < ? OR players <= 0', cutoff);
  }

  async syncRoom(info) {
    this.pruneRooms();
    if (!info || !info.code) return;
    if (!info.isPublic || info.players <= 0) {
      this.ctx.storage.sql.exec('DELETE FROM public_rooms WHERE code = ?', info.code);
      return;
    }
    this.ctx.storage.sql.exec(
      `INSERT INTO public_rooms (code, host_name, track, mode, players, max_players, live, updated_at)
       VALUES (?, ?, ?, ?, ?, 6, ?, ?)
       ON CONFLICT(code) DO UPDATE SET
         host_name=excluded.host_name, track=excluded.track, mode=excluded.mode,
         players=excluded.players, live=excluded.live, updated_at=excluded.updated_at`,
      info.code, cleanName(info.hostName), info.track | 0, info.mode | 0, info.players | 0, info.live ? 1 : 0, Date.now()
    );
  }

  async listRooms() {
    this.pruneRooms();
    return this.ctx.storage.sql.exec(
      'SELECT code, host_name AS hostName, track, mode, players, max_players AS maxPlayers, live, updated_at AS updatedAt FROM public_rooms WHERE live = 0 AND players < max_players ORDER BY players DESC, updated_at DESC LIMIT 20'
    ).toArray();
  }

  async quickMatch(track = 0, mode = 1, hostName = 'Racer') {
    this.pruneRooms();
    const open = this.ctx.storage.sql.exec(
      'SELECT code, track, mode, players FROM public_rooms WHERE live = 0 AND players < max_players ORDER BY players DESC, updated_at DESC LIMIT 1'
    ).toArray();
    if (open.length > 0) {
      return { action: 'join', code: open[0].code, track: open[0].track, mode: open[0].mode };
    }
    const code = makeRoomCode();
    const t = Number.isInteger(track) && track >= 0 && track < TRACKS.length ? track : 0;
    const m = [0, 1, 2].includes(mode) ? mode : 1;
    this.ctx.storage.sql.exec(
      'INSERT INTO public_rooms (code, host_name, track, mode, players, max_players, live, updated_at) VALUES (?, ?, ?, ?, 1, 6, 0, ?)',
      code, cleanName(hostName), t, m, Date.now()
    );
    return { action: 'create', code, track: t, mode: m };
  }

  async getLeaderboard(track) {
    const t = Number.isInteger(track) && track >= 0 && track < TRACKS.length ? track : 0;
    return this.ctx.storage.sql.exec(
      `SELECT id, track, name, car, paint, time_ms AS timeMs, best_lap_ms AS bestLapMs,
              CASE WHEN ghost IS NOT NULL AND length(ghost) > 2 THEN 1 ELSE 0 END AS hasGhost,
              created_at AS createdAt
       FROM leaderboard WHERE track = ? ORDER BY time_ms ASC LIMIT 20`,
      t
    ).toArray();
  }

  async getGhost(id) {
    const rows = this.ctx.storage.sql.exec(
      'SELECT id, track, name, car, paint, time_ms AS timeMs, ghost FROM leaderboard WHERE id = ? LIMIT 1',
      id | 0
    ).toArray();
    if (!rows.length || !rows[0].ghost) return null;
    try {
      return { ...rows[0], ghost: JSON.parse(rows[0].ghost) };
    } catch { return null; }
  }

  async submitScore(body) {
    const track = body?.track | 0;
    const car = body?.car | 0;
    const timeMs = Math.round(Number(body?.timeMs));
    const bestLapMs = Math.round(Number(body?.bestLapMs || timeMs / 3));
    if (track < 0 || track >= TRACKS.length || !validCar(car)) return { error: 'Invalid track or vehicle.' };
    if (!Number.isFinite(timeMs) || timeMs < 25000 || timeMs > 600000) return { error: 'Out-of-range race time.' };
    if (!Number.isFinite(bestLapMs) || bestLapMs < 7000 || bestLapMs > timeMs) return { error: 'Out-of-range lap time.' };

    const name = cleanName(body?.name);
    const paint = /^#[0-9a-f]{6}$/i.test(body?.paint) ? body.paint : '#b6ff3b';
    let ghostStr = null;
    if (Array.isArray(body?.ghost) && body.ghost.length >= 10 && body.ghost.length <= 1200) {
      const sanitized = body.ghost
        .filter(p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite))
        .map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10, Math.round(p[2] * 100) / 100]);
      const encoded = JSON.stringify(sanitized);
      if (encoded.length <= 24000) ghostStr = encoded;
    }

    const res = this.ctx.storage.sql.exec(
      'INSERT INTO leaderboard (track, name, car, paint, time_ms, best_lap_ms, ghost, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id',
      track, name, car, paint, timeMs, bestLapMs, ghostStr, Date.now()
    ).one();

    // Keep top 100 entries per track to bound storage cleanly
    this.ctx.storage.sql.exec(
      'DELETE FROM leaderboard WHERE track = ? AND id NOT IN (SELECT id FROM leaderboard WHERE track = ? ORDER BY time_ms ASC LIMIT 100)',
      track, track
    );

    const rankRow = this.ctx.storage.sql.exec(
      'SELECT COUNT(*) + 1 AS rank FROM leaderboard WHERE track = ? AND time_ms < ?',
      track, timeMs
    ).one();
    return { id: res.id, rank: rankRow.rank, track, timeMs };
  }
}

/* ============================================================================
 * RACE ROOM DURABLE OBJECT (1 DO per Room Code)
 * ==========================================================================*/
export class RaceRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.uid = 0;
    this.code = '';
    this.track = 0;
    this.mode = 1; // 0=Race, 1=Combat, 2=Elimination
    this.isPublic = false;
    this.fillBots = true;
    this.live = false;
    this.seed = 0;
    this.started = 0;
    this.finish = [];
    this.shots = [];
    this.pickups = [];
    this.contacts = new Map();
    this.players = new Map(); // WebSocket -> player state
    this.order = []; // WebSocket[]
    this.tickTimer = null;
    this.lastTick = Date.now();

    // Restore sockets across hibernation if any
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment();
      if (att && att.id) {
        this.uid = Math.max(this.uid, att.id);
        this.code = att.code || this.code;
        this.track = att.track ?? this.track;
        this.mode = att.mode ?? this.mode;
        this.isPublic = !!att.isPublic;
        this.fillBots = att.fillBots !== false;
        const p = this.makePlayer(att.id, att.name, att.car, att.paint, !!att.ready);
        this.players.set(ws, p);
        this.order.push(ws);
      }
    }
  }

  makePlayer(id, name, car, paint, ready = false) {
    return {
      id, name, car, paint, ready,
      rateAt: Date.now(), rate: 0,
      hp: 100, deadUntil: 0, shieldUntil: 0, invUntil: 0,
      abilityUntil: 0, abilityReady: 0, gunReady: 0, missileReady: 0, empReady: 0,
      rapidUntil: 0, plasmaUntil: 0, magnetUntil: 0,
      lap: 0, checkpoint: 0, finish: 0, eliminated: false,
      seenState: false, lastState: Date.now(),
      state: { x: 0, z: 0, h: 0, vf: 0, vl: 0, idx: 3, lap: 0, st: 0, bo: 0, br: 0 }
    };
  }

  send(ws, obj) {
    try { ws.send(JSON.stringify(obj)); } catch {}
  }

  broadcast(obj, exceptWs = null) {
    const raw = JSON.stringify(obj);
    for (const ws of this.order) {
      if (ws === exceptWs) continue;
      try { ws.send(raw); } catch {}
    }
  }

  async syncDirectory() {
    if (!this.code) return;
    try {
      const mm = this.env.MATCHMAKER.getByName('global');
      const host = this.order.length ? this.players.get(this.order[0]) : null;
      await mm.syncRoom({
        code: this.code,
        isPublic: this.isPublic,
        hostName: host?.name || 'Racer',
        track: this.track,
        mode: this.mode,
        players: this.order.length,
        live: this.live
      });
    } catch {}
  }

  broadcastRoomInfo() {
    if (!this.order.length) return;
    const hostId = this.players.get(this.order[0])?.id || 0;
    const list = this.order.map(ws => {
      const p = this.players.get(ws);
      return { id: p.id, name: p.name, car: p.car, paint: p.paint, ready: !!p.ready };
    });
    for (const ws of this.order) {
      const p = this.players.get(ws);
      ws.serializeAttachment({
        id: p.id, name: p.name, car: p.car, paint: p.paint, ready: !!p.ready,
        code: this.code, track: this.track, mode: this.mode, isPublic: this.isPublic, fillBots: this.fillBots
      });
      this.send(ws, {
        t: 'room', code: this.code, you: p.id, host: hostId,
        track: this.track, mode: this.mode, isPublic: this.isPublic, fillBots: this.fillBots,
        players: list
      });
    }
    this.syncDirectory();
  }

  async fetch(request) {
    const url = new URL(request.url);
    const roomCode = (url.searchParams.get('room') || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12);
    if (roomCode && !this.code) this.code = roomCode;

    if (request.headers.get('Upgrade') !== 'websocket') {
      return Response.json({ code: this.code, players: this.order.length, live: this.live, track: this.track, mode: this.mode });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  broadcastHealth(p, killerId = null) {
    const now = Date.now();
    const payload = {
      t: 'health', id: p.id, hp: p.hp,
      dead: p.eliminated || p.deadUntil > now,
      eliminated: !!p.eliminated,
      sh: Math.max(0, (p.shieldUntil - now) / 1000),
      inv: Math.max(0, (p.invUntil - now) / 1000)
    };
    if (killerId) payload.killer = killerId;
    this.broadcast(payload);
  }

  applyDamage(p, amount, by) {
    const now = Date.now();
    if (this.mode === 0 || p.eliminated || p.deadUntil > now || p.invUntil > now || p.shieldUntil > now) return;
    p.hp = Math.max(0, p.hp - amount / ARM[p.car]);
    if (p.hp <= 0) {
      if (this.mode === 2) {
        p.eliminated = true;
        p.deadUntil = now + 9e9;
      } else {
        p.deadUntil = now + 3500;
        p.invUntil = p.deadUntil + 2500;
      }
      this.broadcastHealth(p, by?.id);
      if (this.mode === 2) {
        const alive = this.order.map(w => this.players.get(w)).filter(x => !x.eliminated);
        if (alive.length <= 1) {
          this.live = false;
          this.stopTick();
          if (alive.length === 1) {
            this.broadcast({ t: 'progress', id: alive[0].id, lap: 3, place: 1, elimWin: true });
          }
          this.syncDirectory();
        }
      }
      return;
    }
    this.broadcastHealth(p);
  }

  combatState(p, now) {
    const s = p.state;
    return {
      ...s, y: TRACKS[this.track][s.idx].y + 1.7,
      vx: Math.sin(s.h) * s.vf + Math.cos(s.h) * s.vl,
      vz: Math.cos(s.h) * s.vf - Math.sin(s.h) * s.vl,
      dead: p.eliminated || p.deadUntil > now,
      cloaked: ABILITY[p.car] === 2 && p.abilityUntil > now,
      player: p
    };
  }

  startRace() {
    const now = Date.now();
    this.live = true;
    const seedArr = new Uint32Array(1);
    crypto.getRandomValues(seedArr);
    this.seed = seedArr[0];
    this.started = now + 3400;
    this.finish = [];
    this.shots = [];
    this.contacts.clear();
    const rng = seeded(this.seed);
    this.pickups = Array.from({ length: 8 }, (_, i) => ({ idx: (i * 62 + 30) % 500, lat: (rng() - 0.5) * 12, ready: 0 }));

    this.order.forEach((ws, i) => {
      const p = this.players.get(ws);
      const idx = 3 + i * 4, pt = TRACKS[this.track][idx];
      Object.assign(p, {
        hp: 100, deadUntil: 0, shieldUntil: 0, invUntil: 0,
        abilityUntil: 0, abilityReady: 0, gunReady: 0, missileReady: 0, empReady: 0,
        rapidUntil: 0, plasmaUntil: 0, magnetUntil: 0,
        lap: 0, checkpoint: 0, finish: 0, eliminated: false,
        seenState: false, lastState: now,
        state: { x: pt.x, z: pt.z, h: 0, vf: 0, vl: 0, idx, lap: 0, st: 0, bo: 0, br: 0 }
      });
    });

    const botCount = this.fillBots ? Math.max(0, 6 - this.order.length) : 0;
    this.broadcast({
      t: 'go',
      order: this.order.map(ws => this.players.get(ws).id),
      track: this.track,
      mode: this.mode,
      seed: this.seed,
      botCount
    });
    this.syncDirectory();
    this.startTick();
  }

  startTick() {
    this.stopTick();
    this.lastTick = Date.now();
    this.tickTimer = setInterval(() => this.tick(), 25);
  }

  stopTick() {
    if (this.tickTimer) { clearInterval(this.tickTimer); this.tickTimer = null; }
  }

  tick() {
    if (!this.live || !this.order.length) { this.stopTick(); return; }
    const now = Date.now(), dt = Math.min(0.1, (now - this.lastTick) / 1000);
    this.lastTick = now;

    const plist = this.order.map(ws => this.players.get(ws));
    for (const p of plist) {
      if (this.mode !== 2 && p.deadUntil && now >= p.deadUntil) {
        p.deadUntil = 0; p.hp = 100;
        this.broadcastHealth(p);
      }
    }

    if (this.mode !== 0) {
      for (const s of plist) {
        if (s.eliminated || s.deadUntil > now) continue;
        if (s.abilityUntil > now && ABILITY[s.car] === 5 && now >= (s.seismicAt || 0)) {
          s.seismicAt = now + 850;
          for (const other of plist) {
            if (other !== s && !other.eliminated && other.deadUntil <= now && Math.hypot(other.state.x - s.state.x, other.state.z - s.state.z) < 18) {
              this.applyDamage(other, 14, s);
            }
          }
        }
      }
      for (let i = 0; i < plist.length; i++) {
        for (let j = i + 1; j < plist.length; j++) {
          const a = plist[i], b = plist[j], key = a.id + ':' + b.id;
          if (a.eliminated || b.eliminated || a.deadUntil > now || b.deadUntil > now) continue;
          if (now < (this.contacts.get(key) || 0)) continue;
          const dist = Math.hypot(a.state.x - b.state.x, a.state.z - b.state.z);
          if (dist < 6.5 && ((a.abilityUntil > now && ABILITY[a.car] === 4) || (b.abilityUntil > now && ABILITY[b.car] === 4))) {
            this.contacts.set(key, now + 650);
            if (a.abilityUntil > now && ABILITY[a.car] === 4) this.applyDamage(b, 16, a);
            if (b.abilityUntil > now && ABILITY[b.car] === 4) this.applyDamage(a, 16, b);
            continue;
          }
          if (dist >= 3.6) continue;
          this.contacts.set(key, now + 650);
          for (const [attacker, victim] of [[a, b], [b, a]]) {
            if (attacker.abilityUntil > now && [0, 1].includes(ABILITY[attacker.car])) {
              this.applyDamage(victim, ABILITY[attacker.car] === 0 ? 15 : 28, attacker);
            }
          }
        }
      }

      const points = TRACKS[this.track];
      for (const s of this.shots) {
        if (now >= s.until) continue;
        const ox = s.x, oy = s.y, oz = s.z;
        if (s.ty) {
          if (s.target && (s.target.eliminated || s.target.deadUntil > now || (ABILITY[s.target.car] === 2 && s.target.abilityUntil > now))) s.target = null;
          if (s.target) {
            let e = Math.atan2(s.target.state.x - s.x, s.target.state.z - s.z) - s.a;
            e = Math.atan2(Math.sin(e), Math.cos(e));
            s.a += clamp(e, -2.5 * dt, 2.5 * dt);
            s.y += clamp(points[s.target.state.idx].y + 1.2 - s.y, -30 * dt, 30 * dt);
          }
          s.speed = Math.min(130, s.speed + 50 * dt);
        } else {
          let best = s.idx;
          for (let k = -4; k <= 4; k++) {
            const idx = (s.idx + k + 500) % 500;
            if (Math.hypot(points[idx].x - s.x, points[idx].z - s.z) < Math.hypot(points[best].x - s.x, points[best].z - s.z)) best = idx;
          }
          s.idx = best;
          s.y += s.vy * dt;
        }
        s.x += Math.sin(s.a) * s.speed * dt;
        s.z += Math.cos(s.a) * s.speed * dt;
        const ground = points[s.idx];
        if (!s.ty && Math.hypot(s.x - ground.x, s.z - ground.z) < 14 && s.y < ground.y + 0.1) s.until = 0;
        if (s.until > now) {
          for (const victim of plist) {
            if (victim === s.owner || victim.eliminated || victim.deadUntil > now) continue;
            const y = points[victim.state.idx].y + 1.7;
            if (segmentDistance(ox, oy, oz, s.x, s.y, s.z, victim.state.x, y, victim.state.z) < (s.ty ? 3.5 : 2.8)) {
              if (ABILITY[victim.car] === 1 && victim.abilityUntil > now) {
                s.target = s.owner; s.owner = victim; s.a += Math.PI; s.vy = -s.vy;
              } else {
                this.applyDamage(victim, s.damage, s.owner);
                s.until = 0;
              }
              break;
            }
          }
        }
      }
      this.shots = this.shots.filter(s => now < s.until);
    }
  }

  async webSocketMessage(ws, raw) {
    let m;
    try { m = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw)); } catch { return this.send(ws, { t: 'err', m: 'Invalid message.' }); }
    if (!m || typeof m !== 'object' || typeof m.t !== 'string') return;

    const now = Date.now();
    if (m.t === 'p') { if (Number.isFinite(m.ts)) this.send(ws, { t: 'p', ts: m.ts }); return; }

    let p = this.players.get(ws);
    if (p) {
      if (now - p.rateAt > 1000) { p.rateAt = now; p.rate = 0; }
      if (++p.rate > 110) { ws.close(1008, 'Rate limit'); return; }
    }

    if (m.t === 'create' || m.t === 'join') {
      if (!validCar(m.car)) return this.send(ws, { t: 'err', m: 'Choose a valid vehicle.' });
      if (!p) {
        if (this.order.length >= 6 || this.live) return this.send(ws, { t: 'err', m: 'Room is full or already racing.' });
        if (this.order.length === 0) {
          if (Number.isInteger(m.track) && m.track >= 0 && m.track < TRACKS.length) this.track = m.track;
          if ([0, 1, 2].includes(m.mode)) this.mode = m.mode;
          this.isPublic = !!m.isPublic;
          this.fillBots = m.fillBots !== false;
        }
        const id = ++this.uid;
        const paint = /^#[a-f0-9]{6}$/i.test(m.paint) ? m.paint : '#b6ff3b';
        p = this.makePlayer(id, cleanName(m.name), m.car, paint, false);
        this.players.set(ws, p);
        this.order.push(ws);
      } else {
        p.name = cleanName(m.name);
        p.car = m.car;
        p.paint = /^#[a-f0-9]{6}$/i.test(m.paint) ? m.paint : p.paint;
      }
      this.broadcastRoomInfo();
      return;
    }

    if (!p) return;
    const isHost = this.order[0] === ws;

    if (m.t === 'ready' && !this.live) {
      p.ready = !p.ready;
      this.broadcastRoomInfo();
      return;
    }
    if (m.t === 'config' && isHost && !this.live) {
      if (Number.isInteger(m.track) && m.track >= 0 && m.track < TRACKS.length) this.track = m.track;
      if ([0, 1, 2].includes(m.mode)) this.mode = m.mode;
      if (typeof m.fillBots === 'boolean') this.fillBots = m.fillBots;
      if (typeof m.isPublic === 'boolean') this.isPublic = m.isPublic;
      this.broadcastRoomInfo();
      return;
    }
    if (m.t === 'chat') {
      const idx = m.i | 0;
      const text = QUICK_CHATS[idx];
      if (text) this.broadcast({ t: 'chat', f: p.id, name: p.name, paint: p.paint, text });
      return;
    }
    if (m.t === 'start') {
      if (isHost && !this.live && (this.order.length >= 2 || this.fillBots)) this.startRace();
      return;
    }
    if (m.t === 'rematch') {
      if (!isHost) return this.send(ws, { t: 'err', m: 'The host starts the rematch.' });
      this.live = false;
      this.stopTick();
      this.shots = [];
      for (const w of this.order) this.players.get(w).ready = false;
      this.broadcast({ t: 'reset' });
      this.broadcastRoomInfo();
      return;
    }

    if (!this.live) return;

    if (m.t === 'bots' && isHost && Array.isArray(m.list) && m.list.length <= 5) {
      // Relay host-simulated backfill bots to guests
      const clean = m.list.map(b => ({
        i: b.i | 0, x: +Number(b.x || 0).toFixed(1), z: +Number(b.z || 0).toFixed(1),
        h: +Number(b.h || 0).toFixed(2), vf: +Number(b.vf || 0).toFixed(1),
        vl: +Number(b.vl || 0).toFixed(1), lap: b.lap | 0, idx: clamp(b.idx | 0, 0, 499),
        hp: clamp(b.hp | 0, 0, 100), d: b.d ? 1 : 0, st: clamp(Number(b.st) || 0, -1, 1), bo: b.bo ? 1 : 0
      }));
      this.broadcast({ t: 'bots', list: clean }, ws);
      return;
    }

    if (m.t === 's') {
      if (!validState(m)) return;
      const prev = p.state, pt = TRACKS[this.track][m.idx];
      const dist = Math.hypot(m.x - prev.x, m.z - prev.z);
      const seconds = Math.min(2, Math.max(0.05, (now - p.lastState) / 1000));
      if (p.seenState && dist > seconds * 210 + 18) return;
      if (Math.hypot(m.x - pt.x, m.z - pt.z) > 25) return;
      p.seenState = true; p.lastState = now;
      p.state = {
        x: m.x, z: m.z, h: m.h, vf: m.vf, vl: m.vl, idx: m.idx, lap: p.lap,
        st: clamp(Number.isFinite(m.st) ? m.st : 0, -1, 1), bo: m.bo ? 1 : 0, br: m.br ? 1 : 0
      };
      if (this.mode !== 2 && now >= this.started && !p.finish) {
        const delta = (m.idx - prev.idx + 500) % 500;
        if (delta < 40 && p.checkpoint < 3 && m.idx >= 120 * (p.checkpoint + 1) && m.idx < 120 * (p.checkpoint + 1) + 50) p.checkpoint++;
        if (prev.idx > 450 && m.idx < 50 && p.checkpoint === 3) {
          p.lap++; p.checkpoint = 0;
          if (p.lap === 3) { this.finish.push(p.id); p.finish = this.finish.length; }
          this.broadcast({ t: 'progress', id: p.id, lap: p.lap, place: p.finish });
          if (this.order.every(w => this.players.get(w).finish)) {
            this.live = false; this.stopTick(); this.syncDirectory();
          }
        }
      }
      this.broadcast({ t: 's', f: p.id, ...p.state, lap: p.lap, hp: p.hp, dead: p.eliminated || p.deadUntil > now }, ws);
      return;
    }

    if (now < this.started || p.eliminated || p.deadUntil > now || p.finish) return;

    if (m.t === 'ability' && this.mode !== 0) {
      if (now < p.abilityReady) return;
      p.abilityReady = now + COOLDOWN[p.car] * 1000;
      p.abilityUntil = now + DURATION[p.car] * 1000;
      const ty = ABILITY[p.car];
      if (ty === 0 || ty === 1 || ty === 5) p.invUntil = p.abilityUntil;
      else if (ty === 4) p.invUntil = now + Math.min(1400, DURATION[p.car] * 450);
      if (ty === 5) p.seismicAt = now;
      this.broadcast({ t: 'ability', id: p.id });
      if (ty === 2) for (const s of this.shots) if (s.target === p) s.target = null;
      return;
    }

    if (m.t === 'ev' && this.mode !== 0) {
      if (![0, 1, 2].includes(m.k) || !Number.isFinite(m.a)) return;
      if (m.k === 2) {
        if (now < p.empReady) return;
        p.empReady = now + 10000;
        for (const w of this.order) {
          const other = this.players.get(w);
          if (other !== p && Math.hypot(other.state.x - p.state.x, other.state.z - p.state.z) < 28) {
            this.applyDamage(other, 18, p);
          }
        }
        this.broadcast({ t: 'ev', f: p.id, k: 2 }, ws);
        return;
      }
      const key = m.k ? 'missileReady' : 'gunReady';
      if (now < p[key]) return;
      p[key] = now + (m.k ? 4000 : (p.rapidUntil > now || (p.abilityUntil > now && ABILITY[p.car] === 3)) ? 45 : 120);
      const shooter = this.combatState(p, now);
      const targets = this.order.map(w => this.players.get(w)).filter(x => x !== p).map(x => this.combatState(x, now));
      const targetState = acquire(shooter, targets, TRACKS[this.track]);
      const target = targetState?.player;
      shooter.x += Math.sin(shooter.h) * 3;
      shooter.z += Math.cos(shooter.h) * 3;
      const aim = aimAt(shooter, targetState, m.k ? 90 : 235 + Math.max(0, p.state.vf));
      this.shots.push({
        owner: p, ty: m.k, x: shooter.x, y: shooter.y, z: shooter.z, a: aim.a, vy: aim.vy,
        damage: m.k ? 35 : p.plasmaUntil > now ? 9 : 4,
        speed: m.k ? 68 + Math.max(0, p.state.vf) : 235 + Math.max(0, p.state.vf),
        idx: p.state.idx, target, until: now + (m.k ? 6000 : 950)
      });
      this.broadcast({ t: 'ev', f: p.id, k: m.k, a: aim.a, vy: aim.vy, tg: target?.id }, ws);
      return;
    }

    if (m.t === 'pickup') {
      if (!Number.isInteger(m.index) || m.index < 0 || m.index > 7) return;
      const pk = this.pickups[m.index];
      if (!pk || now < pk.ready) return;
      const pts = TRACKS[this.track], pt = pts[pk.idx], prev = pts[(pk.idx + 499) % 500], next = pts[(pk.idx + 1) % 500];
      const dx = next.x - prev.x, dz = next.z - prev.z, l = Math.hypot(dx, dz) || 1;
      if (Math.hypot(p.state.x - (pt.x + dz / l * pk.lat), p.state.z - (pt.z - dx / l * pk.lat)) > (p.magnetUntil > now ? 14 : 7)) return;
      pk.ready = now + 12000;
      const ty = this.mode === 0 ? m.index % 3 : m.index;
      const power = {
        hp: p.hp, bo: 100,
        sh: Math.max(0, (p.shieldUntil - now) / 1000),
        ms: Math.max(0, (p.missileReady - now) / 1000),
        ultCd: Math.max(0, (p.abilityReady - now) / 1000)
      };
      for (const name of ['rapid', 'plasma', 'magnet']) power[name] = Math.max(0, (p[name + 'Until'] - now) / 1000);
      applyPower(power, ty);
      p.hp = power.hp; p.shieldUntil = now + power.sh * 1000; p.missileReady = now + power.ms * 1000; p.abilityReady = now + power.ultCd * 1000;
      for (const name of ['rapid', 'plasma', 'magnet']) p[name + 'Until'] = now + power[name] * 1000;
      this.broadcast({ t: 'pickup', index: m.index, id: p.id });
      this.broadcastHealth(p);
    }
  }

  handleDisconnect(ws) {
    const p = this.players.get(ws);
    if (!p) return;
    this.players.delete(ws);
    this.order = this.order.filter(w => w !== ws);
    if (!this.order.length) {
      this.live = false;
      this.stopTick();
      this.syncDirectory();
      return;
    }
    this.broadcast({ t: 'gone', id: p.id });
    this.broadcastRoomInfo();
  }

  webSocketClose(ws) { this.handleDisconnect(ws); }
  webSocketError(ws) { this.handleDisconnect(ws); }
}

/* ============================================================================
 * WORKER ENTRYPOINT
 * ==========================================================================*/
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(origin, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === '/api/health' || url.pathname === '/') {
      return Response.json({ ok: true, service: 'tejax-kart-mp', version: '6.4.0' }, { headers: cors });
    }

    if (origin && !isAllowedOrigin(origin, env)) {
      return new Response('Forbidden Origin', { status: 403, headers: cors });
    }

    if (url.pathname === '/api/rooms' && request.method === 'GET') {
      const mm = env.MATCHMAKER.getByName('global');
      const rooms = await mm.listRooms();
      return Response.json({ rooms }, { headers: cors });
    }

    if (url.pathname === '/api/quickmatch' && request.method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch {}
      const mm = env.MATCHMAKER.getByName('global');
      const result = await mm.quickMatch(body.track | 0, body.mode ?? 1, body.name);
      return Response.json(result, { headers: cors });
    }

    if (url.pathname === '/api/leaderboard' && request.method === 'GET') {
      const track = Number(url.searchParams.get('track') || 0) | 0;
      const mm = env.MATCHMAKER.getByName('global');
      const entries = await mm.getLeaderboard(track);
      return Response.json({ track, entries }, { headers: cors });
    }

    if (url.pathname === '/api/leaderboard' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: cors }); }
      const mm = env.MATCHMAKER.getByName('global');
      const res = await mm.submitScore(body);
      return Response.json(res, { status: res.error ? 400 : 200, headers: cors });
    }

    if (url.pathname === '/api/ghost' && request.method === 'GET') {
      const id = Number(url.searchParams.get('id') || 0) | 0;
      const mm = env.MATCHMAKER.getByName('global');
      const ghost = await mm.getGhost(id);
      if (!ghost) return Response.json({ error: 'Ghost not found' }, { status: 404, headers: cors });
      return Response.json(ghost, { headers: cors });
    }

    if (url.pathname === '/ws') {
      const code = (url.searchParams.get('room') || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12);
      if (!code || !code.startsWith('TK-')) {
        return new Response('Valid room code required (?room=TK-XXXXXX)', { status: 400, headers: cors });
      }
      const stub = env.RACE_ROOM.getByName(code);
      return stub.fetch(request);
    }

    return new Response('Not found', { status: 404, headers: cors });
  }
};
