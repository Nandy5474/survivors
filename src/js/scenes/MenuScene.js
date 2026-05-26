/**
 * MenuScene — 主菜单场景
 * 展示标题画面、新游戏/继续/设置入口
 * @version 0.2.0
 */

import BaseScene from './BaseScene.js';
import EventBus, { GameEvents } from '../game/EventBus.js';
import { SaveStorage } from '../utils/Storage.js';

export default class MenuScene extends BaseScene {
  constructor() {
    super();
    this.name = 'menu';

    /** @type {HTMLElement} */
    this._root = null;
    /** @type {Object<string, HTMLElement>} */
    this._buttons = {};
    /** @type {Function[]} 事件销毁函数列表 */
    this._cleanups = [];
  }

  async onEnter(data = {}) {
    this.state = 'loading';
    this.enterTime = performance.now();
    this.data = data;

    await this.load();
    await this.create();

    // 每次进入菜单时刷新存档状态（从游戏返回后也能正确显示）
    await this._updateContinueButton();

    this.state = 'active';
  }

  async create() {
    // 显示菜单画面
    this._root = document.getElementById('menu-screen');
    if (!this._root) {
      console.error('[MenuScene] #menu-screen not found');
      return;
    }

    this._root.classList.remove('hidden');

    // 缓存按钮引用
    this._buttons.newGame   = document.getElementById('menu-new-game');
    this._buttons.continue  = document.getElementById('menu-continue');
    this._buttons.settings  = document.getElementById('menu-settings');

    // 绑定事件
    this._bindEvents();

    // 背景绘制
    this._drawBackground();
  }

  render() {
    // 菜单场景主要使用 HTML UI，Canvas 层仅做背景
    this._drawBackground();
  }

  onExit() {
    if (this._root) {
      this._root.classList.add('hidden');
    }
    this._clearBackground();
    this._unbindEvents();
  }

  // ---- 私有 ----

  _bindEvents() {
    const onNewGame = () => {
      this.game.switchScene('game', { mode: 'new' });
    };
    const onContinue = () => {
      this.game.switchScene('game', { mode: 'continue' });
    };
    const onSettings = () => {
      // Phase 1 暂不实现设置页面，显示占位通知
      EventBus.emit(GameEvents.UI_NOTIFICATION, {
        type: 'info',
        message: '设置功能将在后续版本中开放',
      });
    };

    this._buttons.newGame?.addEventListener('click', onNewGame);
    this._buttons.continue?.addEventListener('click', onContinue);
    this._buttons.settings?.addEventListener('click', onSettings);

    this._cleanups.push(
      () => this._buttons.newGame?.removeEventListener('click', onNewGame),
      () => this._buttons.continue?.removeEventListener('click', onContinue),
      () => this._buttons.settings?.removeEventListener('click', onSettings),
    );
  }

  _unbindEvents() {
    for (const fn of this._cleanups) {
      try { fn(); } catch (e) { /* ignore */ }
    }
    this._cleanups = [];
  }

  /**
   * 根据存档状态更新「继续游戏」按钮（异步，正确查询 IndexedDB）
   */
  async _updateContinueButton() {
    let hasSave = false;
    try {
      hasSave = await SaveStorage.hasAnySave();
    } catch (err) {
      console.warn('[MenuScene] Failed to check save:', err);
    }

    if (this._buttons.continue) {
      this._buttons.continue.disabled = !hasSave;
      this._buttons.continue.textContent = hasSave ? '继续游戏' : '（无存档）';
    }
  }

  /**
   * 绘制菜单背景（暗色渐变 + 装饰元素）
   */
  _drawBackground() {
    const layer = this.game?.getLayer(1); // map 层做背景
    if (!layer) return;

    const { canvas, ctx } = layer;
    const w = canvas.width;
    const h = canvas.height;

    // 深色背景渐变
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(0.6, '#0f0f1a');
    grad.addColorStop(1, '#050510');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 微弱的网格线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
    ctx.lineWidth = 1;
    const gridSize = 80;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  _clearBackground() {
    const layer = this.game?.getLayer(1);
    if (!layer) return;
    const { canvas, ctx } = layer;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}