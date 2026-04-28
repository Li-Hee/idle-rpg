// ============================================================
// Idle Chronicles — Express Server
// ============================================================
import express from 'express';
import path from 'path';
import cors from 'cors';
import { exec } from 'child_process';
import { EQUIP_TYPES, AFFIX_POOL, AFFIX_TIERS, RARITY_MAP, SKILL_LIST, SKILL_RUNES, TOWER_CONFIG, EXPLORATION_TIERS, CLASSES } from './data.js';
import { registerRoute, loginRoute, authMiddleware, getUserCount, getAllUsers } from './auth.js';
import gameStateManager from './gameStateManager.js';

const app = express();
const PORT = process.env.PORT || 3001;

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const distPath = path.join(__dirname, '../../client/dist');

app.use(cors());
app.use(express.json());

// Serve built frontend
app.use(express.static(distPath));

// ============================================================
// Helper: get user's game state
// ============================================================
function gs(req) {
  return gameStateManager.getOrCreate(req.user.username);
}

// ============================================================
// Helper: sanitize state for client (remove circular / heavy data)
// ============================================================
function sanitizeState(gameState) {
  const p = gameState.player;
  const m = gameState.monster;

  // Calculate set bonuses
  gameState.checkSetBonuses();

  // Check exploration completion
  gameState.checkExploration();

  // Daily status
  const dailyStatus = gameState.checkDaily();

  return {
    player: {
      level: p.level,
      exp: p.exp,
      expNeeded: gameState.expNeeded,
      gold: p.gold,
      stones: p.stones,
      reforgeStones: p.reforgeStones,
      lifetimeGold: p.lifetimeGold,
      totalKills: p.totalKills,
      hp: Math.ceil(p.hp),
      maxHp: p.maxHp,
      power: gameState.power,
      totalAtk: gameState.totalAtk,
      totalDef: gameState.totalDef,
      critRate: Math.round(gameState.critRate * 100),
      lifesteal: Math.round(gameState.lifesteal * 100),
      dodge: Math.round(gameState.dodge * 100),
      thorns: Math.round(gameState.thorns * 100),
      goldBonus: Math.round(gameState.goldBonus * 100),
      expBonus: Math.round(gameState.expBonus * 100),
      killStreak: p.killStreak,
      streakBonus: Math.round(gameState.streakBonus * 100),
      killsSinceBoss: p.killsSinceBoss,
      rebirthCount: p.rebirthCount,
      bagSize: p.bagSize,
      classId: p.classId,
      passives: p.passives,
      ultimate: p.ultimate,
      collection: p.collection,
      quests: p.quests,
      eliteTimer: p.eliteTimer,
      explorationCount: p.explorationCount,
      towerHighest: gameState.tower.highestFloor,
      dailyStreak: p.dailyStreak,
      setBonusesUnlocked: p.setBonusesUnlocked,
      // Upgrades
      upgrades: { ...p.upgrades },
      upgradeCosts: {
        hp: Math.floor(80 * Math.pow(1.15, p.upgrades.hp)),
        atk: Math.floor(80 * Math.pow(1.15, p.upgrades.atk)),
        def: Math.floor(80 * Math.pow(1.15, p.upgrades.def))
      },
      // Settings
      settings: { ...p.settings }
    },
    monster: m ? {
      name: m.name,
      color: m.color,
      level: m.level,
      hp: Math.ceil(m.hp),
      maxHp: m.maxHp,
      atk: m.atk,
      def: m.def,
      gold: m.gold,
      exp: m.exp,
      isBoss: m.isBoss,
      isTower: m.isTower || false,
      towerFloor: m.towerFloor || 0
    } : null,
    equipment: {
      slots: Object.fromEntries(Object.entries(p.equipment).map(([k, eq]) => {
        if (!eq) return [k, null];
        const elv = p.enhanceLevels[k] || 0;
        return [k, { ...eq, effAtk: Math.floor(eq.atk * (1 + 0.15 * elv)), effDef: Math.floor(eq.def * (1 + 0.15 * elv)) }];
      })),
      enhanceLevels: p.enhanceLevels,
    },
    inventory: p.inventory,
    skills: p.skills,
    setBonuses: gameState.getActiveSetBonuses(),
    setBonusInfo: { count: gameState._setCache.count, tier: gameState._setCache.tier, bonuses: gameState._setCache.bonuses },
    events: gameState.events.active ? {
      name: gameState.events.active.name,
      desc: gameState.events.active.desc,
      rem: gameState.events.active.rem
    } : null,
    tower: {
      highestFloor: gameState.tower.highestFloor,
      currentFloor: gameState.tower.currentFloor,
      inBattle: gameState.tower.inBattle
    },
    exploration: gameState.getExplorationStatus(),
    explorationTiers: EXPLORATION_TIERS,
    dailies: dailyStatus,
    running: gameState.running,
    logs: gameState.logs.slice(-50),
    toasts: gameState.toasts.splice(0), // drain toasts
    goldLogs: gameState.goldLogs.slice(-50),
    freeDraw: gameState.getFreeDrawStatus()
  };
}

// Helper: respond with sanitized state
function respond(res, gameState) {
  try {
    res.json(sanitizeState(gameState));
  } catch (err) {
    console.error('State error:', err);
    res.status(500).json({ error: 'Internal state error' });
  }
}

// ============================================================
// Auth Routes (no JWT required)
// ============================================================
app.post('/api/auth/register', registerRoute);
app.post('/api/auth/login', loginRoute);

// ============================================================
// GitHub Webhook — auto-deploy on push
// ============================================================
app.post('/api/webhook/deploy', (req, res) => {
  res.json({ ok: true, msg: 'deploy triggered' });
  const cmd = 'cd /home/admin/idle-rpg && git pull origin master && cd server && npm install && cd ../client && npm install && npx vite build && pm2 restart idle-chronicles';
  exec(cmd, (err, stdout, stderr) => {
    const log = `[deploy ${new Date().toISOString()}] ${err ? 'FAIL' : 'OK'}\n${stdout || ''}\n${stderr || ''}`;
    console.log(log);
    require('fs').appendFileSync('/home/admin/idle-rpg/deploy.log', log + '\n---\n');
  });
});

// ============================================================
// Admin Dashboard (public — shows basic stats)
// ============================================================
app.get('/admin', (req, res) => {
  const allUsers = getAllUsers();
  const activeUsers = gameStateManager.getDetailedStats();
  const userCount = Object.keys(allUsers).length;
  const activeCount = activeUsers.length;
  const onlineUsernames = new Set(activeUsers.map(u => u.username));

  const activeRows = activeUsers.sort((a,b) => b.power - a.power).map(u =>
    `<tr>
      <td>🟢 ${u.username}</td>
      <td>Lv.${u.level}</td>
      <td>⚔${u.power}</td>
      <td>💀${u.kills}</td>
      <td>💰${u.gold}</td>
      <td>${u.class || '-'}</td>
      <td>${u.running ? '⚔️' : '⏸️'}</td>
    </tr>`
  ).join('');

  const regRows = Object.entries(allUsers).sort((a,b) => a[1].createdAt - b[1].createdAt).map(([name, data]) =>
    `<tr>
      <td>${onlineUsernames.has(name) ? '🟢' : '⚫'} ${name}</td>
      <td>${new Date(data.createdAt).toLocaleDateString('zh-CN')}</td>
      <td>${onlineUsernames.has(name) ? '在线' : '离线'}</td>
    </tr>`
  ).join('');

  res.send(`<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>仪表盘 — Idle Chronicles</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0d0f14;color:#e8eaf0;font-family:system-ui,-apple-system,sans-serif;padding:20px 16px}
h1{font-size:20px;margin-bottom:4px}
.sub{color:#6b7290;font-size:13px;margin-bottom:20px}
.cards{display:flex;gap:12px;margin-bottom:24px}
.minicard{flex:1;background:#13161f;border:1px solid #1e2230;border-radius:10px;padding:16px;text-align:center}
.minicard .num{font-size:28px;font-weight:700;color:#4caf50}
.minicard .num.blue{color:#4fc3f7}
.minicard .lbl{font-size:12px;color:#6b7290;margin-top:4px}
.section{margin-bottom:24px}
.section-title{font-size:14px;font-weight:700;margin-bottom:10px;color:#8890a8}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:8px 10px;color:#6b7290;font-weight:500;font-size:11px;border-bottom:1px solid #1e2230}
td{padding:8px 10px;border-bottom:1px solid #1e2230;white-space:nowrap}
.btn-row{margin-top:20px;display:flex;gap:10px}
.btn{padding:8px 18px;border-radius:6px;border:none;cursor:pointer;font-size:13px}
.btn-refresh{background:#4a90d9;color:#fff}
.btn-game{background:#1e2230;color:#8890a8}
.meta{font-size:11px;color:#555e78;margin-top:16px}
</style></head><body>
<h1>⚔ Idle Chronicles</h1>
<div class="sub">服务器实时仪表盘</div>
<div class="cards">
  <div class="minicard"><div class="num blue">${userCount}</div><div class="lbl">📝 注册用户</div></div>
  <div class="minicard"><div class="num">${activeCount}</div><div class="lbl">🟢 当前在线</div></div>
</div>
<div class="section">
  <div class="section-title">🟢 在线玩家 (${activeCount}人)</div>
  <table>${activeRows ? '<thead><tr><th>用户名</th><th>等级</th><th>战力</th><th>击杀</th><th>金币</th><th>职业</th><th>状态</th></tr></thead>' : ''}<tbody>${activeRows || '<tr><td style="color:#555e78">暂无在线玩家</td></tr>'}</tbody></table>
</div>
<div class="section">
  <div class="section-title">📋 全部注册用户 (${userCount}人)</div>
  <table><thead><tr><th>用户名</th><th>注册日期</th><th>状态</th></tr></thead><tbody>${regRows}</tbody></table>
</div>
<div class="btn-row">
  <button class="btn btn-refresh" onclick="location.reload()">🔄 刷新</button>
  <a class="btn btn-game" href="/">🎮 进入游戏</a>
</div>
<div class="meta">更新时间: ${new Date().toLocaleString('zh-CN')}</div>
</body></html>`);
});

// ============================================================
// JWT Middleware — protect all /api/* routes below
// ============================================================
app.use('/api', authMiddleware);

// ============================================================
// API Routes
// ============================================================

// ---- State ----
app.get('/api/state', (req, res) => respond(res, gs(req)));

// ---- Toggle combat ----
app.post('/api/toggle', (req, res) => {
  const gameState = gs(req);
  gameState.running ? gameStop(gameState) : gameStart(gameState);
  respond(res, gameState);
});

function gameStart(gameState) {
  if (gameState.running) return;
  gameState.running = true;
  gameState.addLog('⚡ 挂机启动，自动战斗开始...');
}

function gameStop(gameState) {
  if (!gameState.running) return;
  gameState.running = false;
  gameState.addLog('⏸ 挂机已暂停。');
}

// ---- Manual actions ----
app.post('/api/action/equip/:id', (req, res) => {
  const gameState = gs(req);
  const id = parseInt(req.params.id);
  const p = gameState.player;
  const idx = p.inventory.findIndex(i => i.id === id);
  if (idx === -1) return respond(res, gameState);
  const item = p.inventory[idx];
  if (!gameState.canEquipItem(item)) {
    gameState.addToast(`⛔ 职业限制：无法装备 ${item.name}`, 'error');
    return respond(res, gameState);
  }
  const old = p.equipment[item.type];
  p.equipment[item.type] = item;
  p.inventory.splice(idx, 1);
  if (old) {
    if (p.settings.autoSell && old.rarityVal <= p.settings.sellRarity) {
      gameState.goldLog(old.sellPrice, 'auto_sell', `[换下] ${old.name}`);
    } else {
      p.inventory.push(old);
    }
  }
  gameState._calcBaseStats();
  gameState.addLog(`🎽 装备了 ${item.name}`, 'sys');
  respond(res, gameState);
});

app.post('/api/action/sell/:id', (req, res) => {
  const gameState = gs(req);
  const id = parseInt(req.params.id);
  const p = gameState.player;
  const idx = p.inventory.findIndex(i => i.id === id);
  if (idx === -1) return respond(res, gameState);
  const item = p.inventory[idx];
  gameState.goldLog(item.sellPrice, 'sell', item.name);
  p.inventory.splice(idx, 1);
  respond(res, gameState);
});

app.post('/api/action/sell-all', (req, res) => {
  const gameState = gs(req);
  const p = gameState.player;
  let gain = 0;
  p.inventory.forEach(i => { gain += i.sellPrice || 0; });
  if (gain > 0) gameState.goldLog(gain, 'sell_all', `共${p.inventory.length}件`);
  p.inventory = [];
  gameState.addLog(`🎒 一键出售背包所有物品，共获得 ${gain}💰`, 'sys');
  respond(res, gameState);
});

app.post('/api/action/sell-rarity/:maxVal', (req, res) => {
  const gameState = gs(req);
  const maxVal = parseInt(req.params.maxVal);
  const p = gameState.player;
  let gain = 0;
  const kept = [];
  p.inventory.forEach(i => {
    if (i.rarityVal <= maxVal) { gain += i.sellPrice || 0; }
    else { kept.push(i); }
  });
  if (gain > 0) {
    gameState.goldLog(gain, 'sell_rarity', `品质≤${maxVal}`);
    p.inventory = kept;
    gameState.addLog(`🎒 批量出售完成，共获得 ${gain}💰`, 'sys');
  }
  respond(res, gameState);
});

app.post('/api/action/inventory-sort', (req, res) => {
  const gameState = gs(req);
  const p = gameState.player;
  p.inventory.sort((a, b) => {
    if (b.rarityVal !== a.rarityVal) return b.rarityVal - a.rarityVal;
    return b.score - a.score;
  });
  gameState.addLog('🎒 背包已整理完毕。', 'sys');
  respond(res, gameState);
});

// ---- Equipment enhance / reforge ----
app.post('/api/action/enhance/:type', (req, res) => {
  const gameState = gs(req);
  const type = req.params.type;
  const p = gameState.player;
  const eq = p.equipment[type];
  if (!eq) return respond(res, gameState);
  const lv = p.enhanceLevels[type] || 0;
  const gold = Math.floor(80 * 0.5 * (lv + 1));
  const stones = lv + 1;
  const chance = Math.max(0.1, 1.0 - lv * 0.07);
  if (p.gold < gold || p.stones < stones) return respond(res, gameState);
  gameState.goldLog(-gold, 'enhance', `${eq.name} +${lv}→${lv + 1}`);
  p.stones -= stones;
  if (Math.random() <= chance) {
    p.enhanceLevels[type] = lv + 1;
    gameState.addToast(`强化 +${lv + 1} 成功！`, 'success');
    gameState.addLog(`🔨 ${eq.name} 强化成功！+${lv + 1}`, 'sys');
    gameState._checkAchievements();
    gameState._updateQuestProgress('enhance');
  } else {
    gameState.addToast('强化失败！材料已扣除', 'error');
    gameState.addLog(`🔨 ${eq.name} 强化失败`, 'sys');
  }
  gameState._calcBaseStats();
  respond(res, gameState);
});

app.post('/api/action/reforge/:type', (req, res) => {
  const gameState = gs(req);
  const type = req.params.type;
  const p = gameState.player;
  const eq = p.equipment[type];
  if (!eq || !eq.affixes || eq.affixes.length === 0) return respond(res, gameState);
  const base = (eq.rarityVal + 1) * 2;
  const locked = eq.affixes.filter(a => a.locked).length;
  const stones = base + locked * 3;
  const gold = Math.floor((eq.sellPrice || 1) * 2);
  if (p.gold < gold) return respond(res, gameState);
  let missing = Math.max(0, stones - p.reforgeStones);
  let totalGoldCost = gold;
  if (missing > 0) {
    const sc = missing * 500;
    if (p.gold < gold + sc) return respond(res, gameState);
    totalGoldCost += sc;
    p.reforgeStones += missing;
  }
  p.reforgeStones -= stones;
  gameState.goldLog(-totalGoldCost, 'reforge', `${eq.name}`);
  const kept = eq.affixes.filter(a => a.locked);
  const need = eq.affixes.length - kept.length;
  const keptTypes = {};
  kept.forEach(a => { keptTypes[a.type] = true; });
  const validPool = AFFIX_POOL.filter(a => a.allowed.includes(type));
  let pool = validPool.filter(a => !keptTypes[a.type]);
  const newAffixes = [];
  for (let i = 0; i < need; i++) {
    if (pool.length === 0) break;
    const pi = Math.floor(Math.random() * pool.length);
    const poolItem = pool.splice(pi, 1)[0];
    const atVal = Math.min(4, Math.floor(Math.random() * (eq.rarityVal || 1)) + 1);
    const at = AFFIX_TIERS[atVal];
    const bv = poolItem.baseVal + Math.random() * poolItem.variance;
    const fv = Math.round(bv * at.mul * 1000) / 1000;
    newAffixes.push({
      type: poolItem.type, name: poolItem.name, value: fv,
      tierVal: atVal, locked: false,
      desc: `<span style="color:${at.color}">[${at.name}] ${poolItem.format(fv)}</span>`
    });
  }
  eq.affixes = kept.concat(newAffixes);
  eq.score = (eq.atk || 0) * 1.2 + (eq.def || 0) * 1.0 +
    eq.affixes.reduce((s, a) => s + (AFFIX_TIERS[a.tierVal].scoreMult * (eq.itemLv || 1)), 0);
  gameState._calcBaseStats();
  gameState.addLog(`🔨 ${eq.name} 洗练完成！消耗 💎${stones} + 💰${gold}`, 'sys');
  gameState.addToast('🔨 洗练完成！', 'success');
  respond(res, gameState);
});

app.post('/api/action/toggle-lock/:type/:idx', (req, res) => {
  const gameState = gs(req);
  const { type, idx } = req.params;
  const eq = gameState.player.equipment[type];
  if (eq && eq.affixes && eq.affixes[parseInt(idx)]) {
    eq.affixes[parseInt(idx)].locked = !eq.affixes[parseInt(idx)].locked;
  }
  respond(res, gameState);
});

// ---- Shop ----
app.post('/api/action/buy-stone/:n', (req, res) => {
  const gameState = gs(req);
  const n = parseInt(req.params.n);
  const total = 1000 * n;
  const p = gameState.player;
  if (p.gold >= total) {
    gameState.goldLog(-total, 'shop', `💎强化石 x${n}`);
    p.stones += n;
    gameState.addToast(`购买 💎强化石 x${n} 成功`, 'success');
  }
  respond(res, gameState);
});

app.post('/api/action/buy-reforge/:n', (req, res) => {
  const gameState = gs(req);
  const n = parseInt(req.params.n);
  const total = 500 * n;
  const p = gameState.player;
  if (p.gold >= total) {
    gameState.goldLog(-total, 'shop', `🔨洗练石 x${n}`);
    p.reforgeStones += n;
    gameState.addToast(`购买 🔨洗练石 x${n} 成功`, 'success');
  }
  respond(res, gameState);
});

app.post('/api/action/buy-equip/:type', (req, res) => {
  const gameState = gs(req);
  const type = req.params.type;
  const p = gameState.player;
  if (!EQUIP_TYPES.includes(type)) return respond(res, gameState);
  const cost = 80 * 3;
  if (p.gold >= cost) {
    gameState.goldLog(-cost, 'shop', `🎲抽${type}`);
    const mi = gameState._getTierIndex(p.level);
    const item = gameState.generateSpecific(p.level, mi, type, 2);
    // Auto-equip if better than current
    const ce = p.equipment[item.type];
    const cs = ce ? Math.floor(ce.score * (1 + 0.15 * (p.enhanceLevels[item.type] || 0))) : 0;
    if (p.settings.autoEquip && item.score > cs && gameState.canEquipItem(item)) {
      p.equipment[item.type] = item;
      gameState.checkSetBonuses();
      if (ce) {
        if (p.settings.autoSell && ce.rarityVal <= p.settings.sellRarity) {
          gameState.goldLog(ce.sellPrice, 'auto_sell', `[换下] ${ce.name}`);
        } else {
          gameState.addToInventory(ce);
        }
      }
      gameState._calcBaseStats();
    } else {
      gameState.addToInventory(item);
    }
    gameState.addToast('成功抽取保底精良装备', 'success');
  }
  respond(res, gameState);
});

// ---- Upgrades ----
app.post('/api/action/upgrade/:stat', (req, res) => {
  const gameState = gs(req);
  const stat = req.params.stat;
  if (!['hp', 'atk', 'def'].includes(stat)) return respond(res, gameState);
  const p = gameState.player;
  const cost = Math.floor(80 * Math.pow(1.15, p.upgrades[stat]));
  if (p.gold >= cost) {
    gameState.goldLog(-cost, 'upgrade', `${stat} ${p.upgrades[stat]}→${p.upgrades[stat] + 1}`);
    p.upgrades[stat]++;
    gameState._calcBaseStats();
  }
  respond(res, gameState);
});

app.post('/api/action/upgrade-bulk/:stat/:n', (req, res) => {
  const gameState = gs(req);
  const stat = req.params.stat;
  const n = parseInt(req.params.n);
  const p = gameState.player;
  let count = 0, totalCost = 0;
  for (let i = 0; i < n; i++) {
    const cost = Math.floor(80 * Math.pow(1.15, p.upgrades[stat]));
    if (p.gold >= totalCost + cost) { totalCost += cost; p.upgrades[stat]++; count++; }
    else break;
  }
  if (count > 0) {
    gameState.goldLog(-totalCost, 'upgrade_bulk', `${stat} x${count}`);
    gameState._calcBaseStats();
    if (count < n) gameState.addLog(`⚡ 批量修炼${count}级，金币不足未能继续。`, 'sys');
  }
  respond(res, gameState);
});

app.post('/api/action/upgrade-max/:stat', (req, res) => {
  const gameState = gs(req);
  const stat = req.params.stat;
  const p = gameState.player;
  let count = 0, totalCost = 0;
  while (true) {
    const cost = Math.floor(80 * Math.pow(1.15, p.upgrades[stat]));
    if (p.gold >= totalCost + cost) { totalCost += cost; p.upgrades[stat]++; count++; }
    else break;
  }
  if (count > 0) {
    gameState.goldLog(-totalCost, 'upgrade_bulk', `${stat} x${count}`);
    gameState._calcBaseStats();
    gameState.addLog(`⚡ 批量修炼完成 (提升${count}级)。`, 'sys');
  }
  respond(res, gameState);
});

// ---- Skills ----
app.post('/api/action/toggle-skill/:id', (req, res) => {
  const gameState = gs(req);
  const { id } = req.params;
  const s = gameState.player.skills[id];
  if (s) { s.auto = !s.auto; }
  respond(res, gameState);
});

app.post('/api/action/cast-skill/:id', (req, res) => {
  const gameState = gs(req);
  const { id } = req.params;
  if (gameState.player.skills[id] && gameState.player.skills[id].cd === 0) {
    gameState._executeSkill(id);
  }
  respond(res, gameState);
});

app.post('/api/action/set-rune/:skillId/:runeId', (req, res) => {
  const gameState = gs(req);
  const { skillId, runeId } = req.params;
  const s = gameState.player.skills[skillId];
  if (s && SKILL_RUNES[skillId]?.some(r => r.id === runeId)) {
    s.rune = s.rune === runeId ? null : runeId;
    gameState.addToast(`符文已切换`, 'success');
  }
  respond(res, gameState);
});

// ---- Rebirth ----
app.post('/api/action/rebirth', (req, res) => {
  const gameState = gs(req);
  const p = gameState.player;
  const target = 50 + p.rebirthCount * 25;
  if (p.level < target) return respond(res, gameState);
  const lostGold = Math.floor(p.gold * 0.5);
  const lostStones = Math.floor(p.stones * 0.5);
  p.rebirthCount++;
  p.level = 1; p.exp = 0;
  p.stones -= lostStones;
  if (lostGold > 0) gameState.goldLog(-lostGold, 'rebirth', `第${p.rebirthCount}次转生`);
  p.gold -= lostGold;
  p.killStreak = 0; p.lifetimeGold = 0; p.totalKills = 0;
  p.killsSinceBoss = 0;
  p.equipment = { weapon: null, armor: null, helmet: null, boots: null, ring: null, amulet: null };
  p.enhanceLevels = { weapon: 0, armor: 0, helmet: 0, boots: 0, ring: 0, amulet: 0 };
  p.inventory = [];
  p.upgrades = { hp: 0, atk: 0, def: 0 };
  p.currentTier = 'auto';
  gameState._calcBaseStats();
  p.hp = p.maxHp;
  gameState.spawnMonster(p.level, false);
  gameState.addLog(`🌀 转生成功！第 ${p.rebirthCount} 次转生，尘世羁绊已清零！`, 'rebirth');
  gameState.addToast(`🌀 第 ${p.rebirthCount} 次转生完成！`, 'success');
  gameState._checkAchievements();
  respond(res, gameState);
});

// ---- Map ----
app.post('/api/action/change-map/:tier', (req, res) => {
  const gameState = gs(req);
  const tier = req.params.tier;
  gameState.player.currentTier = tier;
  gameState.spawnMonster(gameState.player.level, false);
  gameState.addLog('🗺️ 战区已切换。', 'sys');
  respond(res, gameState);
});

// ---- Settings ----
app.post('/api/settings', (req, res) => {
  const gameState = gs(req);
  const s = req.body;
  const ps = gameState.player.settings;
  if (s.autoEquip != null) ps.autoEquip = s.autoEquip;
  if (s.autoSell != null) ps.autoSell = s.autoSell;
  if (s.sellRarity != null) ps.sellRarity = s.sellRarity;
  if (s.healThreshold != null) ps.healThreshold = s.healThreshold;
  if (s.combatMode != null) ps.combatMode = s.combatMode;
  respond(res, gameState);
});

// ---- Tower ----
app.post('/api/action/tower/:floor', (req, res) => {
  const gameState = gs(req);
  const floor = parseInt(req.params.floor);
  gameState.startTowerFloor(floor);
  respond(res, gameState);
});

app.post('/api/action/tower-leave', (req, res) => {
  const gameState = gs(req);
  gameState.tower.inBattle = false;
  gameState.addLog('🏛️ 退出无尽之塔。', 'sys');
  gameState.spawnMonster(gameState.player.level, false);
  respond(res, gameState);
});

// ---- Exploration ----
app.post('/api/action/explore/:tierId', (req, res) => {
  const gameState = gs(req);
  gameState.startExploration(parseInt(req.params.tierId));
  respond(res, gameState);
});

// ---- Free equipment draw ----
app.post('/api/action/free-draw', (req, res) => {
  const gameState = gs(req);
  gameState.claimFreeDraw();
  respond(res, gameState);
});

// ---- Dailies ----
app.post('/api/action/claim-daily', (req, res) => {
  const gameState = gs(req);
  gameState.claimDaily();
  respond(res, gameState);
});

// ---- Expand Bag ----
app.post('/api/action/expand-bag', (req, res) => {
  const gameState = gs(req);
  const p = gameState.player;
  const cost = 5000 + (p.bagSize - 30) * 2000;
  if (p.gold >= cost && p.bagSize < 100) {
    gameState.goldLog(-cost, 'expand_bag', `${p.bagSize}→${p.bagSize + 10}`);
    p.bagSize += 10;
    gameState.addLog(`🎒 背包已扩展至 ${p.bagSize} 格！`, 'sys');
    gameState.addToast(`🎒 背包 +10 格！`, 'success');
    gameState._checkAchievements();
  }
  respond(res, gameState);
});

// ---- Log clear ----
app.post('/api/clear-logs', (req, res) => {
  const gameState = gs(req);
  gameState.logs = [];
  gameState.addLog('🧹 日志已清空。', 'sys');
  respond(res, gameState);
});

// ---- Class Selection ----
app.post('/api/action/select-class/:classId', (req, res) => {
  const gameState = gs(req);
  const classId = req.params.classId;
  if (CLASSES[classId]) {
    gameState.player.classId = classId;
    gameState._calcBaseStats();
    gameState.addLog(`⚔️ 职业已选择：【${CLASSES[classId].name}】`, 'achieve');
    gameState.addToast(`⚔️ 职业 ${CLASSES[classId].name} 已就绪！`, 'success');
  }
  respond(res, gameState);
});

// ---- Passive Skills ----
app.post('/api/action/upgrade-passive/:skillId', (req, res) => {
  const gameState = gs(req);
  gameState.upgradePassive(req.params.skillId);
  respond(res, gameState);
});

app.post('/api/action/equip-passive/:slot/:skillId', (req, res) => {
  const gameState = gs(req);
  const slot = parseInt(req.params.slot);
  const skillId = req.params.skillId === 'null' ? null : req.params.skillId;
  gameState.equipPassive(slot, skillId);
  respond(res, gameState);
});

// ============================================================
// SPA catch-all — serve index.html for non-API routes
// ============================================================
app.get('*', (_, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ============================================================
// Auto-save + game loop
// ============================================================
const TICK_MS = 500;
const SAVE_INTERVAL = 30000; // 30s

setInterval(() => {
  gameStateManager.tickAll();
}, TICK_MS);

setInterval(() => {
  gameStateManager.saveAll();
}, SAVE_INTERVAL);

// Save on exit
process.on('SIGINT', () => {
  gameStateManager.saveAll();
  process.exit();
});
process.on('SIGTERM', () => {
  gameStateManager.saveAll();
  process.exit();
});

// ============================================================
// Start
// ============================================================

app.listen(PORT, () => {
  console.log(`⚔ Idle Chronicles server running on port ${PORT}`);
  console.log(`📁 Save data: server/storage/`);
});
