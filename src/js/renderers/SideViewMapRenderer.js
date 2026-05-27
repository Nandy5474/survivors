/**
 * SideViewMapRenderer — 横版宏观地图渲染器
 * 类银河城风格：显示建筑/楼层结构横截面
 * @version 0.1.0
 */

import { RoomType, TILE_SIZE } from '../game/MapGenerator.js';

const FLOOR_COLORS = {
  ground: { bg: '#2a3a2a', border: '#4a6a3a' },
  basement: { bg: '#1a1a2e', border: '#3a3a5a' },
  rooftop: { bg: '#3a2a1a', border: '#5a4a3a' },
  upper: { bg: '#2a2a3a', border: '#4a4a6a' },
};

const ROOM_COLORS_SV = {
  [RoomType.HOME]: { fill: '#4a5a3a', border: '#6a7a5a' },
  [RoomType.SMALL_BOX]: { fill: '#5a3e2b', border: '#7a5a40' },
  [RoomType.LARGE_BOX]: { fill: '#4a2e1a', border: '#6a4a30' },
  [RoomType.EMPTY]: { fill: '#2a2a3e', border: '#404060' },
  [RoomType.SUPPLY]: { fill: '#1a3a1a', border: '#2a5a2a' },
  [RoomType.ZOMBIE]: { fill: '#3a1a1a', border: '#5a2a2a' },
  [RoomType.SURVIVOR]: { fill: '#1a1a3a', border: '#2a2a5a' },
};

const ROOM_LABELS_SV = {
  [RoomType.HOME]: '家', [RoomType.SMALL_BOX]: '储藏', [RoomType.LARGE_BOX]: '仓库',
  [RoomType.EMPTY]: '空', [RoomType.SUPPLY]: '物资', [RoomType.ZOMBIE]: '危险',
  [RoomType.SURVIVOR]: '幸存',
};

export default class SideViewMapRenderer {
  /**
   * @param {import('../game/WorldMap.js').default} worldMap
   */
  constructor(worldMap) {
    this.worldMap = worldMap;
    /** 高亮楼层边框颜色 */
    this.highlightColor = '#4a9eff';
    /** 玩家标记颜色 */
    this.playerColor = '#4a9eff';
  }

  /**
   * 渲染横版地图
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width - 画布宽度
   * @param {number} height - 画布高度
   * @param {string} playerFloorId - 玩家所在楼层 ID
   * @param {{x:number,y:number}|null} playerWorldPos - 玩家世界坐标
   * @param {{floorId:string, cx:number, cy:number}|null} hoveredFloor - 鼠标悬停楼层（用于点击交互）
   */
  render(ctx, width, height, playerFloorId, playerWorldPos, hoveredFloor = null) {
    const { floors } = this.worldMap;
    const n = floors.length;
    if (n === 0) {
      ctx.fillStyle = 'rgba(10, 10, 26, 0.95)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#666';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无楼层数据', width / 2, height / 2);
      return;
    }

    // 背景
    ctx.fillStyle = 'rgba(10, 10, 26, 0.95)';
    ctx.fillRect(0, 0, width, height);

    // 装饰线
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    const headerH = 32;
    const footerH = 20;
    const availH = height - headerH - footerH;
    const floorH = Math.max(40, Math.floor(availH / n) - 12);
    const startY = headerH + Math.max(0, (availH - (floorH + 12) * n) / 2);
    const padX = 50;

    // 标题
    ctx.fillStyle = '#e8d5a3';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.worldMap.name} · ${n} 层`, width / 2, headerH - 8);

    for (let i = 0; i < n; i++) {
      const floor = floors[i];
      const fy = startY + i * (floorH + 12);
      const { mapData } = floor;
      const fc = FLOOR_COLORS[floor.id] || FLOOR_COLORS.ground;

      // 楼层背景
      ctx.fillStyle = fc.bg;
      ctx.fillRect(padX, fy, width - padX * 2, floorH);
      ctx.strokeStyle = fc.border;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(padX, fy, width - padX * 2, floorH);

      // 当前楼层高亮
      if (floor.id === playerFloorId) {
        ctx.strokeStyle = this.highlightColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(padX - 2, fy - 2, width - padX * 2 + 4, floorH + 4);
        // 脉冲光晕
        ctx.strokeStyle = 'rgba(74, 158, 255, 0.25)';
        ctx.lineWidth = 6;
        ctx.strokeRect(padX - 3, fy - 3, width - padX * 2 + 6, floorH + 6);
      }

      // 悬停高亮
      if (hoveredFloor && hoveredFloor.floorId === floor.id) {
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(padX, fy, width - padX * 2, floorH);
      }

      // 楼层标签
      ctx.fillStyle = '#e0e0e0';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(floor.name, padX + 8, fy - 4);

      // 已探索房间数
      const explored = mapData.rooms.filter(r => r.explored).length;
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '10px sans-serif';
      ctx.fillText(`已探索 ${explored}/${mapData.rooms.length}`, padX + 8, fy + floorH - 4);

      // 房间矩形
      const usableW = width - padX * 2 - 16;
      const maxWorldW = mapData.width || 1;
      const scaleX = usableW / Math.max(maxWorldW, 1);

      for (const room of mapData.rooms) {
        if (!room.explored) continue;
        const rc = ROOM_COLORS_SV[room.type] || ROOM_COLORS_SV[RoomType.EMPTY];
        const rx = padX + 8 + room.worldX * scaleX;
        const rw = Math.max(3, room.worldW * scaleX);
        const ry = fy + 4;
        const rh = floorH - 8;

        ctx.fillStyle = rc.fill;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = rc.border;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(rx, ry, rw, rh);

        // 房间标签
        if (rw > 30) {
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.font = '9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(ROOM_LABELS_SV[room.type] || '?', rx + rw / 2, ry + rh / 2 + 3);
        }
      }

      // 玩家位置标记
      if (floor.id === playerFloorId && playerWorldPos) {
        const px = padX + 8 + playerWorldPos.x * scaleX;
        const py = fy + floorH / 2;

        // 光晕
        ctx.fillStyle = 'rgba(74, 158, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fill();

        // 圆点
        ctx.fillStyle = this.playerColor;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // 楼层连接线
    for (const conn of this.worldMap.connections) {
      const fi = floors.findIndex(f => f.id === conn.fromFloorId);
      const ti = floors.findIndex(f => f.id === conn.toFloorId);
      if (fi < 0 || ti < 0) continue;

      const fy1 = startY + fi * (floorH + 12) + floorH / 2;
      const fy2 = startY + ti * (floorH + 12) + floorH / 2;
      const cx = width - padX + 16;

      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, fy1);
      ctx.lineTo(cx, fy2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 连接图标
      const icon = conn.type === 'stairs' ? '⇅' : (conn.type === 'elevator' ? '⊞' : '↑');
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(icon, cx, (fy1 + fy2) / 2);
    }

    if (n === 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('单层建筑，无其他楼层', width / 2, height - 10);
    }
  }

  /**
   * 检测屏幕坐标是否命中某个楼层（用于点击交互）
   * @param {number} mouseX
   * @param {number} mouseY
   * @param {number} width
   * @param {number} height
   * @returns {{floorId:string, floorIndex:number}|null}
   */
  hitTest(mouseX, mouseY, width, height) {
    const { floors } = this.worldMap;
    const n = floors.length;
    if (n === 0) return null;

    const headerH = 32;
    const footerH = 20;
    const availH = height - headerH - footerH;
    const floorH = Math.max(40, Math.floor(availH / n) - 12);
    const startY = headerH + Math.max(0, (availH - (floorH + 12) * n) / 2);
    const padX = 50;

    if (mouseX < padX || mouseX > width - padX) return null;

    for (let i = 0; i < n; i++) {
      const fy = startY + i * (floorH + 12);
      if (mouseY >= fy && mouseY <= fy + floorH) {
        return { floorId: floors[i].id, floorIndex: i };
      }
    }
    return null;
  }
}
