/**
 * CombatUI — 战斗界面渲染器
 * 在 Canvas 上绘制 AP 回合制战斗 HUD：
 *   - 丧尸血条 + 名称
 *   - 玩家 AP 点数显示
 *   - 行动按钮（攻击 / 防御 / 撤退 / 等待）
 *   - 战斗日志（简化）
 * @version 0.1.0
 */

import CombatManager, { CombatAction } from './CombatManager.js';

/** 行动按钮定义 */
const ACTION_BUTTONS = [
  { action: CombatAction.ATTACK,  label: '⚔ 攻击',  color: '#e63946', desc: '消耗1AP，攻击丧尸' },
  { action: CombatAction.DEFEND,  label: '🛡 防御',  color: '#457b9d', desc: '消耗1AP，减伤50%' },
  { action: CombatAction.RETREAT, label: '🏃 撤退', color: '#e9c46a', desc: '尝试逃离战斗' },
  { action: CombatAction.WAIT,    label: '⏳ 等待', color: '#6c757d', desc: '结束本回合' },
];

/** 按钮布局 */
const BTN = {
  width: 110,
  height: 44,
  gap: 12,
  marginBottom: 24,
};

export default class CombatUI {
  /**
   * @param {import('../game/Game.js').default} game
   * @param {CombatManager} combatManager
   */
  constructor(game, combatManager) {
    this.game = game;
    this.combat = combatManager;

    /** @type {CanvasRenderingContext2D} */
    this.ctx = null;

    /** @type {HTMLCanvasElement} */
    this.canvas = null;

    /** @type {Array<object>} 按钮热区（用于点击检测） */
    this._buttons = [];

    /** @type {number} 当前悬停按钮索引 */
    this._hoveredBtn = -1;

    /** @type {Array<string>} 可见战斗日志（最近 5 条） */
    this._visibleLog = [];

    this._initCanvas();
    this._bindEvents();
  }

  /**
   * 初始化战斗 UI 专用 Canvas 层
   * 修复：getLayer() 接受数字索引，3 = fx 层
   */
  _initCanvas() {
    const layer = this.game.getLayer(3);  // 3 = fx 层
    if (!layer || !layer.canvas) {
      console.error('[CombatUI] fx 层未找到，战斗 UI 无法渲染');
      return;
    }
    this.canvas = layer.canvas;
    this.ctx = layer.ctx;
  }

  /**
   * 绑定鼠标/触摸事件（点击行动按钮）
   */
  _bindEvents() {
    if (!this.canvas) return;
    this._onMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left;
      const y = (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top;
      this._checkHover(x, y);
    };

    this._onMouseDown = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left;
      const y = (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top;
      this._handleClick(x, y);
    };

    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    // 触摸支持
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this._onMouseDown(e);
    }, { passive: false });
  }

  /**
   * 每帧渲染战斗 UI（在 GameScene 的 render 中调用）
   * @param {number} dt - 帧间隔（秒）
   */
  render(dt) {
    if (!this.combat.inCombat) return;
    if (!this.ctx || !this.canvas) return;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 清空本帧
    ctx.clearRect(0, 0, w, h);

    const state = this.combat.getCombatState();
    if (!state) return;

    // 更新可见日志
    this._visibleLog = state.log.slice(-5);

    this._drawOverlay(w, h);
    this._drawZombieInfo(state, w, h);
    this._drawPlayerInfo(state, w, h);
    this._drawActionButtons(state, w, h);
    this._drawCombatLog(w, h);
  }

  /**
   * 绘制半透明遮罩（仅覆盖顶部和底部）
   */
  _drawOverlay(w, h) {
    const ctx = this.ctx;

    // 顶部信息栏背景
    const topGrad = ctx.createLinearGradient(0, 0, 0, 100);
    topGrad.addColorStop(0, 'rgba(0,0,0,0.65)');
    topGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, w, 100);

    // 底部按钮区背景
    const botGrad = ctx.createLinearGradient(0, h - 200, 0, h);
    botGrad.addColorStop(0, 'rgba(0,0,0,0)');
    botGrad.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, h - 200, w, 200);
  }

  /**
   * 绘制丧尸信息（顶部居中）
   */
  _drawZombieInfo(state, w, h) {
    const ctx = this.ctx;
    const z = state.zombie;
    const cx = w / 2;

    // 名称
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(z.name, cx, 16);

    // 精英标识
    if (z.isElite) {
      ctx.fillStyle = '#f4a261';
      ctx.font = '13px "PingFang SC", sans-serif';
      ctx.fillText('★ 精英', cx, 40);
    }

    // 血条
    const barW = 220;
    const barH = 14;
    const barX = cx - barW / 2;
    const barY = 58;

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(barX, barY, barW, barH);

    const hpRatio = Math.max(0, state.zombieCurrentHp / z.maxHp);
    const hpColor = hpRatio > 0.5 ? '#e63946' : hpRatio > 0.25 ? '#e9c46a' : '#e63946';
    ctx.fillStyle = hpColor;
    ctx.fillRect(barX, barY, barW * hpRatio, barH);

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.strokeRect(barX, barY, barW, barH);

    // 血量文字
    ctx.fillStyle = '#fff';
    ctx.font = '11px monospace';
    ctx.fillText(`${Math.ceil(state.zombieCurrentHp)} / ${z.maxHp}`, cx, barY + 16);
  }

  /**
   * 绘制玩家信息（左上）
   */
  _drawPlayerInfo(state, w, h) {
    const ctx = this.ctx;
    const px = 16;
    const py = 16;

    // 玩家 HP
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(px - 4, py - 4, 180, 60);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.strokeRect(px - 4, py - 4, 180, 60);

    ctx.fillStyle = '#fff';
    ctx.font = '13px "PingFang SC", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`HP: ${state.playerHp} / ${state.playerMaxHp}`, px, py);

    // HP 血条
    const hpBarW = 160;
    const hpBarH = 8;
    const hpBarX = px;
    const hpBarY = py + 18;
    const hpRatio = state.playerHp / state.playerMaxHp;

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
    ctx.fillStyle = hpRatio > 0.5 ? '#2a9d8f' : hpRatio > 0.25 ? '#e9c46a' : '#e63946';
    ctx.fillRect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH);

    // AP 显示
    ctx.fillStyle = '#fff';
    ctx.font = '13px "PingFang SC", sans-serif';
    ctx.fillText('AP:', px, py + 34);

    for (let i = 0; i < state.playerMaxAp; i++) {
      const apX = px + 32 + i * 20;
      const apY = py + 36;
      ctx.beginPath();
      ctx.arc(apX, apY, 7, 0, Math.PI * 2);
      ctx.fillStyle = i < state.playerAp ? '#e9c46a' : 'rgba(255,255,255,0.15)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.stroke();
    }

    // 回合信息
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '12px monospace';
    ctx.fillText(`第 ${state.turn} 回合`, px, py + 50);
  }

  /**
   * 绘制行动按钮（底部居中）
   */
  _drawActionButtons(state, w, h) {
    const ctx = this.ctx;
    this._buttons = [];

    const totalW = ACTION_BUTTONS.length * BTN.width + (ACTION_BUTTONS.length - 1) * BTN.gap;
    let startX = (w - totalW) / 2;
    const startY = h - BTN.marginBottom - BTN.height;

    ACTION_BUTTONS.forEach((btn, i) => {
      const bx = startX + i * (BTN.width + BTN.gap);
      const by = startY;

      const canUse = this._canUseAction(btn.action, state);
      const isHovered = i === this._hoveredBtn;

      // 按钮背景
      ctx.fillStyle = canUse
        ? (isHovered ? this._lighten(btn.color, 20) : btn.color)
        : 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      this._roundRect(ctx, bx, by, BTN.width, BTN.height, 8);
      ctx.fill();

      if (isHovered && canUse) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // 按钮文字
      ctx.fillStyle = canUse ? '#fff' : 'rgba(255,255,255,0.3)';
      ctx.font = 'bold 14px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, bx + BTN.width / 2, by + BTN.height / 2);

      // 保存热区
      this._buttons.push({
        action: btn.action,
        x: bx, y: by,
        w: BTN.width, h: BTN.height,
        canUse,
      });
    });
  }

  /**
   * 绘制战斗日志（右侧）
   */
  _drawCombatLog(w, h) {
    const ctx = this.ctx;
    const logX = w - 260;
    const logY = 100;
    const lineH = 20;

    if (this._visibleLog.length === 0) return;

    // 背景
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(logX - 8, logY - 4, 252, this._visibleLog.length * lineH + 8);

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    this._visibleLog.forEach((line, i) => {
      // 截断过长日志
      const text = line.length > 36 ? line.slice(0, 33) + '...' : line;
      ctx.fillText(text, logX, logY + i * lineH);
    });
  }

  /**
   * 判断某个行动是否可用
   * @param {string} action
   * @param {object} state
   * @returns {boolean}
   */
  _canUseAction(action, state) {
    switch (action) {
      case CombatAction.ATTACK:
      case CombatAction.DEFEND:
        return state.playerAp > 0;
      case CombatAction.RETREAT:
      case CombatAction.WAIT:
        return true;
      default:
        return false;
    }
  }

  /**
   * 检测鼠标悬停
   */
  _checkHover(x, y) {
    this._hoveredBtn = -1;
    for (let i = 0; i < this._buttons.length; i++) {
      const b = this._buttons[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        this._hoveredBtn = i;
        break;
      }
    }
  }

  /**
   * 处理按钮点击
   */
  _handleClick(x, y) {
    for (const b of this._buttons) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        if (b.canUse) {
          this.combat.playerAction(b.action);
        }
        break;
      }
    }
  }

  /**
   * 工具：圆角矩形路径
   */
  _roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /**
   * 工具：颜色变亮
   */
  _lighten(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + percent);
    const g = Math.min(255, ((num >> 8) & 0x00FF) + percent);
    const b = Math.min(255, (num & 0x0000FF) + percent);
    return `rgb(${r},${g},${b})`;
  }

  /**
   * 销毁（移除事件监听）
   */
  destroy() {
    if (this.canvas) {
      this.canvas.removeEventListener('mousemove', this._onMouseMove);
      this.canvas.removeEventListener('mousedown', this._onMouseDown);
    }
  }
}
