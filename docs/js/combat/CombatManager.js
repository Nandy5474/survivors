/**
 * CombatManager — AP 回合制战斗管理器
 * 触发条件：玩家进入丧尸房间，或丧尸追击玩家触发战斗
 * 战斗流程：进入战斗 → 玩家选择行动（攻击/防御/撤退）→ 丧尸行动 → 结算 → 循环
 * @version 0.1.0
 */

import EventBus, { GameEvents } from '../game/EventBus.js';
import { StateManager } from '../game/StateManager.js';

/** 战斗行动类型 */
export const CombatAction = Object.freeze({
  ATTACK: 'attack',     // 攻击：消耗 AP，对丧尸造成伤害
  DEFEND: 'defend',     // 防御：消耗 AP，本回合减伤 50%
  RETREAT: 'retreat',   // 撤退：消耗全部 AP，尝试逃离战斗
  WAIT: 'wait',         // 等待：不消耗 AP，结束本回合
});

/** 丧尸类型配置 */
export const ZombieType = Object.freeze({
  NORMAL: {
    key: 'normal',
    name: '普通丧尸',
    baseHp: 50,
    baseAttack: 8,
    baseSpeed: 60,
    apPerTurn: 2,
    dodgeRate: 0.05,
    critRate: 0.05,
    expReward: 10,
    lootTable: ['food', 'materials_wood'],
  },
  ELITE: {
    key: 'elite',
    name: '精英丧尸',
    baseHp: 120,
    baseAttack: 15,
    baseSpeed: 45,
    apPerTurn: 3,
    dodgeRate: 0.10,
    critRate: 0.15,
    expReward: 30,
    lootTable: ['ammo', 'materials_metal', 'food'],
  },
});

/** 玩家 AP 上限 */
const PLAYER_MAX_AP = 3;

/** 攻击命中率 */
const ATTACK_HIT_RATE = 0.85;

/** 撤退成功率基础值 */
const RETREAT_BASE_RATE = 0.5;

export default class CombatManager {
  /**
   * @param {import('../game/Game.js').default} game
   */
  constructor(game) {
    this.game = game;

    /** @type {boolean} 是否正在战斗中 */
    this.inCombat = false;

    /** @type {string|null} 当前战斗 ID */
    this._combatId = null;

    /** @type {object|null} 当前战斗状态 */
    this._state = null;

    /** @type {import('./Zombie.js').default|null} 当前战斗的丧尸 */
    this._zombie = null;

    /** @type {import('./Player.js').default|null} 玩家引用 */
    this._player = null;

    /** @type {import('../game/MapGenerator.js').Room|null} 战斗发生的房间 */
    this._room = null;
  }

  /**
   * 开始战斗
   * @param {import('./Zombie.js').default} zombie
   * @param {import('./Player.js').default} player
   * @param {import('../game/MapGenerator.js').Room} room
   */
  startCombat(zombie, player, room) {
    if (this.inCombat) return;

    this.inCombat = true;
    this._combatId = `combat_${Date.now()}`;
    this._zombie = zombie;
    this._player = player;
    this._room = room;

    // 初始化战斗状态
    this._state = {
      turn: 1,
      playerAp: PLAYER_MAX_AP,
      playerDefending: false,
      zombieHp: zombie.hp,
      zombieMaxHp: zombie.maxHp,
      zombieAp: this._getZombieAp(zombie),
      log: [],   // 战斗日志
    };

    this._log(`${this._getZombieName(zombie)} 出现了！`);

    EventBus.emit(GameEvents.COMBAT_START, {
      combatId: this._combatId,
      zombie: this._getZombieInfo(zombie),
      playerAp: this._state.playerAp,
      turn: this._state.turn,
    });

    console.log(`[CombatManager] 战斗开始 — ${this._combatId}`);
  }

  /**
   * 玩家选择行动
   * @param {string} action - CombatAction 枚举值
   * @returns {object|null} 战斗结果（如果战斗结束则返回，否则返回 null）
   */
  playerAction(action) {
    if (!this.inCombat || !this._state) return null;

    const state = this._state;
    const zombie = this._zombie;
    const player = this._player;

    switch (action) {
      case CombatAction.ATTACK:
        if (state.playerAp <= 0) {
          this._log('AP 不足，无法攻击！');
          return null;
        }
        state.playerAp--;
        this._doPlayerAttack();
        break;

      case CombatAction.DEFEND:
        if (state.playerAp <= 0) {
          this._log('AP 不足，无法防御！');
          return null;
        }
        state.playerAp--;
        state.playerDefending = true;
        this._log('你进入防御姿态，本回合减伤 50%。');
        break;

      case CombatAction.RETREAT:
        return this._doRetreat();
        break;

      case CombatAction.WAIT:
        this._log('你选择等待时机。');
        break;

      default:
        this._log(`未知行动: ${action}`);
        return null;
    }

    // 检查丧尸是否已死亡
    if (state.zombieHp <= 0) {
      return this._endCombat(true);
    }

    // 丧尸回合
    this._zombieTurn();

    // 检查玩家是否已死亡
    if (StateManager.get('player.hp') <= 0) {
      return this._endCombat(false);
    }

    // 新回合
    this._nextTurn();

    return null; // 战斗继续
  }

  /**
   * 玩家攻击逻辑
   */
  _doPlayerAttack() {
    const state = this._state;
    const zombie = this._zombie;

    // 命中判定
    if (Math.random() > ATTACK_HIT_RATE) {
      this._log(`攻击未命中 ${this._getZombieName(zombie)}！`);
      return;
    }

    // 暴击判定
    const isCrit = Math.random() < (zombie.isElite ? 0.15 : 0.10);
    let damage = this._calcPlayerDamage();

    if (isCrit) {
      damage = Math.floor(damage * 1.5);
      this._log(`暴击！对 ${this._getZombieName(zombie)} 造成 ${damage} 点伤害！`);
    } else {
      this._log(`对 ${this._getZombieName(zombie)} 造成 ${damage} 点伤害。`);
    }

    state.zombieHp = Math.max(0, state.zombieHp - damage);

    EventBus.emit(GameEvents.DAMAGE_DEALT, {
      combatId: this._combatId,
      source: 'player',
      target: 'zombie',
      damage,
      isCrit,
      zombieRemainingHp: state.zombieHp,
    });
  }

  /**
   * 计算玩家伤害（基于背包物资和基础攻击力）
   * @returns {number}
   */
  _calcPlayerDamage() {
    const inventory = StateManager.get('player.inventory') || [];
    let baseDamage = 10; // 基础徒手伤害

    // 检查是否有武器类物资
    const weaponBonus = inventory
      .filter(item => item.type && item.type.includes('weapon'))
      .length * 5;

    return baseDamage + weaponBonus;
  }

  /**
   * 丧尸回合
   */
  _zombieTurn() {
    const state = this._state;
    const zombie = this._zombie;
    const playerHp = StateManager.get('player.hp');

    // 丧尸攻击
    const zombieDamage = zombie.attack;

    // 玩家防御减伤
    let finalDamage = zombieDamage;
    if (state.playerDefending) {
      finalDamage = Math.floor(zombieDamage * 0.5);
      this._log(`防御姿态减轻了伤害，受到 ${finalDamage} 点伤害（原 ${zombieDamage}）。`);
    } else {
      this._log(`${this._getZombieName(zombie)} 攻击你，造成 ${finalDamage} 点伤害！`);
    }

    const newHp = Math.max(0, playerHp - finalDamage);
    StateManager.set('player.hp', newHp);

    EventBus.emit(GameEvents.DAMAGE_DEALT, {
      combatId: this._combatId,
      source: 'zombie',
      target: 'player',
      damage: finalDamage,
      playerRemainingHp: newHp,
    });

    // 重置防御状态
    state.playerDefending = false;
  }

  /**
   * 撤退逻辑
   * @returns {object|null}
   */
  _doRetreat() {
    const state = this._state;
    const zombie = this._zombie;

    // 撤退成功率 = 基础值 + 玩家剩余 AP * 0.15
    const successRate = RETREAT_BASE_RATE + state.playerAp * 0.15;
    const success = Math.random() < successRate;

    if (success) {
      this._log('撤退成功！你逃离了战斗。');
      return this._endCombat(false, 'retreat');
    } else {
      this._log('撤退失败！丧尸挡住了你的去路。');
      // 撤退失败，丧尸额外攻击一次
      this._zombieTurn();
      if (StateManager.get('player.hp') <= 0) {
        return this._endCombat(false);
      }
      this._nextTurn();
      return null;
    }
  }

  /**
   * 进入下一回合
   */
  _nextTurn() {
    const state = this._state;

    state.turn++;
    state.playerAp = PLAYER_MAX_AP;
    state.zombieAp = this._getZombieAp(this._zombie);

    this._log(`--- 第 ${state.turn} 回合 ---`);

    EventBus.emit(GameEvents.COMBAT_START, {
      combatId: this._combatId,
      turn: state.turn,
      playerAp: state.playerAp,
      isNewTurn: true,
    });
  }

  /**
   * 结束战斗
   * @param {boolean} victory - 是否胜利
   * @param {string} [reason] - 结束原因（retreat / defeat / victory）
   * @returns {object} 战斗结算结果
   */
  _endCombat(victory, reason = '') {
    const state = this._state;
    const zombie = this._zombie;

    /** @type {object} 结算结果 */
    const result = {
      combatId: this._combatId,
      victory,
      reason: reason || (victory ? 'victory' : 'defeat'),
      turns: state.turn,
      log: [...state.log],
      loot: [],
    };

    if (victory) {
      // 胜利：获取物资奖励
      const loot = this._generateLoot(zombie);
      result.loot = loot;

      // 更新 StateManager
      const currentInventory = StateManager.get('player.inventory') || [];
      loot.forEach(item => currentInventory.push(item));
      StateManager.set('player.inventory', currentInventory);

      // 恢复丧尸状态（标记为死亡）
      zombie.takeDamage(zombie.maxHp);

      this._log(`战斗胜利！获得 ${loot.length} 件物资。`);
    } else if (reason !== 'retreat') {
      // 失败（非撤退）：扣血
      const currentHp = StateManager.get('player.hp');
      const penalty = Math.floor(currentHp * 0.3); // 失败扣 30% 当前 HP
      const newHp = Math.max(1, currentHp - penalty); // 至少留 1 HP
      StateManager.set('player.hp', newHp);

      this._log(`战斗失败！HP 降至 ${newHp}。`);
    }

    this.inCombat = false;
    this._state = null;
    this._zombie = null;
    this._room = null;

    EventBus.emit(GameEvents.COMBAT_END, result);
    console.log(`[CombatManager] 战斗结束 — ${result.reason}`, result);

    return result;
  }

  /**
   * 生成战利品
   * @param {import('./Zombie.js').default} zombie
   * @returns {Array<object>}
   */
  _generateLoot(zombie) {
    const typeConfig = zombie.isElite ? ZombieType.ELITE : ZombieType.NORMAL;
    const lootTable = typeConfig.lootTable;
    const loot = [];

    // 1~2 件随机战利品
    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const itemType = lootTable[Math.floor(Math.random() * lootTable.length)];
      loot.push({
        type: itemType,
        quantity: 1,
        source: 'combat',
        turn: this._state.turn,
      });
    }

    return loot;
  }

  /**
   * 获取丧尸 AP（每回合行动点数）
   * @param {import('./Zombie.js').default} zombie
   * @returns {number}
   */
  _getZombieAp(zombie) {
    return zombie.isElite ? ZombieType.ELITE.apPerTurn : ZombieType.NORMAL.apPerTurn;
  }

  /**
   * 获取丧尸名称
   * @param {import('./Zombie.js').default} zombie
   * @returns {string}
   */
  _getZombieName(zombie) {
    return zombie.isElite ? ZombieType.ELITE.name : ZombieType.NORMAL.name;
  }

  /**
   * 获取丧尸信息（用于 UI 展示）
   * @param {import('./Zombie.js').default} zombie
   * @returns {object}
   */
  _getZombieInfo(zombie) {
    const config = zombie.isElite ? ZombieType.ELITE : ZombieType.NORMAL;
    return {
      name: config.name,
      isElite: zombie.isElite,
      hp: zombie.hp,
      maxHp: zombie.maxHp,
      attack: zombie.attack,
      apPerTurn: config.apPerTurn,
    };
  }

  /**
   * 添加战斗日志
   * @param {string} msg
   */
  _log(msg) {
    if (this._state) {
      this._state.log.push(`[T${this._state.turn}] ${msg}`);
    }
    console.log(`[Combat] ${msg}`);
  }

  /**
   * 获取当前战斗状态（供 UI 读取）
   * @returns {object|null}
   */
  getCombatState() {
    if (!this.inCombat || !this._state) return null;

    return {
      inCombat: true,
      combatId: this._combatId,
      turn: this._state.turn,
      playerAp: this._state.playerAp,
      playerMaxAp: PLAYER_MAX_AP,
      playerHp: StateManager.get('player.hp'),
      playerMaxHp: StateManager.get('player.maxHp'),
      zombie: this._getZombieInfo(this._zombie),
      zombieCurrentHp: this._state.zombieHp,
      log: [...this._state.log],
    };
  }

  /**
   * 是否可撤退（距离房间出口足够近）
   * @returns {boolean}
   */
  canRetreat() {
    // 简化：总是可以撤退，但有成功率
    return this.inCombat;
  }
}
