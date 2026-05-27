/**
 * MapRenderer — 地图渲染器
 * 负责绘制网格地图、房间、走廊、迷雾
 * @version 0.1.0
 */

import { RoomType, TileType, TILE_SIZE } from '../game/MapGenerator.js';

/** 房间类型颜色映射 */
const ROOM_COLORS = {
  [RoomType.HOME]:     { fill: '#2a2a1a', border: '#5a5a3a', label: '家' },
  [RoomType.SMALL_BOX]: { fill: '#3d2b1f', border: '#5a3e2b', label: '储物间' },
  [RoomType.LARGE_BOX]: { fill: '#2e1f14', border: '#4a2e1a', label: '大型储物间' },
  [RoomType.EMPTY]:     { fill: '#1e1e2e', border: '#333350', label: '空房间' },
  [RoomType.SUPPLY]:     { fill: '#1a2e1a', border: '#2a4a2a', label: '物资房' },
  [RoomType.ZOMBIE]:     { fill: '#2e1a1a', border: '#4a2a2a', label: '危险区域' },
  [RoomType.SURVIVOR]:   { fill: '#1a1a2e', border: '#2a2a4a', label: '幸存者' },
};

/** 地砖颜色 */
const TILE_COLORS = {
  [TileType.WALL]:    '#2a2a40',
  [TileType.FLOOR]:   '#1c1c2a',
  [TileType.CORRIDOR]: '#1a1a28',
  [TileType.DOOR]:    '#5a6a4a',
};

/** 迷雾颜色 */
const FOG_COLOR = 'rgba(0, 0, 0, 0.75)';
const FOG_EDGE_COLOR = 'rgba(0, 0, 0, 0.35)';

export default class MapRenderer {
  /**
   * @param {import('../game/MapGenerator.js').MapData} mapData
   */
  constructor(mapData) {
    this.mapData = mapData;

    /** 迷雾渐隐半径（像素） */
    this.fogRadius = TILE_SIZE * 4;

    /** 是否显示迷雾（可关闭用于调试） */
    this.fogEnabled = true;
  }

  /**
   * 渲染整张地图
   * @param {CanvasRenderingContext2D} ctx
   * @param {{ x: number, y: number, w: number, h: number }} viewport - 视口（世界坐标）
   */
  render(ctx, viewport) {
    const { mapData } = this;
    const tw = TILE_SIZE;
    const th = TILE_SIZE;

    // 计算可见网格范围（扩展 1 格避免边缘闪烁）
    const startCol = Math.max(0, Math.floor(viewport.x / tw) - 1);
    const endCol = Math.min(mapData.gridW, Math.ceil((viewport.x + viewport.w) / tw) + 1);
    const startRow = Math.max(0, Math.floor(viewport.y / th) - 1);
    const endRow = Math.min(mapData.gridH, Math.ceil((viewport.y + viewport.h) / th) + 1);

    // 1) 绘制地砖
    for (let y = startRow; y < endRow; y++) {
      const row = mapData.tiles[y];
      if (!row) continue;
      for (let x = startCol; x < endCol; x++) {
        const tile = row[x];
        const color = TILE_COLORS[tile] || TILE_COLORS[TileType.WALL];
        ctx.fillStyle = color;
        ctx.fillRect(x * tw, y * th, tw, th);
      }
    }

    // 2) 绘制房间高亮
    for (const room of mapData.rooms) {
      // 跳过不可见的房间
      if (!this._isRoomVisible(room, viewport)) continue;

      const color = ROOM_COLORS[room.type] || ROOM_COLORS[RoomType.EMPTY];
      const rx = room.worldX;
      const ry = room.worldY;
      const rw = room.worldW;
      const rh = room.worldH;

      // 房间底色
      ctx.fillStyle = color.fill;
      ctx.fillRect(rx, ry, rw, rh);

      // 房间边框
      ctx.strokeStyle = color.border;
      ctx.lineWidth = 2;
      ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);

      // 房间类型标签（小字）
      if (rw >= tw * 2) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(color.label, rx + rw / 2, ry + rh / 2 + 4);
      }

      // 物资图标
      if (room.hasSupplies) {
        this._drawSupplyIcon(ctx, rx + rw / 2, ry + rh / 2 - 10);
      }
    }

    // 2.5) 绘制门标记
    for (const room of mapData.rooms) {
      if (!room.doors || room.doors.length === 0) continue;
      if (!this._isRoomVisible(room, viewport)) continue;

      for (const door of room.doors) {
        const dx = door.gx * tw + tw / 2;
        const dy = door.gy * th + th / 2;
        this._drawDoorMarker(ctx, dx, dy, door.side);
      }
    }

    // 3) 绘制网格线（淡）
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = startCol; x <= endCol; x++) {
      ctx.beginPath();
      ctx.moveTo(x * tw, startRow * th);
      ctx.lineTo(x * tw, endRow * th);
      ctx.stroke();
    }
    for (let y = startRow; y <= endRow; y++) {
      ctx.beginPath();
      ctx.moveTo(startCol * tw, y * th);
      ctx.lineTo(endCol * tw, y * th);
      ctx.stroke();
    }

    // 4) 绘制迷雾
    if (this.fogEnabled) {
      this._renderFog(ctx, viewport);
    }
  }

  /**
   * 渲染迷雾
   */
  _renderFog(ctx, viewport) {
    const { mapData } = this;
    const tw = TILE_SIZE;
    const th = TILE_SIZE;

    // 简单方案：未探索的房间区域画迷雾
    // 优化：只画视口内的未探索区域
    const startCol = Math.max(0, Math.floor(viewport.x / tw));
    const endCol = Math.min(mapData.gridW, Math.ceil((viewport.x + viewport.w) / tw));
    const startRow = Math.max(0, Math.floor(viewport.y / th));
    const endRow = Math.min(mapData.gridH, Math.ceil((viewport.y + viewport.h) / th));

    ctx.fillStyle = FOG_COLOR;

    for (let y = startRow; y < endRow; y++) {
      for (let x = startCol; x < endCol; x++) {
        const room = mapData.getRoomAt(x, y);
        if (!room || !room.explored) {
          // 检查该格是否为地板（墙壁不画迷雾，因为墙壁本身就是黑的）
          const tile = mapData.tiles[y]?.[x];
          if (tile !== TileType.WALL) {
            ctx.fillRect(x * tw, y * th, tw, th);
          }
        }
      }
    }
  }

  /**
   * 绘制小地图（可选，在角落显示）
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} px - 屏幕 X
   * @param {number} py - 屏幕 Y
   * @param {number} size - 小地图尺寸（像素）
   * @param {{ x: number, y: number }} playerPos - 玩家世界坐标
   */
  renderMinimap(ctx, px, py, size, playerPos) {
    const { mapData } = this;
    const scale = size / Math.max(mapData.width, mapData.height);

    ctx.save();
    ctx.translate(px, py);
    ctx.scale(scale, scale);

    // 背景
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, mapData.width, mapData.height);

    // 已探索房间
    for (const room of mapData.rooms) {
      if (!room.explored) continue;
      const color = ROOM_COLORS[room.type] || ROOM_COLORS[RoomType.EMPTY];
      ctx.fillStyle = color.fill;
      ctx.fillRect(room.worldX, room.worldY, room.worldW, room.worldH);
    }

    // 玩家位置
    ctx.fillStyle = '#4a9eff';
    ctx.beginPath();
    ctx.arc(playerPos.x, playerPos.y, TILE_SIZE * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ---- 私有辅助 ----

  _isRoomVisible(room, viewport) {
    return room.worldX + room.worldW > viewport.x
        && room.worldX < viewport.x + viewport.w
        && room.worldY + room.worldH > viewport.y
        && room.worldY < viewport.y + viewport.h;
  }

  _drawSupplyIcon(ctx, cx, cy) {
    // 简单的菱形物资图标
    ctx.save();
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx + 6, cy);
    ctx.lineTo(cx, cy + 8);
    ctx.lineTo(cx - 6, cy);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /**
   * 绘制门标记 — 半透明缺口 + 淡绿色门符号
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx - 门中心世界 X
   * @param {number} cy - 门中心世界 Y
   * @param {string} side - DoorSide
   */
  _drawDoorMarker(ctx, cx, cy, side) {
    const tw = TILE_SIZE;
    ctx.save();

    // 门底色 — 淡绿色半透明
    ctx.fillStyle = 'rgba(90, 160, 80, 0.5)';
    ctx.fillRect(cx - tw / 2, cy - tw / 2, tw, tw);

    // 门符号 — 根据朝向绘制小箭头
    ctx.fillStyle = '#c0ffc0';
    ctx.strokeStyle = '#6aaa6a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const s = 6;
    switch (side) {
      case 'top':
        ctx.moveTo(cx, cy - s); ctx.lineTo(cx - s, cy + s); ctx.lineTo(cx + s, cy + s); ctx.closePath();
        break;
      case 'bottom':
        ctx.moveTo(cx, cy + s); ctx.lineTo(cx - s, cy - s); ctx.lineTo(cx + s, cy - s); ctx.closePath();
        break;
      case 'left':
        ctx.moveTo(cx - s, cy); ctx.lineTo(cx + s, cy - s); ctx.lineTo(cx + s, cy + s); ctx.closePath();
        break;
      case 'right':
        ctx.moveTo(cx + s, cy); ctx.lineTo(cx - s, cy - s); ctx.lineTo(cx - s, cy + s); ctx.closePath();
        break;
    }
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}