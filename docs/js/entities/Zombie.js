/**
 * Zombie — 丧尸实体基类
 * 支持巡逻 AI、基础属性，为后续战斗系统预留接口
 * @version 0.1.0
 */

import { TILE_SIZE } from '../game/MapGenerator.js';

/** 丧尸状态 */
export const ZombieState = Object.freeze({
  IDLE: 'idle',
  PATROL: 'patrol',
  CHASE: 'chase',
  ATTACK: 'attack',
  DEAD: 'dead',
});

export default class Zombie {
  /**
   * @param {number} x - 世界坐标 X
   * @param {number} y - 世界坐标 Y
   * @param {object} [opts]
   */
  constructor(x, y, opts = {}) {
    this.x = x;
    this.y = y;

    /** 半径 */
    this.radius = opts.radius || 18;

    /** 血量 */
    this.hp = opts.hp || 50;
    this.maxHp = this.hp;

    /** 攻击力 */
    this.attack = opts.attack || 8;

    /** 移动速度 */
    this.speed = opts.speed || 60;

    /** 当前状态 */
    this.state = ZombieState.IDLE;

    /** 巡逻路径（世界坐标点数组） */
    this.patrolPath = opts.patrolPath || [];

    /** 当前巡逻路径索引 */
    this._patrolIndex = 0;

    /** 巡逻方向：1=正向，-1=反向 */
    this._patrolDir = 1;

    /** 朝向弧度 */
    this.facing = 0;

    /** 索敌范围（像素） */
    this.detectionRange = opts.detectionRange || 200;

    /** 攻击冷却（秒） */
    this._attackCooldown = 0;
    this.attackInterval = opts.attackInterval || 1.5;

    /** 是否为精英丧尸 */
    this.isElite = opts.isElite || false;

    /** 类型标识（战斗系统扩展用） */
    this.type = opts.type || 'walker';
  }

  /**
   * 每帧更新
   * @param {number} dt - 秒
   * @param {import('../game/MapGenerator.js').MapData} mapData
   * @param {import('./Player.js').default} [player] - 玩家引用，用于索敌
   */
  update(dt, mapData, player = null) {
    if (this.state === ZombieState.DEAD) return;

    this._attackCooldown = Math.max(0, this._attackCooldown - dt);

    // 检测玩家是否在索敌范围内
    if (player && this.state !== ZombieState.CHASE) {
      const dist = this._distanceTo(player);
      if (dist < this.detectionRange) {
        this.state = ZombieState.CHASE;
      }
    }

    switch (this.state) {
      case ZombieState.PATROL:
        this._patrol(dt, mapData);
        break;
      case ZombieState.CHASE:
        this._chase(dt, mapData, player);
        break;
      case ZombieState.IDLE:
      default:
        // 有巡逻路径则自动切换为巡逻
        if (this.patrolPath.length > 0) {
          this.state = ZombieState.PATROL;
          this._patrolIndex = 0;
        }
        break;
    }
  }

  /** 受伤 */
  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.state = ZombieState.DEAD;
      return true; // 已死亡
    }
    return false;
  }

  /** 是否存活 */
  get isAlive() {
    return this.state !== ZombieState.DEAD;
  }

  // ---- 预留战斗接口 ----

  /** 对目标造成伤害 */
  dealDamageTo(target) {
    if (this._attackCooldown > 0) return false;
    this._attackCooldown = this.attackInterval;
    // target.receiveDamage(this.attack) — 战斗系统实现
    return true;
  }

  // ---- 私有 ----

  _patrol(dt, mapData) {
    if (this.patrolPath.length === 0) {
      this.state = ZombieState.IDLE;
      return;
    }

    const target = this.patrolPath[this._patrolIndex];
    const dist = this._distanceToPoint(target);

    if (dist < 4) {
      // 到达路径点，切换下一个
      this._patrolIndex += this._patrolDir;
      if (this._patrolIndex >= this.patrolPath.length) {
        this._patrolIndex = this.patrolPath.length - 2;
        this._patrolDir = -1;
      } else if (this._patrolIndex < 0) {
        this._patrolIndex = 1;
        this._patrolDir = 1;
      }
      return;
    }

    this._moveToward(target.x, target.y, dt, mapData);
  }

  _chase(dt, mapData, player) {
    if (!player) {
      this.state = ZombieState.PATROL;
      return;
    }

    const dist = this._distanceTo(player);
    if (dist > this.detectionRange * 1.5) {
      // 玩家跑远了，恢复巡逻
      this.state = ZombieState.PATROL;
      return;
    }

    this._moveToward(player.x, player.y, dt, mapData);
  }

  _moveToward(tx, ty, dt, mapData) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) return;

    const nx = dx / dist;
    const ny = dy / dist;
    const step = this.speed * dt;

    const newX = this.x + nx * step;
    const newY = this.y + ny * step;

    if (this._checkWalkable(newX, this.y, mapData)) this.x = newX;
    if (this._checkWalkable(this.x, newY, mapData)) this.y = newY;

    this.facing = Math.atan2(ny, nx);
  }

  _checkWalkable(wx, wy, mapData) {
    const r = this.radius - 2;
    const pts = [
      { x: wx - r, y: wy - r },
      { x: wx + r, y: wy + r },
      { x: wx, y: wy },
    ];
    for (const p of pts) {
      if (!mapData.isWalkableWorld(p.x, p.y)) return false;
    }
    return true;
  }

  _distanceTo(entity) {
    return this._distanceToPoint(entity);
  }

  _distanceToPoint(pt) {
    const dx = this.x - pt.x;
    const dy = this.y - pt.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** 网格坐标 */
  get gridX() { return Math.floor(this.x / TILE_SIZE); }
  get gridY() { return Math.floor(this.y / TILE_SIZE); }
}