// ============================================================
// Game Data Tables
// ============================================================

export const MONSTER_TABLE = [
  { id: 1,  name: "史莱姆",   emoji: "🟢", minLv: 1,  maxLv: 10,  baseMul: 1.0, color: "#4caf50" },
  { id: 2,  name: "哥布林",   emoji: "👺", minLv: 11, maxLv: 20,  baseMul: 1.3, color: "#8bc34a" },
  { id: 3,  name: "骷髅战士", emoji: "💀", minLv: 21, maxLv: 30,  baseMul: 1.7, color: "#78909c" },
  { id: 4,  name: "石像鬼",   emoji: "🗿", minLv: 31, maxLv: 40,  baseMul: 2.2, color: "#7e57c2" },
  { id: 5,  name: "暗黑骑士", emoji: "⚔️", minLv: 41, maxLv: 50,  baseMul: 2.8, color: "#ef5350" },
  { id: 6,  name: "双头魔狼", emoji: "🐺", minLv: 51, maxLv: 60,  baseMul: 3.5, color: "#ff5722" },
  { id: 7,  name: "深渊恶魔", emoji: "👿", minLv: 61, maxLv: 70,  baseMul: 4.3, color: "#e91e63" },
  { id: 8,  name: "龙族卫士", emoji: "🐉", minLv: 71, maxLv: 80,  baseMul: 5.2, color: "#ff9800" },
  { id: 9,  name: "远古巨龙", emoji: "🐲", minLv: 81, maxLv: 90,  baseMul: 6.2, color: "#f44336" },
  { id: 10, name: "混沌魔神", emoji: "🌑", minLv: 91, maxLv: 999, baseMul: 7.5, color: "#b71c1c" }
];

export const BOSS_NAMES = ["史莱姆之王","哥布林酋长","骷髅将军","石像鬼领主","暗黑大骑士","双头狼王","深渊领主","龙族长老","远古龙王","混沌之神"];

export const EQUIP_NAMES = {
  weapon: ["破碎短刃","血牙匕首","霜噬之刃","噬魂者战镰","黑曜石裁决","暗影哀歌","深渊撕裂者","龙脊·阿什坎迪","灰烬使者","弑神·终焉之锋"],
  armor:  ["残旧裹布","铁棘甲胄","暗钢壁垒","血铸胸铠","黑曜石战甲","不朽者之御","龙鳞圣盾","卡利姆多壁垒","混沌吞噬者","创世·原初之铠"],
  helmet: ["破布兜帽","铁颚面甲","暗影头冠","血角战盔","灵魂王冠","不朽者之冕","龙鳞凝视","星辰耀盔","永夜主宰","混沌·灭世之冠"],
  boots:  ["绑腿草鞋","铁踵之靴","暗影行者","血蹄战靴","虚空行者","不朽者之步","龙炎径靴","跃渊踏靴","混沌践踏者","星界漫游者"],
  ring:   ["骨片指环","寒风之戒","暗影魔戒","噬灵者之环","黑曜石之星","不朽者之印","龙裔指环","约束星辰","混沌织法者","终焉·永恒之戒"],
  amulet: ["骨牙吊坠","霜月护符","暗影垂饰","噬魂者之坠","虚空之心","不朽者徽记","龙源之坠","天使之泪","混沌脉动","创世神之心"]
};

export const EQUIP_TYPES = ["weapon","armor","helmet","boots","ring","amulet"];

export const AFFIX_POOL = [
  { type: "crit", name:"暴击", baseVal:0.02, variance:0.01, allowed:["weapon","helmet","ring"], format:v => `暴击率 +${Math.round(v*100)}%` },
  { type: "lifesteal", name:"吸血", baseVal:0.01, variance:0.01, allowed:["weapon","ring","amulet"], format:v => `攻击吸血 +${Math.round(v*100)}%` },
  { type: "atkPct", name:"狂力", baseVal:0.02, variance:0.01, allowed:["weapon","ring"], format:v => `总攻击 +${Math.round(v*100)}%` },
  { type: "thorns", name:"荆棘", baseVal:0.03, variance:0.01, allowed:["armor","helmet","amulet"], format:v => `反伤率 +${Math.round(v*100)}%` },
  { type: "hpPct", name:"巨熊", baseVal:0.03, variance:0.02, allowed:["armor","helmet","boots","amulet"], format:v => `总生命 +${Math.round(v*100)}%` },
  { type: "dodge", name:"灵动", baseVal:0.015, variance:0.005, allowed:["boots","ring"], format:v => `闪避率 +${Math.round(v*100)}%` },
  { type: "defPct", name:"坚韧", baseVal:0.03, variance:0.02, allowed:["armor","helmet","boots","amulet"], format:v => `总防御 +${Math.round(v*100)}%` },
  { type: "exp", name:"学识", baseVal:0.05, variance:0.02, allowed:["weapon","helmet","armor","boots","ring","amulet"], format:v => `经验加成 +${Math.round(v*100)}%` },
  { type: "gold", name:"财富", baseVal:0.05, variance:0.02, allowed:["weapon","helmet","armor","boots","ring","amulet"], format:v => `金币加成 +${Math.round(v*100)}%` }
];

export const AFFIX_TIERS = {
  1:{ name:"初级", color:"#4caf50", mul:1.0, scoreMult:20 },
  2:{ name:"中级", color:"#2196f3", mul:2.0, scoreMult:50 },
  3:{ name:"高级", color:"#9c27b0", mul:3.5, scoreMult:120 },
  4:{ name:"终极", color:"#ff9800", mul:5.0, scoreMult:300 }
};

export const RARITY_MAP = [
  { name:"普通", color:"#e8eaf0", prob:1.00, mul:1.0, affixCount:0, val:0 },
  { name:"优秀", color:"#4caf50", prob:0.60, mul:1.2, affixCount:1, val:1 },
  { name:"精良", color:"#2196f3", prob:0.30, mul:1.5, affixCount:2, val:2 },
  { name:"史诗", color:"#9c27b0", prob:0.10, mul:2.0, affixCount:3, val:3 },
  { name:"传说", color:"#ff9800", prob:0.03, mul:3.0, affixCount:4, val:4 }
];

export const ACHIEVEMENT_LIST = [
  { id:"level_5",  name:"初出茅庐", desc:"达到等级 5",  reward:"💰 50 + 💎2",           fn: p => { p.gold += 50; p.stones += 2; } },
  { id:"level_10", name:"冒险者",   desc:"达到等级 10", reward:"💰 100 + 💎3",          fn: p => { p.gold += 100; p.stones += 3; } },
  { id:"level_25", name:"资深勇者", desc:"达到等级 25", reward:"💰 500 + 💎10",         fn: p => { p.gold += 500; p.stones += 10; } },
  { id:"level_50", name:"英雄降临", desc:"达到等级 50", reward:"💰 3000 + 💎20",        fn: p => { p.gold += 3000; p.stones += 20; } },
  { id:"level_100",name:"传奇不朽", desc:"达到等级 100",reward:"💰 20000 + 💎50",       fn: p => { p.gold += 20000; p.stones += 50; } },
  { id:"kill_100", name:"百人斩",   desc:"累计击杀 100 只",  reward:"💰 100 + 💎2",          fn: p => { p.gold += 100; p.stones += 2; } },
  { id:"kill_500", name:"屠戮者",   desc:"累计击杀 500 只",  reward:"💰 500 + 💎10",         fn: p => { p.gold += 500; p.stones += 10; } },
  { id:"kill_2000",name:"千人屠",   desc:"累计击杀 2000 只", reward:"💰 3000 + 💎20",        fn: p => { p.gold += 3000; p.stones += 20; } },
  { id:"gold_10k", name:"小富即安", desc:"累积获得 10000 金币",  reward:"💰 500",            fn: p => { p.gold += 500; } },
  { id:"gold_100k",name:"富甲一方", desc:"累积获得 100000 金币", reward:"💰 3000 + 💎10",    fn: p => { p.gold += 3000; p.stones += 10; } },
  { id:"enhance_5",name:"精工巧匠", desc:"任意装备强化到 +5",  reward:"💎 10",             fn: p => { p.stones += 10; } },
  { id:"enhance_10",name:"锻造大师",desc:"任意装备强化到 +10", reward:"💎 25",             fn: p => { p.stones += 25; } },
  { id:"all_equip",name:"全副武装", desc:"穿戴全部 6 件装备",  reward:"💰 200 + 💎5",       fn: p => { p.gold += 200; p.stones += 5; } },
  { id:"power_500", name:"战力初显", desc:"总战力达到 500",   reward:"💰 300 + 💎3",        fn: p => { p.gold += 300; p.stones += 3; } },
  { id:"power_5000",name:"战力觉醒", desc:"总战力达到 5000",  reward:"💰 2000 + 💎15",      fn: p => { p.gold += 2000; p.stones += 15; } },
  { id:"rebirth_1", name:"涅槃重生", desc:"完成首次转生",    reward:"永久加成", fn: _ => {} },
  { id:"rebirth_5", name:"不死凤凰", desc:"完成 5 次转生",   reward:"永久加成", fn: _ => {} },
  // 新增成就
  { id:"tower_10",  name:"登塔新秀", desc:"无尽之塔到达 10 层",  reward:"💰 2000 + 💎10",  fn: p => { p.gold += 2000; p.stones += 10; } },
  { id:"tower_50",  name:"爬塔高手", desc:"无尽之塔到达 50 层",  reward:"💰 15000 + 💎30", fn: p => { p.gold += 15000; p.stones += 30; } },
  { id:"explore_10",name:"探索先锋", desc:"完成 10 次秘境探索",  reward:"💰 500 + 💎5",    fn: p => { p.gold += 500; p.stones += 5; } },
  { id:"bag_50",    name:"背包大户", desc:"背包扩展至 50 格",    reward:"💰 2000 + 💎5",   fn: p => { p.gold += 2000; p.stones += 5; } },
  { id:"set_bonus", name:"套装收集者", desc:"激活任意套装效果",  reward:"💰 1000 + 💎10",  fn: p => { p.gold += 1000; p.stones += 10; } },
];

export const SKILL_LIST = [
  { id: "heavyHit", name: "🔥 破甲重击", type: "attack", cdMax: 10, desc: "造成 300% 伤害，无视怪物一半防御" },
  { id: "heal",     name: "✨ 圣光治愈", type: "heal",   cdMax: 16, desc: "立即恢复 25% 最大生命值" },
  { id: "vampire",  name: "🦇 鲜血汲取", type: "attack", cdMax: 14, desc: "造成 150% 伤害，全额转化为生命" }
];

// 技能符文分支
export const SKILL_RUNES = {
  heavyHit: [
    { id: "hh_damage", name: "粉碎", desc: "伤害提升至 400%" },
    { id: "hh_cd",     name: "迅击", desc: "冷却减少 3 秒" },
    { id: "hh_stun",   name: "震荡", desc: "10% 概率秒杀普通怪" }
  ],
  heal: [
    { id: "hl_power",  name: "强愈", desc: "恢复提升至 40% 最大生命" },
    { id: "hl_cd",     name: "迅愈", desc: "冷却减少 4 秒" },
    { id: "hl_shield", name: "护盾", desc: "溢出治疗转为护盾(上限20%HP)" }
  ],
  vampire: [
    { id: "vp_damage", name: "血沸", desc: "伤害提升至 220%" },
    { id: "vp_heal",   name: "血蛭", desc: "吸血提升至 200% 伤害" },
    { id: "vp_chain",  name: "血链", desc: "同时对两个目标造成伤害" }
  ]
};

// 套装效果
export const SET_BONUSES = {
  2: { name: "坚固", desc: "防御 +15%", apply: stats => { stats.defBonus += 0.15; } },
  4: { name: "狂暴", desc: "攻击 +20%", apply: stats => { stats.atkBonus += 0.20; } },
  6: { name: "套装精通", desc: "全属性 +10%", apply: stats => { stats.allBonus += 0.10; } }
};

// 无尽之塔配置
export const TOWER_CONFIG = {
  totalFloors: 100,
  baseHpMult: 8,
  baseAtkMult: 1.5,
  baseDefMult: 1.2,
  rewards: {
    10:  { gold: 5000, stones: 10, desc: "5000💰 + 💎10" },
    25:  { gold: 15000, stones: 20, desc: "15000💰 + 💎20" },
    50:  { gold: 50000, stones: 50, desc: "50000💰 + 💎50" },
    75:  { gold: 100000, stones: 80, desc: "100000💰 + 💎80" },
    100: { gold: 300000, stones: 200, desc: "300000💰 + 💎200" }
  }
};

// 每日签到奖励 (7天循环)
export const DAILY_REWARDS = [
  { day: 1,  gold: 500,  stones: 3,  desc: "500💰 + 💎3" },
  { day: 2,  gold: 800,  stones: 5,  desc: "800💰 + 💎5" },
  { day: 3,  gold: 1200, stones: 8,  desc: "1200💰 + 💎8" },
  { day: 4,  gold: 2000, reforge: 3, desc: "2000💰 + 🔨3" },
  { day: 5,  gold: 3000, stones: 10, desc: "3000💰 + 💎10" },
  { day: 6,  gold: 5000, reforge: 5, desc: "5000💰 + 🔨5" },
  { day: 7,  gold: 10000, stones: 30, reforge: 10, desc: "10000💰 + 💎30 + 🔨10" }
];

export const EXPLORATION_TIERS = [
  { id: 1, name: "迷雾森林",  duration: 30,  minLv: 1,  rewards: { goldBase: 200, stoneChance: 0.3, itemChance: 0.4 } },
  { id: 2, name: "幽暗洞穴",  duration: 60,  minLv: 20, rewards: { goldBase: 800, stoneChance: 0.5, itemChance: 0.5 } },
  { id: 3, name: "失落遗迹",  duration: 120, minLv: 40, rewards: { goldBase: 3000, stoneChance: 0.7, itemChance: 0.6 } },
  { id: 4, name: "龙之巢穴",  duration: 240, minLv: 60, rewards: { goldBase: 10000, stoneChance: 0.9, itemChance: 0.7 } },
  { id: 5, name: "混沌深渊",  duration: 480, minLv: 80, rewards: { goldBase: 30000, stoneChance: 1.0, itemChance: 0.8 } }
];

// Core scale calculation for monster stats
export function getScale(lv) {
  return Math.floor(8 + lv * 4 + Math.pow(lv, 1.15));
}

export function getRewardScale(lv) {
  return Math.floor(8 + lv * 4 + Math.pow(lv, 1.15));
}

// Export enums
export const SKILL_RUNE_IDS = Object.keys(SKILL_RUNES).reduce((acc, skillId) => {
  acc[skillId] = SKILL_RUNES[skillId].map(r => r.id);
  return acc;
}, {});

// ============================================================
// NEW — 第二章玩法深度
// ============================================================

// ---- 职业分支 ----
export const CLASSES = {
  warrior: {
    id: 'warrior', name: '狂战士', icon: '⚔️',
    desc: '血量越低攻击越高，享受刀尖舔血的快感',
    baseAtkMult: 1.2, baseDefMult: 0.8, baseHpMult: 0.9,
    passive: { id: 'berserker_rage', name: '血怒', desc: '每损失10%HP，攻击+5%' },
    statPri: 'totalAtk'
  },
  paladin: {
    id: 'paladin', name: '圣骑士', icon: '🛡️',
    desc: '防御和反伤增强，团队中最坚实的后盾',
    baseAtkMult: 0.9, baseDefMult: 1.3, baseHpMult: 1.1,
    passive: { id: 'paladin_aura', name: '圣光屏障', desc: '反伤率+10%，治疗效果+20%' },
    statPri: 'totalDef'
  },
  assassin: {
    id: 'assassin', name: '刺客', icon: '🗡️',
    desc: '暴击和闪避极高，一击毙命的暗杀大师',
    baseAtkMult: 1.1, baseDefMult: 0.7, baseHpMult: 0.8,
    passive: { id: 'assassin_blade', name: '暗影之刃', desc: '暴击率+10%，连杀上限+100%' },
    statPri: 'critRate'
  }
};

// ---- 被动技能 ----
export const PASSIVE_SKILLS = [
  { id: 'toughness',    name: '🛡️ 坚韧',   desc: '防御+20%',         maxLv: 5, baseEffect: 0.20, type: 'def' },
  { id: 'rage',         name: '🔥 怒意',   desc: '攻击+15%',         maxLv: 5, baseEffect: 0.15, type: 'atk' },
  { id: 'vampiric',     name: '🦇 嗜血',   desc: '吸血+5%',          maxLv: 5, baseEffect: 0.05, type: 'lifesteal' },
  { id: 'shield',       name: '🔰 护盾',   desc: '开场获得30%HP护盾', maxLv: 3, baseEffect: 0.30, type: 'shield' },
  { id: 'scavenger',    name: '💰 拾荒者', desc: '金币获取+30%',     maxLv: 5, baseEffect: 0.30, type: 'gold' },
  { id: 'predator',     name: '🎯 猎手',   desc: '对Boss伤害+40%',   maxLv: 5, baseEffect: 0.40, type: 'boss_dmg' },
  { id: 'fortitude',    name: '💪 铁骨',   desc: '生命+25%',         maxLv: 5, baseEffect: 0.25, type: 'hp' },
];

// ---- 职业装备限制 ----
// armorTier: [minTierIndex, maxTierIndex] for armor/helmet/boots (weapon/ring/amulet unrestricted)
export const EQUIP_RESTRICTIONS = {
  warrior:  { label: '无限制', armorTier: [0, 9] },
  paladin:  { label: '仅限重甲', armorTier: [3, 9] },
  assassin: { label: '仅限轻甲', armorTier: [0, 2] },
};

// ---- 装备进阶合成配方 ----
export const CRAFT_RECIPES = {
  // 4件同品质+同类型 → 1件下一品质
  common:    { need: 4, inputRarity: 0, outputRarity: 1, cost: 500 },
  uncommon:  { need: 4, inputRarity: 1, outputRarity: 2, cost: 2000 },
  rare:      { need: 4, inputRarity: 2, outputRarity: 3, cost: 8000 },
  epic:      { need: 4, inputRarity: 3, outputRarity: 4, cost: 30000 }
};

// ---- 装备图鉴收集奖励 ----
export const COLLECTION_MILESTONES = [
  { count: 5,   reward: '全属性+2%', atk: 0.02, def: 0.02, hp: 0.02, gold: 5000 },
  { count: 15,  reward: '暴击+3%',   crit: 0.03, gold: 15000 },
  { count: 30,  reward: '全属性+5%', atk: 0.05, def: 0.05, hp: 0.05, gold: 50000 },
  { count: 50,  reward: '掉率+5%',   dropRate: 0.05, stones: 50 }
];

// ---- 每日悬赏 ----
export const QUEST_POOL = [
  { id: 'kill_50',      name: '清道夫',    desc: '击杀 50 只怪物',    type: 'kill',  target: 50,  reward: { gold: 3000, stones: 5 } },
  { id: 'kill_200',     name: '屠戮者',    desc: '击杀 200 只怪物',   type: 'kill',  target: 200, reward: { gold: 10000, stones: 15 } },
  { id: 'collect_green',name: '拾荒者',    desc: '拾取 5 件优秀+装备',type: 'collect',target: 5,   reward: { gold: 2000, reforge: 3 } },
  { id: 'collect_blue', name: '收藏家',    desc: '拾取 3 件精良+装备',type: 'collect',target: 3,   reward: { gold: 5000, stones: 8 } },
  { id: 'enhance_3',    name: '锻造学徒',  desc: '强化装备 3 次',     type: 'enhance',target: 3,   reward: { gold: 3000, stones: 5 } },
  { id: 'enhance_10',   name: '锻造大师',  desc: '强化装备 10 次',    type: 'enhance',target: 10,  reward: { gold: 10000, reforge: 8 } },
  { id: 'boss_3',       name: '猎龙者',    desc: '击败 3 个Boss',     type: 'boss',  target: 3,   reward: { gold: 15000, stones: 20 } },
  { id: 'boss_10',      name: '弑神者',    desc: '击败 10 个Boss',    type: 'boss',  target: 10,  reward: { gold: 50000, stones: 50 } },
];

// ---- 限时精英怪 ----
export const ELITE_MONSTER_CONFIG = {
  interval: 1800,        // 30分钟 (秒)
  hpMult: 3,
  atkMult: 1.8,
  defMult: 1.5,
  goldMult: 5,
  expMult: 4,
  dropRate: 0.8,
  stoneDrop: 5
};

