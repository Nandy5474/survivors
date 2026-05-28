/**
 * MobileControls — 虚拟摇杆 + 交互/战斗按钮（移动端触控适配）
 * v4.0：修复 EventBus 通信、正确初始化、改进触控体验
 * @version 4.0.0
 */

import EventBus, { GameEvents } from '../game/EventBus.js';

/** 自定义触控事件（发射给 GameScene） */
export const TouchEvents = Object.freeze({
  TOUCH_JOYSTICK: 'touch:joystick',
  TOUCH_INTERACT: 'touch:interact',
  TOUCH_ATTACK: 'touch:attack',
  TOUCH_DODGE: 'touch:dodge',
  TOUCH_BACKPACK: 'touch:backpack',
  TOUCH_MENU: 'touch:menu',
});

export default class MobileControls {
  /**
   * @param {import('../game/Game.js').default} game
   */
  constructor(game) {
    this.game = game;

    /** @type {HTMLElement|null} 摇杆容器 */
    this._joystickEl = null;
    /** @type {HTMLElement|null} 摇杆底座 */
    this._joystickBase = null;
    /** @type {HTMLElement|null} 摇杆拇指 */
    this._thumbEl = null;

    /** @type {HTMLElement|null} */
    this._interactBtn = null;
    /** @type {HTMLElement|null} */
    this._attackBtn = null;
    /** @type {HTMLElement|null} */
    this._dodgeBtn = null;
    /** @type {HTMLElement|null} */
    this._backpackBtn = null;
    /** @type {HTMLElement|null} */
    this._menuBtn = null;

    this._enabled = false;
    this._joystickRadius = 55;
    this._input = { x: 0, y: 0 };
    this._activeTouch = { id: null, x: 0, y: 0, active: false };
    this._touchCleanups = [];
    this._unsubs = [];
    this._currentMode = 'base';
    
    /** 新增：输入状态，供 GameScene 读取 */
    this._joystickInput = { x: 0, y: 0, active: false };
  }

  init() {
    if (this._enabled) return;
    this._createStyles();
    this._createJoystick();
    this._createInteractButton();
    this._createCombatButtons();
    this._createMenuButton();
    this._bindTouchEvents();
    this._bindSceneEvents();
    this._enabled = true;
  }

  destroy() {
    if (!this._enabled) return;
    this._removeTouchEvents();
    this._unbindSceneEvents();
    this._removeElements();
    this._enabled = false;
  }

  /**
   * 获取当前摇杆输入
   * @returns {{x: number, y: number, active: boolean}}
   */
  getInput() {
    return {
      x: this._joystickInput.x,
      y: this._joystickInput.y,
      active: this._joystickInput.active
    };
  }

  setInteractButtonVisible(visible) {
    if (this._interactBtn) {
      this._interactBtn.style.display = visible ? 'flex' : 'none';
    }
  }

  setVisible(visible) {
    if (this._joystickEl) {
      this._joystickEl.style.display = visible ? 'block' : 'none';
    }
  }

  setMode(mode) {
    this._currentMode = mode;
    const isExplore = mode === 'exploration';
    const isCombat = mode === 'combat';

    if (this._joystickEl) {
      this._joystickEl.style.display = isExplore ? 'block' : 'none';
    }
    if (this._interactBtn && !isExplore) {
      this._interactBtn.style.display = 'none';
    }

    for (const btn of [this._attackBtn, this._dodgeBtn, this._backpackBtn]) {
      if (btn) {
        btn.style.display = isCombat ? 'flex' : 'none';
      }
    }
  }

  // ========== DOM 创建 ==========

  _createStyles() {
    if (document.getElementById('mc-styles-v4')) return;
    const s = document.createElement('style');
    s.id = 'mc-styles-v4';
    s.textContent = `
      /* z-index: 摇杆/按钮(15) < 地图面板(90) < 暂停菜单(z--menu=30) < 菜单按钮(110) */
      #mc-joystick {
        position: fixed;
        left: 3vw;
        bottom: 5vh;
        width: 130px;
        height: 130px;
        z-index: 15;
        pointer-events: none;
        display: none;
      }
      #mc-joystick-base {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 110px;
        height: 110px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.06);
        border: 2px solid rgba(255, 255, 255, 0.12);
        pointer-events: auto;
        touch-action: none;
      }
      #mc-joystick-thumb {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.18);
        border: 2px solid rgba(255, 255, 255, 0.3);
        pointer-events: none;
        transition: transform 0.05s ease-out;
      }
      /* 交互按钮 (E) — 右下，战斗按钮上方 */
      #mc-interact-btn {
        position: fixed;
        right: 3vw;
        bottom: 20vh;
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: rgba(230, 57, 70, 0.45);
        border: 2px solid rgba(230, 57, 70, 0.6);
        color: #fff;
        font-size: 22px;
        font-weight: 700;
        z-index: 15;
        display: none;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        user-select: none;
        -webkit-user-select: none;
        outline: none;
        touch-action: manipulation;
        box-shadow: 0 0 18px rgba(230, 57, 70, 0.25);
      }
      /* 战斗按钮 — 右下横向排列 */
      .mc-combat-btn {
        position: fixed;
        width: 58px;
        height: 58px;
        border-radius: 50%;
        color: #fff;
        font-size: 14px;
        font-weight: 600;
        z-index: 15;
        display: none;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        user-select: none;
        -webkit-user-select: none;
        outline: none;
        touch-action: manipulation;
      }
      #mc-attack-btn {
        right: 3vw;
        bottom: 5vh;
        background: rgba(220, 38, 38, 0.5);
        border: 2px solid rgba(220, 38, 38, 0.7);
      }
      #mc-dodge-btn {
        right: calc(3vw + 68px);
        bottom: 5vh;
        background: rgba(245, 158, 11, 0.5);
        border: 2px solid rgba(245, 158, 11, 0.7);
      }
      #mc-backpack-btn {
        right: calc(3vw + 136px);
        bottom: 5vh;
        background: rgba(59, 130, 246, 0.5);
        border: 2px solid rgba(59, 130, 246, 0.7);
      }
      /* 菜单按钮 — 右上角，始终显示 */
      #mc-menu-btn {
        position: fixed;
        right: 2vw;
        top: 6vh;
        width: 42px;
        height: 42px;
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #fff;
        font-size: 20px;
        z-index: 110;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        -webkit-user-select: none;
        outline: none;
        touch-action: manipulation;
      }
      .mc-btn-pressed {
        transform: scale(0.88) !important;
        opacity: 0.7;
      }
    `;
    document.head.appendChild(s);
  }

  _createJoystick() {
    const c = document.createElement('div');
    c.id = 'mc-joystick';
    
    const b = document.createElement('div');
    b.id = 'mc-joystick-base';
    
    const t = document.createElement('div');
    t.id = 'mc-joystick-thumb';
    
    c.appendChild(b);
    c.appendChild(t);
    
    const uiLayer = document.getElementById('ui-layer');
    if (uiLayer) {
      uiLayer.appendChild(c);
    } else {
      document.body.appendChild(c);
    }
    
    this._joystickEl = c;
    this._joystickBase = b;
    this._thumbEl = t;
  }

  _createInteractButton() {
    const btn = document.createElement('button');
    btn.id = 'mc-interact-btn';
    btn.textContent = 'E';
    btn.setAttribute('aria-label', '交互');
    btn.type = 'button';
    
    const uiLayer = document.getElementById('ui-layer');
    if (uiLayer) {
      uiLayer.appendChild(btn);
    } else {
      document.body.appendChild(btn);
    }
    
    this._interactBtn = btn;
  }

  _createCombatButtons() {
    const defs = [
      { id: 'mc-attack-btn', text: '⚔', label: '攻击' },
      { id: 'mc-dodge-btn', text: '↺', label: '闪避' },
      { id: 'mc-backpack-btn', text: '▦', label: '背包' },
    ];
    
    for (const d of defs) {
      const btn = document.createElement('button');
      btn.id = d.id;
      btn.className = 'mc-combat-btn';
      btn.textContent = d.text;
      btn.setAttribute('aria-label', d.label);
      btn.type = 'button';
      
      const uiLayer = document.getElementById('ui-layer');
      if (uiLayer) {
        uiLayer.appendChild(btn);
      } else {
        document.body.appendChild(btn);
      }
      
      if (d.id === 'mc-attack-btn') this._attackBtn = btn;
      else if (d.id === 'mc-dodge-btn') this._dodgeBtn = btn;
      else this._backpackBtn = btn;
    }
  }

  _createMenuButton() {
    const btn = document.createElement('button');
    btn.id = 'mc-menu-btn';
    btn.textContent = '☰';
    btn.setAttribute('aria-label', '菜单');
    btn.type = 'button';
    
    const uiLayer = document.getElementById('ui-layer');
    if (uiLayer) {
      uiLayer.appendChild(btn);
    } else {
      document.body.appendChild(btn);
    }
    
    this._menuBtn = btn;
  }

  // ========== 触摸事件绑定 ==========

  _bindTouchEvents() {
    const onStart = (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (this._hitButton(t.clientX, t.clientY)) continue;
        if (t.clientX < window.innerWidth * 0.4 && 
            t.clientY > window.innerHeight * 0.4 && 
            !this._activeTouch.active) {
          this._activeTouch.active = true;
          this._activeTouch.id = t.identifier;
          this._positionJoystickBase(t.clientX, t.clientY);
          this._joystickInput.active = true;
        }
      }
    };
    
    const onMove = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === this._activeTouch.id) {
          e.preventDefault();
          this._updateJoystick(t.clientX, t.clientY);
        }
      }
    };
    
    const onEnd = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this._activeTouch.id) {
          this._releaseJoystick();
        }
      }
    };
    
    document.addEventListener('touchstart', onStart, { passive: false });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd, { passive: false });
    document.addEventListener('touchcancel', onEnd, { passive: false });
    
    this._touchCleanups.push(
      () => document.removeEventListener('touchstart', onStart),
      () => document.removeEventListener('touchmove', onMove),
      () => document.removeEventListener('touchend', onEnd),
      () => document.removeEventListener('touchcancel', onEnd)
    );
    
    // 绑定按钮事件
    this._bindBtn(this._interactBtn, TouchEvents.TOUCH_INTERACT);
    this._bindBtn(this._attackBtn, TouchEvents.TOUCH_ATTACK);
    this._bindBtn(this._dodgeBtn, TouchEvents.TOUCH_DODGE);
    this._bindBtn(this._backpackBtn, TouchEvents.TOUCH_BACKPACK);
    this._bindBtn(this._menuBtn, TouchEvents.TOUCH_MENU);
  }

  _bindBtn(btn, eventName) {
    if (!btn) return;
    
    const h = (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.add('mc-btn-pressed');
      setTimeout(() => btn.classList.remove('mc-btn-pressed'), 120);
      EventBus.emit(eventName);
    };
    
    btn.addEventListener('touchstart', h, { passive: false });
    btn.addEventListener('mousedown', h);
    
    this._touchCleanups.push(
      () => btn.removeEventListener('touchstart', h),
      () => btn.removeEventListener('mousedown', h)
    );
  }

  _hitButton(tx, ty) {
    for (const btn of [this._interactBtn, this._attackBtn, this._dodgeBtn, this._backpackBtn, this._menuBtn]) {
      if (!btn || btn.style.display === 'none') continue;
      const r = btn.getBoundingClientRect();
      if (tx >= r.left && tx <= r.right && ty >= r.top && ty <= r.bottom) {
        return true;
      }
    }
    return false;
  }

  _bindSceneEvents() {
    this._unsubs.push(
      EventBus.on(GameEvents.SCENE_CHANGE, ({ scene }) => {
        if (scene === 'game:exploration') {
          this.setMode('exploration');
        } else if (scene === 'game:combat') {
          this.setMode('combat');
        } else {
          this.setMode('base');
        }
      })
    );
    
    this._unsubs.push(
      EventBus.on('room:entered', ({ room }) => {
        if (this._currentMode !== 'exploration') return;
        this.setInteractButtonVisible(!!(room && (room.hasSupplies || room.type === 'survivor')));
      })
    );
  }

  _removeTouchEvents() {
    for (const fn of this._touchCleanups) {
      fn();
    }
    this._touchCleanups = [];
  }
  
  _unbindSceneEvents() {
    for (const fn of this._unsubs) {
      fn();
    }
    this._unsubs = [];
  }

  _removeElements() {
    const ids = [
      'mc-joystick',
      'mc-interact-btn',
      'mc-attack-btn',
      'mc-dodge-btn',
      'mc-backpack-btn',
      'mc-menu-btn'
    ];
    
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) {
        el.remove();
      }
    }
    
    this._joystickEl = null;
    this._joystickBase = null;
    this._thumbEl = null;
    this._interactBtn = null;
    this._attackBtn = null;
    this._dodgeBtn = null;
    this._backpackBtn = null;
    this._menuBtn = null;
  }

  // ========== 摇杆逻辑 ==========

  _positionJoystickBase(x, y) {
    if (!this._joystickEl || !this._joystickBase) return;
    
    const r = this._joystickEl.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    
    const ox = Math.max(-15, Math.min(15, x - cx));
    const oy = Math.max(-15, Math.min(15, y - cy));
    
    this._joystickBase.style.transform = `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))`;
    
    this._activeTouch.x = x;
    this._activeTouch.y = y;
  }

  _updateJoystick(x, y) {
    const r = this._joystickBase?.getBoundingClientRect();
    if (!r) return;
    
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    let nx = 0;
    let ny = 0;
    
    if (dist > 3) {
      const c = Math.min(dist, this._joystickRadius) / dist;
      nx = dx * c / this._joystickRadius;
      ny = dy * c / this._joystickRadius;
    }
    
    this._input.x = nx;
    this._input.y = ny;
    this._activeTouch.x = x;
    this._activeTouch.y = y;
    
    // 更新输入状态
    this._joystickInput.x = nx;
    this._joystickInput.y = ny;
    this._joystickInput.active = true;
    
    if (this._thumbEl) {
      this._thumbEl.style.transform = `translate(calc(-50% + ${nx * this._joystickRadius}px), calc(-50% + ${ny * this._joystickRadius}px))`;
    }
    
    // 发射 EventBus 事件
    EventBus.emit(TouchEvents.TOUCH_JOYSTICK, { x: nx, y: ny });
  }

  _releaseJoystick() {
    this._activeTouch.active = false;
    this._activeTouch.id = null;
    this._input.x = 0;
    this._input.y = 0;
    
    // 更新输入状态
    this._joystickInput.x = 0;
    this._joystickInput.y = 0;
    this._joystickInput.active = false;
    
    if (this._thumbEl) {
      this._thumbEl.style.transform = 'translate(-50%, -50%)';
    }
    
    // 发射 EventBus 事件
    EventBus.emit(TouchEvents.TOUCH_JOYSTICK, { x: 0, y: 0 });
  }

  static isMobile() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
}
