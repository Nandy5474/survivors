/**
 * FloorMapPanel — 类银河城横版楼层视图
 * 宏观显示楼层结构（类似银河城地图），用于楼层切换
 * Tab 键在横版视图和俯视角探索之间切换
 * @version 1.0.0
 */

import EventBus, { GameEvents } from '../game/EventBus.js';

export default class FloorMapPanel {
  /**
   * @param {import('../game/Game.js').default} game
   * @param {import('../game/MapGenerator.js').MapData} mapData
   */
  constructor(game, mapData) {
    this.game = game;
    this.mapData = mapData;
    
    /** @type {HTMLElement|null} 面板容器 */
    this._panelEl = null;
    /** @type {HTMLCanvasElement|null} 画布 */
    this._canvas = null;
    /** @type {CanvasRenderingContext2D|null} */
    this._ctx = null;
    
    /** 当前楼层 */
    this._currentFloor = 1;
    /** 总楼层数 */
    this._totalFloors = 3;
    
    /** 是否显示横版视图 */
    this._showSideView = false;
    
    this._resizeHandler = this._onResize.bind(this);
  }

  /**
   * 初始化面板
   */
  init() {
    this._createPanel();
    this._bindEvents();
    window.addEventListener('resize', this._resizeHandler);
    this._render();
  }

  /**
   * 销毁面板
   */
  destroy() {
    this._unbindEvents();
    window.removeEventListener('resize', this._resizeHandler);
    if (this._panelEl) {
      this._panelEl.remove();
      this._panelEl = null;
    }
  }

  /**
   * 切换横版/俯视角视图
   */
  toggleView() {
    this._showSideView = !this._showSideView;
    this._render();
    EventBus.emit(GameEvents.UI_NOTIFICATION, {
      type: 'info',
      message: this._showSideView ? '切换到横版视图' : '切换到俯视角视图'
    });
  }

  /**
   * 切换到指定楼层
   * @param {number} floor
   */
  switchFloor(floor) {
    if (floor < 1 || floor > this._totalFloors) return;
    this._currentFloor = floor;
    this._render();
    EventBus.emit('floor:changed', { floor: this._currentFloor });
  }

  // ========== 私有方法 ==========

  _createPanel() {
    // 创建面板 DOM
    const panel = document.createElement('div');
    panel.id = 'floor-map-panel';
    panel.className = 'hidden';
    panel.innerHTML = `
      <div id="floor-map-header">
        <h3>楼层地图</h3>
        <button id="floor-map-close">✕</button>
      </div>
      <canvas id="canvas-floor-map"></canvas>
      <div id="floor-map-controls">
        <button class="floor-btn" data-floor="1">1F</button>
        <button class="floor-btn" data-floor="2">2F</button>
        <button class="floor-btn" data-floor="3">3F</button>
      </div>
    `;
    
    const uiLayer = document.getElementById('ui-layer');
    if (uiLayer) {
      uiLayer.appendChild(panel);
    } else {
      document.body.appendChild(panel);
    }
    
    this._panelEl = panel;
    this._canvas = document.getElementById('canvas-floor-map');
    this._ctx = this._canvas?.getContext('2d');
    
    // 添加样式
    this._addStyles();
  }

  _addStyles() {
    if (document.getElementById('floor-map-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'floor-map-styles';
    style.textContent = `
      #floor-map-panel {
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 80vw;
        max-width: 900px;
        height: 70vh;
        max-height: 600px;
        background: rgba(20, 20, 40, 0.95);
        border: 2px solid rgba(100, 100, 160, 0.5);
        border-radius: 12px;
        z-index: 95;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 8px 48px rgba(0, 0, 0, 0.6);
      }
      #floor-map-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      #floor-map-header h3 {
        font-size: 18px;
        font-weight: 700;
        color: #e8d5a3;
        letter-spacing: 2px;
      }
      #floor-map-close {
        width: 32px;
        height: 32px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #fff;
        font-size: 16px;
        border-radius: 6px;
        cursor: pointer;
      }
      #canvas-floor-map {
        flex: 1;
        width: 100%;
        background: rgba(10, 10, 30, 0.8);
      }
      #floor-map-controls {
        display: flex;
        gap: 8px;
        padding: 12px;
        justify-content: center;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
      .floor-btn {
        padding: 6px 16px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #fff;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }
      .floor-btn:hover {
        background: rgba(100, 100, 200, 0.3);
      }
      .floor-btn.active {
        background: rgba(100, 100, 200, 0.5);
        border-color: rgba(150, 150, 255, 0.7);
      }
    `;
    
    document.head.appendChild(style);
  }

  _bindEvents() {
    // 关闭按钮
    const closeBtn = document.getElementById('floor-map-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }
    
    // 楼层切换按钮
    const floorBtns = document.querySelectorAll('.floor-btn');
    for (const btn of floorBtns) {
      btn.addEventListener('click', (e) => {
        const floor = parseInt(e.target.dataset.floor);
        this.switchFloor(floor);
      });
    }
    
    // Tab 键切换视图
    this._tabHandler = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        this.toggleView();
      }
    };
    window.addEventListener('keydown', this._tabHandler);
    
    // ESC 关闭
    this._escHandler = (e) => {
      if (e.key === 'Escape' && this._panelEl && !this._panelEl.classList.contains('hidden')) {
        this.hide();
      }
    };
    window.addEventListener('keydown', this._escHandler);
  }

  _unbindEvents() {
    if (this._tabHandler) {
      window.removeEventListener('keydown', this._tabHandler);
    }
    if (this._escHandler) {
      window.removeEventListener('keydown', this._escHandler);
    }
  }

  _onResize() {
    this._render();
  }

  /**
   * 显示面板
   */
  show() {
    if (this._panelEl) {
      this._panelEl.classList.remove('hidden');
      this._render();
    }
  }

  /**
   * 隐藏面板
   */
  hide() {
    if (this._panelEl) {
      this._panelEl.classList.add('hidden');
    }
  }

  /**
   * 渲染横版楼层地图
   */
  _render() {
    if (!this._ctx || !this._canvas) return;
    
    // 设置画布大小
    const rect = this._canvas.getBoundingClientRect();
    this._canvas.width = rect.width;
    this._canvas.height = rect.height;
    
    const ctx = this._ctx;
    const w = this._canvas.width;
    const h = this._canvas.height;
    
    // 清空
    ctx.fillStyle = 'rgba(10, 10, 30, 0.95)';
    ctx.fillRect(0, 0, w, h);
    
    if (this._showSideView) {
      this._renderSideView(ctx, w, h);
    } else {
      this._renderTopDownView(ctx, w, h);
    }
    
    // 更新楼层按钮状态
    const floorBtns = document.querySelectorAll('.floor-btn');
    for (const btn of floorBtns) {
      if (parseInt(btn.dataset.floor) === this._currentFloor) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  }

  /**
   * 渲染横版视图（类银河城风格）
   */
  _renderSideView(ctx, w, h) {
    // 横版视图：显示楼层堆叠，类似银河城地图
    const floorH = h / this._totalFloors;
    const roomW = 60;
    const roomH = 40;
    
    for (let floor = 1; floor <= this._totalFloors; floor++) {
      const fy = (floor - 1) * floorH;
      
      // 绘制楼层背景
      ctx.fillStyle = floor === this._currentFloor 
        ? 'rgba(100, 100, 200, 0.15)' 
        : 'rgba(50, 50, 80, 0.1)';
      ctx.fillRect(0, fy, w, floorH);
      
      // 绘制楼层标签
      ctx.fillStyle = floor === this._currentFloor 
        ? 'rgba(255, 255, 255, 0.9)' 
        : 'rgba(255, 255, 255, 0.4)';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${floor}F`, 10, fy + 20);
      
      // 绘制房间（模拟数据）
      const rooms = this._getFloorRooms(floor);
      for (let i = 0; i < rooms.length; i++) {
        const room = rooms[i];
        const rx = 60 + i * (roomW + 20);
        const ry = fy + (floorH - roomH) / 2;
        
        // 房间颜色
        ctx.fillStyle = room.explored 
          ? this._getRoomColor(room.type)
          : 'rgba(100, 100, 100, 0.4)';
        ctx.fillRect(rx, ry, roomW, roomH);
        
        // 边框
        ctx.strokeStyle = room.explored 
          ? 'rgba(255, 255, 255, 0.3)' 
          : 'rgba(100, 100, 100, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx, ry, roomW, roomH);
        
        // 房间标记
        if (room.explored) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(this._getRoomLabel(room.type), rx + roomW / 2, ry + roomH / 2 + 3);
        }
      }
      
      // 绘制连接线（楼梯/电梯）
      if (floor < this._totalFloors) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(w / 2, fy + floorH);
        ctx.lineTo(w / 2, fy + floorH + floorH / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // 绘制楼梯标记
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⬆', w / 2, fy + floorH + 15);
      }
    }
  }

  /**
   * 渲染俯视角视图（当前楼层的 2.5D 视图）
   */
  _renderTopDownView(ctx, w, h) {
    if (!this.mapData) return;
    
    const mapW = this.mapData.width;
    const mapH = this.mapData.height;
    
    // 计算缩放
    const scaleX = w / mapW;
    const scaleY = h / mapH;
    const scale = Math.min(scaleX, scaleY) * 0.8;
    
    // 居中
    const offsetX = (w - mapW * scale) / 2;
    const offsetY = (h - mapH * scale) / 2;
    
    // 绘制房间
    for (const room of this.mapData.rooms) {
      const rx = offsetX + room.worldX * scale;
      const ry = offsetY + room.worldY * scale;
      const rw = room.worldW * scale;
      const rh = room.worldH * scale;
      
      ctx.fillStyle = room.explored 
        ? this._getRoomColor(room.type)
        : 'rgba(100, 100, 100, 0.4)';
      ctx.fillRect(rx, ry, rw, rh);
      
      ctx.strokeStyle = room.explored 
        ? 'rgba(255, 255, 255, 0.3)' 
        : 'rgba(100, 100, 100, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(rx, ry, rw, rh);
    }
    
    // 绘制玩家位置（模拟）
    const playerFloor = this._currentFloor;
    // 实际应该从 GameScene 获取玩家位置
    ctx.fillStyle = 'rgba(230, 57, 70, 0.9)';
    ctx.beginPath();
    ctx.arc(offsetX + mapW * scale / 2, offsetY + mapH * scale / 2, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * 获取指定楼层的房间（模拟数据）
   */
  _getFloorRooms(floor) {
    // 模拟数据：每个楼层有 3-5 个房间
    const rooms = [];
    const count = 3 + (floor % 3);
    for (let i = 0; i < count; i++) {
      rooms.push({
        type: i === 0 ? 'home' : (i === 1 ? 'supply' : 'empty'),
        explored: i < 2 // 前两个已探索
      });
    }
    return rooms;
  }

  /**
   * 获取房间颜色
   */
  _getRoomColor(type) {
    switch (type) {
      case 'home': return 'rgba(52, 152, 219, 0.7)';
      case 'supply': return 'rgba(46, 204, 113, 0.7)';
      case 'zombie': return 'rgba(231, 76, 60, 0.7)';
      case 'survivor': return 'rgba(155, 89, 182, 0.7)';
      default: return 'rgba(149, 165, 166, 0.5)';
    }
  }

  /**
   * 获取房间标签
   */
  _getRoomLabel(type) {
    switch (type) {
      case 'home': return '家';
      case 'supply': return '物';
      case 'zombie': return '尸';
      case 'survivor': return '人';
      default: return '空';
    }
  }
}
