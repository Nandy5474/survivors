/**
 * MobileControls — 虚拟摇杆 + 交互按钮（移动端触控适配）
 * 修复版 v1.2：左下角 30%×70% 摇杆区，右下角 30%×70% 按钮区，顶部 30% 留给游戏
 * 半透明设计，不遮挡游戏画面
 * @version 1.2.0
 */

export default class MobileControls {
  /**
   * @param {import('../game/Game.js').default} game
   */
  constructor(game) {
    this.game = game;

    /** @type {HTMLElement|null} 摇杆容器 */
    this._joystickContainer = null;
    /** @type {HTMLElement|null} 摇杆拇指 */
    this._joystickThumb = null;
    /** @type {{x:number, y:number, active:boolean, id:number|null}} 摇杆状态 */
    this._joystick = { x: 0, y: 0, active: false, id: null };

    /** @type {HTMLElement|null} 交互按钮 */
    this._interactBtn = null;

    /** @type {boolean} 是否启用 */
    this._enabled = false;

    /** @type {number} 摇杆半径（外圈） */
    this._joystickRadius = 60;

    /** @type {number} 拇指半径 */
    this._thumbRadius = 24;

    /** @type {{x:number, y:number}} 摇杆中心（世界坐标） */
    this._joystickCenter = { x: 0, y: 0 };

    /** @type {number} 左侧摇杆区域宽度占比（0~1） */
    this._joystickZoneRatio = 0.30;

    /** @type {number} 右侧交互按钮区域宽度占比（0~1） */
    this._buttonZoneRatio = 0.30;

    /** @type {number} 底部操作区高度占比（0~1），低于此值才响应 */
    this._bottomZoneRatio = 0.70;
  }

  /**
   * 初始化移动端控制，注入 DOM
   */
  init() {
    if (this._enabled) return;

    this._createJoystick();
    this._createInteractButton();
    this._bindTouchEvents();

    this._enabled = true;
    console.log('[MobileControls] Initialized (v1.1 — no overlap)');
  }

  /**
   * 销毁，移除 DOM 和事件
   */
  destroy() {
    if (!this._enabled) return;

    this._removeTouchEvents();

    if (this._joystickContainer && this._joystickContainer.parentNode) {
      this._joystickContainer.parentNode.removeChild(this._joystickContainer);
    }
    if (this._interactBtn && this._interactBtn.parentNode) {
      this._interactBtn.parentNode.removeChild(this._interactBtn);
    }

    this._enabled = false;
    console.log('[MobileControls] Destroyed');
  }

  /**
   * 获取当前摇杆输入归一化值 [-1, 1]
   * @returns {{x: number, y: number}}
   */
  getInput() {
    if (!this._enabled || !this._joystick.active) {
      return { x: 0, y: 0 };
    }
    return { x: this._joystick.x, y: this._joystick.y };
  }

  /**
   * 创建虚拟摇杆 DOM（严格限定在左侧 35% 区域）
   */
  _createJoystick() {
    const container = document.createElement('div');
    container.id = 'mobile-joystick';
    // 初始位置：左侧 24px，底部 120px
    container.style.cssText = [
      'position: fixed',
      'left: 24px',
      'bottom: 120px',
      'width: 140px',
      'height: 140px',
      'z-index: 100',
      'pointer-events: none',
      'display: none',
    ].join(';');

    // 外圈
    const outer = document.createElement('div');
    outer.style.cssText = [
      'position: absolute',
      'left: 50%',
      'top: 50%',
      'transform: translate(-50%, -50%)',
      'width: 120px',
      'height: 120px',
      'border-radius: 50%',
      'background: rgba(255,255,255,0.08)',
      'border: 2px solid rgba(255,255,255,0.18)',
      'backdrop-filter: blur(4px)',
      '-webkit-backdrop-filter: blur(4px)',
      'pointer-events: none',
    ].join(';');

    // 拇指
    const thumb = document.createElement('div');
    thumb.style.cssText = [
      'position: absolute',
      'left: 50%',
      'top: 50%',
      'transform: translate(-50%, -50%)',
      'width: 48px',
      'height: 48px',
      'border-radius: 50%',
      'background: rgba(255,255,255,0.22)',
      'border: 2px solid rgba(255,255,255,0.35)',
      'transition: left 0.05s, top 0.05s',
      'pointer-events: none',
    ].join(';');

    container.appendChild(outer);
    container.appendChild(thumb);
    document.getElementById('ui-layer').appendChild(container);

    this._joystickContainer = container;
    this._joystickThumb = thumb;
  }

  /**
   * 创建右侧交互按钮（E 键），严格限定在右侧 35% 区域
   */
  _createInteractButton() {
    const btn = document.createElement('button');
    btn.id = 'mobile-interact-btn';
    btn.textContent = 'E';
    btn.setAttribute('aria-label', '交互');
    btn.style.cssText = [
      'position: fixed',
      'right: 28px',
      'bottom: 140px',
      'width: 64px',
      'height: 64px',
      'border-radius: 50%',
      'background: rgba(230, 57, 70, 0.35)',
      'border: 2px solid rgba(230, 57, 70, 0.55)',
      'color: #fff',
      'font-size: 22px',
      'font-weight: 700',
      'font-family: inherit',
      'z-index: 100',
      'display: none',
      'backdrop-filter: blur(4px)',
      '-webkit-backdrop-filter: blur(4px)',
      'cursor: pointer',
      'user-select: none',
      '-webkit-user-select: none',
      'outline: none',
      'touch-action: manipulation',
      'align-items: center',
      'justify-content: center',
    ].join(';');

    // 防止默认行为 & 阻止冒泡
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); }, { passive: false });
    btn.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); });

    document.getElementById('ui-layer').appendChild(btn);
    this._interactBtn = btn;
  }

  /**
   * 绑定触摸事件（委托到 document，捕获阶段）
   * 严格分区：左侧 35% 归摇杆，右侧 35% 归交互按钮，中间 30% 不处理
   */
  _bindTouchEvents() {
    /** @type {Function[]} 取消函数列表 */
    this._touchCleanups = [];

    // 触摸开始（捕获阶段，先于所有子元素）
    const onTouchStart = (e) => {
      for (const touch of e.changedTouches) {
        const x = touch.clientX;
        const y = touch.clientY;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const joystickZoneMax = w * this._joystickZoneRatio;     // 左侧 30%
        const buttonZoneMin = w * (1 - this._buttonZoneRatio);   // 右侧 30%
        const topZoneMin = h * (1 - this._bottomZoneRatio);      // 下方 70%（y > topZoneMin）

        // === 区域 1：左下角 — 摇杆区 ===
        if (x < joystickZoneMax && y > topZoneMin && !this._joystick.active) {
          e.preventDefault();
          e.stopPropagation();
          this._joystick.active = true;
          this._joystick.id = touch.identifier;
          this._showJoystick(x, y);
          this._updateJoystick(x, y);
          continue;
        }

        // === 区域 2：右下角 — 交互按钮区 ===
        if (x > buttonZoneMin && y > topZoneMin) {
          // 检查是否点中交互按钮
          const btn = this._interactBtn;
          if (btn && btn.style.display !== 'none') {
            const rect = btn.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
              e.preventDefault();
              e.stopPropagation();
              this._onInteractStart();
            }
          }
          continue;
        }

        // === 区域 3：顶部 30% 或中间区域 → 不拦截，交给游戏层 ===
      }
    };

    // 触摸移动（仅更新摇杆，按钮区不响应移动）
    const onTouchMove = (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier === this._joystick.id) {
          e.preventDefault();
          e.stopPropagation();
          this._updateJoystick(touch.clientX, touch.clientY);
        }
      }
    };

    // 触摸结束
    const onTouchEnd = (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier === this._joystick.id) {
          this._joystick.active = false;
          this._joystick.id = null;
          this._joystick.x = 0;
          this._joystick.y = 0;
          this._hideJoystick();
        }
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: false, capture: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', onTouchEnd, { passive: false, capture: true });
    document.addEventListener('touchcancel', onTouchEnd, { passive: false, capture: true });

    this._touchCleanups.push(
      () => document.removeEventListener('touchstart', onTouchStart, true),
      () => document.removeEventListener('touchmove', onTouchMove, true),
      () => document.removeEventListener('touchend', onTouchEnd, true),
      () => document.removeEventListener('touchcancel', onTouchEnd, true)
    );
  }

   /**
   * 显示摇杆到触摸位置（限制在左侧区域内）
   */
  _showJoystick(x, y) {
    const container = this._joystickContainer;
    if (!container) return;

    const maxX = window.innerWidth * this._joystickZoneRatio - 70; // 不超出左侧区
    const clampedX = Math.max(24, Math.min(x, maxX));

    container.style.display = 'block';
    container.style.left = `${clampedX - 70}px`;
    container.style.bottom = 'auto';
    container.style.top = `${y - 70}px`;

    this._joystickCenter = { x: clampedX, y };
  }

  /**
   * 隐藏摇杆
   */
  _hideJoystick() {
    const container = this._joystickContainer;
    if (!container) return;

    container.style.display = 'none';

    // 重置拇指位置
    if (this._joystickThumb) {
      this._joystickThumb.style.left = '50%';
      this._joystickThumb.style.top = '50%';
    }
  }

  /**
   * 更新摇杆位置，计算归一化输入
   */
  _updateJoystick(x, y) {
    const cx = this._joystickCenter.x;
    const cy = this._joystickCenter.y;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = this._joystickRadius;

    let nx = 0, ny = 0;
    if (dist > 0) {
      const clamp = Math.min(dist, maxDist) / dist;
      nx = (dx * clamp) / maxDist;
      ny = (dy * clamp) / maxDist;
    }

    this._joystick.x = nx;
    this._joystick.y = ny;

    // 更新拇指位置
    if (this._joystickThumb) {
      const offsetX = (nx * maxDist);
      const offsetY = (ny * maxDist);
      this._joystickThumb.style.left = `calc(50% + ${offsetX}px)`;
      this._joystickThumb.style.top = `calc(50% + ${offsetY}px)`;
    }
  }

  /**
   * 交互按钮按下
   */
  _onInteractStart() {
    // 触发 E 键交互（通过 EventBus 或直接调用 GameScene）
    const gameScene = this._getGameScene();
    if (gameScene && gameScene._onInteract) {
      gameScene._onInteract();
    }

    // 按钮动画反馈
    if (this._interactBtn) {
      this._interactBtn.style.transform = 'scale(0.88)';
      setTimeout(() => {
        if (this._interactBtn) {
          this._interactBtn.style.transform = 'scale(1)';
        }
      }, 120);
    }
  }

  /**
   * 获取当前 GameScene 引用
   * @returns {import('../scenes/GameScene.js').default|null}
   */
  _getGameScene() {
    return this.game?._scenes?.get('game') || null;
  }

  /**
   * 显示/隐藏交互按钮
   * @param {boolean} visible
   */
  setInteractButtonVisible(visible) {
    if (!this._interactBtn) return;
    this._interactBtn.style.display = visible ? 'flex' : 'none';
  }

  /**
   * 移除触摸事件
   */
  _removeTouchEvents() {
    if (this._touchCleanups) {
      this._touchCleanups.forEach(fn => fn());
      this._touchCleanups = [];
    }
  }

  /**
   * 是否移动端（供外部判断）
   * @returns {boolean}
   */
  static isMobile() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    );
  }
}
