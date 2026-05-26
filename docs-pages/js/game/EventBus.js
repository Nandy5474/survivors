/**
 * EventBus — 全局事件总线系统
 * 提供发布/订阅模式，用于模块间解耦通信
 * @version 0.1.0
 */

/**
 * 游戏事件类型枚举
 * 命名规范：domain:action
 */
export const GameEvents = Object.freeze({
  // --- 游戏生命周期 ---
  GAME_INIT: 'game:init',
  GAME_START: 'game:start',
  GAME_PAUSE: 'game:pause',
  GAME_RESUME: 'game:resume',
  GAME_OVER: 'game:over',
  GAME_QUIT: 'game:quit',

  // --- 场景事件 ---
  SCENE_CHANGE: 'scene:change',
  SCENE_READY: 'scene:ready',
  SCENE_EXIT: 'scene:exit',

  // --- 探索事件 ---
  EXPLORATION_START: 'exploration:start',
  EXPLORATION_COMPLETE: 'exploration:complete',
  ROOM_DISCOVERED: 'room:discovered',
  ROOM_ENTERED: 'room:entered',

  // --- 战斗事件 ---
  COMBAT_START: 'combat:start',
  COMBAT_END: 'combat:end',
  DAMAGE_DEALT: 'combat:damageDealt',
  UNIT_DEFEATED: 'combat:unitDefeated',

  // --- 资源事件 ---
  RESOURCE_CHANGED: 'resource:changed',
  ITEM_ACQUIRED: 'item:acquired',
  ITEM_USED: 'item:used',

  // --- 佣兵事件 ---
  MERCENARY_RECRUITED: 'mercenary:recruited',
  MERCENARY_DEPLOYED: 'mercenary:deployed',
  MERCENARY_LEVELUP: 'mercenary:levelUp',

  // --- 基地事件 ---
  BUILDING_CONSTRUCTED: 'building:constructed',
  BUILDING_UPGRADED: 'building:upgraded',
  ZOMBIE_ATTACK: 'zombie:attack',

  // --- 剧情事件 ---
  STORY_PROGRESS: 'story:progress',
  DIALOGUE_START: 'dialogue:start',
  DIALOGUE_END: 'dialogue:end',
  QUEST_ACCEPTED: 'quest:accepted',
  QUEST_COMPLETED: 'quest:completed',

  // --- 玩家事件 ---
  PLAYER_DAMAGED: 'player:damaged',
  PLAYER_HEALED: 'player:healed',
  PLAYER_LEVELUP: 'player:levelUp',
  PLAYER_DIED: 'player:died',

  // --- UI 事件 ---
  UI_NOTIFICATION: 'ui:notification',
  UI_DIALOG_OPEN: 'ui:dialogOpen',
  UI_DIALOG_CLOSE: 'ui:dialogClose',
});

/**
 * 事件总线类
 */
class EventBusClass {
  constructor() {
    /** @type {Map<string, Array<{callback: Function, context: any, once: boolean}>>} */
    this._listeners = new Map();
    /** @type {Array<{event: string, data: any}>} 调试用：事件历史 */
    this._history = [];
    this._historyEnabled = false;
    this._maxHistory = 100;
  }

  /**
   * 订阅事件
   * @param {string} event - 事件名（推荐使用 GameEvents 枚举）
   * @param {Function} callback - 回调函数 (data) => void
   * @param {object} [context] - 回调上下文（this 绑定）
   * @returns {Function} 取消订阅函数
   */
  on(event, callback, context = null) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    const entry = { callback, context, once: false };
    this._listeners.get(event).push(entry);

    return () => this.off(event, callback, context);
  }

  /**
   * 单次订阅事件（触发后自动取消）
   * @param {string} event
   * @param {Function} callback
   * @param {object} [context]
   * @returns {Function} 取消订阅函数
   */
  once(event, callback, context = null) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    const entry = { callback, context, once: true };
    this._listeners.get(event).push(entry);

    return () => this.off(event, callback, context);
  }

  /**
   * 取消订阅
   * @param {string} event
   * @param {Function} callback
   * @param {object} [context]
   */
  off(event, callback, context = null) {
    const listeners = this._listeners.get(event);
    if (!listeners) return;

    this._listeners.set(
      event,
      listeners.filter(e => !(e.callback === callback && e.context === context))
    );
  }

  /**
   * 发布事件
   * @param {string} event - 事件名
   * @param {*} [data] - 事件数据
   */
  emit(event, data = null) {
    // 记录历史
    if (this._historyEnabled) {
      this._history.push({ event, data, time: Date.now() });
      if (this._history.length > this._maxHistory) {
        this._history.shift();
      }
    }

    const listeners = this._listeners.get(event);
    if (!listeners) return;

    // 先复制再遍历，防止回调中修改数组
    const toRemove = [];
    for (const entry of listeners) {
      try {
        entry.callback.call(entry.context, data);
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${event}":`, err);
      }
      if (entry.once) {
        toRemove.push(entry);
      }
    }

    // 移除 once 订阅
    if (toRemove.length > 0) {
      this._listeners.set(
        event,
        listeners.filter(e => !toRemove.includes(e))
      );
    }
  }

  /**
   * 清除指定事件的所有订阅
   * @param {string} event
   */
  clear(event) {
    this._listeners.delete(event);
  }

  /**
   * 清除所有订阅
   */
  clearAll() {
    this._listeners.clear();
  }

  /**
   * 查询某事件当前的订阅数量
   * @param {string} event
   * @returns {number}
   */
  listenerCount(event) {
    return (this._listeners.get(event) || []).length;
  }

  /**
   * 启用/禁用事件历史记录（调试用）
   * @param {boolean} enabled
   */
  setHistoryEnabled(enabled) {
    this._historyEnabled = enabled;
    if (!enabled) this._history = [];
  }

  /**
   * 获取事件历史
   * @returns {Array<{event: string, data: any, time: number}>}
   */
  getHistory() {
    return [...this._history];
  }
}

// 全局单例
export const EventBus = new EventBusClass();
export default EventBus;