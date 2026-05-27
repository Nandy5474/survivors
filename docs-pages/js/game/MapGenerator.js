/**
 * MapGenerator — 随机俯视角网格地图生成器
 * 基于箱组（BoxGroup）规则生成房间布局，连接主道路
 * @version 0.1.0
 */

import { SeededRandom } from '../utils/Random.js';

// ============ 枚举 ============

/** 房间类型 */
export const RoomType = Object.freeze({
  SMALL_BOX: 'small_box',
  LARGE_BOX: 'large_box',
  EMPTY: 'empty',
  SUPPLY: 'supply',
  ZOMBIE: 'zombie',
  SURVIVOR: 'survivor',
});

/** 地砖类型 */
export const TileType = Object.freeze({
  WALL: 0,
  FLOOR: 1,
  CORRIDOR: 2,
  DOOR: 3,
});

/** 门朝向 */
export const DoorSide = Object.freeze({
  TOP: 'top',
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right',
});

/** 地砖像素尺寸 */
export const TILE_SIZE = 64;

// ============ 房间类 ============

export class Room {
  /**
   * @param {number} gridX - 网格 X 坐标
   * @param {number} gridY - 网格 Y 坐标
   * @param {number} gridW - 网格宽度
   * @param {number} gridH - 网格高度
   * @param {string} type - RoomType
   */
  constructor(gridX, gridY, gridW, gridH, type) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.gridW = gridW;
    this.gridH = gridH;
    this.type = type;
    this.explored = false;
    this.hasSupplies = false;
    this.supplyType = null;
    this.boxGroupId = -1;
    /** @type {{ gx: number, gy: number, side: string }[]} 门在墙壁上的网格坐标 */
    this.doors = [];
  }

  get worldX() { return this.gridX * TILE_SIZE; }
  get worldY() { return this.gridY * TILE_SIZE; }
  get worldW() { return this.gridW * TILE_SIZE; }
  get worldH() { return this.gridH * TILE_SIZE; }
  get centerX() { return this.worldX + this.worldW / 2; }
  get centerY() { return this.worldY + this.worldH / 2; }

  containsWorldPoint(wx, wy) {
    return wx >= this.worldX && wx < this.worldX + this.worldW
        && wy >= this.worldY && wy < this.worldY + this.worldH;
  }

  containsGridPoint(gx, gy) {
    return gx >= this.gridX && gx < this.gridX + this.gridW
        && gy >= this.gridY && gy < this.gridY + this.gridH;
  }
}

// ============ 箱组类 ============

export class BoxGroup {
  /**
   * @param {number} id
   * @param {number} gridX
   * @param {number} gridY
   * @param {number} gridW
   * @param {number} gridH
   */
  constructor(id, gridX, gridY, gridW, gridH) {
    this.id = id;
    this.gridX = gridX;
    this.gridY = gridY;
    this.gridW = gridW;
    this.gridH = gridH;
    /** @type {Room[]} */
    this.rooms = [];
  }

  get centerGridX() { return this.gridX + Math.floor(this.gridW / 2); }
  get centerGridY() { return this.gridY + Math.floor(this.gridH / 2); }
}

// ============ 地图数据 ============

export class MapData {
  /**
   * @param {number} gridW - 网格宽度
   * @param {number} gridH - 网格高度
   */
  constructor(gridW, gridH) {
    this.gridW = gridW;
    this.gridH = gridH;
    this.width = gridW * TILE_SIZE;
    this.height = gridH * TILE_SIZE;

    /** @type {number[][]} 地砖网格 [y][x] */
    this.tiles = [];
    /** @type {Room[]} */
    this.rooms = [];
    /** @type {BoxGroup[]} */
    this.boxGroups = [];

    this.playerStart = { x: 0, y: 0 };
    this.exitPoint = { x: 0, y: 0 };

    /** @type {import('../entities/LootItem.js').LootItem[]} 地图拾取物列表 */
    this.lootItems = [];
  }

  /**
   * 判断网格坐标是否可行走
   */
  isWalkable(gx, gy) {
    if (gx < 0 || gx >= this.gridW || gy < 0 || gy >= this.gridH) return false;
    const row = this.tiles[gy];
    if (!row) return false;
    return row[gx] === TileType.FLOOR || row[gx] === TileType.CORRIDOR || row[gx] === TileType.DOOR;
  }

  /**
   * 判断世界坐标是否可行走
   */
  isWalkableWorld(wx, wy) {
    const gx = Math.floor(wx / TILE_SIZE);
    const gy = Math.floor(wy / TILE_SIZE);
    return this.isWalkable(gx, gy);
  }

  /** 获取网格坐标处的房间 */
  getRoomAt(gx, gy) {
    for (const room of this.rooms) {
      if (room.containsGridPoint(gx, gy)) return room;
    }
    return null;
  }

  /** 获取世界坐标处的房间 */
  getRoomAtWorld(wx, wy) {
    const gx = Math.floor(wx / TILE_SIZE);
    const gy = Math.floor(wy / TILE_SIZE);
    return this.getRoomAt(gx, gy);
  }

  /** 获取包含指定世界坐标点的房间（宽松判定，用中心点） */
  getContainingRoom(wx, wy) {
    for (const room of this.rooms) {
      if (room.containsWorldPoint(wx, wy)) return room;
    }
    return null;
  }
}

// ============ 地图生成器 ============

export default class MapGenerator {
  /**
   * @param {number} seed - 随机种子
   * @param {number} [gridW=40] - 地图网格宽度
   * @param {number} [gridH=30] - 地图网格高度
   * @param {object} [options={}] - 可选配置
   * @param {boolean} [options.hasWeapon=false] - 玩家是否已获得武器
   */
  constructor(seed, gridW = 40, gridH = 30, options = {}) {
    this.rng = new SeededRandom(seed);
    this.gridW = gridW;
    this.gridH = gridH;
    this.options = options;

    // 箱组配置
    this._boxGroupCols = 4;
    this._boxGroupRows = 2;
  }

  /**
   * 生成地图
   * @returns {MapData}
   */
  generate() {
    const map = new MapData(this.gridW, this.gridH);

    // Step 1: 全部初始化为墙壁
    for (let y = 0; y < this.gridH; y++) {
      map.tiles[y] = new Array(this.gridW).fill(TileType.WALL);
    }

    // Step 2: 放置箱组
    this._placeBoxGroups(map);

    // Step 3: 在箱组内雕刻房间
    this._carveRooms(map);

    // Step 3.5: 生成房间门
    this._generateDoors(map);

    // Step 3.6: 生成地图拾取物
    this._generateLootItems(map);

    // Step 4: 箱组内部走廊连接
    this._createInternalCorridors(map);

    // Step 5: 主干道连接箱组
    this._createMainRoads(map);

    // Step 6: 设置玩家出生点和出口
    this._setSpawnAndExit(map);

    return map;
  }

  // ---- 私有：箱组放置 ----

  _placeBoxGroups(map) {
    const sectorW = Math.floor(this.gridW / this._boxGroupCols);
    const sectorH = Math.floor(this.gridH / this._boxGroupRows);
    let bgId = 0;

    for (let row = 0; row < this._boxGroupRows; row++) {
      for (let col = 0; col < this._boxGroupCols; col++) {
        const sectorX = col * sectorW + 3;
        const sectorY = row * sectorH + 3;
        const maxW = sectorW - 6;
        const maxH = sectorH - 6;

        // 随机箱组尺寸
        const bgW = this.rng.int(5, Math.min(9, maxW));
        const bgH = this.rng.int(5, Math.min(8, maxH));
        const padX = Math.max(0, sectorW - 6 - bgW);
        const padY = Math.max(0, sectorH - 6 - bgH);
        const bgX = sectorX + this.rng.int(0, padX);
        const bgY = sectorY + this.rng.int(0, padY);

        const bg = new BoxGroup(bgId++, bgX, bgY, bgW, bgH);
        map.boxGroups.push(bg);
      }
    }
  }

  // ---- 私有：雕刻房间 ----

  _carveRooms(map) {
    for (const bg of map.boxGroups) {
      const { gridX: bx, gridY: by, gridW: bw, gridH: bh } = bg;

      // 至少留 1 格边距
      const innerW = bw - 2;
      const innerH = bh - 2;
      if (innerW < 1 || innerH < 1) continue;

      // 计算网格房间布局
      const roomCols = Math.max(1, Math.floor(innerW / 3));
      const roomRows = Math.max(1, Math.floor(innerH / 3));
      const cellW = Math.floor(innerW / roomCols);
      const cellH = Math.floor(innerH / roomRows);

      for (let r = 0; r < roomRows; r++) {
        for (let c = 0; c < roomCols; c++) {
          const rx = bx + 1 + c * cellW;
          const ry = by + 1 + r * cellH;
          const rw = Math.min(cellW - 1, bx + bw - 1 - rx);
          const rh = Math.min(cellH - 1, by + bh - 1 - ry);

          if (rw < 1 || rh < 1) continue;

          const type = this._assignRoomType();
          const room = new Room(rx, ry, rw, rh, type);
          room.boxGroupId = bg.id;

          // 物资房和储物间设置物资
          if (type === RoomType.SUPPLY || type === RoomType.SMALL_BOX) {
            room.hasSupplies = true;
            room.supplyType = this.rng.weightedPick({
              food: 30,
              water: 25,
              ammo: 15,
              parts: 20,
              materials: 10,
            });
          }

          bg.rooms.push(room);
          map.rooms.push(room);

          // 雕刻地砖
          for (let fy = ry; fy < ry + rh; fy++) {
            for (let fx = rx; fx < rx + rw; fx++) {
              if (fy >= 0 && fy < this.gridH && fx >= 0 && fx < this.gridW) {
                map.tiles[fy][fx] = TileType.FLOOR;
              }
            }
          }
        }
      }
    }
  }

  /** 按权重分配房间类型 */
  _assignRoomType() {
    const hasWeapon = this.options.hasWeapon !== false;
    if (hasWeapon) {
      return this.rng.weightedPick({
        [RoomType.EMPTY]: 30,
        [RoomType.SMALL_BOX]: 20,
        [RoomType.LARGE_BOX]: 5,
        [RoomType.SUPPLY]: 20,
        [RoomType.ZOMBIE]: 15,
        [RoomType.SURVIVOR]: 10,
      });
    }
    // 无武器时不生成丧尸房，权重重新分配
    return this.rng.weightedPick({
      [RoomType.EMPTY]: 35,
      [RoomType.SMALL_BOX]: 22,
      [RoomType.LARGE_BOX]: 6,
      [RoomType.SUPPLY]: 24,
      [RoomType.SURVIVOR]: 13,
    });
  }

  // ---- 私有：内部走廊 ----

  _createInternalCorridors(map) {
    for (const bg of map.boxGroups) {
      if (bg.rooms.length < 2) continue;

      // 相邻房间之间雕刻走廊
      for (let i = 0; i < bg.rooms.length - 1; i++) {
        this._carveCorridor(map, bg.rooms[i], bg.rooms[i + 1]);
      }
    }
  }

  /**
   * L 形走廊：从 roomA 中心走到 roomB 中心
   */
  _carveCorridor(map, roomA, roomB) {
    const ax = Math.floor(roomA.centerX / TILE_SIZE);
    const ay = Math.floor(roomA.centerY / TILE_SIZE);
    const bx = Math.floor(roomB.centerX / TILE_SIZE);
    const by = Math.floor(roomB.centerY / TILE_SIZE);

    // 水平段
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) {
      if (x >= 0 && x < this.gridW && ay >= 0 && ay < this.gridH) {
        if (map.tiles[ay][x] === TileType.WALL) {
          map.tiles[ay][x] = TileType.CORRIDOR;
        }
      }
    }

    // 垂直段
    for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) {
      if (y >= 0 && y < this.gridH && bx >= 0 && bx < this.gridW) {
        if (map.tiles[y][bx] === TileType.WALL) {
          map.tiles[y][bx] = TileType.CORRIDOR;
        }
      }
    }
  }

  // ---- 私有：主干道 ----

  _createMainRoads(map) {
    for (let i = 0; i < map.boxGroups.length - 1; i++) {
      const a = map.boxGroups[i];
      const b = map.boxGroups[i + 1];
      const ax = a.centerGridX;
      const ay = a.centerGridY;
      const bx = b.centerGridX;
      const by = b.centerGridY;

      this._carveWideRoad(map, ax, ay, bx, by);
    }
  }

  /** 2 格宽道路 */
  _carveWideRoad(map, x1, y1, x2, y2) {
    // 水平 → 垂直
    const xMin = Math.min(x1, x2);
    const xMax = Math.max(x1, x2);
    const yMin = Math.min(y1, y2);
    const yMax = Math.max(y1, y2);

    for (let x = xMin; x <= xMax; x++) {
      for (let dy = -1; dy <= 1; dy++) {
        const y = y1 + dy;
        if (x >= 0 && x < this.gridW && y >= 0 && y < this.gridH) {
          if (map.tiles[y][x] === TileType.WALL) {
            map.tiles[y][x] = TileType.CORRIDOR;
          }
        }
      }
    }

    for (let y = yMin; y <= yMax; y++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = x2 + dx;
        if (x >= 0 && x < this.gridW && y >= 0 && y < this.gridH) {
          if (map.tiles[y][x] === TileType.WALL) {
            map.tiles[y][x] = TileType.CORRIDOR;
          }
        }
      }
    }
  }

  // ---- 私有：门生成 ----

  /**
   * 为每个房间在墙壁上随机开至少 1 扇门
   */
  _generateDoors(map) {
    for (const room of map.rooms) {
      const rx = room.gridX;
      const ry = room.gridY;
      const rw = room.gridW;
      const rh = room.gridH;

      // 收集四面墙上的候选位置
      const candidates = [];

      if (rw >= 2 && rh >= 2) {
        // 标准房间（≥2×2）：排除角落
        this._collectDoorCandidates(rx, ry, rw, rh, candidates, true);
      } else {
        // 极小房间（1×N 或 N×1）：包含角落
        this._collectDoorCandidates(rx, ry, rw, rh, candidates, false);
      }

      if (candidates.length === 0) continue;

      // 随机选 1~2 个位置开门
      const doorCount = this.rng.int(1, Math.min(2, candidates.length));
      const shuffled = [...candidates].sort(() => this.rng.float() - 0.5);

      for (let i = 0; i < doorCount; i++) {
        const { gx, gy, side } = shuffled[i];
        if (map.tiles[gy]?.[gx] === TileType.WALL) {
          map.tiles[gy][gx] = TileType.DOOR;
          room.doors.push({ gx, gy, side });
        }
      }

      // 强制兜底：如果随机后仍未开门，选第一个候选强制开门
      if (room.doors.length === 0 && candidates.length > 0) {
        const { gx, gy, side } = candidates[0];
        map.tiles[gy][gx] = TileType.DOOR;
        room.doors.push({ gx, gy, side });
      }
    }
  }

  /**
   * 收集房间墙壁上的门候选位置
   * @param {number} rx
   * @param {number} ry
   * @param {number} rw
   * @param {number} rh
   * @param {Array} candidates
   * @param {boolean} excludeCorners - 是否排除角落
   */
  _collectDoorCandidates(rx, ry, rw, rh, candidates, excludeCorners) {
    const innerPad = excludeCorners ? 1 : 0;

    // 上墙（y = ry - 1）
    if (ry > 0) {
      for (let x = rx + innerPad; x < rx + rw - innerPad; x++) {
        if (x >= 0 && x < this.gridW) {
          candidates.push({ gx: x, gy: ry - 1, side: DoorSide.TOP });
        }
      }
    }
    // 下墙（y = ry + rh）
    if (ry + rh < this.gridH) {
      for (let x = rx + innerPad; x < rx + rw - innerPad; x++) {
        if (x >= 0 && x < this.gridW) {
          candidates.push({ gx: x, gy: ry + rh, side: DoorSide.BOTTOM });
        }
      }
    }
    // 左墙（x = rx - 1）
    if (rx > 0) {
      for (let y = ry + innerPad; y < ry + rh - innerPad; y++) {
        if (y >= 0 && y < this.gridH) {
          candidates.push({ gx: rx - 1, gy: y, side: DoorSide.LEFT });
        }
      }
    }
    // 右墙（x = rx + rw）
    if (rx + rw < this.gridW) {
      for (let y = ry + innerPad; y < ry + rh - innerPad; y++) {
        if (y >= 0 && y < this.gridH) {
          candidates.push({ gx: rx + rw, gy: y, side: DoorSide.RIGHT });
        }
      }
    }
  }

  // ---- 私有：拾取物生成 ----

  /**
   * 在地图走廊和空房间地板上随机生成拾取物
   */
  _generateLootItems(map) {
    const LootType = ['ammo', 'medkit', 'parts', 'food'];
    const corridorTiles = [];

    // 收集所有走廊/空房间的地板格
    for (let y = 0; y < this.gridH; y++) {
      for (let x = 0; x < this.gridW; x++) {
        if (map.tiles[y][x] === TileType.CORRIDOR) {
          corridorTiles.push({ gx: x, gy: y });
        }
      }
    }

    // 也收集空房间内部地板（至少距离墙 1 格）
    for (const room of map.rooms) {
      if (room.type !== RoomType.EMPTY) continue;
      for (let dy = 1; dy < room.gridH - 1; dy++) {
        for (let dx = 1; dx < room.gridW - 1; dx++) {
          const gx = room.gridX + dx;
          const gy = room.gridY + dy;
          if (map.tiles[gy]?.[gx] === TileType.FLOOR) {
            corridorTiles.push({ gx, gy });
          }
        }
      }
    }

    if (corridorTiles.length === 0) return;

    // 随机散布拾取物（约每 50 格一个）
    const lootCount = Math.max(5, Math.floor(corridorTiles.length / 50));
    const shuffled = [...corridorTiles].sort(() => this.rng.float() - 0.5);

    for (let i = 0; i < Math.min(lootCount, shuffled.length); i++) {
      const { gx, gy } = shuffled[i];
      const type = LootType[this.rng.int(0, LootType.length - 1)];
      const amount = this._lootAmount(type);
      const wx = gx * TILE_SIZE + TILE_SIZE / 2;
      const wy = gy * TILE_SIZE + TILE_SIZE / 2;

      map.lootItems.push({
        x: wx, y: wy, type, amount, collected: false,
        gridX: gx, gridY: gy,
      });
    }
  }

  _lootAmount(type) {
    switch (type) {
      case 'ammo': return this.rng.int(3, 10);
      case 'medkit': return this.rng.int(1, 2);
      case 'parts': return this.rng.int(1, 4);
      case 'food': return this.rng.int(1, 3);
      default: return 1;
    }
  }

  // ---- 私有：出入口 ----

  _setSpawnAndExit(map) {
    if (map.boxGroups.length > 0) {
      const bg = map.boxGroups[0];
      const sx = (bg.gridX + 1) * TILE_SIZE + TILE_SIZE / 2;
      const sy = (bg.gridY + 1) * TILE_SIZE + TILE_SIZE / 2;
      map.playerStart = { x: sx, y: sy };
    }

    if (map.boxGroups.length > 1) {
      const bg = map.boxGroups[map.boxGroups.length - 1];
      const ex = (bg.gridX + bg.gridW - 2) * TILE_SIZE + TILE_SIZE / 2;
      const ey = (bg.gridY + Math.floor(bg.gridH / 2)) * TILE_SIZE + TILE_SIZE / 2;
      map.exitPoint = { x: ex, y: ey };
    }
  }
}