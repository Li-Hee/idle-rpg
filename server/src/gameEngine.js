// ============================================================
// Game Engine — manages game state, tick loop, and all systems
// ============================================================
import {
  MONSTER_TABLE, BOSS_NAMES, EQUIP_NAMES, EQUIP_TYPES,
  AFFIX_POOL, AFFIX_TIERS, RARITY_MAP, ACHIEVEMENT_LIST,
  SKILL_LIST, SKILL_RUNES, SET_BONUSES, TOWER_CONFIG,
  DAILY_REWARDS, EXPLORATION_TIERS,
  CLASSES, PASSIVE_SKILLS, CRAFT_RECIPES, COLLECTION_MILESTONES,
  QUEST_POOL, ELITE_MONSTER_CONFIG, EQUIP_RESTRICTIONS,
  getScale, getRewardScale
} from './data.js';
import { save, load } from './storage.js';

// ============================================================
// GameState class — holds all mutable state
// ============================================================
class GameState {
  constructor() {
    this.player = null;
    this.monster = null;
    this.running = false;
    this.tickCount = 0;
    this.logs = [];
    this.toasts = [];
    // Enhanced systems
    this.tower = { highestFloor: 0, currentFloor: 0, inBattle: false };
    this.exploration = { active: null, endTime: 0 };
    this.dailies = { lastSignIn: '', streak: 0, claimedToday: false };
    this.achievements = {};
    this.events = { active: null, cooldown: 0 };
    this.goldLogs = [];
    // For set bonuses tracking
    this._setCache = { count: 0, bonuses: [] };
  }

  init() {
    const saved = load('gamesave');
    if (saved) {
      this._deserialize(saved);
    } else {
      this._newGame();
    }
    this._calcBaseStats();
    this._checkOfflineProgress();
    this.spawnMonster(this.player.level, false);
    if (this.player.hp == null) this.player.hp = this.player.maxHp;
    this._checkQuests();
    if (this.player.rebirthCount >= 3) this.unlockUltimate();
    this._checkPassiveSlotUnlock();
    this.addLog('📖 Idle Chronicles 已就绪！突破·套装·秘境·爬塔·签到 — 全新功能开放！');
  }

  _newGame() {
    this.player = {
      level: 1, exp: 0, gold: 0, stones: 0, reforgeStones: 0,
      baseAtk: 0, baseDef: 0, hp: 100, maxHp: 100,
      totalKills: 0, lifetimeGold: 0,
      killStreak: 0, killsSinceBoss: 0,
      lastSaveTime: Date.now(),
      // Equip slots
      equipment: { weapon: null, armor: null, helmet: null, boots: null, ring: null, amulet: null },
      enhanceLevels: { weapon: 0, armor: 0, helmet: 0, boots: 0, ring: 0, amulet: 0 },
      // Inventory
      inventory: [],
      bagSize: 30,
      // Upgrades
      upgrades: { hp: 0, atk: 0, def: 0 },
      // Rebirth
      rebirthCount: 0,
      // Settings
      settings: {
        autoEquip: true, autoSell: false, sellRarity: 0,
        healThreshold: 0.5, combatMode: 'balanced'
      },
      // Skills
      skills: {
        heavyHit: { auto: true, cd: 0, rune: null },
        heal: { auto: true, cd: 0, rune: null },
        vampire: { auto: true, cd: 0, rune: null }
      },
      // Map
      currentTier: 'auto', unlockedTier: 0,
      // Achievements
      completedAchievements: {},
      // Tower
      towerHighest: 0,
      // Dailies
      dailyStreak: 0, lastSignInDate: '',
      // Exploration count (lifetime)
      explorationCount: 0,
      // Set bonuses seen
      setBonusesUnlocked: false,
      // NEW: 职业
      classId: null,
      // NEW: 被动技能
      passives: { slots: [null, null], unlockSlots: 1, levels: {} },
      // NEW: 终极技能
      ultimate: { unlocked: false, cd: 0 },
      // NEW: 装备图鉴收集
      collection: {},
      // NEW: 每日悬赏
      quests: { date: '', list: [], progress: {}, completed: {} },
      // NEW: 限时精英怪计时
      eliteTimer: 0,
      // NEW: 每日精英击杀计数
      dailyBossKills: 0,
      // Free equipment draw cooldown (timestamp, 0 = immediately available)
      freeDrawAt: 0
    };
    this.goldLogs = [];
  }

  _deserialize(saved) {
    const p = saved.player || saved;
    this.player = {
      level: p.level || 1, exp: p.exp || 0, gold: p.gold || 0,
      stones: p.stones || 0, reforgeStones: p.reforgeStones || 0,
      baseAtk: 0, baseDef: 0, hp: 0, maxHp: 0,
      totalKills: p.totalKills || 0, lifetimeGold: p.lifetimeGold || 0,
      killStreak: p.killStreak || 0, killsSinceBoss: p.killsSinceBoss || 0,
      lastSaveTime: p.lastSaveTime || Date.now(),
      equipment: p.equipment || { weapon: null, armor: null, helmet: null, boots: null, ring: null, amulet: null },
      enhanceLevels: p.enhanceLevels || { weapon: 0, armor: 0, helmet: 0, boots: 0, ring: 0, amulet: 0 },
      inventory: p.inventory || [],
      bagSize: p.bagSize || 30,
      upgrades: p.upgrades || { hp: 0, atk: 0, def: 0 },
      rebirthCount: p.rebirthCount || 0,
      settings: p.settings || { autoEquip: true, autoSell: false, sellRarity: 0, healThreshold: 0.5, combatMode: 'balanced' },
      skills: p.skills || {
        heavyHit: { auto: true, cd: 0, rune: null },
        heal: { auto: true, cd: 0, rune: null },
        vampire: { auto: true, cd: 0, rune: null }
      },
      currentTier: 'auto',
      unlockedTier: p.unlockedTier || 0,
      completedAchievements: p.completedAchievements || {},
      towerHighest: p.towerHighest || 0,
      dailyStreak: p.dailyStreak || 0,
      lastSignInDate: p.lastSignInDate || '',
      explorationCount: p.explorationCount || 0,
      setBonusesUnlocked: p.setBonusesUnlocked || false,
      classId: p.classId || null,
      passives: p.passives || { slots: [null, null], unlockSlots: 1, levels: {} },
      ultimate: p.ultimate || { unlocked: false, cd: 0 },
      collection: p.collection || {},
      quests: p.quests || { date: '', list: [], progress: {}, completed: {} },
      eliteTimer: p.eliteTimer || 0,
      dailyBossKills: p.dailyBossKills || 0,
      freeDrawAt: p.freeDrawAt || 0
    };
    // Restore sub-systems
    this.achievements = this.player.completedAchievements;
    this.dailies.streak = this.player.dailyStreak;
    this.dailies.lastSignIn = this.player.lastSignInDate;
    this.tower.highestFloor = this.player.towerHighest;
    this.goldLogs = saved.goldLogs || [];
    // Migrate old item names: strip quality prefix from save data
    this._migrateItemNames();
  }

  // Migrate old item names: strip quality prefix and rename to current tier names
  _migrateItemNames() {
    const p = this.player;
    const re = /^(优秀|精良|史诗|传说)的 /;
    // Collect all valid current names per type
    const currentNames = {};
    for (const t of Object.keys(EQUIP_NAMES)) {
      currentNames[t] = new Set(EQUIP_NAMES[t]);
    }
    const fix = (item) => {
      if (!item?.name || !item.type) return;
      // Strip quality prefix if present
      if (re.test(item.name)) item.name = item.name.replace(re, '');
      // If name is not in the current naming table, assign the tier-appropriate name
      const validNames = currentNames[item.type];
      if (validNames && !validNames.has(item.name)) {
        const ti = Math.min(9, Math.max(0, Math.floor((item.itemLv || 1) / 10)));
        item.name = EQUIP_NAMES[item.type][ti];
      }
    };
    Object.values(p.equipment).forEach(fix);
    p.inventory.forEach(fix);
  }

  _serialize() {
    return {
      player: {
        ...this.player,
        baseAtk: undefined, baseDef: undefined, maxHp: undefined, hp: this.player.hp,
        lastSaveTime: Date.now(),
        completedAchievements: this.achievements,
        dailyStreak: this.dailies.streak,
        lastSignInDate: this.dailies.lastSignIn,
        towerHighest: this.tower.highestFloor,
      },
      goldLogs: this.goldLogs.slice(-200)
    };
  }

  saveGame() {
    this.player.lastSaveTime = Date.now();
    save('gamesave', this._serialize());
  }

  // ---- Logging ----
  addLog(msg, type = '') {
    const cls = type ? `c-${type}` : '';
    this.logs.push({ msg, cls, time: Date.now() });
    if (this.logs.length > 100) this.logs.shift();
  }

  addToast(msg, type = 'success') {
    this.toasts.push({ msg, type, time: Date.now() });
    if (this.toasts.length > 20) this.toasts.shift();
  }

  // ---- Gold transaction logging ----
  goldLog(amount, source, detail = '') {
    const p = this.player;
    if (!p) return;
    if (amount > 0) p.lifetimeGold = (p.lifetimeGold || 0) + amount;
    p.gold += amount;
    this.goldLogs.push({
      time: Date.now(),
      source,
      amount,
      before: p.gold - amount,
      after: p.gold,
      detail
    });
    if (this.goldLogs.length > 200) this.goldLogs.shift();
  }

  // ============================================================
  // Player Stat Calculations
  // ============================================================
  get upgMultiplier() { return 1 + Math.floor(this.player.level / 10); }

  _calcBaseStats() {
    const p = this.player;
    const scale = getScale(p.level);
    p.baseAtk = Math.floor(scale * 0.6);
    p.baseDef = Math.floor(scale * 0.3);
    p.maxHp = this._calcMaxHp();
    if (p.hp > p.maxHp) p.hp = p.maxHp;
    if (p.hp == null || p.hp === 0) p.hp = p.maxHp;
    this._checkPassiveSlotUnlock();
  }

  _calcMaxHp() {
    const p = this.player;
    const scale = getScale(p.level);
    const base = scale * 15 + (p.upgrades.hp * 80 * (1 + p.level / 10));
    const hpPct = this.getAffixTotal('hpPct');
    const stag = this.getStagnation();
    const passives = this.getPassiveEffects();
    const clsBonus = this.getClassBonus();
    const collect = this.getCollectionBonus();
    const passiveHp = passives.hp || 0;
    return Math.floor(base * (1 + hpPct + passiveHp + (collect.hp || 0)) * this.getRebirthBonus('hp') * (1 - stag * 0.01) * clsBonus.hpMult);
  }

  get totalAtk() {
    const p = this.player;
    const base = p.baseAtk + (p.upgrades.atk * 5 * (1 + p.level / 10)) + this.getEquipAtk();
    const atkPct = this.getAffixTotal('atkPct');
    const stag = this.getStagnation();
    const setAtkBonus = this._setCache.bonuses.includes('atkBonus') ? 0.20 : 0;
    const allBonus = this._setCache.bonuses.includes('allBonus') ? 0.10 : 0;
    // Passive & class & collection bonuses
    const passives = this.getPassiveEffects();
    const clsBonus = this.getClassBonus();
    const collectBonus = this.getCollectionBonus();
    const passiveAtk = passives.atk || 0;
    const classAtkMult = clsBonus.atkMult;
    const collectAtk = collectBonus.atk || 0;
    // Class passive (warrior rage)
    const classPassive = this.getClassPassiveEffects();
    const rageBonus = classPassive.atkBonus || 0;
    // Active set bonus
    let setDefBonus = this._setCache.bonuses.includes('defBonus') ? 0.15 : 0;
    // Stagnation penalty
    const stagPenalty = 1 - stag * 0.01;
    return Math.floor(base * (1 + atkPct + setAtkBonus + allBonus + passiveAtk + collectAtk + rageBonus) * this.getRebirthBonus('atk') * stagPenalty * classAtkMult);
  }

  get totalDef() {
    const p = this.player;
    const base = p.baseDef + (p.upgrades.def * 2 * (1 + p.level / 10)) + this.getEquipDef();
    const defPct = this.getAffixTotal('defPct');
    const stag = this.getStagnation();
    const setDefBonus = this._setCache.bonuses.includes('defBonus') ? 0.15 : 0;
    const allBonus = this._setCache.bonuses.includes('allBonus') ? 0.10 : 0;
    const passives = this.getPassiveEffects();
    const clsBonus = this.getClassBonus();
    const collectBonus = this.getCollectionBonus();
    return Math.floor(base * (1 + defPct + setDefBonus + allBonus + (passives.def || 0) + (collectBonus.def || 0)) * this.getRebirthBonus('def') * (1 - stag * 0.01) * clsBonus.defMult);
  }

  get power() {
    return this.totalAtk + this.totalDef + Math.floor(this._calcMaxHp() / 5);
  }

  get expNeeded() {
    const lv = this.player.level;
    // Steeper curve: early game easy (~14 kills at L10), late game slows sharply (~170 kills at L70)
    // This creates a natural wall encouraging rebirth from ~level 50+
    const exponent = Math.min(2.6, 1.4 + lv * 0.012);
    return Math.floor(40 * Math.pow(lv, exponent));
  }

  get critRate() {
    const passives = this.getPassiveEffects();
    const classEffect = this.getClassPassiveEffects();
    const collect = this.getCollectionBonus();
    return 0.05 + this.getAffixTotal('crit') + (classEffect.critBonus || 0) + (collect.crit || 0);
  }
  get lifesteal() {
    const passives = this.getPassiveEffects();
    return this.getAffixTotal('lifesteal') + (passives.lifesteal || 0);
  }
  get dodge() { return this.getAffixTotal('dodge'); }
  get thorns() {
    const passives = this.getPassiveEffects();
    return this.getAffixTotal('thorns') + (passives.thornsBonus || 0);
  }
  get goldBonus() {
    const g = this.getAffixTotal('gold');
    const passives = this.getPassiveEffects();
    return g + (this.getRebirthBonus('gold') - 1) - this.getStagnation() * 0.02 + (passives.gold || 0);
  }
  get expBonus() {
    const e = this.getAffixTotal('exp');
    return e + (this.getRebirthBonus('exp') - 1) - this.getStagnation() * 0.02;
  }

  get streakBonus() {
    const classEffect = this.getClassPassiveEffects();
    const capBonus = classEffect.streakCapBonus || 0;
    return Math.min(this.player.killStreak * 0.015, 0.6 + capBonus * 0.5);
  }

  get shieldAmount() {
    if (!this._shieldActive || !this.player) return 0;
    return Math.floor(this.player.maxHp * (this.getPassiveEffects().shield || 0));
  }

  get bossDmgBonus() {
    return this.getPassiveEffects().bossDmg || 0;
  }

  // ---- Equipment helpers ----
  getEquipAtk() {
    let t = 0;
    for (const k of EQUIP_TYPES) {
      const eq = this.player.equipment[k];
      if (eq) t += this._getEqAtk(eq, k);
    }
    return t;
  }

  getEquipDef() {
    let t = 0;
    for (const k of EQUIP_TYPES) {
      const eq = this.player.equipment[k];
      if (eq) t += this._getEqDef(eq, k);
    }
    return t;
  }

  _getEqAtk(eq, type) {
    const lv = this.player.enhanceLevels[type] || 0;
    return Math.floor(eq.atk * (1 + 0.15 * lv));
  }

  _getEqDef(eq, type) {
    const lv = this.player.enhanceLevels[type] || 0;
    return Math.floor(eq.def * (1 + 0.15 * lv));
  }

  getAffixTotal(affixType) {
    let t = 0;
    for (const k of EQUIP_TYPES) {
      const eq = this.player.equipment[k];
      if (eq && eq.affixes) {
        for (const a of eq.affixes) {
          if (a.type === affixType) t += a.value;
        }
      }
    }
    return t;
  }

  // ---- Rebirth ----
  getRebirthBonus(type) {
    const count = this.player.rebirthCount;
    const bonuses = { atk: 0.10, def: 0.10, hp: 0.10, exp: 0.05, gold: 0.05, drop: 0.03 };
    return 1 + count * (bonuses[type] || 0);
  }

  getStagnation() {
    const target = 50 + this.player.rebirthCount * 25;
    if (this.player.level < target) return 0;
    return Math.min(25, this.player.level - target);
  }

  // ---- Set bonus check ----
  checkSetBonuses() {
    const p = this.player;
    const slots = p.equipment;
    // Count how many equipped items share the same tierIndex
    const tierCounts = {};
    let highestTier = -1;
    for (const k of EQUIP_TYPES) {
      const eq = slots[k];
      if (eq && eq.tierIndex != null) {
        tierCounts[eq.tierIndex] = (tierCounts[eq.tierIndex] || 0) + 1;
        if (eq.tierIndex > highestTier) highestTier = eq.tierIndex;
      }
    }
    // Find the best set (most items from same tier)
    let maxCount = 0;
    let bestTier = -1;
    for (const [tier, count] of Object.entries(tierCounts)) {
      if (count > maxCount) { maxCount = count; bestTier = parseInt(tier); }
    }
    // Determine active set bonuses
    const bonusKeys = [];
    if (maxCount >= 2) bonusKeys.push('defBonus');
    if (maxCount >= 4) bonusKeys.push('atkBonus');
    if (maxCount >= 6) bonusKeys.push('allBonus');
    this._setCache = { count: maxCount, bonuses: bonusKeys, tier: bestTier };
    if (maxCount >= 2 && !p.setBonusesUnlocked) {
      p.setBonusesUnlocked = true;
      this.addLog('🎯 套装效果已激活！同区域装备多件获得额外属性！', 'drop');
    }
  }

  getActiveSetBonuses() {
    const b = this._setCache;
    if (b.count < 2) return [];
    const result = [];
    if (b.count >= 2) result.push({ pieces: 2, ...SET_BONUSES[2] });
    if (b.count >= 4) result.push({ pieces: 4, ...SET_BONUSES[4] });
    if (b.count >= 6) result.push({ pieces: 6, ...SET_BONUSES[6] });
    return result;
  }

  // ============================================================
  // Monster
  // ============================================================
  spawnMonster(pl, isBoss) {
    const p = this.player;
    let tl = p.currentTier === 'auto' ? pl : pl;
    let tpl = MONSTER_TABLE[0];
    if (p.currentTier !== 'auto') {
      tpl = MONSTER_TABLE.find(t => t.id == p.currentTier) || tpl;
    } else {
      for (let i = 0; i < MONSTER_TABLE.length; i++) {
        if (tl >= MONSTER_TABLE[i].minLv) tpl = MONSTER_TABLE[i];
        else break;
      }
    }
    const lv = Math.max(tpl.minLv, Math.min(tpl.maxLv, tl + Math.floor(Math.random() * 2) - 1));
    const scale = getScale(lv);
    const rewardScale = getRewardScale(lv);
    const bm = isBoss ? 4 : 1;
    const ti = MONSTER_TABLE.findIndex(t => t.id === tpl.id);
    // Drop rate scales with tier: 8% at early tiers → 20% at max
    const baseDropRate = Math.min(0.20, 0.08 + ti * 0.015);
    this.monster = {
      name: isBoss
        ? `👑 [BOSS] ${BOSS_NAMES[ti] || BOSS_NAMES[0]}`
        : `${tpl.emoji} ${tpl.name}`,
      color: isBoss ? '#f44336' : tpl.color,
      level: lv, tierIndex: ti,
      maxHp: Math.round(scale * 18 * tpl.baseMul * bm),
      hp: Math.round(scale * 18 * tpl.baseMul * bm),
      atk: Math.round(scale * 0.65 * tpl.baseMul * (isBoss ? 2 : 1)),
      def: Math.round(scale * 0.4 * tpl.baseMul * (isBoss ? 1.5 : 1)),
      gold: Math.max(1, Math.round(rewardScale * 0.12 * tpl.baseMul * (isBoss ? 3 : 1) + Math.random() * 2)),
      exp: Math.round(rewardScale * 1.5 * tpl.baseMul * (isBoss ? 3 : 1)),
      dropRate: isBoss ? 1.0 : baseDropRate,
      isBoss: isBoss || false,
      maxHpOrig: Math.round(scale * 12 * tpl.baseMul * bm)
    };
  }

  // ============================================================
  // Equipment Generation
  // ============================================================
  generateDrop(ml, ti, minR) {
    // Cap drop level to player level to prevent gear snowball from high-tier maps
    const effectiveMl = Math.min(ml, this.player.level);
    const type = EQUIP_TYPES[Math.floor(Math.random() * EQUIP_TYPES.length)];
    const rand = Math.random();
    let rarity = RARITY_MAP[0];
    for (let i = RARITY_MAP.length - 1; i >= 0; i--) {
      if (rand < RARITY_MAP[i].prob) { rarity = RARITY_MAP[i]; break; }
    }
    // Tier-based max rarity: low tier monsters can't drop high quality gear
    const maxRByTier = [1, 2, 3, 3, 4, 4, 4, 4, 4, 4]; // ti=0: max 优秀, ti=1: max 精良, ti=2: max 史诗, ti=3+: 传说
    const maxR = maxRByTier[Math.min(ti, 9)];
    if (rarity.val > maxR) rarity = RARITY_MAP[maxR];
    if (minR !== undefined && rarity.val < minR) rarity = RARITY_MAP[Math.min(minR, maxR)];
    return this._buildItem(effectiveMl, ti, type, rarity);
  }

  generateSpecific(ml, ti, type, ri) {
    return this._buildItem(ml, ti, type, RARITY_MAP[ri]);
  }

  _buildItem(ml, ti, type, rarity) {
    const scale = getRewardScale(ml);
    let atk = 0, def = 0;
    switch (type) {
      case 'weapon':  atk = Math.floor(scale * (0.45 + Math.random() * 0.15) * rarity.mul); break;
      case 'armor':   def = Math.floor(scale * (0.35 + Math.random() * 0.15) * rarity.mul); break;
      case 'helmet':  def = Math.floor(scale * (0.18 + Math.random() * 0.1) * rarity.mul); break;
      case 'boots':   def = Math.floor(scale * (0.12 + Math.random() * 0.08) * rarity.mul); break;
      case 'ring':    atk = Math.floor(scale * (0.22 + Math.random() * 0.1) * rarity.mul); def = Math.floor(scale * (0.05 + Math.random() * 0.05) * rarity.mul); break;
      case 'amulet':  atk = Math.floor(scale * (0.1 + Math.random() * 0.08) * rarity.mul); def = Math.floor(scale * (0.15 + Math.random() * 0.1) * rarity.mul); break;
    }
    const affixes = [];
    if (rarity.affixCount > 0) {
      const validPool = AFFIX_POOL.filter(a => a.allowed.includes(type));
      const pool = validPool.slice();
      for (let i = 0; i < rarity.affixCount; i++) {
        if (pool.length === 0) break;
        const pi = Math.floor(Math.random() * pool.length);
        const poolItem = pool.splice(pi, 1)[0];
        const atVal = Math.min(4, Math.floor(Math.random() * rarity.val) + 1);
        const at = AFFIX_TIERS[atVal];
        const bv = poolItem.baseVal + Math.random() * poolItem.variance;
        const fv = Math.round(bv * at.mul * 1000) / 1000;
        affixes.push({
          type: poolItem.type, name: poolItem.name, value: fv,
          tierVal: atVal, locked: false,
          desc: `<span style="color:${at.color}">[${at.name}] ${poolItem.format(fv)}</span>`
        });
      }
    }
    const bn = EQUIP_NAMES[type][Math.min(ti, EQUIP_NAMES[type].length - 1)];
    const fn = bn;
    const score = atk * 1.2 + def * 1.0 + affixes.reduce((s, a) => s + (AFFIX_TIERS[a.tierVal].scoreMult * ml), 0);
    const sellPrice = Math.max(1, Math.floor(getRewardScale(ml) * (0.3 + rarity.val * 0.25)));
    return {
      id: Date.now() + Math.floor(Math.random() * 10000),
      itemLv: ml, tierIndex: ti, type, name: fn, atk, def,
      color: rarity.color, rarityVal: rarity.val,
      affixes, score, sellPrice
    };
  }

  // ============================================================
  // Inventory
  // ============================================================
  addToInventory(item) {
    const p = this.player;
    if (p.inventory.length >= p.bagSize) {
      const price = item.sellPrice || 0;
      this.goldLog(price, 'auto_sell', `[背包满] ${item.name}`);
      this.addLog(`🎒 背包已满，${item.name} 自动出售获得 ${price}💰`, 'sys');
      return false;
    }
    p.inventory.push(item);
    return true;
  }

  // ---- Free equipment draw ----
  getFreeDrawStatus() {
    const remaining = this.player.freeDrawAt ? Math.max(0, this.player.freeDrawAt - Date.now()) : 0;
    return { ready: remaining <= 0, remaining };
  }

  claimFreeDraw() {
    const status = this.getFreeDrawStatus();
    if (!status.ready) return null;
    const p = this.player;
    const ti = this._getEquipTier(p.level);
    const types = EQUIP_TYPES;
    const type = types[Math.floor(Math.random() * types.length)];
    const item = this._buildItem(p.level, ti, type, RARITY_MAP[1]); // 优秀 quality
    // Auto-equip if better than current (same logic as drops)
    const ce = p.equipment[item.type];
    const cs = ce ? Math.floor(ce.score * (1 + 0.15 * (p.enhanceLevels[item.type] || 0))) : 0;
    if (p.settings.autoEquip && item.score > cs && this.canEquipItem(item)) {
      p.equipment[item.type] = item;
      this.checkSetBonuses();
      if (ce) {
        if (p.settings.autoSell && ce.rarityVal <= p.settings.sellRarity) {
          this.goldLog(ce.sellPrice, 'auto_sell', `[换下] ${ce.name}`);
        } else {
          this.addToInventory(ce);
        }
      }
      this.addLog(`🎁 免费抽装：${item.name} 自动穿戴！`, 'sys');
    } else {
      const added = this.addToInventory(item);
      if (!added) {
        this.addLog('🎒 背包已满，免费装备已自动出售', 'sys');
      }
    }
    this.player.freeDrawAt = Date.now() + 300000; // 5 min cooldown
    this.addLog(`🎁 免费抽装：获得 ${item.name}`, 'sys');
    this.addToast(`🎁 获得 ${item.name}！`, 'success');
    return item;
  }

  // ============================================================
  // Battle System
  // ============================================================
  calcDamage(atk, def) {
    return Math.max(1, Math.floor((atk * atk) / (atk + def)));
  }

  // ============================================================
  // Events
  // ============================================================
  _tickEvents() {
    if (this.events.cooldown > 0) { this.events.cooldown--; return; }
    if (this.events.active) {
      // Handle regen event
      if (this.events.active.id === 'regen') {
        const heal = Math.floor(this.player.maxHp * 0.05);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
      }
      this.events.active.rem--;
      if (this.events.active.rem <= 0) {
        this.addLog(`⏰ [${this.events.active.name}] 效果结束。`, 'event');
        this.events.active = null;
        this.events.cooldown = 10;
      }
      return;
    }
    if (this.events.cooldown > 0) return;
    if (Math.random() < 0.04) {
      const pool = [
        { id: 'goblin', name: '💰 金币哥布林！', dur: 8, desc: '金币掉落翻倍！' },
        { id: 'frenzy', name: '⚡ 战斗狂热！', dur: 6, desc: '攻击力提升 50%！' },
        { id: 'blessing', name: '🍀 幸运祝福！', dur: 5, desc: '装备掉率翻倍！' },
        { id: 'regen', name: '💚 生命之泉！', dur: 8, desc: '每回合恢复 5% HP！' },
        { id: 'chest', name: '📦 神秘宝箱！', dur: 1, desc: '立即获得奖励！', instant: true }
      ];
      const evt = pool[Math.floor(Math.random() * pool.length)];
      if (evt.instant) {
        const bonus = Math.floor(getScale(this.player.level) * 5 + Math.random() * 500);
        this.goldLog(bonus, 'event', '神秘宝箱');
        const mi = this._getEquipTier(this.player.level);
        const item = this.generateDrop(this.player.level, mi);
        item.rarityVal = Math.max(item.rarityVal, 2);
        this.addToInventory(item);
        this.addLog(`📦 神秘宝箱开启！获得 ${bonus}💰 和一件装备！`, 'event');
        this.addToast(`📦 神秘宝箱！${bonus}💰`, 'success');
        this.events.cooldown = 10;
      } else {
        this.events.active = { id: evt.id, name: evt.name, desc: evt.desc, rem: evt.dur };
        this.addLog(`✨ [${evt.name}] ${evt.desc} (持续 ${evt.dur} 回合)`, 'event');
      }
    }
  }

  getEventModifiers() {
    if (!this.events.active) return { atkMult: 1, goldMult: 1, dropMult: 1 };
    const e = this.events.active;
    return {
      atkMult: e.id === 'frenzy' ? 1.5 : 1,
      goldMult: e.id === 'goblin' ? 2 : 1,
      dropMult: e.id === 'blessing' ? 2 : 1
    };
  }

  // ============================================================
  // Skills
  // ============================================================
  _tickSkills() {
    const skills = this.player.skills;
    for (const key of ['heavyHit', 'heal', 'vampire']) {
      if (skills[key].cd > 0) skills[key].cd--;
    }
  }

  _executeSkill(skillKey) {
    const p = this.player;
    const m = this.monster;
    if (!m || m.hp <= 0 || p.hp <= 0) return;
    const s = this.player.skills[skillKey];
    const sk = SKILL_LIST.find(x => x.id === skillKey);
    if (!sk) return;
    s.cd = sk.cdMax;
    const rune = s.rune;

    if (skillKey === 'heavyHit') {
      const defIgnore = m.def * 0.5;
      const dmgMult = rune === 'hh_damage' ? 4 : rune === 'hh_stun' ? 3 : 3;
      const d = this.calcDamage(this.totalAtk * dmgMult, defIgnore);
      m.hp = Math.max(0, m.hp - d);
      this.addLog(`🔥 释放 [破甲重击]！对 ${m.name} 造成 ${d} 巨额伤害！${rune === 'hh_stun' ? ' 💫' : ''}`);
      if (rune === 'hh_stun' && !m.isBoss && Math.random() < 0.10) {
        m.hp = 0;
        this.addLog(`💫 震荡效果触发！秒杀了 ${m.name}！`, 'dodge');
      }
      if (rune === 'hh_cd') s.cd = Math.max(3, sk.cdMax - 3);
      if (m.hp <= 0) this._processMonsterKill(m);
    } else if (skillKey === 'heal') {
      const healPct = rune === 'hl_power' ? 0.40 : 0.25;
      const h = Math.floor(p.maxHp * healPct);
      p.hp = Math.min(p.maxHp, p.hp + h);
      if (rune === 'hl_cd') s.cd = Math.max(4, sk.cdMax - 4);
      if (rune === 'hl_shield' && p.hp + h > p.maxHp) {
        // Shield mechanic: store overflow as "shield" in hp buffer
        // Simplified: just give a small extra heal
        const overflow = Math.floor((p.hp + h - p.maxHp) * 0.3);
        p.hp = Math.min(p.maxHp + overflow, p.hp + Math.floor(h * 0.2));
      }
      this.addLog(`✨ 释放 [圣光治愈]！恢复了 ${h}❤ 生命值！${rune === 'hl_power' ? ' (强效)' : ''}`);
    } else if (skillKey === 'vampire') {
      const dmgMult = rune === 'vp_damage' ? 2.2 : rune === 'vp_chain' ? 1.5 : 1.5;
      const lifestealMult = rune === 'vp_heal' ? 2.0 : 1.0;
      const baseDmg = Math.floor(this.totalAtk * dmgMult);
      const d = this.calcDamage(baseDmg, m.def);
      m.hp = Math.max(0, m.hp - d);
      const heal = Math.min(p.maxHp - p.hp, Math.floor(d * lifestealMult));
      p.hp = Math.min(p.maxHp, p.hp + heal);
      this.addLog(`🦇 释放 [鲜血汲取]！造成 ${d} 伤害并吸取 ${heal} 生命！`);
      if (rune === 'vp_chain' && !m.isBoss) {
        // Second hit effect
        const d2 = this.calcDamage(Math.floor(baseDmg * 0.6), m.def);
        m.hp = Math.max(0, m.hp - d2);
        if (d2 > 0) this.addLog(`🩸 血链额外造成 ${d2} 伤害！`);
      }
      if (m.hp <= 0) this._processMonsterKill(m);
    }
  }

  // ============================================================
  // Combat Tick
  // ============================================================
  _processMonsterKill(m) {
    const p = this.player;
    const mods = this.getEventModifiers();
    const bg = Math.floor(m.gold * (1 + this.goldBonus) * mods.goldMult);
    const be = Math.floor(m.exp * (1 + this.expBonus));
    const sm = 1 + this.streakBonus;
    const fg = Math.floor(bg * sm);
    const fe = Math.floor(be * sm);
    this.goldLog(fg, 'kill', m.name);
    p.exp += fe;
    let leveled = false;
    while (p.exp >= this.expNeeded) {
      p.exp -= this.expNeeded;
      p.level++;
      this._calcBaseStats();
      p.hp = p.maxHp;
      leveled = true;
    }
    p.totalKills++;
    p.killStreak++;
    p.killsSinceBoss++;

    this._updateQuestProgress('kill');
    if (m.isBoss) this._updateQuestProgress('boss');
    if (m.isElite) this._processEliteKill();

    if ([10, 25, 50, 100].includes(p.killStreak)) {
      this.addLog(`🔥 ${p.killStreak}连杀！奖励加成 +${Math.round(this.streakBonus * 100)}%`, 'streak');
      this.addToast(`🔥 ${p.killStreak}连杀达成！`, 'success');
    }

    let logMsg = `✅ 击杀 ${m.name}！获得 <span class="c-exp">+${fe} EXP</span>  <span class="c-gold">+${fg} 💰</span>`;
    if (sm > 1) logMsg += ` <span class="c-streak">(连杀 +${Math.round(this.streakBonus * 100)}%)</span>`;
    this.addLog(logMsg);
    if (leveled) {
      this.addLog(`🎉 升级！当前等级 Lv.${p.level}，生命值回满！`, 'level');
      this.addToast(`🎉 升级 Lv.${p.level}！`, 'success');
    }

    // Passive HP regen after kill
    p.hp = Math.min(p.maxHp, p.hp + Math.floor(p.maxHp * 0.1));

    // Drop check
    const stagDropPenalty = 1 - this.getStagnation() * 0.02;
    const dc = m.dropRate * mods.dropMult * this.getRebirthBonus('drop') * Math.max(0, stagDropPenalty);
    if (Math.random() < dc) {
      const mi = this._getEquipTier(m.level);
      const minR = m.isBoss ? 3 : undefined;
      const item = this.generateDrop(m.level, mi, minR);
      this._checkCollection(item);
      this._updateQuestProgress('collect');
      const ce = p.equipment[item.type];
      const cs = ce ? Math.floor(ce.score * (1 + 0.15 * (p.enhanceLevels[item.type] || 0))) : 0;
      const inHtml = `Lv.${item.itemLv} <span style="color:${item.color}">${item.name}</span>`;
      if (p.settings.autoEquip && item.score > cs && this.canEquipItem(item)) {
        p.equipment[item.type] = item;
        this.addLog(`🎁 [${inHtml}] 评分更高，自动穿戴！`, 'drop');
        this.checkSetBonuses();
        if (ce) {
          if (p.settings.autoSell && ce.rarityVal <= p.settings.sellRarity) {
            this.goldLog(ce.sellPrice, 'auto_sell', `[换下] ${ce.name}`);
          } else {
            this.addToInventory(ce);
          }
        }
      } else if (p.settings.autoSell && item.rarityVal <= p.settings.sellRarity) {
        this.goldLog(item.sellPrice, 'auto_sell', `[掉落] ${item.name}`);
        this.addLog(`💰 [${inHtml}] 自动出售 ${item.sellPrice}💰`, 'sys');
      } else {
        const added = this.addToInventory(item);
        if (added) this.addLog(`🎁 [${inHtml}] 已存入背包。`, 'sys');
      }
    }

    // Stone drops
    if (Math.random() < 0.08) {
      const sd = 1 + Math.floor(Math.random() * 2);
      p.stones += sd;
      this.addLog(`💎 获得 强化石 x${sd}`, 'exp');
    }
    if (Math.random() < 0.05) {
      const rd = 1 + Math.floor(Math.random() * 2);
      p.reforgeStones += rd;
      this.addLog(`💜 获得 洗练石 x${rd}`, 'exp');
    }

    if (m.isBoss) {
      this.addLog(`👑 Boss 击败！【${m.name}】已被征服！`, 'boss');
      this.addToast(`👑 Boss ${m.name} 击败！`, 'success');
      p.killsSinceBoss = 0;
      this.events.active = null;
      this.events.cooldown = 0;
      // Advance map
      const next = Math.min(MONSTER_TABLE.length - 1, m.tierIndex + 1);
      if (next > p.unlockedTier) {
        p.unlockedTier = next;
      }
      p.currentTier = 'auto';
      const sel = MONSTER_TABLE[next];
      this.addLog(`🗺️ 已推进至【${sel.name}】！`, 'sys');
      this.addToast(`🗺️ 已推进至【${sel.name}】`, 'success');
    }

    // Tower floor handling
    if (m.isTower) {
      this.handleTowerVictory();
      // Auto-advance to next floor
      const maxAdvance = Math.min(1, TOWER_CONFIG.totalFloors - this.tower.currentFloor);
      if (maxAdvance > 0 && this.running) {
        this.startTowerFloor(this.tower.currentFloor + 1);
      } else {
        this.tower.inBattle = false;
        this.spawnMonster(p.level, false);
      }
      this._checkAchievements();
      return;
    }

    // Spawn next monster
    if (p.killsSinceBoss >= 30) {
      this.spawnMonster(p.level, true);
      this.addLog(`⚠ Boss 【${this.monster.name}】出现了！`, 'boss');
      this.addToast(`👑 ${this.monster.name} 来袭！`, 'achieve');
    } else {
      this.spawnMonster(p.level, false);
    }
    this._checkAchievements();
  }

  tick() {
    if (!this.running) return;
    this.tickCount++;
    this._tickSkills();
    this._tickEvents();
    this._tickEliteMonster();
    this._tickUltimate();
    let m = this.monster;
    if (!m || m.hp <= 0) return;
    const p = this.player;
    const cm = p.settings.combatMode || 'balanced';
    const mods = this.getEventModifiers();

    // Auto skills
    for (const key of ['heavyHit', 'heal', 'vampire']) {
      const s = p.skills[key];
      if (!s.auto || s.cd !== 0) continue;
      const sk = SKILL_LIST.find(x => x.id === key);
      if (!sk) continue;
      if (cm === 'boss_focus' && sk.type === 'attack' && !m.isBoss) continue;
      if (cm === 'survival' && sk.type === 'attack' && key !== 'vampire') continue;
      if (sk.type === 'heal' && p.hp >= p.maxHp * p.settings.healThreshold) continue;
      this._executeSkill(key);
      m = this.monster; // Re-read after skill (may have spawned new monster)
      if (!m || m.hp <= 0) return;
    }

    // Normal attack
    const atk = Math.floor(this.totalAtk * mods.atkMult);
    let pd = this.calcDamage(atk, m.def);
    const isCrit = Math.random() < this.critRate;
    if (isCrit) pd = Math.floor(pd * 1.5);
    m.hp = Math.max(0, m.hp - pd);
    let ha = 0;
    if (this.lifesteal > 0) {
      ha = Math.max(1, Math.floor(pd * this.lifesteal));
      p.hp = Math.min(p.maxHp, p.hp + ha);
    }
    const dt = isCrit ? `💥暴击 ${pd}` : `${pd}`;
    const lst = ha > 0 ? ` (吸血 +${ha}❤)` : '';
    this.addLog(`⚔ 攻击 ${m.name} 造成 ${dt} 伤害${lst}`);
    if (m.hp <= 0) { this._processMonsterKill(m); return; }

    // Monster attacks
    const isDodged = Math.random() < this.dodge;
    if (isDodged) {
      this.addLog(`💨 灵动触发！闪避了 ${m.name} 的攻击！`, 'dodge');
    } else {
      const md = this.calcDamage(m.atk, this.totalDef);
      p.hp -= md;
      this.addLog(`🩸 ${m.name} 反击，造成 ${md} 伤害`);
      if (this.thorns > 0 && md > 0) {
        const td = Math.max(1, Math.floor(md * this.thorns));
        m.hp -= td;
        this.addLog(`🦔 荆棘触发！反弹 ${td} 伤害`);
        if (m.hp <= 0) { this._processMonsterKill(m); return; }
      }
    }

    // Player death
    if (p.hp <= 0) {
      const expLost = Math.floor(p.exp * 0.2);
      const goldLost = Math.min(Math.floor(p.gold * 0.05), p.gold);
      p.exp = Math.max(0, p.exp - expLost);
      if (goldLost > 0) this.goldLog(-goldLost, 'death', `被 ${m.name} 击败`);
      p.hp = p.maxHp;
      p.killStreak = 0;
      p.killsSinceBoss = 0;
      this.events.active = null;
      this.addLog(`☠ 被 ${m.name} 击败！丢失 ${expLost}EXP / ${goldLost}💰。连杀中断！`, 'red');
      if (m.isBoss) this._retreat();
      this.spawnMonster(p.level, false);
    }
  }

  _retreat() {
    const p = this.player;
    let cur = p.currentTier === 'auto' ? p.unlockedTier + 1 : parseInt(p.currentTier);
    if (cur <= 1) { p.currentTier = 'auto'; return; }
    p.currentTier = Math.max(1, cur - 1).toString();
    this.addLog(`⚠️ 不敌Boss，退回安全区重整旗鼓！`, 'sys');
  }

  _getTierIndex(tl) {
    let i = 0;
    for (let j = 0; j < MONSTER_TABLE.length; j++) {
      if (tl >= MONSTER_TABLE[j].minLv) i = j;
    }
    return Math.min(9, i);
  }

  // Equipment tier: every 10 player levels = new tier tier
  _getEquipTier(lv) {
    return Math.min(9, Math.max(0, Math.floor(lv / 10)));
  }

  // ============================================================
  // Achievements
  // ============================================================
  _checkAchievements() {
    const p = this.player;
    for (const a of ACHIEVEMENT_LIST) {
      if (this.achievements[a.id]) continue;
      let ok = false;
      switch (a.id) {
        case 'level_5': ok = p.level >= 5; break;
        case 'level_10': ok = p.level >= 10; break;
        case 'level_25': ok = p.level >= 25; break;
        case 'level_50': ok = p.level >= 50; break;
        case 'level_100': ok = p.level >= 100; break;
        case 'kill_100': ok = p.totalKills >= 100; break;
        case 'kill_500': ok = p.totalKills >= 500; break;
        case 'kill_2000': ok = p.totalKills >= 2000; break;
        case 'gold_10k': ok = p.lifetimeGold >= 10000; break;
        case 'gold_100k': ok = p.lifetimeGold >= 100000; break;
        case 'enhance_5': ok = this._hasEnhanceLevel(5); break;
        case 'enhance_10': ok = this._hasEnhanceLevel(10); break;
        case 'all_equip': ok = this._allSlotsFilled(); break;
        case 'power_500': ok = this.power >= 500; break;
        case 'power_5000': ok = this.power >= 5000; break;
        case 'rebirth_1': ok = p.rebirthCount >= 1; break;
        case 'rebirth_5': ok = p.rebirthCount >= 5; break;
        case 'tower_10': ok = this.tower.highestFloor >= 10; break;
        case 'tower_50': ok = this.tower.highestFloor >= 50; break;
        case 'explore_10': ok = p.explorationCount >= 10; break;
        case 'bag_50': ok = p.bagSize >= 50; break;
        case 'set_bonus': ok = p.setBonusesUnlocked; break;
      }
      if (ok) {
        this.achievements[a.id] = true;
        const prevGold = p.gold;
        a.fn(p);
        const gained = p.gold - prevGold;
        if (gained !== 0) this.goldLog(gained, 'achievement', a.name);
        this.addLog(`🏆 成就解锁：【${a.name}】→ ${a.reward}`, 'achieve');
        this.addToast(`🏆 ${a.name} — ${a.reward}`, 'achieve');
      }
    }
  }

  _hasEnhanceLevel(n) {
    return Object.values(this.player.enhanceLevels).some(v => v >= n);
  }

  _allSlotsFilled() {
    return EQUIP_TYPES.every(k => this.player.equipment[k] !== null);
  }

  // ============================================================
  // Offline Progress
  // ============================================================
  _checkOfflineProgress() {
    const p = this.player;
    if (!p.lastSaveTime) return;
    const elapsed = (Date.now() - p.lastSaveTime) / 1000;
    if (elapsed < 30) return;
    const MAX_HR = 4;
    const capped = Math.min(elapsed, MAX_HR * 3600);
    const totalTicks = Math.floor(capped / 5);
    if (totalTicks < 1) return;
    const survivalRate = 0.98;
    const mi = this._getEquipTier(p.level);
    const tpl = MONSTER_TABLE[mi];
    const avgLv = Math.max(tpl.minLv, Math.min(tpl.maxLv, p.level));
    const rewardScale = getRewardScale(avgLv);
    const avgExp = Math.round(rewardScale * 1.5 * tpl.baseMul);
    const avgGold = Math.max(1, Math.round(rewardScale * 0.2 * tpl.baseMul));
    const effTicks = Math.floor(totalTicks * survivalRate);
    const totalExp = Math.floor(effTicks * avgExp * (1 + this.expBonus));
    const totalGold = Math.floor(effTicks * avgGold * (1 + this.goldBonus));
    const itemCount = Math.floor(effTicks * 0.15 * 0.5 * Math.max(0, 1 - this.getStagnation() * 0.02));
    p.exp += totalExp;
    let leveled = false;
    while (p.exp >= this.expNeeded) { p.exp -= this.expNeeded; p.level++; leveled = true; }
    if (leveled) { p.hp = p.maxHp; this._calcBaseStats(); }
    this.goldLog(totalGold, 'offline', '离线收益');
    p.totalKills += effTicks;
    let bagged = 0;
    for (let i = 0; i < itemCount; i++) {
      const item = this.generateDrop(avgLv, mi);
      if (p.settings.autoEquip && this.canEquipItem(item)) {
        const ce = p.equipment[item.type];
        const cs = ce ? Math.floor(ce.score * (1 + 0.15 * (p.enhanceLevels[item.type] || 0))) : 0;
        if (item.score > cs) {
          if (ce) this.addToInventory(ce);
          p.equipment[item.type] = item;
          continue;
        }
      }
      if (p.settings.autoSell && item.rarityVal <= p.settings.sellRarity) {
        this.goldLog(item.sellPrice, 'auto_sell', `[离线] ${item.name}`);
        continue;
      }
      if (p.inventory.length < p.bagSize) { p.inventory.push(item); bagged++; }
      else { this.goldLog(item.sellPrice, 'auto_sell', `[离线满] ${item.name}`); }
    }
    const mins = Math.floor(capped / 60);
    const h = Math.floor(mins / 60);
    const m2 = mins % 60;
    const ts = h > 0 ? `${h}小时${m2}分钟` : `${m2}分钟`;
    this.addLog(`⏳ 欢迎回来！离线 ${ts}，击败 ${effTicks} 只怪，获得 ${totalExp}EXP + ${totalGold}💰 + ${bagged}件装备`, 'offline');
    this.addToast(`⏳ 离线 ${ts}，获得 ${totalExp} EXP + ${totalGold}💰`, 'success');
  }

  // ============================================================
  // Tower of Trials
  // ============================================================
  startTowerFloor(floor) {
    const p = this.player;
    if (this.monster && this.monster.hp > 0 && p.hp <= 0) return false;
    const ft = Math.min(floor, TOWER_CONFIG.totalFloors);
    const scale = getScale(p.level);
    const rewardScale = getRewardScale(p.level);
    const floorMult = 1 + ft * 0.15;
    const hp = Math.round(scale * 12 * 4 * floorMult);
    this.monster = {
      name: `🏛️ 塔 ${ft}层 — 守护者`,
      color: '#ff9800',
      level: Math.floor(ft * 1.5),
      tierIndex: Math.min(9, Math.floor(ft / 10)),
      maxHp: hp, hp,
      atk: Math.round(scale * 0.65 * 2 * floorMult),
      def: Math.round(scale * 0.4 * 1.5 * floorMult),
      gold: Math.round(rewardScale * 0.2 * 3 * (1 + ft * 0.05)),
      exp: Math.round(rewardScale * 1.5 * 3 * (1 + ft * 0.05)),
      dropRate: 0.5,
      isBoss: true,
      isTower: true,
      towerFloor: ft
    };
    this.tower.inBattle = true;
    this.tower.currentFloor = ft;
    this.addLog(`🏛️ 进入无尽之塔 【第 ${ft} 层】！`, 'achieve');
    this.addToast(`🏛️ 塔 ${ft} 层 挑战开始！`, 'success');
    return true;
  }

  handleTowerVictory() {
    const ft = this.tower.currentFloor;
    if (ft > this.tower.highestFloor) {
      this.tower.highestFloor = ft;
      this.player.towerHighest = ft;
    }
    this.tower.inBattle = false;
    // Check floor rewards
    const reward = TOWER_CONFIG.rewards[ft];
    if (reward) {
      const p = this.player;
      this.goldLog(reward.gold, 'tower', `塔 ${ft} 层`);
      p.stones += reward.stones || 0;
      p.reforgeStones += reward.reforge || 0;
      this.addLog(`🏛️ 塔 ${ft} 层奖励！获得 ${reward.desc}`, 'achieve');
      this.addToast(`🏛️ 塔 ${ft} 层奖励！`, 'success');
    }
    this._checkAchievements();
  }

  // ============================================================
  // Exploration
  // ============================================================
  startExploration(tierId) {
    const p = this.player;
    if (this.exploration.active) return false;
    const tier = EXPLORATION_TIERS.find(t => t.id === tierId);
    if (!tier) return false;
    if (p.level < tier.minLv) return false;
    this.exploration.active = tier;
    this.exploration.endTime = Date.now() + tier.duration * 1000;
    this.addLog(`🗺️ 秘境探索出发！前往【${tier.name}】(${tier.duration}秒后返回)`, 'sys');
    this.addToast(`🗺️ 探索【${tier.name}】开始！`, 'success');
    return true;
  }

  checkExploration() {
    const ex = this.exploration;
    if (!ex.active) return false;
    if (Date.now() < ex.endTime) return false;
    // Exploration complete!
    const tier = ex.active;
    const p = this.player;
    const durationMin = tier.duration / 60;
    const goldReward = Math.floor(tier.rewards.goldBase * durationMin * (1 + Math.random() * 0.5));
    this.goldLog(goldReward, 'exploration', `【${tier.name}】`);
    p.explorationCount++;
    let logMsg = `🗺️ 探索【${tier.name}】完成！获得 ${goldReward}💰`;
    // Stone chance
    if (Math.random() < tier.rewards.stoneChance) {
      const stones = Math.floor(durationMin * (1 + Math.random()));
      p.stones += stones;
      logMsg += ` + 💎${stones}`;
    }
    // Item chance
    if (Math.random() < tier.rewards.itemChance) {
      const mi = this._getEquipTier(p.level);
      const item = this.generateDrop(p.level, mi);
      this.addToInventory(item);
      logMsg += ` + 🎁${item.name}`;
    }
    this.addLog(logMsg, 'event');
    this.addToast(`🗺️ 探索完成！+${goldReward}💰`, 'success');
    this.exploration.active = null;
    this._checkAchievements();
    return true;
  }

  getExplorationStatus() {
    if (!this.exploration.active) return { active: false };
    const remaining = Math.max(0, Math.floor((this.exploration.endTime - Date.now()) / 1000));
    return {
      active: true,
      name: this.exploration.active.name,
      remaining,
      total: this.exploration.active.duration,
      progress: 1 - remaining / this.exploration.active.duration
    };
  }

  // ============================================================
  // Daily Sign-In
  // ============================================================
  checkDaily() {
    const today = new Date().toDateString();
    const p = this.player;
    if (p.lastSignInDate === today) {
      this.dailies.claimedToday = true;
      return { claimed: true, streak: p.dailyStreak, day: (p.dailyStreak % 7) + 1 };
    }
    this.dailies.claimedToday = false;
    return { claimed: false, streak: p.dailyStreak, day: (p.dailyStreak % 7) + 1 };
  }

  claimDaily() {
    const p = this.player;
    const today = new Date().toDateString();
    if (p.lastSignInDate === today) return false;
    // Check if consecutive
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (p.lastSignInDate !== yesterday) {
      p.dailyStreak = 0;
    }
    p.dailyStreak++;
    this.dailies.streak = p.dailyStreak;
    p.lastSignInDate = today;
    this.dailies.lastSignIn = today;
    const dayIdx = ((p.dailyStreak - 1) % 7);
    const reward = DAILY_REWARDS[dayIdx];
    this.goldLog(reward.gold, 'daily', `签到第${dayIdx + 1}天`);
    p.stones += reward.stones || 0;
    p.reforgeStones += reward.reforge || 0;
    const desc = `第${dayIdx + 1}天签到奖励：${reward.desc}`;
    this.addLog(`📅 ${desc}`, 'achieve');
    this.addToast(`📅 ${desc}`, 'success');
    this.dailies.claimedToday = true;
    return true;
  }

  // ============================================================
  // NEW: 职业分支
  // ============================================================
  getClassConfig() {
    const p = this.player;
    if (!p.classId) return null;
    return CLASSES[p.classId] || null;
  }

  getClassBonus() {
    const cls = this.getClassConfig();
    if (!cls) return { atkMult: 1, defMult: 1, hpMult: 1 };
    // Apply class base multipliers at stat calculation level
    return { atkMult: cls.baseAtkMult, defMult: cls.baseDefMult, hpMult: cls.baseHpMult };
  }

  // Class-specific passive effects applied in stat calculations
  getClassPassiveEffects() {
    const cls = this.getClassConfig();
    if (!cls) return {};
    const p = this.player;
    switch (p.classId) {
      case 'warrior': {
        const hpLoss = 1 - (p.hp / p.maxHp);
        return { atkBonus: Math.floor(hpLoss * 10) * 0.05 }; // 每10%HP损失+5%攻击
      }
      case 'paladin':
        return { thornsBonus: 0.10, healBonus: 0.20 };
      case 'assassin':
        return { critBonus: 0.10, streakCapBonus: 1.0 };
      default:
        return {};
    }
  }

  // Check if class can equip an item based on equip restrictions
  canEquipItem(item) {
    const p = this.player;
    if (!p.classId || !item) return true;
    const restriction = EQUIP_RESTRICTIONS[p.classId];
    if (!restriction) return true;
    // Only armor/helmet/boots have restrictions (body armor slots)
    if (!['armor', 'helmet', 'boots'].includes(item.type)) return true;
    const [min, max] = restriction.armorTier;
    const ti = item.tierIndex != null ? item.tierIndex : 0;
    return ti >= min && ti <= max;
  }

  // Override stat getters with class bonuses
  get totalAtkWithClass() {
    const base = this.totalAtk;
    const clsBonus = this.getClassBonus();
    const passiveEffects = this.getClassPassiveEffects();
    const atkFromPassive = passiveEffects.atkBonus || 0;
    const baseWithClass = Math.floor(base * clsBonus.atkMult);
    return Math.floor(baseWithClass * (1 + atkFromPassive));
  }

  get totalDefWithClass() {
    const base = this.totalDef;
    const clsBonus = this.getClassBonus();
    return Math.floor(base * clsBonus.defMult);
  }

  get maxHpWithClass() {
    const base = this._calcMaxHp();
    const clsBonus = this.getClassBonus();
    return Math.floor(base * clsBonus.hpMult);
  }

  get critRateWithClass() {
    const base = this.critRate;
    const effects = this.getClassPassiveEffects();
    return base + (effects.critBonus || 0);
  }

  // ============================================================
  // NEW: 被动技能
  // ============================================================
  getPassiveEffects() {
    const p = this.player;
    const effects = { atk: 0, def: 0, hp: 0, lifesteal: 0, gold: 0, shield: 0, bossDmg: 0 };
    const passives = p.passives;
    if (!passives || !passives.slots) return effects;
    for (const skillId of passives.slots) {
      if (!skillId) continue;
      const skill = PASSIVE_SKILLS.find(s => s.id === skillId);
      if (!skill) continue;
      const lv = passives.levels[skillId] || 1;
      const mult = lv;
      switch (skill.type) {
        case 'atk': effects.atk += skill.baseEffect * mult; break;
        case 'def': effects.def += skill.baseEffect * mult; break;
        case 'hp': effects.hp += skill.baseEffect * mult; break;
        case 'lifesteal': effects.lifesteal += skill.baseEffect * mult; break;
        case 'gold': effects.gold += skill.baseEffect * mult; break;
        case 'boss_dmg': effects.bossDmg += skill.baseEffect * mult; break;
        case 'shield': effects.shield = skill.baseEffect * mult; break;
      }
    }
    // Apply class effects to passives
    const clsEffects = this.getClassPassiveEffects();
    if (clsEffects.thornsBonus) effects.thornsBonus = clsEffects.thornsBonus;
    if (clsEffects.healBonus) effects.healBonus = clsEffects.healBonus;
    return effects;
  }

  upgradePassive(skillId) {
    const p = this.player;
    const skill = PASSIVE_SKILLS.find(s => s.id === skillId);
    if (!skill) return false;
    const lv = p.passives.levels[skillId] || 1;
    if (lv >= skill.maxLv) return false;
    const cost = 2000 * lv;
    if (p.gold < cost) return false;
    this.goldLog(-cost, 'upgrade_passive', `【${skill.name}】Lv.${lv}→${lv + 1}`);
    p.passives.levels[skillId] = lv + 1;
    this._calcBaseStats();
    this.addLog(`⬆️ 被动技能【${skill.name}】升级至 Lv.${lv + 1}！`, 'achieve');
    return true;
  }

  equipPassive(slotIdx, skillId) {
    const p = this.player;
    if (slotIdx >= p.passives.unlockSlots) return false;
    // Check if already equipped
    if (p.passives.slots[slotIdx] === skillId) {
      p.passives.slots[slotIdx] = null; // unequip
      return true;
    }
    // Remove from other slot if equipped elsewhere
    for (let i = 0; i < p.passives.slots.length; i++) {
      if (p.passives.slots[i] === skillId) p.passives.slots[i] = null;
    }
    p.passives.slots[slotIdx] = skillId;
    this._calcBaseStats();
    return true;
  }

  // ============================================================
  // NEW: 终极技能
  // ============================================================
  _tickUltimate() {
    const p = this.player;
    if (!p.ultimate.unlocked) return;
    if (p.ultimate.cd > 0) { p.ultimate.cd--; return; }
    // Auto-cast when available and in combat
    if (!this.monster || this.monster.hp <= 0 || p.hp <= 0) return;
    if (!this.running) return;
    // Cast: 500% damage, if kills boss restore 50% HP
    const dmg = this.calcDamage(Math.floor(this.totalAtkWithClass * 5), this.monster.def);
    this.monster.hp = Math.max(0, this.monster.hp - dmg);
    p.ultimate.cd = 60;
    this.addLog(`🌀 释放【天罚】！造成 ${dmg} 点毁灭性伤害！`, 'achieve');
    if (this.monster.hp <= 0) {
      if (this.monster.isBoss) {
        p.hp = Math.min(p.maxHp, p.hp + Math.floor(p.maxHp * 0.5));
        this.addLog(`💚 天罚击杀Boss，恢复 50% 生命值！`, 'exp');
      }
      this._processMonsterKill(this.monster);
    }
  }

  unlockUltimate() {
    if (this.player.ultimate.unlocked) return;
    this.player.ultimate.unlocked = true;
    this.addLog(`🌀 终极技能【天罚】已解锁！每60秒可造成500%伤害！`, 'achieve');
    this.addToast(`🌀 终极技能已解锁！`, 'achieve');
  }

  _checkPassiveSlotUnlock() {
    const p = this.player;
    if (p.passives.unlockSlots >= 2) return;
    if (p.rebirthCount >= 1 || p.level >= 30) {
      p.passives.unlockSlots = 2;
      this.addLog(`💫 被动技能槽2已解锁！可装备更多被动技能！`, 'achieve');
      this.addToast(`💫 被动技能槽2已解锁！`, 'achieve');
    }
  }

  // ============================================================
  // NEW: 装备进阶合成
  // ============================================================
  craftUpgrade(type, indices) {
    const p = this.player;
    if (!indices || indices.length !== 4) return { ok: false, msg: '需要选择4件同品质同部位装备' };
    const items = indices.map(i => p.inventory[i]).filter(Boolean);
    if (items.length !== 4) return { ok: false, msg: '装备不存在' };
    const first = items[0];
    // Check all same type and rarity
    for (const item of items) {
      if (item.type !== first.type || item.rarityVal !== first.rarityVal) {
        return { ok: false, msg: '必须为同品质同部位的装备' };
      }
    }
    const recipe = Object.values(CRAFT_RECIPES).find(r => r.inputRarity === first.rarityVal);
    if (!recipe) return { ok: false, msg: '该品质无法继续进阶' };
    if (p.gold < recipe.cost) return { ok: false, msg: `金币不足，需要 ${recipe.cost}💰` };
    this.goldLog(-recipe.cost, 'craft', `【${first.type}】${RARITY_MAP[recipe.outputRarity].name}`);
    // Remove items (reverse order to avoid index shifting)
    const sortedIndices = [...indices].sort((a, b) => b - a);
    for (const idx of sortedIndices) {
      p.inventory.splice(idx, 1);
    }
    // Generate upgraded item
    const newRarity = RARITY_MAP[recipe.outputRarity];
    const newItem = this._buildItem(first.itemLv, first.tierIndex, first.type, newRarity);
    // Keep some affixes from the best input item
    const bestItem = items.sort((a, b) => b.score - a.score)[0];
    if (bestItem.affixes && bestItem.affixes.length > 0 && newItem.affixes) {
      // Carry over one random affix from the best input item
      const bestAffix = bestItem.affixes[Math.floor(Math.random() * bestItem.affixes.length)];
      if (newItem.affixes.length < 4) {
        const carryOver = { ...bestAffix, locked: false,
          desc: bestAffix.desc.replace('[', '[').replace(']', ']') + ' <span style="color:#ff9800">[继承]</span>'
        };
        newItem.affixes.push(carryOver);
      }
    }
    p.inventory.push(newItem);
    this.addLog(`🔮 装备进阶成功！获得 ${newItem.name}！`, 'achieve');
    this.addToast(`🔮 进阶成功！`, 'success');
    return { ok: true, item: newItem };
  }

  // ============================================================
  // NEW: 装备图鉴收集
  // ============================================================
  _checkCollection(item) {
    const p = this.player;
    if (!item) return;
    // Extract base name (remove quality prefix)
    const baseName = item.name.replace(/^(普通|优秀|精良|史诗|传说)的 /, '');
    const key = `${baseName}_${item.type}`;
    if (p.collection[key]) return;
    p.collection[key] = { name: baseName, type: item.type, rarity: item.rarityVal, time: Date.now() };
    const count = Object.keys(p.collection).length;
    this.addLog(`📖 图鉴收录：${item.name} (${count}/60)`, 'sys');
    // Check milestones
    for (const ms of COLLECTION_MILESTONES) {
      if (count === ms.count) {
        if (ms.gold) this.goldLog(ms.gold, 'collection', `里程碑 ${ms.count}`);
        if (ms.stones) p.stones += ms.stones;
        this.addLog(`🏆 图鉴里程碑【${ms.reward}】达成！${ms.gold ? '+' + ms.gold + '💰' : ''}${ms.stones ? ' +💎' + ms.stones : ''}`, 'achieve');
        this.addToast(`📖 图鉴里程碑：${ms.reward}`, 'achieve');
      }
    }
  }

  getCollectionBonus() {
    const count = Object.keys(this.player.collection).length;
    const bonus = { atk: 0, def: 0, hp: 0, crit: 0, dropRate: 0 };
    for (const ms of COLLECTION_MILESTONES) {
      if (count >= ms.count) {
        if (ms.atk) bonus.atk += ms.atk;
        if (ms.def) bonus.def += ms.def;
        if (ms.hp) bonus.hp += ms.hp;
        if (ms.crit) bonus.crit += ms.crit;
        if (ms.dropRate) bonus.dropRate = ms.dropRate;
      }
    }
    return bonus;
  }

  // ============================================================
  // NEW: 每日悬赏
  // ============================================================
  _checkQuests() {
    const p = this.player;
    const today = new Date().toDateString();
    // Generate new quests if needed
    if (p.quests.date !== today || p.quests.list.length === 0) {
      this._generateDailyQuests();
    }
  }

  _generateDailyQuests() {
    const p = this.player;
    const today = new Date().toDateString();
    // Pick 3 random quests
    const shuffled = [...QUEST_POOL].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3);
    p.quests = {
      date: today,
      list: selected.map(q => q.id),
      progress: {},
      completed: {}
    };
    selected.forEach(q => { p.quests.progress[q.id] = 0; });
    this.addLog(`📋 新的每日悬赏已生成！完成3个悬赏领取奖励！`, 'sys');
  }

  _updateQuestProgress(type, amount = 1) {
    const p = this.player;
    const today = new Date().toDateString();
    if (p.quests.date !== today) {
      this._generateDailyQuests();
    }
    for (const questId of p.quests.list) {
      if (p.quests.completed[questId]) continue;
      const quest = QUEST_POOL.find(q => q.id === questId);
      if (!quest || quest.type !== type) continue;
      p.quests.progress[questId] = (p.quests.progress[questId] || 0) + amount;
      if (p.quests.progress[questId] >= quest.target) {
        p.quests.completed[questId] = true;
        const r = quest.reward;
        if (r.gold) this.goldLog(r.gold, 'quest', quest.name);
        p.stones += r.stones || 0;
        p.reforgeStones += r.reforge || 0;
        this.addLog(`📋 悬赏完成：【${quest.name}】！获得 ${r.gold ? r.gold + '💰' : ''}${r.stones ? ' 💎' + r.stones : ''}${r.reforge ? ' 🔨' + r.reforge : ''}`, 'achieve');
        this.addToast(`📋 悬赏完成！${quest.name}`, 'success');
      }
    }
  }

  // ============================================================
  // NEW: 限时精英怪
  // ============================================================
  _tickEliteMonster() {
    const p = this.player;
    if (!this.running) return;
    p.eliteTimer = (p.eliteTimer || 0) + 1;
    if (p.eliteTimer < ELITE_MONSTER_CONFIG.interval) return;
    // Don't spawn if already in boss/elite fight
    if (this.monster && (this.monster.isBoss || this.monster.isElite)) return;
    // Spawn elite
    p.eliteTimer = 0;
    const tpl = MONSTER_TABLE[this._getTierIndex(p.level)] || MONSTER_TABLE[0];
    const lv = Math.max(tpl.minLv, Math.min(tpl.maxLv, p.level));
    const scale = this._getScaleFor(lv);
    const rewardScale = getRewardScale(lv);
    const cfg = ELITE_MONSTER_CONFIG;
    this.monster = {
      name: `⭐ 精英 ${tpl.emoji} ${tpl.name}`,
      color: '#ff9800',
      level: lv, tierIndex: MONSTER_TABLE.findIndex(t => t.id === tpl.id),
      maxHp: Math.round(scale * 12 * tpl.baseMul * cfg.hpMult),
      hp: Math.round(scale * 12 * tpl.baseMul * cfg.hpMult),
      atk: Math.round(scale * 0.65 * tpl.baseMul * cfg.atkMult),
      def: Math.round(scale * 0.4 * tpl.baseMul * cfg.defMult),
      gold: Math.round(rewardScale * 0.2 * tpl.baseMul * cfg.goldMult),
      exp: Math.round(rewardScale * 1.5 * tpl.baseMul * cfg.expMult),
      dropRate: cfg.dropRate,
      isBoss: false,
      isElite: true
    };
    this.addLog(`⭐ 精英怪物出现了！【${this.monster.name}】`, 'boss');
    this.addToast(`⭐ 精英怪来袭！`, 'achieve');
  }

  _getScaleFor(lv) {
    return getScale(lv);
  }

  // Handle elite kill rewards
  _processEliteKill() {
    const cfg = ELITE_MONSTER_CONFIG;
    const stoneDrop = cfg.stoneDrop + Math.floor(Math.random() * 3);
    this.player.stones += stoneDrop;
    this.addLog(`💎 精英怪掉落 强化石 x${stoneDrop}`, 'exp');
    if (Math.random() < 0.5) {
      const rd = 1 + Math.floor(Math.random() * 3);
      this.player.reforgeStones += rd;
      this.addLog(`💜 精英怪掉落 洗练石 x${rd}`, 'exp');
    }
    this.addLog(`⭐ 精英怪物被击败！额外奖励已获取！`, 'boss');
    this.addToast(`⭐ 精英击杀！`, 'success');
  }
}

// Export singleton
const gameState = new GameState();
export default gameState;
// Export class for multi-user support
export { GameState };
