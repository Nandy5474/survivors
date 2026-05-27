/**
 * Player — 玩家实体类
 * 处理移动、碰撞检测、房间进入、物资收集
 * @version 0.1.0
 */

import { TILE_SIZE } from '../game/MapGenerator.js';

/** 碰撞检测半径（像素，中心偏移） */
const COLLISION_RADIUS = 20;

export default class Player {
  /**
   * @param {number} x - 世界坐标 X（像素）
   * @param {number} y - 世界坐标 Y（像素）
   */
  constructor(x, y) {
    this.x = x;
    this.y = y;

    /** 移动速度（像素/秒） */
    this.speed = 200;

    /** 实体半径 */
    this.radius = COLLISION_RADIUS;

    /** 面朝方向弧度（默认向右） */
    this.facing = 0;

    /** 当前所在房间引用 */
    this.currentRoom = null;

    /** 背包 */
    this.inventory = [];

    /** 是否正在移动 */
    this.isMoving = false;
  }

  /**
   * 尝试移动，带碰撞检测
   * @param {number} dx - X 方向输入 (-1..1)
   * @param {number} dy - Y 方向输入 (-1..1)
   * @param {number} dt - 帧间隔（秒）
   * @param {import('../game/MapGenerator.js').MapData} mapData
   * @returns {boolean} 是否实际移动了
   */
  move(dx, dy, dt, mapData) {
    if (dx === 0 && dy === 0) {
      this.isMoving = false;
      return false;
    }

    // 归一化对角线移动
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / len;
    const ny = dy / len;

    const step = this.speed * dt;
    const newX = this.x + nx * step;
    const newY = this.y + ny * step;

    let moved = false;

    // 尝试同时移动 X 和 Y（对角线）
    if (this._checkCollision(newX, newY, mapData)) {
      this.x = newX;
      this.y = newY;
      moved = true;
    } else {
      // 尝试只移动 X
      if (this._checkCollision(newX, this.y, mapData)) {
        this.x = newX;
        moved = true;
      }
      // 尝试只移动 Y
      if (this._checkCollision(this.x, newY, mapData)) {
        this.y = newY;
        moved = true;
      }
    }

    // 更新朝向
    if (moved) {
      this.facing = Math.atan2(ny, nx);
    }
    this.isMoving = moved;

    return moved;
  }

  /**
   * 碰撞检测：检测指定世界坐标是否可行走
   * 使用四个角点（上下左右）进行检测
   */
  _checkCollision(wx, wy, mapData) {
    const r = this.radius - 2; // 留一点余量
    const points = [
      { x: wx - r, y: wy - r },
      { x: wx + r, y: wy - r },
      { x: wx - r, y: wy + r },
      { x: wx + r, y: wy + r },
      { x: wx,     y: wy },
    ];

    for (const p of points) {
      if (!mapData.isWalkableWorld(p.x, p.y)) return false;
    }
    return true;
  }

  /**
   * 检查是否进入房间
   * @param {MapData} mapData
   * @returns {Room|null}
   */
  checkRoomEntry(mapData) {
    const room = mapData.getContainingRoom(this.x, this.y);
    if (room && room !== this.currentRoom) {
      const prev = this.currentRoom;
      this.currentRoom = room;
      room.explored = true;
      return room;
    }
    return null;
  }

  /**
   * 收集当前房间物资
   * @returns {{ supplyType: string }|null}
   */
  collectSupply() {
    if (!this.currentRoom) return null;
    if (!this.currentRoom.hasSupplies) return null;

    const room = this.currentRoom;
    room.hasSupplies = false; // 已收集

    this.inventory.push({
      type: room.supplyType,
      roomType: room.type,
      collectedAt: Date.now(),
    });

    return { supplyType: room.supplyType, roomType: room.type };
  }

  /** 网格坐标 */
  get gridX() { return Math.floor(this.x / TILE_SIZE); }
  get gridY() { return Math.floor(this.y / TILE_SIZE); }

  /**
   * 序列化（存档用）
   */
  serialize() {
    return {
      x: this.x,
      y: this.y,
      facing: this.facing,
      inventory: [...this.inventory],
    };
  }

  /**
   * 反序列化
   */
  deserialize(data) {
    this.x = data.x;
    this.y = data.y;
    this.facing = data.facing;
    this.inventory = data.inventory || [];
  }
}