/**
 * MapGenerator — 随机俯视角网格地图生成器
 * 基于箱组（BoxGroup）规则生成房间布局，连接主道路
 * @version 0.2.0 — Task 5: 优化序章地图布局
 */

import { SeededRandom } from '../utils/Random.js';

// ============ 枚举 ============

export const RoomType = Object.freeze({
  HOME: 'home',
  SMALL_BOX: 'small_box',
  LARGE_BOX: 'large_box',
  EMPTY: 'empty',
  SUPPLY: 'supply',
  ZOMBIE: 'zombie',
  SURVIVOR: 'survivor',
  ELEVATOR_HALL: 'elevator_hall',
  STAIRWELL: 'stairwell',
});

export const TileType = Object.freeze({ WALL: 0, FLOOR: 1, CORRIDOR: 2, DOOR: 3 });
export const DoorSide = Object.freeze({ TOP: 'top', BOTTOM: 'bottom', LEFT: 'left', RIGHT: 'right' });
export const TILE_SIZE = 64;

// ============ 房间类 ============

export class Room {
  constructor(gridX, gridY, gridW, gridH, type) {
    this.gridX = gridX; this.gridY = gridY; this.gridW = gridW; this.gridH = gridH;
    this.type = type; this.explored = false; this.hasSupplies = false; this.supplyType = null;
    this.boxGroupId = -1; this.doors = [];
  }
  get worldX() { return this.gridX * TILE_SIZE; }
  get worldY() { return this.gridY * TILE_SIZE; }
  get worldW() { return this.gridW * TILE_SIZE; }
  get worldH() { return this.gridH * TILE_SIZE; }
  get centerX() { return this.worldX + this.worldW / 2; }
  get centerY() { return this.worldY + this.worldH / 2; }
  containsWorldPoint(wx, wy) { return wx >= this.worldX && wx < this.worldX + this.worldW && wy >= this.worldY && wy < this.worldY + this.worldH; }
  containsGridPoint(gx, gy) { return gx >= this.gridX && gx < this.gridX + this.gridW && gy >= this.gridY && gy < this.gridY + this.gridH; }
}

// ============ 箱组类 ============

export class BoxGroup {
  constructor(id, gridX, gridY, gridW, gridH) {
    this.id = id; this.gridX = gridX; this.gridY = gridY; this.gridW = gridW; this.gridH = gridH; this.rooms = [];
  }
  get centerGridX() { return this.gridX + Math.floor(this.gridW / 2); }
  get centerGridY() { return this.gridY + Math.floor(this.gridH / 2); }
}

// ============ 地图数据 ============

export class MapData {
  constructor(gridW, gridH) {
    this.gridW = gridW; this.gridH = gridH;
    this.width = gridW * TILE_SIZE; this.height = gridH * TILE_SIZE;
    this.tiles = []; this.rooms = []; this.boxGroups = [];
    this.playerStart = { x: 0, y: 0 }; this.exitPoint = { x: 0, y: 0 }; this.lootItems = [];
  }
  isWalkable(gx, gy) {
    if (gx < 0 || gx >= this.gridW || gy < 0 || gy >= this.gridH) return false;
    const row = this.tiles[gy]; if (!row) return false;
    return row[gx] === TileType.FLOOR || row[gx] === TileType.CORRIDOR || row[gx] === TileType.DOOR;
  }
  isWalkableWorld(wx, wy) { return this.isWalkable(Math.floor(wx / TILE_SIZE), Math.floor(wy / TILE_SIZE)); }
  getRoomAt(gx, gy) { for (const r of this.rooms) { if (r.containsGridPoint(gx, gy)) return r; } return null; }
  getRoomAtWorld(wx, wy) { return this.getRoomAt(Math.floor(wx / TILE_SIZE), Math.floor(wy / TILE_SIZE)); }
  getContainingRoom(wx, wy) { for (const r of this.rooms) { if (r.containsWorldPoint(wx, wy)) return r; } return null; }
}

// ============ 地图生成器 ============

export default class MapGenerator {
  constructor(seed, gridW = 40, gridH = 30, options = {}) {
    this.rng = new SeededRandom(seed); this.gridW = gridW; this.gridH = gridH; this.options = options;
    this._boxGroupCols = 4; this._boxGroupRows = 2;
  }

  generate() {
    const map = new MapData(this.gridW, this.gridH);
    for (let y = 0; y < this.gridH; y++) map.tiles[y] = new Array(this.gridW).fill(TileType.WALL);
    this._placeBoxGroups(map); this._carveRooms(map); this._generateDoors(map);
    this._generateLootItems(map); this._createInternalCorridors(map);
    this._createMainRoads(map); this._setSpawnAndExit(map);
    return map;
  }

  _placeBoxGroups(map) {
    const sectorW = Math.floor(this.gridW / this._boxGroupCols), sectorH = Math.floor(this.gridH / this._boxGroupRows);
    let bgId = 0;
    for (let row = 0; row < this._boxGroupRows; row++) for (let col = 0; col < this._boxGroupCols; col++) {
      const sx = col * sectorW + 3, sy = row * sectorH + 3, maxW = sectorW - 6, maxH = sectorH - 6;
      const bw = this.rng.int(5, Math.min(9, maxW)), bh = this.rng.int(5, Math.min(8, maxH));
      const px = Math.max(0, sectorW - 6 - bw), py = Math.max(0, sectorH - 6 - bh);
      map.boxGroups.push(new BoxGroup(bgId++, sx + this.rng.int(0, px), sy + this.rng.int(0, py), bw, bh));
    }
  }

  _carveRooms(map) {
    for (const bg of map.boxGroups) {
      const { gridX: bx, gridY: by, gridW: bw, gridH: bh } = bg;
      const innerW = bw - 2, innerH = bh - 2; if (innerW < 1 || innerH < 1) continue;
      const rCols = Math.max(1, Math.floor(innerW / 3)), rRows = Math.max(1, Math.floor(innerH / 3));
      const cw = Math.floor(innerW / rCols), ch = Math.floor(innerH / rRows);
      for (let r = 0; r < rRows; r++) for (let c = 0; c < rCols; c++) {
        const rx = bx + 1 + c * cw, ry = by + 1 + r * ch;
        const rw = Math.min(cw - 1, bx + bw - 1 - rx), rh = Math.min(ch - 1, by + bh - 1 - ry);
        if (rw < 1 || rh < 1) continue;
        const type = this._assignRoomType();
        const room = new Room(rx, ry, rw, rh, type); room.boxGroupId = bg.id;
        if (type === RoomType.SUPPLY || type === RoomType.SMALL_BOX) { room.hasSupplies = true; room.supplyType = this.rng.weightedPick({ food: 30, water: 25, ammo: 15, parts: 20, materials: 10 }); }
        bg.rooms.push(room); map.rooms.push(room);
        for (let fy = ry; fy < ry + rh; fy++) for (let fx = rx; fx < rx + rw; fx++) { if (fy >= 0 && fy < this.gridH && fx >= 0 && fx < this.gridW) map.tiles[fy][fx] = TileType.FLOOR; }
      }
    }
  }

  _assignRoomType() {
    const hasW = this.options.hasWeapon !== false;
    return hasW ? this.rng.weightedPick({ [RoomType.EMPTY]: 30, [RoomType.SMALL_BOX]: 20, [RoomType.LARGE_BOX]: 5, [RoomType.SUPPLY]: 20, [RoomType.ZOMBIE]: 15, [RoomType.SURVIVOR]: 10 })
      : this.rng.weightedPick({ [RoomType.EMPTY]: 35, [RoomType.SMALL_BOX]: 22, [RoomType.LARGE_BOX]: 6, [RoomType.SUPPLY]: 24, [RoomType.SURVIVOR]: 13 });
  }

  _createInternalCorridors(map) {
    for (const bg of map.boxGroups) { if (bg.rooms.length < 2) continue; for (let i = 0; i < bg.rooms.length - 1; i++) this._carveCorridor(map, bg.rooms[i], bg.rooms[i + 1]); }
  }

  _carveCorridor(map, a, b) {
    const ax = Math.floor(a.centerX / TILE_SIZE), ay = Math.floor(a.centerY / TILE_SIZE);
    const bx = Math.floor(b.centerX / TILE_SIZE), by = Math.floor(b.centerY / TILE_SIZE);
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) { if (x >= 0 && x < this.gridW && ay >= 0 && ay < this.gridH && map.tiles[ay][x] === TileType.WALL) map.tiles[ay][x] = TileType.CORRIDOR; }
    for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) { if (y >= 0 && y < this.gridH && bx >= 0 && bx < this.gridW && map.tiles[y][bx] === TileType.WALL) map.tiles[y][bx] = TileType.CORRIDOR; }
  }

  _createMainRoads(map) { for (let i = 0; i < map.boxGroups.length - 1; i++) this._carveWideRoad(map, map.boxGroups[i].centerGridX, map.boxGroups[i].centerGridY, map.boxGroups[i + 1].centerGridX, map.boxGroups[i + 1].centerGridY); }

  _carveWideRoad(map, x1, y1, x2, y2) {
    const xMin = Math.min(x1, x2), xMax = Math.max(x1, x2), yMin = Math.min(y1, y2), yMax = Math.max(y1, y2);
    for (let x = xMin; x <= xMax; x++) for (let dy = -1; dy <= 1; dy++) { const y = y1 + dy; if (x >= 0 && x < this.gridW && y >= 0 && y < this.gridH && map.tiles[y][x] === TileType.WALL) map.tiles[y][x] = TileType.CORRIDOR; }
    for (let y = yMin; y <= yMax; y++) for (let dx = -1; dx <= 1; dx++) { const x = x2 + dx; if (x >= 0 && x < this.gridW && y >= 0 && y < this.gridH && map.tiles[y][x] === TileType.WALL) map.tiles[y][x] = TileType.CORRIDOR; }
  }

  _generateDoors(map) {
    for (const room of map.rooms) {
      const candidates = [];
      if (room.gridW >= 2 && room.gridH >= 2) this._collectDoorCandidates(room, candidates, true);
      else this._collectDoorCandidates(room, candidates, false);
      if (candidates.length === 0) continue;
      const dc = this.rng.int(1, Math.min(2, candidates.length));
      const shuf = [...candidates].sort(() => this.rng.float() - 0.5);
      for (let i = 0; i < dc; i++) { const { gx, gy, side } = shuf[i]; if (map.tiles[gy]?.[gx] === TileType.WALL) { map.tiles[gy][gx] = TileType.DOOR; room.doors.push({ gx, gy, side }); } }
      if (room.doors.length === 0 && candidates.length > 0) { const { gx, gy, side } = candidates[0]; map.tiles[gy][gx] = TileType.DOOR; room.doors.push({ gx, gy, side }); }
    }
  }

  _collectDoorCandidates(room, candidates, excludeCorners) {
    const pad = excludeCorners ? 1 : 0, rx = room.gridX, ry = room.gridY, rw = room.gridW, rh = room.gridH;
    if (ry > 0) for (let x = rx + pad; x < rx + rw - pad; x++) { if (x >= 0 && x < this.gridW) candidates.push({ gx: x, gy: ry - 1, side: DoorSide.TOP }); }
    if (ry + rh < this.gridH) for (let x = rx + pad; x < rx + rw - pad; x++) { if (x >= 0 && x < this.gridW) candidates.push({ gx: x, gy: ry + rh, side: DoorSide.BOTTOM }); }
    if (rx > 0) for (let y = ry + pad; y < ry + rh - pad; y++) { if (y >= 0 && y < this.gridH) candidates.push({ gx: rx - 1, gy: y, side: DoorSide.LEFT }); }
    if (rx + rw < this.gridW) for (let y = ry + pad; y < ry + rh - pad; y++) { if (y >= 0 && y < this.gridH) candidates.push({ gx: rx + rw, gy: y, side: DoorSide.RIGHT }); }
  }

  _generateLootItems(map) {
    const LT = ['ammo', 'medkit', 'parts', 'food'], corridorTiles = [];
    for (let y = 0; y < this.gridH; y++) for (let x = 0; x < this.gridW; x++) { if (map.tiles[y][x] === TileType.CORRIDOR) corridorTiles.push({ gx: x, gy: y }); }
    for (const room of map.rooms) { if (room.type !== RoomType.EMPTY) continue; for (let dy = 1; dy < room.gridH - 1; dy++) for (let dx = 1; dx < room.gridW - 1; dx++) { const gx = room.gridX + dx, gy = room.gridY + dy; if (map.tiles[gy]?.[gx] === TileType.FLOOR) corridorTiles.push({ gx, gy }); } }
    if (corridorTiles.length === 0) return;
    const lc = Math.max(5, Math.floor(corridorTiles.length / 50)), s = [...corridorTiles].sort(() => this.rng.float() - 0.5);
    for (let i = 0; i < Math.min(lc, s.length); i++) {
      const { gx, gy } = s[i], type = LT[this.rng.int(0, 3)];
      map.lootItems.push({ x: gx * TILE_SIZE + TILE_SIZE / 2, y: gy * TILE_SIZE + TILE_SIZE / 2, type, amount: this._lootAmount(type), collected: false, gridX: gx, gridY: gy });
    }
  }

  _lootAmount(type) { switch (type) { case 'ammo': return this.rng.int(3, 10); case 'medkit': return this.rng.int(1, 2); case 'parts': return this.rng.int(1, 4); case 'food': return this.rng.int(1, 3); default: return 1; } }

  _setSpawnAndExit(map) {
    if (map.boxGroups.length > 0) { const bg = map.boxGroups[0]; map.playerStart = { x: (bg.gridX + 1) * TILE_SIZE + TILE_SIZE / 2, y: (bg.gridY + 1) * TILE_SIZE + TILE_SIZE / 2 }; }
    if (map.boxGroups.length > 1) { const bg = map.boxGroups[map.boxGroups.length - 1]; map.exitPoint = { x: (bg.gridX + bg.gridW - 2) * TILE_SIZE + TILE_SIZE / 2, y: (bg.gridY + Math.floor(bg.gridH / 2)) * TILE_SIZE + TILE_SIZE / 2 }; }
  }

  // ============ 剧本地图 ============

  /** Task 6: 序章「居民楼」— 30x30 双楼层 */
  static generatePrologue() {
    const T = TILE_SIZE, GW = 30, GH = 30, map = new MapData(GW, GH);
    for (let y = 0; y < GH; y++) map.tiles[y] = new Array(GW).fill(TileType.WALL);

    // 楼层 3（玩家起始楼层）：8 间房 + 电梯厅 + 楼梯间
    const floor3Defs = [
      // 东翼房间
      [2, 2, 3, 4, RoomType.HOME],      // 301 玩家家
      [6, 2, 3, 4, RoomType.EMPTY],    // 302 空房
      [10, 2, 3, 4, RoomType.EMPTY],   // 303 空房
      [14, 2, 3, 4, RoomType.EMPTY],   // 304 空房
      // 西翼房间
      [2, 8, 3, 4, RoomType.EMPTY],    // 305 空房
      [6, 8, 3, 4, RoomType.EMPTY],    // 306 空房
      [10, 8, 3, 4, RoomType.EMPTY],   // 307 空房
      [14, 8, 3, 4, RoomType.EMPTY],   // 308 空房
      // 公共区域
      [18, 2, 4, 4, RoomType.ELEVATOR_HALL],  // 电梯厅（无法运行）
      [23, 2, 3, 4, RoomType.STAIRWELL],      // 消防楼梯
    ];

    // 楼层 1（一楼大厅）：大厅 + 出口
    const floor1Defs = [
      [2, 18, 8, 6, RoomType.EMPTY],   // 一楼大厅
      [11, 18, 4, 4, RoomType.SUPPLY], // 一楼便利店
      [16, 18, 3, 4, RoomType.STAIRWELL], // 楼梯间（1楼）
      [20, 18, 4, 4, RoomType.ELEVATOR_HALL], // 电梯厅（1楼）
    ];

    const rooms = [];
    for (const [rx, ry, rw, rh, type] of [...floor3Defs, ...floor1Defs]) {
      const room = new Room(rx, ry, rw, rh, type);
      for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) { if (y >= 0 && y < GH && x >= 0 && x < GW) map.tiles[y][x] = TileType.FLOOR; }
      if (type === RoomType.HOME) { room.hasSupplies = true; room.supplyType = 'food'; }
      if (type === RoomType.SUPPLY) { room.hasSupplies = true; room.supplyType = 'ammo'; }
      map.rooms.push(room); rooms.push(room);
    }

    const [home, f3r2, f3r3, f3r4, f3r5, f3r6, f3r7, f3r8, elevator3, stair3, lobby, store1f, stair1f, elevator1f] = rooms;

    // 3楼走廊：连接所有房间到电梯厅
    for (let x = home.gridX + home.gridW; x < elevator3.gridX; x++) { if (x >= 0 && x < GW) map.tiles[4][x] = TileType.CORRIDOR; }
    for (let x = f3r2.gridX + f3r2.gridW; x < elevator3.gridX; x++) { if (x >= 0 && x < GW) map.tiles[4][x] = TileType.CORRIDOR; }
    for (let x = f3r3.gridX + f3r3.gridW; x < elevator3.gridX; x++) { if (x >= 0 && x < GW) map.tiles[4][x] = TileType.CORRIDOR; }
    for (let x = f3r4.gridX + f3r4.gridW; x < elevator3.gridX; x++) { if (x >= 0 && x < GW) map.tiles[4][x] = TileType.CORRIDOR; }
    for (let x = f3r5.gridX + f3r5.gridW; x < elevator3.gridX; x++) { if (x >= 0 && x < GW) map.tiles[10][x] = TileType.CORRIDOR; }
    for (let x = f3r6.gridX + f3r6.gridW; x < elevator3.gridX; x++) { if (x >= 0 && x < GW) map.tiles[10][x] = TileType.CORRIDOR; }
    for (let x = f3r7.gridX + f3r7.gridW; x < elevator3.gridX; x++) { if (x >= 0 && x < GW) map.tiles[10][x] = TileType.CORRIDOR; }
    for (let x = f3r8.gridX + f3r8.gridW; x < elevator3.gridX; x++) { if (x >= 0 && x < GW) map.tiles[10][x] = TileType.CORRIDOR; }

    // 3楼电梯厅到楼梯间走廊
    for (let x = elevator3.gridX + elevator3.gridW; x < stair3.gridX; x++) { if (x >= 0 && x < GW) map.tiles[4][x] = TileType.CORRIDOR; }

    // 1楼走廊：连接楼梯间到大厅
    for (let x = stair1f.gridX + stair1f.gridW; x < lobby.gridX; x++) { if (x >= 0 && x < GW) map.tiles[20][x] = TileType.CORRIDOR; }
    for (let x = lobby.gridX + lobby.gridW; x < store1f.gridX; x++) { if (x >= 0 && x < GW) map.tiles[20][x] = TileType.CORRIDOR; }
    for (let x = store1f.gridX + store1f.gridW; x < elevator1f.gridX; x++) { if (x >= 0 && x < GW) map.tiles[20][x] = TileType.CORRIDOR; }

    // 门：所有房间到走廊
    this._pDoor(map, home, home.gridX + home.gridW, 4, DoorSide.RIGHT);
    this._pDoor(map, f3r2, f3r2.gridX + f3r2.gridW, 4, DoorSide.RIGHT);
    this._pDoor(map, f3r3, f3r3.gridX + f3r3.gridW, 4, DoorSide.RIGHT);
    this._pDoor(map, f3r4, f3r4.gridX + f3r4.gridW, 4, DoorSide.RIGHT);
    this._pDoor(map, f3r5, f3r5.gridX + f3r5.gridW, 10, DoorSide.RIGHT);
    this._pDoor(map, f3r6, f3r6.gridX + f3r6.gridW, 10, DoorSide.RIGHT);
    this._pDoor(map, f3r7, f3r7.gridX + f3r7.gridW, 10, DoorSide.RIGHT);
    this._pDoor(map, f3r8, f3r8.gridX + f3r8.gridW, 10, DoorSide.RIGHT);
    this._pDoor(map, elevator3, elevator3.gridX - 1, 4, DoorSide.LEFT);
    this._pDoor(map, elevator3, elevator3.gridX + elevator3.gridW, 4, DoorSide.RIGHT);
    this._pDoor(map, stair3, stair3.gridX - 1, 4, DoorSide.LEFT);
    this._pDoor(map, lobby, lobby.gridX - 1, 20, DoorSide.LEFT);
    this._pDoor(map, store1f, store1f.gridX - 1, 20, DoorSide.LEFT);
    this._pDoor(map, elevator1f, elevator1f.gridX - 1, 20, DoorSide.LEFT);

    // 楼梯连接：3楼楼梯到1楼楼梯（垂直通道）
    for (let y = stair3.gridY + stair3.gridH; y < stair1f.gridY; y++) { if (y >= 0 && y < GH) map.tiles[y][stair3.gridX + 1] = TileType.CORRIDOR; }

    // 拾取物：3楼房间内
    map.lootItems.push({ x: f3r2.centerX, y: f3r2.centerY, type: 'food', amount: 1, collected: false, gridX: f3r2.gridX + Math.floor(f3r2.gridW / 2), gridY: f3r2.gridY + Math.floor(f3r2.gridH / 2) });
    map.lootItems.push({ x: f3r3.centerX, y: f3r3.centerY, type: 'parts', amount: 2, collected: false, gridX: f3r3.gridX + Math.floor(f3r3.gridW / 2), gridY: f3r3.gridY + Math.floor(f3r3.gridH / 2) });
    map.lootItems.push({ x: f3r5.centerX, y: f3r5.centerY, type: 'medkit', amount: 1, collected: false, gridX: f3r5.gridX + Math.floor(f3r5.gridW / 2), gridY: f3r5.gridY + Math.floor(f3r5.gridH / 2) });

    // 1楼便利店武器
    map.lootItems.push({ x: store1f.centerX, y: store1f.centerY, type: 'ammo', amount: 5, collected: false, gridX: store1f.gridX + Math.floor(store1f.gridW / 2), gridY: store1f.gridY + Math.floor(store1f.gridH / 2) });

    map.playerStart = { x: home.centerX, y: home.centerY };
    map.exitPoint = { x: lobby.worldX + lobby.worldW + T, y: lobby.centerY };
    
    // 标记楼层
    map.floors = {
      3: { rooms: [home, f3r2, f3r3, f3r4, f3r5, f3r6, f3r7, f3r8, elevator3, stair3], yRange: [0, 15] },
      1: { rooms: [lobby, store1f, stair1f, elevator1f], yRange: [16, 30] }
    };
    
    return map;
  }

  /** 第一章「废土初探」 */
  static generateChapter1() {
    const T = TILE_SIZE, GW = 30, GH = 25, map = new MapData(GW, GH);
    for (let y = 0; y < GH; y++) map.tiles[y] = new Array(GW).fill(TileType.WALL);

    let h = 0; for (let i = 0; i < 'chapter1_wasteland'.length; i++) h = ((h << 5) - h + 'chapter1_wasteland'.charCodeAt(i)) | 0;
    const rnd = () => { h = (h * 16807 + 0) % 2147483647; return (h & 0x7fffffff) / 0x7fffffff; };
    const ri = (mn, mx) => mn + Math.floor(rnd() * (mx - mn + 1));

    const defs = [
      [2, 2, 4, 4, RoomType.EMPTY], [8, 2, 4, 4, RoomType.SUPPLY], [14, 1, 5, 5, RoomType.ZOMBIE], [21, 3, 4, 3, RoomType.EMPTY],
      [2, 9, 4, 4, RoomType.SURVIVOR], [8, 9, 5, 5, RoomType.ZOMBIE], [15, 9, 4, 4, RoomType.SUPPLY], [21, 9, 3, 5, RoomType.EMPTY],
    ];
    for (const [rx, ry, rw, rh, type] of defs) {
      const room = new Room(rx, ry, rw, rh, type);
      for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) { if (y >= 0 && y < GH && x >= 0 && x < GW) map.tiles[y][x] = TileType.FLOOR; }
      if (type === RoomType.SUPPLY) { room.hasSupplies = true; room.supplyType = ['food', 'water', 'ammo', 'parts'][ri(0, 3)]; }
      if (map.rooms.length === 0 && type === RoomType.EMPTY) { room.hasSupplies = true; room.supplyType = 'food'; }
      map.rooms.push(room);
    }
    const conn = (a, b) => {
      const ax = Math.floor(a.centerX / T), ay = Math.floor(a.centerY / T), bx = Math.floor(b.centerX / T), by = Math.floor(b.centerY / T);
      for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) for (let dy = -1; dy <= 1; dy++) { const ny = ay + dy; if (ny >= 0 && ny < GH && x >= 0 && x < GW && map.tiles[ny][x] === TileType.WALL) map.tiles[ny][x] = TileType.CORRIDOR; }
      for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) for (let dx = -1; dx <= 1; dx++) { const nx = bx + dx; if (y >= 0 && y < GH && nx >= 0 && nx < GW && map.tiles[y][nx] === TileType.WALL) map.tiles[y][nx] = TileType.CORRIDOR; }
    };
    const rs = map.rooms; conn(rs[0], rs[1]); conn(rs[1], rs[2]); conn(rs[2], rs[3]); conn(rs[0], rs[4]); conn(rs[4], rs[5]); conn(rs[5], rs[6]); conn(rs[6], rs[7]); conn(rs[3], rs[7]);
    for (const room of rs) {
      const cand = []; const { gridX: rx, gridY: ry, gridW: rw, gridH: rh } = room;
      if (ry > 0) for (let x = rx + 1; x < rx + rw - 1; x++) { if (x >= 0 && x < GW) cand.push({ gx: x, gy: ry - 1, side: DoorSide.TOP }); }
      if (ry + rh < GH) for (let x = rx + 1; x < rx + rw - 1; x++) { if (x >= 0 && x < GW) cand.push({ gx: x, gy: ry + rh, side: DoorSide.BOTTOM }); }
      if (rx > 0) for (let y = ry + 1; y < ry + rh - 1; y++) { if (y >= 0 && y < GH) cand.push({ gx: rx - 1, gy: y, side: DoorSide.LEFT }); }
      if (rx + rw < GW) for (let y = ry + 1; y < ry + rh - 1; y++) { if (y >= 0 && y < GH) cand.push({ gx: rx + rw, gy: y, side: DoorSide.RIGHT }); }
      if (cand.length === 0) continue;
      const dcn = Math.min(2, cand.length), sh = [...cand].sort(() => rnd() - 0.5);
      for (let i = 0; i < dcn; i++) { const { gx, gy, side } = sh[i]; if (map.tiles[gy]?.[gx] === TileType.WALL) { map.tiles[gy][gx] = TileType.DOOR; room.doors.push({ gx, gy, side }); } }
    }
    const ct = []; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { if (map.tiles[y][x] === TileType.CORRIDOR) ct.push({ gx: x, gy: y }); }
    const shc = [...ct].sort(() => rnd() - 0.5), lcn = Math.min(8, shc.length), lt = ['ammo', 'medkit', 'parts', 'food'];
    for (let i = 0; i < lcn; i++) { const { gx, gy } = shc[i], tp = lt[ri(0, 3)]; map.lootItems.push({ x: gx * T + T / 2, y: gy * T + T / 2, type: tp, amount: tp === 'ammo' ? ri(3, 8) : ri(1, 3), collected: false, gridX: gx, gridY: gy }); }
    map.playerStart = { x: rs[0].centerX, y: rs[0].centerY };
    map.exitPoint = { x: rs[rs.length - 1].worldX + rs[rs.length - 1].worldW + T, y: rs[rs.length - 1].centerY };
    return map;
  }

  // 序章专用：添加门（支持 WALL 和 CORRIDOR 瓦片）
  static _pDoor(map, room, gx, gy, side) {
    if (gx >= 0 && gx < map.gridW && gy >= 0 && gy < map.gridH) {
      const t = map.tiles[gy]?.[gx];
      if (t === TileType.WALL || t === TileType.CORRIDOR) map.tiles[gy][gx] = TileType.DOOR;
    }
    room.doors.push({ gx, gy, side });
  }
}