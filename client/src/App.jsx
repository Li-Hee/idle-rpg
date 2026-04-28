import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchState, toggle, equipItem, sellItem, sellAll, sellRarity, sortInventory,
  enhance, reforge, toggleLock,
  buyStone, buyReforge, buyEquip,
  upgrade, upgradeBulk, upgradeMax,
  toggleSkill, castSkill, setRune,
  rebirth,
  changeMap, updateSettings,
  enterTower, leaveTower, startExplore,
  claimDaily, expandBag, clearLogs,
  selectClass, upgradePassive, equipPassive,
  claimFreeDraw,
  setToken, getToken, onUnauthorized
} from './api';
import AuthScreen from './AuthScreen';

// ============================================================
// Sub-components
// ============================================================

function Toast({ toasts }) {
  if (!toasts || toasts.length === 0) return null;
  return (
    <div id="toast-container">
      {toasts.map((t, i) => (
        <div key={i} className={`toast ${t.type === 'achieve' ? 'achieve' : ''}`}
          style={{ border: `1px solid ${t.type === 'achieve' ? '#ff9800' : t.type === 'error' ? '#e04040' : '#4caf50'}`,
            color: t.type === 'achieve' ? '#ff9800' : t.type === 'error' ? '#e04040' : '#4caf50' }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function LogPanel({ logs, onClear }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);
  return (
    <div className="panel">
      <div className="panel-title"><span>📜 战斗日志</span><button className="btn-small-action" onClick={onClear}>清空日志</button></div>
      <div className="log-box" ref={ref}>
        {logs?.map((l, i) => (
          <div key={i} className={`log-entry ${l.cls}`} dangerouslySetInnerHTML={{ __html: l.msg }} />
        ))}
      </div>
    </div>
  );
}

function GoldLogPanel({ logs }) {
  const [show, setShow] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);
  const sourceColors = {
    kill: '#4caf50', event: '#ff9800', daily: '#f0c040', achievement: '#9c27b0',
    quest: '#2196f3', exploration: '#00bcd4', tower: '#ff5722', offline: '#78909c',
    sell: '#66bb6a', sell_all: '#66bb6a', sell_rarity: '#66bb6a', auto_sell: '#81c784',
    shop: '#ef5350', upgrade: '#ef5350', upgrade_bulk: '#ef5350',
    enhance: '#ff7043', reforge: '#ff7043', expand_bag: '#ef5350',
    craft: '#ab47bc', upgrade_passive: '#ce93d8',
    death: '#f44336', rebirth: '#f44336',
    collection: '#ffd54f'
  };
  const sourceLabels = {
    kill: '击杀', event: '事件', daily: '签到', achievement: '成就',
    quest: '悬赏', exploration: '探索', tower: '爬塔', offline: '离线',
    sell: '出售', sell_all: '一键出售', sell_rarity: '批量出售', auto_sell: '自动出售',
    shop: '商店', upgrade: '修炼', upgrade_bulk: '批量修炼',
    enhance: '强化', reforge: '洗练', expand_bag: '扩包',
    craft: '合成', upgrade_passive: '被动升级',
    death: '死亡', rebirth: '转生',
    collection: '图鉴'
  };
  return (
    <div className="panel" style={{ marginTop: 8 }}>
      <div className="panel-title" onClick={() => setShow(!show)} style={{ cursor: 'pointer' }}>
        <span>💰 金币流水 {show ? '▼' : '▶'}</span>
        <span style={{ fontSize: 11, color: '#8890a8' }}>共 {logs?.length || 0} 条</span>
      </div>
      {show && (
        <div className="log-box" ref={ref} style={{ maxHeight: 280, fontSize: 12 }}>
          {logs?.length === 0 && <div style={{ color: '#8890a8', padding: 8 }}>暂无金币记录</div>}
          {logs?.slice().reverse().map((l, i) => (
            <div key={i} style={{ padding: '3px 6px', borderBottom: '1px solid #1e2230', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: '#555e78', fontSize: 11, minWidth: 55 }}>{new Date(l.time).toLocaleTimeString()}</span>
              <span style={{
                color: sourceColors[l.source] || '#8890a8',
                fontSize: 11, fontWeight: 600, minWidth: 44
              }}>{sourceLabels[l.source] || l.source}</span>
              <span style={{ color: l.amount > 0 ? '#4caf50' : '#f44336', fontWeight: 700, minWidth: 55 }}>
                {l.amount > 0 ? '+' : ''}{l.amount}
              </span>
              <span style={{ color: '#555e78', fontSize: 11 }}>
                ({l.before}→{l.after})
              </span>
              <span style={{ color: '#8890a8', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MonsterView({ monster, running }) {
  if (!monster) return (
    <div className="monster-card"><div className="monster-name" style={{ color: '#555e78' }}>— 等待出战 —</div></div>
  );
  const pp = monster.hp / monster.maxHp;
  const hpClass = pp > 0.6 ? 'green' : pp > 0.3 ? 'yellow' : 'red';
  return (
    <div className={`monster-card ${monster.isBoss ? 'boss' : ''} ${monster.isElite ? 'elite' : ''}`}>
      {monster.isBoss && <div className="boss-warning" style={{ display: 'block' }}>⚠ BOSS 战！⚠</div>}
      <div className="monster-header">
        <div className="monster-name" style={{ color: monster.isBoss ? '#f44336' : monster.color }}>
          {monster.name}
        </div>
        <div className="monster-lv">Lv.{monster.level}</div>
      </div>
      <div className="monster-attrs">
        <span>⚔ ATK {monster.atk}</span>
        <span>🛡 DEF {monster.def}</span>
        <span>💰 {monster.gold}</span>
        <span>✨ {monster.exp}</span>
      </div>
      <div className="hp-label"><span>❤️ 生命值</span><span>{Math.ceil(monster.hp)} / {monster.maxHp}</span></div>
      <div className="hp-wrap"><div className={`hp-bar ${hpClass}`} style={{ width: `${pp * 100}%` }} /></div>
      {monster.isTower && <div style={{ fontSize: 11, color: '#ff9800', marginTop: 6 }}>🏛️ 无尽之塔 第 {monster.towerFloor} 层</div>}
      {monster.isElite && <div style={{ fontSize: 11, color: '#ff9800', marginTop: 6 }}>⭐ 精英怪物 — 额外掉落强化石</div>}
    </div>
  );
}

function PlayerStats({ player }) {
  if (!player) return null;
  const pp = player.hp / player.maxHp;
  const hpClass = pp > 0.6 ? 'green' : pp > 0.3 ? 'yellow' : 'red';
  const expPct = player.maxHp > 0 ? Math.round((player.exp / player.expNeeded) * 100) : 0;
  return (
    <>
      <div className="panel">
        <div className="panel-title">👤 角色信息</div>
        <div className="hp-section">
          <div className="hp-label"><span>玩家生命值 (HP)</span><span>{player.hp} / {player.maxHp}</span></div>
          <div className="hp-wrap"><div className={`hp-bar ${hpClass}`} style={{ width: `${pp * 100}%` }} /></div>
        </div>
        <div className="player-grid">
          <div className="stat-box">
            <div className="stat-label">等级</div>
            <div className="stat-val">{player.level}</div>
            <div className="stat-sub">{player.exp} / {player.expNeeded} EXP</div>
            <div className="xp-wrap"><div className="xp-bar" style={{ width: `${expPct}%` }} /></div>
          </div>
          <div className="stat-box">
            <div className="stat-label">金币</div>
            <div className="stat-val gold">{Math.floor(player.gold)}</div>
            <div className="stat-sub">Gold</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">强化石</div>
            <div className="stat-val cyan">{player.stones}</div>
            <div className="stat-sub">Stones</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">洗练石</div>
            <div className="stat-val purple">{player.reforgeStones}</div>
            <div className="stat-sub">Reforge</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">战力</div>
            <div className="stat-val power">{player.power}</div>
            <div className="stat-sub">Power</div>
          </div>
        </div>
        {player.collection && (
          <div style={{ marginTop: 4, fontSize: 11, color: '#4caf50' }}>
            📖 图鉴收集：{Object.keys(player.collection).length}/60
          </div>
        )}
      </div>

      {/* Stats panel */}
      <div className="panel">
        <div className="panel-title">总属性</div>
        <div className="combat-stats">
          <div className="stat-box"><div className="stat-label">总攻击</div><div className="stat-val red">{player.totalAtk}</div></div>
          <div className="stat-box"><div className="stat-label">总防御</div><div className="stat-val blue">{player.totalDef}</div></div>
          <div className="stat-box"><div className="stat-label">暴击率</div><div className="stat-val yellow">{player.critRate}%</div></div>
          <div className="stat-box"><div className="stat-label">吸血率</div><div className="stat-val pink">{player.lifesteal}%</div></div>
          <div className="stat-box"><div className="stat-label">闪避率</div><div className="stat-val cyan">{player.dodge}%</div></div>
          <div className="stat-box"><div className="stat-label">反伤率</div><div className="stat-val green">{player.thorns}%</div></div>
          <div className="stat-box"><div className="stat-label">金币加成</div><div className="stat-val gold">{player.goldBonus}%</div></div>
          <div className="stat-box"><div className="stat-label">经验加成</div><div className="stat-val exp">{player.expBonus}%</div></div>
        </div>
        {player.collection && (
          <div style={{ marginTop: 4, fontSize: 11, color: '#4caf50' }}>
            📖 图鉴收集：{Object.keys(player.collection).length}/60
          </div>
        )}
      </div>
    </>
  );
}

function EquipSlot({ type, slot, enhanceLevel, onEnhance, onReforge, onToggleLock, state }) {
  const eq = slot;
  const lv = enhanceLevel || 0;
  const hasItem = !!eq;
  useEffect(() => {
    window.__toggleLock = onToggleLock;
    return () => { if (window.__toggleLock === onToggleLock) window.__toggleLock = null; };
  }, [onToggleLock]);

  return (
    <div className={`equip-slot ${hasItem ? 'has-item' : ''}`} id={`slot-${type}`}>
      <div className="equip-info">
        <div className="equip-type">{type === 'weapon' ? '⚔ 武器' : type === 'armor' ? '🛡 护甲' : type === 'helmet' ? '⛑ 头盔' : type === 'boots' ? '👟 鞋子' : type === 'ring' ? '💍 戒指' : '📿 项链'}</div>
        <div className="equip-name" style={{ color: eq?.color || '#555e78' }}>
          {eq ? <><span className="enh-lv" style={{fontWeight:400,marginRight:2}}>Lv.{eq.itemLv} </span>{eq.name}<span className="enh-lv"> +{lv}</span></> : '空'}
        </div>
        <div className="equip-stats">
          {eq ? `ATK+${eq.effAtk} DEF+${eq.effDef}` : '—'}
        </div>
        {eq?.affixes?.length > 0 && (
          <div className="equip-affix" dangerouslySetInnerHTML={{
            __html: eq.affixes.map((a, i) =>
              `<span style="display:inline-flex;align-items:center;gap:2px;">
                <span class="lock-toggle" onclick="window.__toggleLock('${type}',${i})">${a.locked ? '🔒' : '🔓'}</span>
                ${a.desc}
              </span>`
            ).join('<br>')
          }} />
        )}
      </div>
      {hasItem && (
        <div className="equip-action">
          <button className="btn-enhance" onClick={() => onEnhance(type)}>强化</button>
          <div className="enh-req">成功率: {Math.max(10, Math.round((1 - lv * 0.07) * 100))}%</div>
          {eq?.affixes?.length > 0 && (
            <button className="btn-enhance btn-reforge" onClick={() => onReforge(type)}>洗练</button>
          )}
        </div>
      )}
    </div>
  );
}

function EquipmentPanel({ equipment, state, onEnhance, onReforge, onToggleLock }) {
  const slots = equipment?.slots || {};
  const levels = equipment?.enhanceLevels || {};
  return (
    <div className="equip-grid">
      {['weapon', 'armor', 'helmet', 'boots', 'ring', 'amulet'].map(type => (
        <EquipSlot
          key={type} type={type} slot={slots[type]} enhanceLevel={levels[type]}
          onEnhance={onEnhance} onReforge={onReforge} onToggleLock={onToggleLock}
        />
      ))}
    </div>
  );
}

function InventoryPanel({ items, bagSize, onEquip, onSell, onSellAll, onSellRarity, onSort }) {
  if (!items) items = [];
  return (
    <div className="panel">
      <div className="panel-title">
        <span>🎒 背包 ({items.length}/{bagSize || 30})</span>
        <div>
          <button className="btn-small-action" onClick={onSort}>整理</button>
          <button className="btn-small-action" onClick={() => onSellRarity(0)}>出售白</button>
          <button className="btn-small-action" onClick={() => onSellRarity(1)}>出售绿-</button>
          <button className="btn-small-action" onClick={() => onSellRarity(2)}>出售蓝-</button>
          <button className="btn-sell-all" onClick={onSellAll}>一键全卖</button>
        </div>
      </div>
      <div className="bag-box">
        {items.length === 0 ? (
          <div style={{ color: '#555e78', fontSize: 12, textAlign: 'center', padding: 20 }}>背包空空如也...</div>
        ) : items.map(item => {
          const ss = [];
          if (item.atk > 0) ss.push(`ATK+${item.atk}`);
          if (item.def > 0) ss.push(`DEF+${item.def}`);
          const slotIcon = { weapon: '⚔', armor: '🛡', helmet: '⛑', boots: '👟', ring: '💍', amulet: '📿' }[item.type] || '';
          return (
            <div key={item.id} className="bag-item">
              <div className="bag-item-info">
                <div className="bag-item-title" style={{ color: item.color }}>
                  <span className="bag-item-lv">Lv.{item.itemLv}</span><span style={{marginRight:4}}>{slotIcon}</span>{item.name}
                </div>
                <div className="bag-item-stats">{ss.join(' ')}</div>
                {item.affixes?.length > 0 && (
                  <div className="bag-item-affix" dangerouslySetInnerHTML={{
                    __html: item.affixes.map(a => a.desc).join('<br>')
                  }} />
                )}
              </div>
              <div className="bag-actions">
                <button className="btn-bag" onClick={() => onEquip(item.id)}>装备</button>
                <button className="btn-bag" onClick={() => onSell(item.id)}>出售</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SkillPanel({ skills, state, onToggle, onCast, onSetRune }) {
  const skillDefs = [
    { id: 'heavyHit', name: '🔥 破甲重击', desc: '造成 300% 伤害，无视怪物一半防御', cdMax: 10 },
    { id: 'heal', name: '✨ 圣光治愈', desc: '立即恢复 25% 最大生命值', cdMax: 16 },
    { id: 'vampire', name: '🦇 鲜血汲取', desc: '造成 150% 伤害，全额转化为生命', cdMax: 14 }
  ];

  const runeMap = {
    heavyHit: [
      { id: 'hh_damage', name: '粉碎', desc: '伤害→400%' },
      { id: 'hh_cd', name: '迅击', desc: 'CD-3s' },
      { id: 'hh_stun', name: '震荡', desc: '10%秒杀普通怪' }
    ],
    heal: [
      { id: 'hl_power', name: '强愈', desc: '恢复→40%' },
      { id: 'hl_cd', name: '迅愈', desc: 'CD-4s' },
      { id: 'hl_shield', name: '护盾', desc: '溢出→护盾' }
    ],
    vampire: [
      { id: 'vp_damage', name: '血沸', desc: '伤害→220%' },
      { id: 'vp_heal', name: '血蛭', desc: '吸血×2' },
      { id: 'vp_chain', name: '血链', desc: '双目标' }
    ]
  };

  return (
    <div className="panel">
      <div className="panel-title">🔥 主动技能 ({state?.running ? '战斗中' : '已暂停'})</div>
      <div className="skill-grid">
        {skillDefs.map(sk => {
          const s = skills?.[sk.id];
          const cd = s?.cd || 0;
          const pct = sk.cdMax > 0 ? (cd / sk.cdMax) * 100 : 0;
          const runes = runeMap[sk.id] || [];
          const activeRune = s?.rune;
          return (
            <div key={sk.id} className="skill-item">
              <div className="skill-info">
                <div className="skill-name">{sk.name}</div>
                <div className="skill-desc">{sk.desc}</div>
                <div className="rune-row">
                  {runes.map(r => (
                    <span key={r.id}
                      className={`rune-chip ${activeRune === r.id ? 'active' : ''}`}
                      onClick={() => onSetRune(sk.id, r.id)}
                      title={r.desc}>{r.name}</span>
                  ))}
                </div>
              </div>
              <div className="skill-actions">
                <label className="setting-label" style={{ fontSize: 11 }}>
                  <input type="checkbox" checked={s?.auto !== false} onChange={() => onToggle(sk.id)} /> 自动
                </label>
                <button className="btn-skill" disabled={cd > 0} onClick={() => onCast(sk.id)}>
                  {cd > 0 ? `${cd}s` : '释放'}
                </button>
              </div>
              <div className="skill-cd-bar" style={{ width: `${pct}%` }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UpgradePanel({ player, onUpgrade, onUpgradeBulk, onUpgradeMax }) {
  if (!player) return null;
  const getCost = (t) => Math.floor(80 * Math.pow(1.15, player.upgrades[t]));
  return (
    <div className="panel">
      <div className="panel-title">属性修炼 <span className="upg-multiplier">增幅: {Math.floor((1 + player.level / 10) * 100)}%</span></div>
      {['hp', 'atk', 'def'].map(stat => {
        const label = stat === 'hp' ? '❤️ 锻炼体魄' : stat === 'atk' ? '⚔ 打磨武器' : '🛡 加固防具';
        const cost = getCost(stat);
        return (
          <div key={stat} className="compact-row">
            <span>{label} (Lv.{player.upgrades[stat]})</span>
            <span className="gold">{cost} 💰</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn-upgrade" disabled={player.gold < cost} onClick={() => onUpgrade(stat)}>提升</button>
              <button className="btn-upgrade" disabled={player.gold < cost * 10} onClick={() => onUpgradeBulk(stat, 10)}>+10</button>
              <button className="btn-upgrade" disabled={player.gold < cost} onClick={() => onUpgradeMax(stat)}>MAX</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RebirthPanel({ player, onRebirth }) {
  if (!player) return null;
  const target = 50 + (player.rebirthCount || 0) * 25;
  const unlocked = player.level >= target;
  const stag = unlocked ? Math.min(25, Math.max(0, player.level - target)) : 0;
  return (
    <div className="rebirth-panel">
      <div className="rb-title">🌀 转生系统</div>
      <div className="rb-desc">
        {player.rebirthCount > 0
          ? `已转生 ${player.rebirthCount} 次，当前需要 Lv.${target} 进行第 ${player.rebirthCount + 1} 次转生`
          : unlocked ? '✅ 已解锁！达到 Lv.50 可转生' : `未解锁 — 达到 Lv.${target} 解锁转生`}
      </div>
      {player.rebirthCount > 0 && (
        <>
          <div className="rb-desc">当前永久加成：</div>
          <div className="rb-bonus-grid">
            {[
              { label: '⚔ 攻击力', id: 'atk', val: player.rebirthCount * 25 },
              { label: '🛡 防御力', id: 'def', val: player.rebirthCount * 25 },
              { label: '❤️ 生命值', id: 'hp', val: player.rebirthCount * 25 },
              { label: '✨ 经验', id: 'exp', val: player.rebirthCount * 15 },
              { label: '💰 金币', id: 'gold', val: player.rebirthCount * 15 },
              { label: '🎁 掉率', id: 'drop', val: player.rebirthCount * 10 }
            ].map(b => (
              <div key={b.id} className="rb-bonus-item">
                {b.label}<div className="rb-val">+{b.val}%</div>
              </div>
            ))}
          </div>
        </>
      )}
      {stag > 0 && (
        <div className="stag-warning">
          <div style={{ color: '#e04040', fontWeight: 700, marginBottom: 4 }}>⚠ 尘世羁绊 {stag} 层</div>
          <div>EXP -{stag * 2}% | 金币 -{stag * 2}% | 全属性 -{stag}%</div>
        </div>
      )}
      {unlocked && (
        <div style={{ fontSize: 11, color: '#4caf50', marginBottom: 8, lineHeight: 1.8 }}>
          ✅ 保留：金币和强化石的 50%<br />
          ❌ 重置：等级、装备、背包、修炼
        </div>
      )}
      <button className="btn-rebirth" disabled={!unlocked} onClick={onRebirth}>
        转生 (需要 Lv.{target}+)
      </button>
    </div>
  );
}

function ShopPanel({ player, freeDraw, onBuyStone, onBuyReforge, onBuyEquip, onClaimFreeDraw }) {
  const [cd, setCd] = useState(0);
  useEffect(() => {
    setCd(freeDraw?.ready ? 0 : Math.ceil((freeDraw?.remaining || 0) / 1000));
  }, [freeDraw?.ready, freeDraw?.remaining]);
  useEffect(() => {
    if (cd <= 0) return;
    const timer = setTimeout(() => setCd(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cd]);
  if (!player) return null;
  return (
    <div className="panel">
      <div className="panel-title">🏪 黑市商城</div>
      <div className="shop-row" style={{ borderBottom: '1px solid #ff980033', paddingBottom: 10, marginBottom: 10 }}>
        <span style={{ color: '#ff9800', fontWeight: 700 }}>🎁 免费抽装</span>
        <span style={{ color: '#8890a8', fontSize: 11 }}>每5分钟免费抽取一件优秀装备</span>
        <button className="btn-upgrade"
          disabled={!freeDraw?.ready}
          onClick={onClaimFreeDraw}>
          {freeDraw?.ready ? '🎲 免费抽取' : `⏳ ${cd}s`}
        </button>
      </div>
      <div className="shop-row">
        <span>💎 强化石</span>
        <span className="gold">1000 💰/个</span>
        <div className="btn-group">
          <button className="btn-upgrade" disabled={player.gold < 1000} onClick={() => onBuyStone(1)}>x1</button>
          <button className="btn-upgrade" disabled={player.gold < 10000} onClick={() => onBuyStone(10)}>x10</button>
          <button className="btn-upgrade" disabled={player.gold < 100000} onClick={() => onBuyStone(100)}>x100</button>
        </div>
      </div>
      <div className="shop-row">
        <span style={{ color: '#9c27b0' }}>🔨 洗练石</span>
        <span className="gold">500 💰/个</span>
        <div className="btn-group">
          <button className="btn-upgrade" disabled={player.gold < 500} onClick={() => onBuyReforge(1)}>x1</button>
          <button className="btn-upgrade" disabled={player.gold < 5000} onClick={() => onBuyReforge(10)}>x10</button>
          <button className="btn-upgrade" disabled={player.gold < 50000} onClick={() => onBuyReforge(100)}>x100</button>
        </div>
      </div>
      <div className="shop-divider" />
      <div style={{ fontSize: 11, color: '#555e78', marginBottom: 8 }}>精良(蓝)装备抽取 (240💰):</div>
      <div className="shop-equip-grid">
        {['weapon', 'armor', 'helmet', 'boots', 'ring', 'amulet'].map(type => (
          <div key={type} className="shop-equip-row">
            <span className="quality-blue">{type === 'weapon' ? '武器' : type === 'armor' ? '护甲' : type === 'helmet' ? '头盔' : type === 'boots' ? '鞋子' : type === 'ring' ? '戒指' : '项链'}</span>
            <button className="btn-upgrade" disabled={player.gold < 240} onClick={() => onBuyEquip(type)}>抽</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SetBonusDisplay({ bonuses, setBonusInfo }) {
  const hasActive = bonuses && bonuses.length > 0;
  const info = setBonusInfo || { count: 0 };
  return (
    <div className="set-bonus-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span>🎯 套装</span>
        <span style={{ color: '#8890a8', fontSize: 11 }}>
          同区域装备 {info.count}/6 件
          {info.tier != null && info.tier >= 0 ? ` (区域 ${info.tier + 1})` : ''}
        </span>
        {[2, 4, 6].map(n => (
          <span key={n} className={`set-badge ${info.count >= n ? 'active' : 'inactive'}`}>
            {n}件: {n === 2 ? '防御+15%' : n === 4 ? '攻击+20%' : '全属性+10%'}
          </span>
        ))}
      </div>
      {hasActive && (
        <div style={{ marginTop: 4, color: '#4caf50', fontSize: 11 }}>
          已激活：{bonuses.map(b => b.desc).join('、')}
        </div>
      )}
      {!hasActive && info.count >= 1 && (
        <div style={{ marginTop: 4, color: '#ff9800', fontSize: 11 }}>
          再收集 {2 - info.count} 件同区域装备可激活防御+15%
        </div>
      )}
    </div>
  );
}

function TowerPanel({ tower, player, onEnter, onLeave }) {
  if (!tower) return null;
  if (tower.inBattle) {
    return (
      <div className="panel" style={{ borderColor: '#ff9800' }}>
        <div className="panel-title" style={{ color: '#ff9800' }}>🏛️ 无尽之塔 — 第 {tower.currentFloor} 层</div>
        <button className="btn-rebirth" style={{ background: '#555e78' }} onClick={onLeave}>退出爬塔</button>
      </div>
    );
  }
  const canEnter = player?.level >= 10;
  return (
    <div className="panel" style={{ borderColor: '#ff9800' }}>
      <div className="panel-title" style={{ color: '#ff9800' }}>🏛️ 无尽之塔</div>
      <div style={{ fontSize: 12, color: '#8890a8', marginBottom: 8 }}>
        最高层数：{tower.highestFloor || 0} / 100 层
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[1, 10, 25, 50, 75, 100].map(f => (
          <button key={f} className="btn-upgrade"
            disabled={!canEnter}
            onClick={() => onEnter(f)}>
            {f}层
          </button>
        ))}
      </div>
      {!canEnter && <div style={{ fontSize: 10, color: '#e04040', marginTop: 4 }}>需要 Lv.10+</div>}
    </div>
  );
}

function ExplorationPanel({ exploration, tiers, player, onExplore }) {
  if (!exploration) return null;
  if (exploration.active) {
    const pct = exploration.progress * 100;
    return (
      <div className="panel" style={{ borderColor: '#2196f3' }}>
        <div className="panel-title" style={{ color: '#2196f3' }}>🗺️ 秘境探索中</div>
        <div style={{ fontSize: 12, color: '#8890a8', marginBottom: 6 }}>
          {exploration.name} — 剩余 {exploration.remaining}秒
        </div>
        <div className="xp-wrap"><div className="xp-bar" style={{ width: `${pct}%`, background: '#2196f3' }} /></div>
      </div>
    );
  }
  return (
    <div className="panel" style={{ borderColor: '#2196f3' }}>
      <div className="panel-title" style={{ color: '#2196f3' }}>🗺️ 秘境探索</div>
      <div className="explore-grid">
        {tiers?.map(tier => (
          <button key={tier.id} className="btn-upgrade explore-btn"
            disabled={player?.level < tier.minLv}
            onClick={() => onExplore(tier.id)}
            title={`${tier.name} (Lv.${tier.minLv}+ · ${tier.duration}秒)`}>
            🌍 {tier.name}<br />
            <span style={{ fontSize: 9, color: '#8890a8' }}>Lv.{tier.minLv}+ · {tier.duration}秒</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DailyPanel({ dailies, player, onClaim }) {
  if (!dailies) return null;
  const day = dailies.day || 1;
  const claimed = dailies.claimed;
  const streak = dailies.streak || 0;
  const rewards = [
    { day: 1, desc: '500💰 + 💎3' },
    { day: 2, desc: '800💰 + 💎5' },
    { day: 3, desc: '1200💰 + 💎8' },
    { day: 4, desc: '2000💰 + 🔨3' },
    { day: 5, desc: '3000💰 + 💎10' },
    { day: 6, desc: '5000💰 + 🔨5' },
    { day: 7, desc: '10000💰 + 💎30 + 🔨10' }
  ];
  return (
    <div className="panel" style={{ borderColor: '#f0c040' }}>
      <div className="panel-title" style={{ color: '#f0c040' }}>
        📅 每日签到
        <span className="badge-pill">连签 {streak} 天</span>
      </div>
      <div className="daily-grid">
        {rewards.map(r => {
          const isToday = r.day === day;
          const isClaimed = r.day < day || (isToday && claimed);
          return (
            <div key={r.day} className={`daily-cell ${isToday ? 'today' : ''} ${isClaimed ? 'claimed' : ''}`}>
              <div className="daily-day">Day {r.day}</div>
              <div className="daily-desc">{r.desc}</div>
              {isToday && !claimed && <div className="daily-claim" onClick={onClaim}>领取</div>}
              {isClaimed && <div className="daily-check">✅</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Chapter 2: New UI Components
// ============================================================

const CLASS_DATA = [
  { id: 'warrior', name: '狂战士', icon: '⚔️', desc: '血量越低攻击越高', passiveDesc: '每损失10%HP攻击+5%', statDesc: 'ATK×1.2', equipRest: '无限制' },
  { id: 'paladin', name: '圣骑士', icon: '🛡️', desc: '防御和反伤增强', passiveDesc: '反伤+10% 治疗+20%', statDesc: 'DEF×1.3', equipRest: '仅限重甲(铁甲+)' },
  { id: 'assassin', name: '刺客', icon: '🗡️', desc: '暴击闪避极高', passiveDesc: '暴击+10% 连杀上限+100%', statDesc: 'CRI+10%', equipRest: '仅限轻甲(皮甲-)' }
];

const PASSIVE_DEFS = [
  { id: 'toughness', name: '🛡️ 坚韧', desc: '防御+20%', baseEffect: 0.20, type: 'def', maxLv: 5 },
  { id: 'rage', name: '🔥 怒意', desc: '攻击+15%', baseEffect: 0.15, type: 'atk', maxLv: 5 },
  { id: 'vampiric', name: '🦇 嗜血', desc: '吸血+5%', baseEffect: 0.05, type: 'lifesteal', maxLv: 5 },
  { id: 'fortitude', name: '💪 铁骨', desc: '生命+25%', baseEffect: 0.25, type: 'hp', maxLv: 5 },
  { id: 'shield', name: '🔰 护盾', desc: '开场30%HP护盾', baseEffect: 0.30, type: 'shield', maxLv: 3 },
  { id: 'scavenger', name: '💰 拾荒者', desc: '金币获取+30%', baseEffect: 0.30, type: 'gold', maxLv: 5 },
  { id: 'predator', name: '🎯 猎手', desc: '对Boss伤害+40%', baseEffect: 0.40, type: 'boss_dmg', maxLv: 5 }
];

function ClassPanel({ player }) {
  if (!player || !player.classId) return null;
  const cls = CLASS_DATA.find(c => c.id === player.classId);
  if (!cls) return null;
  return (
    <div className="panel">
      <div className="panel-title">⚔️ 职业</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28 }}>{cls.icon}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{cls.name}</div>
          <div style={{ fontSize: 11, color: '#8890a8' }}>{cls.desc}</div>
          <div style={{ fontSize: 11, color: '#ff9800' }}>{cls.passiveDesc}</div>
          <div style={{ fontSize: 11, color: '#4fc3f7' }}>装备限制: {cls.equipRest}</div>
        </div>
      </div>
    </div>
  );
}

function ClassSelectPanel({ player, onSelect }) {
  if (!player || player.classId) return null;
  return (
    <div className="panel class-select-banner">
      <div className="panel-title" style={{ color: '#f0c040', fontSize: 13 }}>⚔️ 选择你的职业</div>
      <div className="class-select-grid">
        {CLASS_DATA.map(c => (
          <div key={c.id} className="class-card" onClick={() => onSelect(c.id)}>
            <div className="class-card-icon">{c.icon}</div>
            <div className="class-card-name">{c.name}</div>
            <div className="class-card-desc">{c.desc}</div>
            <div className="class-card-stats">{c.statDesc}</div>
            <div className="class-card-passive">{c.passiveDesc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PassivePanel({ player, onUpgrade, onEquip }) {
  const p = player?.passives || { slots: [null, null], unlockSlots: 1, levels: {} };
  return (
    <div className="panel">
      <div className="panel-title">💫 被动技能</div>
      <div className="passive-slots">
        {[0, 1].map(si => {
          const ok = si < p.unlockSlots;
          const eq = p.slots[si];
          const sk = eq ? PASSIVE_DEFS.find(s => s.id === eq) : null;
          return (
            <div key={si} className={`passive-slot ${ok ? (sk ? 'filled' : 'empty') : 'locked'}`} title={!ok ? '需要 等级≥30 或 转生≥1 解锁' : ''}>
              {ok ? (sk ? <span>{sk.name} <a className="passive-unequip" onClick={() => onEquip(si, null)}>✕</a></span> : <span className="passive-empty">空</span>) : <span>🔒 槽{si+1}</span>}
            </div>
          );
        })}
      </div>
      <div className="passive-grid">
        {PASSIVE_DEFS.map(sk => {
          const lv = p.levels[sk.id] || 1;
          const eq = p.slots.includes(sk.id);
          const mx = lv >= sk.maxLv;
          const cost = 2000 * lv;
          const eff = Math.round((sk.baseEffect || 0) * lv * 100);
          const dynDesc = sk.type === 'shield' ? `开场${eff}%HP护盾`
            : sk.type === 'boss_dmg' ? `对Boss伤害+${eff}%`
            : sk.type === 'lifesteal' ? `吸血+${eff}%`
            : sk.type === 'gold' ? `金币获取+${eff}%`
            : `${['def','atk','hp'].includes(sk.type||'') ? (sk.type==='def'?'防御':sk.type==='atk'?'攻击':'生命') : ''}+${eff}%`;
          const emptySlot = () => { for (let i = 0; i < p.slots.length; i++) { if (!p.slots[i]) return i; } return -1; };
          return (
            <div key={sk.id} className={`passive-item ${eq ? 'equipped' : ''}`}>
              <div><span className="passive-name">{sk.name}</span> <span className="passive-level">Lv.{lv}</span></div>
              <div className="passive-desc">{dynDesc}</div>
              <div className="passive-actions">
                {eq ? (
                  <button className="btn-small-action" onClick={() => onEquip(p.slots.indexOf(sk.id), null)}>卸下</button>
                ) : (
                  <button className="btn-small-action" disabled={emptySlot() < 0} onClick={() => onEquip(emptySlot(), sk.id)}>装备</button>
                )}
                <button className="btn-upgrade" disabled={mx || !player || player.gold < cost} onClick={() => onUpgrade(sk.id)}>
                  {mx ? 'MAX' : `${cost}💰`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuestPanel({ quests }) {
  if (!quests || !quests.list || quests.list.length === 0) return null;
  const QD = {
    kill_50: { name:'清道夫', desc:'击杀50只', target:50, reward:'3000💰+💎5' },
    kill_200: { name:'屠戮者', desc:'击杀200只', target:200, reward:'10000💰+💎15' },
    collect_green: { name:'拾荒者', desc:'优秀+装备5件', target:5, reward:'2000💰+🔨3' },
    collect_blue: { name:'收藏家', desc:'精良+装备3件', target:3, reward:'5000💰+💎8' },
    enhance_3: { name:'锻造学徒', desc:'强化3次', target:3, reward:'3000💰+💎5' },
    enhance_10: { name:'锻造大师', desc:'强化10次', target:10, reward:'10000💰+🔨8' },
    boss_3: { name:'猎龙者', desc:'击败3个Boss', target:3, reward:'15000💰+💎20' },
    boss_10: { name:'弑神者', desc:'击败10个Boss', target:10, reward:'50000💰+💎50' }
  };
  const c = quests.completed || {};
  const p = quests.progress || {};
  return (
    <div className="panel" style={{ borderColor:'#f0c040' }}>
      <div className="panel-title" style={{ color:'#f0c040' }}>📋 每日悬赏</div>
      {quests.list.map(qid => {
        const d = QD[qid];
        if (!d) return null;
        const cur = p[qid] || 0;
        const pct = Math.min(100, Math.round(cur/d.target*100));
        const done = !!c[qid];
        return (
          <div key={qid} className="quest-item">
            <div className="quest-info">
              <span className={`quest-name ${done?'done':''}`}>{done?'✅':'📋'} {d.name}</span>
              <span className="quest-desc">{d.desc}</span>
              <span className="quest-reward">{d.reward}</span>
            </div>
            <div className="quest-progress">
              <div className="xp-wrap"><div className="xp-bar" style={{ width:`${pct}%`, background:done?'#4caf50':'#f0c040' }}/></div>
              <span className="quest-count">{cur}/{d.target}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Main App
// ============================================================
export default function App() {
  const [state, setState] = useState(null);
  const [tab, setTab] = useState('stats');
  const [showShop, setShowShop] = useState(false);
  const [logs, setLogs] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [connected, setConnected] = useState(false);
  const [connError, setConnError] = useState(false);
  const [token, setTokenState] = useState(() => getToken());
  const [username, setUsernameState] = useState(() => localStorage.getItem('ic_username'));
  const timerRef = useRef(null);

  // Auth handlers
  const handleAuth = useCallback((newToken, user) => {
    setToken(newToken);
    setTokenState(newToken);
    setUsernameState(user);
    localStorage.setItem('ic_username', user || '');
  }, []);

  const handleLogout = useCallback(() => {
    setToken(null);
    setTokenState(null);
    setUsernameState(null);
    localStorage.removeItem('ic_username');
  }, []);

  // Register 401 handler — clears session when token expires
  useEffect(() => {
    onUnauthorized(() => {
      setTokenState(null);
      setUsernameState(null);
      localStorage.removeItem('ic_username');
    });
    return () => onUnauthorized(null);
  }, []);

  // Polling — only runs when logged in
  useEffect(() => {
    if (!token) return;
    let failCount = 0;
    const load = async () => {
      const data = await fetchState();
      if (data) {
        setState(data);
        setLogs(data.logs || []);
        setConnected(true);
        setConnError(false);
        failCount = 0;
        if (data.toasts?.length) {
          setToasts(data.toasts);
          setTimeout(() => setToasts([]), 3000);
        }
      } else {
        failCount++;
        if (failCount >= 3) setConnError(true);
      }
    };
    load();
    timerRef.current = setInterval(load, 1200);
    return () => clearInterval(timerRef.current);
  }, [token]);

  // Action helpers
  const act = useCallback(async (fn) => {
    const data = await fn();
    if (data) {
      setState(data);
      setLogs(data.logs || []);
      if (data.toasts?.length) {
        setToasts(data.toasts);
        setTimeout(() => setToasts([]), 3000);
      }
    }
  }, []);

  const player = state?.player;
  const monster = state?.monster;
  const equipment = state?.equipment;
  const inventory = state?.inventory;
  const skills = state?.skills;
  const setBonuses = state?.setBonuses;
  const setBonusInfo = state?.setBonusInfo;
  const tower = state?.tower;
  const exploration = state?.exploration;
  const tiers = state?.explorationTiers;
  const dailies = state?.dailies;
  const events = state?.events;
  const goldLogs = state?.goldLogs;
  const freeDraw = state?.freeDraw;

  // Auth gate
  if (!token) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  // Connection error screen
  if (!connected && connError) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#0d0f14', color:'#e8eaf0', padding:40, textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:20 }}>⚠️</div>
        <h2 style={{ marginBottom:12 }}>无法连接到游戏服务器</h2>
        <p style={{ color:'#8890a8', maxWidth:400, lineHeight:1.8, marginBottom:20 }}>
          请确保后端已启动（端口 3001）。
          <br/>双击 start.bat 启动服务。
        </p>
        <button onClick={() => { setConnError(false); fetchState().then(d => { if(d) setState(d); }); }}
          style={{ padding:'8px 24px', background:'#4a90d9', border:'none', borderRadius:8, color:'#fff', fontSize:14, cursor:'pointer' }}>
          重试连接
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      <Toast toasts={toasts} />
      <header className="header">
        <div>
          <h1>⚔ Idle Chronicles</h1>
          <div className="subtitle">自动挂机 · 无尽冒险</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {username && (
            <span style={{ color: '#6b7290', fontSize: 12, marginRight: 4 }}>
              👤 {username}
            </span>
          )}
          <button className="btn-small-action" onClick={handleLogout}
            title="退出登录" style={{ fontSize: 11 }}>
            退出
          </button>
          {dailies && !dailies.claimed && (
            <button className="btn-daily-mini" onClick={() => act(claimDaily)}>📅</button>
          )}
          <button className={`btn-toggle ${state?.running ? 'running' : ''}`} onClick={() => act(toggle)}>
            {state?.running ? '⏸ 停止挂机' : '▶ 开始挂机'}
          </button>
        </div>
      </header>

      {/* Battle status bar */}
      <div className="battle-bar">
        <div className={`battle-dot ${state?.running ? 'active' : ''}`} />
        <span>{state?.running ? '战斗中...' : '已暂停'}</span>
        {player?.killStreak >= 5 && (
          <span className={`streak-badge ${player.killStreak >= 100 ? 'inferno' : player.killStreak >= 25 ? 'fire' : ''}`}>
            ⚡ {player.killStreak}连杀 (+{player.streakBonus}%)
          </span>
        )}
        {player?.eliteTimer != null && !monster?.isElite && (() => {
          const remain = Math.max(0, Math.floor((1800 - (player.eliteTimer || 0)) * 0.5));
          if (remain > 300) return null;
          return <span style={{ color: '#ff9800', fontSize: 11 }}>⭐ 精英 {remain > 60 ? `${Math.floor(remain/60)}分${remain%60}秒` : `${remain}秒`}</span>;
        })()}
        <span style={{ marginLeft: 'auto', color: '#555e78', fontSize: 11 }}>
          {player?.killsSinceBoss != null
            ? (30 - player.killsSinceBoss <= 0 ? '⚠ Boss 即将出现!' : `距 Boss 还有 ${30 - player.killsSinceBoss} 只`)
            : ''}
        </span>
      </div>

      <main className="main">
        {tab === 'battle' && (
          <>
            {/* Event banner */}
            {events && (
              <div className="event-banner" style={{ display: 'flex' }}>
                ✨ {events.name} — {events.desc}
                <span className="event-timer">剩余 {events.rem} 回合</span>
              </div>
            )}

            <ClassSelectPanel player={player} onSelect={id => act(() => selectClass(id))} />
            <MonsterView monster={monster} running={state?.running} />
            <SkillPanel skills={skills} state={state} onToggle={id => act(() => toggleSkill(id))}
              onCast={id => act(() => castSkill(id))}
              onSetRune={(sid, rid) => act(() => setRune(sid, rid))} />
            <LogPanel logs={logs} onClear={() => act(clearLogs)} />
            <GoldLogPanel logs={goldLogs} />
          </>
        )}

        {tab === 'equip' && (
          <>
            <div className="panel">
              <div className="panel-title">
                身上装备
                <button className="btn-small-action" onClick={() => setShowShop(!showShop)}>
                  {showShop ? '收起' : '🏪 黑市'}
                </button>
              </div>
              <EquipmentPanel equipment={equipment} state={state}
                onEnhance={type => act(() => enhance(type))}
                onReforge={type => act(() => reforge(type))}
                onToggleLock={(type, idx) => act(() => toggleLock(type, idx))} />
              <SetBonusDisplay bonuses={setBonuses || []} setBonusInfo={setBonusInfo} />
            </div>

            {showShop && <ShopPanel player={player} freeDraw={freeDraw}
              onBuyStone={n => act(() => buyStone(n))}
              onBuyReforge={n => act(() => buyReforge(n))}
              onBuyEquip={type => act(() => buyEquip(type))}
              onClaimFreeDraw={() => act(() => claimFreeDraw())} />}

            <InventoryPanel items={inventory} bagSize={player?.bagSize}
              onEquip={id => act(() => equipItem(id))}
              onSell={id => act(() => sellItem(id))}
              onSellAll={() => act(sellAll)}
              onSellRarity={v => act(() => sellRarity(v))}
              onSort={() => act(sortInventory)} />
            {player && player.bagSize < 100 && (
              <div className="panel">
                <div className="compact-row">
                  <span>🎒 背包扩容 ({player.bagSize}/100)</span>
                  <span className="gold">{5000 + (player.bagSize - 30) * 2000} 💰</span>
                  <button className="btn-upgrade" disabled={player.gold < 5000 + (player.bagSize - 30) * 2000}
                    onClick={() => act(expandBag)}>+10格</button>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'stats' && (
          <>
            <PlayerStats player={player} />
            <ClassPanel player={player} />
            <UpgradePanel player={player}
              onUpgrade={s => act(() => upgrade(s))}
              onUpgradeBulk={(s, n) => act(() => upgradeBulk(s, n))}
              onUpgradeMax={s => act(() => upgradeMax(s))} />
            <PassivePanel player={player}
              onUpgrade={id => act(() => upgradePassive(id))}
              onEquip={(slot, id) => act(() => equipPassive(slot, id))} />
          </>
        )}

        {tab === 'systems' && (
          <>
            <DailyPanel dailies={dailies} player={player} onClaim={() => act(claimDaily)} />
            <ExplorationPanel exploration={exploration} tiers={tiers} player={player}
              onExplore={id => act(() => startExplore(id))} />
            <TowerPanel tower={tower} player={player}
              onEnter={f => act(() => enterTower(f))}
              onLeave={() => act(leaveTower)} />
            <RebirthPanel player={player} onRebirth={() => { if (window.confirm('确定要转生吗？')) act(rebirth); }} />
            <QuestPanel quests={player?.quests} />
          </>
        )}
      </main>

      {/* Bottom Tab Bar */}
      <div className="bottom-tabs">
        <button className={`bottom-tab ${tab === 'battle' ? 'active' : ''}`} onClick={() => setTab('battle')}>
          ⚔️ 战斗
        </button>
        <button className={`bottom-tab ${tab === 'equip' ? 'active' : ''}`} onClick={() => setTab('equip')}>
          🎒 背包
        </button>
        <button className={`bottom-tab ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>
          📊 属性
        </button>
        <button className={`bottom-tab ${tab === 'systems' ? 'active' : ''}`} onClick={() => setTab('systems')}>
          🏗️ 系统
        </button>
      </div>
    </div>
  );
}
