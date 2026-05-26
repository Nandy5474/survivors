/**
 * GameScene — 主游戏场景
 * 核心游玩场景，承载探索、基地管理、战斗等主要玩法
 * @version 0.2.0
 */

import BaseScene from './BaseScene.js';
import EventBus, { GameEvents } from '../game/EventBus.js';
import StateManager from '../game/StateManager.js';

/** 游戏模式枚举 */
export const GameMode = Object.freeze({
  EXPLORATION: 'exploration',
  BASE: 'base',
  COMBAT: 'combat',
  DIALOGUE: 'dialogue',
});

export default class GameScene extends BaseScene {
  constructor() {
    super();
    this.name = 'game';

    /** @type {string} 当前游戏模式 */
    this.mode = GameMode.BASE;

    /** @type {boolean} 暂停状态 */
    this._isPaused = false;

    /** @type {HTMLElement|null} */
    this._pauseOverlay = null;

    /** @type {object} 子模块引用（后续阶段注入） */
    this.systems = {};

    // 事件监听取消函数
    this._unsubscribers = [];

    // 暂停/HUD 按钮 handler 引用（用于精确解绑）
    /** @type {Map<string, Function>} */
    this._pauseHandlers = new Map();
    /** @type {Map<string, Function>} */
    this._hudHandlers = new Map();

    // 调试：FPS 计数
    this._fpsCounter = 0;
    this._fpsTime = 0;
  }

  async create() {
    // 隐藏菜单
    const menuScreen = document.getElementById('menu-screen');
    if (menuScreen) menuScreen.classList.add('hidden');

    // 显示底部操作栏
    const hudBottom = document.getElementById('hud-bottom');
    if (hudBottom) hudBottom.classList.remove('hidden');

    // 初始化暂停相关 UI
    this._pauseOverlay = document.getElementById('pause-overlay');
    this._bindPauseEvents();

    // 绑定底部按钮事件
    this._bindHudButtons();

    // 订阅全局事件
    this._subscribeEvents();

    // 画初始地图背景
    this._drawBaseBackground();

    // 更新 HUD
    this._refreshHUD();

    console.log('[GameScene] Created. Mode:', this.data.mode || 'continue');
  }

  update(dt) {
    if (this._isPaused) return;

    // 根据当前模式分发更新
    switch (this.mode) {
      case GameMode.BASE:
        this._updateBase(dt);
        break;
      case GameMode.EXPLORATION:
        this._updateExploration(dt);
        break;
      case GameMode.COMBAT:
        this._updateCombat(dt);
        break;
      default:
        break;
    }

    // 时间推进
    this._advanceGameTime(dt);
  }

  render() {
    if (this._isPaused) return;

    // 根据当前模式分发渲染
    switch (this.mode) {
      case GameMode.BASE:
        this._renderBase();
        break;
      case GameMode.EXPLORATION:
        this._renderExploration();
        break;
      case GameMode.COMBAT:
        this._renderCombat();
        break;
      default:
        break;
    }
  }

  onPause() {
    this._isPaused = true;
    if (this._pauseOverlay) {
      this._pauseOverlay.classList.remove('hidden');
    }
  }

  onResume() {
    this._isPaused = false;
    if (this._pauseOverlay) {
      this._pauseOverlay.classList.add('hidden');
    }
  }

  onExit() {
    this._unbindPauseEvents();
    this._unbindHudButtons();
    this._unsubscribeAll();

    const hudBottom = document.getElementById('hud-bottom');
    if (hudBottom) hudBottom.classList.add('hidden');
  }

  /**
   * 切换游戏模式
   * @param {string} mode - GameMode 枚举值
   */
  setMode(mode) {
    if (!Object.values(GameMode).includes(mode)) {
      console.warn(`[GameScene] Unknown mode: ${mode}`);
      return;
    }
    const prevMode = this.mode;
    this.mode = mode;
    EventBus.emit(GameEvents.SCENE_CHANGE, { scene: `game:${mode}`, data: { prevMode } });
  }

  // ---- 私有：模式更新 ----

  /** @param {number} dt */
  _updateBase(dt) {
    // Phase 2+ 实现基地逻辑
  }

  /** @param {number} dt */
  _updateExploration(dt) {
    // Phase 2+ 实现探索逻辑
  }

  /** @param {number} dt */
  _updateCombat(dt) {
    // Phase 3+ 实现战斗逻辑
  }

  // ---- 私有：模式渲染 ----

  _renderBase() {
    this._drawBaseBackground();
  }

  _renderExploration() {
    // Phase 2+ 实现探索渲染
  }

  _renderCombat() {
    // Phase 3+ 实现战斗渲染
  }

  // ---- 私有：背景绘制 ----

  _drawBaseBackground() {
    const ctx = this.game?.getMapCtx();
    if (!ctx) return;

    const layer = this.game.getLayer(1);
    const w = layer.canvas.width;
    const h = layer.canvas.height;

    // 基地场景底色
    ctx.fillStyle = '#1c1c2a';
    ctx.fillRect(0, 0, w, h);

    // 地面网格参考线（等距/俯视角参考）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const tileSize = 64;
    for (let x = 0; x < w; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 中心区域高亮（安全屋位置占位）
    const cx = w / 2, cy = h / 2;
    ctx.fillStyle = 'rgba(230, 57, 70, 0.08)';
    ctx.beginPath();
    ctx.arc(cx, cy, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(230, 57, 70, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // ---- 私有：HUD 更新 ----

  _refreshHUD() {
    const state = StateManager.getState();
    const p = state.player;
    const r = state.globalResources;

    this._setHudText('hud-hp', `❤️ ${p.hp}/${p.maxHp}`);
    this._setHudText('hud-sanity', `🧠 ${p.sanity}/${p.maxSanity}`);
    this._setHudText('hud-day', `📅 第 ${state.gameTime.day} 天`);
    this._setHudText('hud-time', `🕐 ${String(state.gameTime.hour).padStart(2, '0')}:${String(state.gameTime.minute).padStart(2, '0')}`);
    this._setHudText('hud-gold', `💰 ${r.gold}`);
    this._setHudText('hud-diamond', `💎 ${r.diamond}`);
    this._setHudText('hud-food', `🍖 ${r.food}`);
    this._setHudText('hud-water', `💧 ${r.water}`);
    this._setHudText('hud-ammo', `🔫 ${r.ammo}`);
  }

  _setHudText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // ---- 私有：事件绑定 ----

  _subscribeEvents() {
    // 资源变更时刷新 HUD
    this._unsubscribers.push(
      EventBus.on(GameEvents.RESOURCE_CHANGED, () => this._refreshHUD())
    );

    // 通知
    this._unsubscribers.push(
      EventBus.on(GameEvents.UI_NOTIFICATION, ({ type, message }) => {
        this._showNotification(type, message);
      })
    );

    // 键盘暂停
    const onKeydown = (e) => {
      if (e.key === 'Escape') {
        if (this._isPaused) {
          this.game.resume();
        } else {
          this.game.pause();
        }
      }
    };
    window.addEventListener('keydown', onKeydown);
    this._unsubscribers.push(() => window.removeEventListener('keydown', onKeydown));
  }

  _bindPauseEvents() {
    const onResume = () => this.game.resume();
    const onSave = () => {
      EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'info', message: '存档功能将在后续版本中开放' });
    };
    const onQuit = () => {
      this.game.resume(); // 先恢复循环，确保 onExit 正常执行
      this.game.switchScene('menu');
    };

    document.getElementById('pause-resume')?.addEventListener('click', onResume);
    document.getElementById('pause-save')?.addEventListener('click', onSave);
    document.getElementById('pause-quit')?.addEventListener('click', onQuit);

    this._pauseHandlers.set('resume', onResume);
    this._pauseHandlers.set('save', onSave);
    this._pauseHandlers.set('quit', onQuit);
  }

  _unbindPauseEvents() {
    const resumeEl = document.getElementById('pause-resume');
    const saveEl   = document.getElementById('pause-save');
    const quitEl   = document.getElementById('pause-quit');

    if (resumeEl) resumeEl.removeEventListener('click', this._pauseHandlers.get('resume'));
    if (saveEl)   saveEl.removeEventListener('click',   this._pauseHandlers.get('save'));
    if (quitEl)   quitEl.removeEventListener('click',   this._pauseHandlers.get('quit'));

    this._pauseHandlers.clear();
  }

  _bindHudButtons() {
    /** @param {string} id */
    const bind = (id, handler) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', handler);
        this._hudHandlers.set(id, handler);
      }
    };

    bind('btn-explore',   () => this.setMode(GameMode.EXPLORATION));
    bind('btn-base',      () => this.setMode(GameMode.BASE));
    bind('btn-inventory', () => EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'info', message: '背包功能将在后续版本中开放' }));
    bind('btn-mercenary', () => EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'info', message: '佣兵系统将在后续版本中开放' }));
    bind('btn-survivors',() => EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'info', message: '幸存者管理将在后续版本中开放' }));
    bind('btn-menu',      () => this.game.pause());
  }

  _unbindHudButtons() {
    for (const [id, handler] of this._hudHandlers.entries()) {
      const el = document.getElementById(id);
      if (el) el.removeEventListener('click', handler);
    }
    this._hudHandlers.clear();
  }

  _unsubscribeAll() {
    this._unsubscribers.forEach(fn => fn());
    this._unsubscribers = [];
  }

  // ---- 私有：时间系统 ----

  /**
   * 推进游戏时间
   * @param {number} dt - 秒
   */
  _advanceGameTime(dt) {
    // 游戏中 1 秒 = 实际中 1 分钟（在探索/基地模式下）
    if (this.mode === GameMode.COMBAT) return; // 战斗时时间暂停

    let minute = StateManager.get('gameTime.minute') + dt;
    let hour = StateManager.get('gameTime.hour');
    let day = StateManager.get('gameTime.day');

    if (minute >= 60) {
      minute -= 60;
      hour += 1;
    }

    if (hour >= 24) {
      hour -= 24;
      day += 1;
    }

    StateManager.batch([
      { path: 'gameTime.minute', value: Math.floor(minute) },
      { path: 'gameTime.hour', value: hour },
      { path: 'gameTime.day', value: day },
    ]);

    // 定期刷新 HUD
    if (Math.floor(minute) % 10 === 0) {
      this._refreshHUD();
    }
  }

  // ---- 私有：通知 ----

  /**
   * @param {string} type
   * @param {string} message
   */
  _showNotification(type, message) {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const el = document.createElement('div');
    el.className = `notification ${type}`;
    el.textContent = message;
    container.appendChild(el);

    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 3000);
  }
}