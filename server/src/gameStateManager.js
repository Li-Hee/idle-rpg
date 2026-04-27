// ============================================================
// GameState Manager — per-user game state management
// ============================================================
import { GameState } from './gameEngine.js';
import { save, load } from './storage.js';

class GameStateManager {
  constructor() {
    this.states = new Map();
  }

  getOrCreate(username) {
    if (this.states.has(username)) {
      return this.states.get(username);
    }
    const gs = new GameState();
    const saved = load(`save_${username}`);
    if (saved) {
      gs._deserialize(saved);
    } else {
      gs._newGame();
    }
    gs._calcBaseStats();
    gs._checkOfflineProgress();
    gs.spawnMonster(gs.player.level, false);
    if (gs.player.hp == null) gs.player.hp = gs.player.maxHp;
    gs._checkQuests();
    if (gs.player.rebirthCount >= 3) gs.unlockUltimate();
    gs.addLog('📖 Idle Chronicles 已就绪！');
    this.states.set(username, gs);
    return gs;
  }

  tickAll() {
    for (const gs of this.states.values()) {
      if (gs.running) {
        gs.tick();
      }
    }
  }

  saveAll() {
    for (const [username, gs] of this.states) {
      gs.player.lastSaveTime = Date.now();
      save(`save_${username}`, gs._serialize());
    }
  }

  getActiveCount() {
    return this.states.size;
  }

  getDetailedStats() {
    const users = [];
    for (const [username, gs] of this.states) {
      const p = gs.player;
      users.push({
        username,
        level: p.level,
        power: p.power || 0,
        kills: p.kills || 0,
        gold: Math.floor(p.gold || 0),
        rebirth: p.rebirthCount || 0,
        class: p.classId || '',
        running: gs.running,
        hp: `${Math.floor(p.hp || 0)}/${p.maxHp || 0}`,
        lastSave: p.lastSaveTime || 0
      });
    }
    return users;
  }
}

const manager = new GameStateManager();
export default manager;
