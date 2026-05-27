/**
 * FullMapRenderer — 全屏大地图渲染器
 * 渲染已探索/未探索房间、玩家位置、标记
 * @version 1.0.0
 */

export default class FullMapRenderer {
  /**
   * @param {import('./MapGenerator.js').MapData} mapData
   */
  constructor(mapData) {
    this.mapData = mapData;
  }

  /**
   * 渲染全屏地图
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D 上下文
   * @param {number} canvasWidth - 画布宽度
   * @param {number} canvasHeight - 画布高度
   * @param {{x: number, y: number}} playerPos - 玩家位置（世界坐标）
   */
  render(ctx, canvasWidth, canvasHeight, playerPos) {
    if (!this.mapData) return;

    const mapW = this.mapData.width;
    const mapH = this.mapData.height;

    // 计算缩放比例，使地图适应画布
    const padding = 40;
    const scaleX = (canvasWidth - padding * 2) / mapW;
    const scaleY = (canvasHeight - padding * 2 - 60) / mapH; // 减去标题和图例空间
    const scale = Math.min(scaleX, scaleY);

    // 计算偏移，使地图居中
    const offsetX = (canvasWidth - mapW * scale) / 2;
    const offsetY = (canvasHeight - mapH * scale) / 2 + 30; // 向下偏移一些

    // 清空画布
    ctx.fillStyle = 'rgba(10, 10, 30, 0.95)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 绘制网格背景
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 0.5;
    const gridSize = 32 * scale;
    for (let x = offsetX; x < canvasWidth - offsetX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, offsetY);
      ctx.lineTo(x, offsetY + mapH * scale);
      ctx.stroke();
    }
    for (let y = offsetY; y < offsetY + mapH * scale; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(offsetX, y);
      ctx.lineTo(offsetX + mapW * scale, y);
      ctx.stroke();
    }

    // 绘制房间
    for (const room of this.mapData.rooms) {
      const rx = offsetX + room.worldX * scale;
      const ry = offsetY + room.worldY * scale;
      const rw = room.worldW * scale;
      const rh = room.worldH * scale;

      // 根据探索状态选择颜色
      if (room.explored) {
        // 已探索：根据房间类型选择颜色
        let color = 'rgba(46, 204, 113, 0.6)'; // 默认绿色
        switch (room.type) {
          case 'home':
            color = 'rgba(52, 152, 219, 0.7)'; // 蓝色 - 家
            break;
          case 'supply':
            color = 'rgba(46, 204, 113, 0.7)'; // 绿色 - 物资
            break;
          case 'zombie':
            color = 'rgba(231, 76, 60, 0.7)'; // 红色 - 丧尸
            break;
          case 'survivor':
            color = 'rgba(155, 89, 182, 0.7)'; // 紫色 - 幸存者
            break;
          case 'empty':
            color = 'rgba(149, 165, 166, 0.5)'; // 灰色 - 空房间
            break;
        }
        ctx.fillStyle = color;
        ctx.fillRect(rx, ry, rw, rh);

        // 绘制边框
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx, ry, rw, rh);

        // 绘制房间类型标记
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = `${Math.max(10, 12 * scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let label = '';
        switch (room.type) {
          case 'home': label = '家'; break;
          case 'supply': label = '物'; break;
          case 'zombie': label = '尸'; break;
          case 'survivor': label = '人'; break;
          default: label = '';
        }
        
        if (label) {
          ctx.fillText(label, rx + rw / 2, ry + rh / 2);
        }
      } else {
        // 未探索：灰色
        ctx.fillStyle = 'rgba(100, 100, 100, 0.4)';
        ctx.fillRect(rx, ry, rw, rh);

        ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx, ry, rw, rh);

        // 绘制问号
        ctx.fillStyle = 'rgba(150, 150, 150, 0.5)';
        ctx.font = `${Math.max(10, 14 * scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', rx + rw / 2, ry + rh / 2);
      }
    }

    // 绘制走廊
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2 * scale;
    for (let y = 0; y < this.mapData.gridH; y++) {
      for (let x = 0; x < this.mapData.gridW; x++) {
        const tile = this.mapData.tiles[y]?.[x];
        if (tile === 2) { // CORRIDOR
          const cx = offsetX + (x + 0.5) * (this.mapData.TILE_SIZE || 64) * scale;
          const cy = offsetY + (y + 0.5) * (this.mapData.TILE_SIZE || 64) * scale;
          
          // 检查相邻走廊并绘制连接线
          if (x > 0 && this.mapData.tiles[y]?.[x - 1] === 2) {
            const nx = offsetX + (x - 0.5) * (this.mapData.TILE_SIZE || 64) * scale;
            ctx.beginPath();
            ctx.moveTo(nx, cy);
            ctx.lineTo(cx, cy);
            ctx.stroke();
          }
          if (y > 0 && this.mapData.tiles[y - 1]?.[x] === 2) {
            const ny = offsetY + (y - 0.5) * (this.mapData.TILE_SIZE || 64) * scale;
            ctx.beginPath();
            ctx.moveTo(cx, ny);
            ctx.lineTo(cx, cy);
            ctx.stroke();
          }
        }
      }
    }

    // 绘制玩家位置
    if (playerPos) {
      const px = offsetX + playerPos.x * scale;
      const py = offsetY + playerPos.y * scale;

      // 绘制玩家标记（红色圆点 + 光晕）
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(230, 57, 70, 0.8)';
      ctx.fillStyle = 'rgba(230, 57, 70, 0.9)';
      ctx.beginPath();
      ctx.arc(px, py, 6 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 绘制方向指示器
      ctx.strokeStyle = 'rgba(230, 57, 70, 0.9)';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(px, py - 10 * scale);
      ctx.lineTo(px, py - 16 * scale);
      ctx.stroke();
    }

    // 绘制图例
    const legendY = canvasHeight - 40;
    const legendStartX = canvasWidth / 2 - 200;

    // 已探索
    ctx.fillStyle = 'rgba(46, 204, 113, 0.7)';
    ctx.fillRect(legendStartX, legendY, 12, 12);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('已探索', legendStartX + 18, legendY + 6);

    // 未探索
    ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
    ctx.fillRect(legendStartX + 100, legendY, 12, 12);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('未探索', legendStartX + 118, legendY + 6);

    // 玩家位置
    ctx.fillStyle = 'rgba(230, 57, 70, 0.9)';
    ctx.beginPath();
    ctx.arc(legendStartX + 200 + 6, legendY + 6, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('玩家位置', legendStartX + 218, legendY + 6);
  }
}
