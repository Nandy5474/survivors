/**
 * StateManager — 游戏状态管理器
 * 集中管理全局 GameState，提供不可变数据更新与状态快照
 * @version 0.1.0
 */

import EventBus, { GameEvents } from './EventBus.js';

/**
 * 创建默认 GameState
 * @returns {object}
 */
function createDefaultState() {
  return {
    player: {
      hp: 100,
      maxHp: 100,
      sanity: 80,
      maxSanity: 100,
      inventory: [],
      equipment: {},
      position: { x: 0, y: 0 },
      /** 是否已获得武器（首次获得后丧尸开始出没） */
      hasWeapon: false,
    },

    base: {
      level: 1,
      buildings: [],
      storedResources: {},
      defense: 0,
    },

    survivors: [],

    mercenaries: [],

    exploration: {
      mapSeed: 0,
      rooms: [],
      currentRoom: null,
      revealedRooms: [],
      turnCount: 0,
    },

    globalResources: {
      gold: 0,
      diamond: 0,
      food: 0,
      water: 0,
      ammo: 0,
      materials: { wood: 0, stone: 0, metal: 0 },
      parts: 0,
    },

    story: {
      chapter: 1,
      flags: {},
      completedQuests: [],
    },

    gameTime: {
      day: 1,
      hour: 8,
      minute: 0,
      season: 'autumn',
    },

    meta: {
      isPaused: false,
      currentScene: null,
      playTime: 0,
    },
  };
}

class StateManagerClass {
  constructor() {
    /** @type {object} 当前 GameState */
    this._state = createDefaultState();
    /** @type {Array<object>} 快照栈（用于撤销/回滚，最多保留 20 层） */
    this._snapshots = [];
    this._maxSnapshots = 20;
    /** @type {boolean} 是否自动记录快照 */
    this._autoSnapshot = true;
  }

  /**
   * 获取当前状态（仅只读浅拷贝）
   * @returns {object}
   */
  getState() {
    return this._state;
  }

  /**
   * 获取指定路径的状态值
   * @param {string} path - 点号分隔路径，如 'player.hp'
   * @returns {*}
   */
  get(path) {
    const keys = path.split('.');
    let current = this._state;
    for (const key of keys) {
      if (current == null) return undefined;
      current = current[key];
    }
    return current;
  }

  /**
   * 原子更新状态（浅合并，仅支持一层合并）
   * @param {string} path - 顶层 key，如 'player'
   * @param {object|Function} updater - 更新对象或更新函数 (prev) => newValue
   */
  update(path, updater) {
    if (this._autoSnapshot) {
      this._pushSnapshot();
    }

    const newValue = typeof updater === 'function'
      ? updater(this._state[path] ? { ...this._state[path] } : null)
      : updater;

    this._state[path] = newValue;

    // 发布通用状态变更事件
    EventBus.emit(GameEvents.RESOURCE_CHANGED, { path, value: newValue });
  }

  /**
   * 深度更新状态（沿路径深合并）
   * @param {string} path - 点号分隔路径，如 'player.hp'
   * @param {*} value - 新值
   */
  set(path, value) {
    if (this._autoSnapshot) {
      this._pushSnapshot();
    }

    const keys = path.split('.');
    let target = this._state;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in target)) target[keys[i]] = {};
      target = target[keys[i]];
    }

    target[keys[keys.length - 1]] = value;

    EventBus.emit(GameEvents.RESOURCE_CHANGED, { path, value });
  }

  /**
   * 批量更新（一次快照内完成多个更新）
   * @param {Array<{path: string, value: *}>} updates
   */
  batch(updates) {
    if (this._autoSnapshot) {
      this._pushSnapshot();
    }

    for (const { path, value } of updates) {
      this.set(path, value);
    }
  }

  /**
   * 重置状态
   */
  reset() {
    this._snapshots = [];
    this._state = createDefaultState();
    EventBus.emit(GameEvents.GAME_INIT, { state: this._state });
  }

  /**
   * 从存档加载状态
   * @param {object} savedState
   */
  loadFromSave(savedState) {
    this._snapshots = [];
    this._state = { ...createDefaultState(), ...savedState };
    EventBus.emit(GameEvents.GAME_START, { state: this._state });
  }

  /**
   * 导出存档快照（深拷贝）
   * @returns {object}
   */
  toSaveData() {
    return JSON.parse(JSON.stringify(this._state));
  }

  /**
   * 创建快照
   * @returns {number} 当前快照栈深度
   */
  snapshot() {
    this._pushSnapshot();
    return this._snapshots.length;
  }

  /**
   * 回滚到上一个快照
   * @returns {boolean} 是否回滚成功
   */
  rollback() {
    if (this._snapshots.length === 0) return false;
    this._state = this._snapshots.pop();
    return true;
  }

  /**
   * 清空快照栈
   */
  clearSnapshots() {
    this._snapshots = [];
  }

  /**
   * 设置是否自动记录快照
   * @param {boolean} enabled
   */
  setAutoSnapshot(enabled) {
    this._autoSnapshot = enabled;
  }

  // ---- 私有 ----

  /** @private */
  _pushSnapshot() {
    this._snapshots.push(JSON.parse(JSON.stringify(this._state)));
    if (this._snapshots.length > this._maxSnapshots) {
      this._snapshots.shift();
    }
  }
}

// 全局单例
export const StateManager = new StateManagerClass();
export default StateManager;