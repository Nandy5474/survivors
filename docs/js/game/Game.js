/**
 * Game — 游戏主类
 * 管理游戏生命周期、主循环、场景切换、画布管理
 * @version 0.1.0
 */

import EventBus, { GameEvents } from './EventBus.js';
import StateManager from './StateManager.js';

export default class Game {
  constructor() {
    /** @type {HTMLCanvasElement|null} */
    this.canvasFog = null;
    /** @type {HTMLCanvasElement|null} */
    this.canvasMap = null;
    /** @type {HTMLCanvasElement|null} */
    this.canvasEntity = null;
    /** @type {HTMLCanvasElement|null} */
    this.canvasFx = null;

    /** @type {Array<{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}>} */
    this._canvasLayers = [];

    /** @type {Map<string, import('../scenes/BaseScene.js').default>} */
    this._scenes = new Map();
    /** @type {import('../scenes/BaseScene.js').default|null} */
    this._currentScene = null;

    /** @type {boolean} */
    this.isRunning = false;
    /** @type {number} */
    this.lastTime = 0;
    /** @type {number} */
    this.accumulator = 0;
    /** @type {number} 固定逻辑帧间隔 (ms) */
    this.fixedDeltaTime = 1000 / 60;
    /** @type {number} 渲染帧计数 */
    this.frameCount = 0;
    /** @type {number} 逻辑帧计数 */
    this.tickCount = 0;

    /** @type {number} 目标 FPS（0 = 无限制） */
    this.targetFPS = 60;
    /** @type {number} */
    this._frameInterval = 1000 / 60;
    /** @type {number} */
    this._lastFrameTime = 0;

    // 绑定循环回调
    this._loop = this._loop.bind(this);
  }

  /**
   * 初始化游戏引擎
   * - 获取 Canvas 元素引用
   * - 设置画布尺寸
   * - 注册场景
   */
  async init(config = {}) {
    this.targetFPS = config.targetFPS || 60;
    this._frameInterval = 1000 / this.targetFPS;

    // 获取四层 Canvas
    this.canvasFog = document.getElementById('canvas-fog');
    this.canvasMap = document.getElementById('canvas-map');
    this.canvasEntity = document.getElementById('canvas-entity');
    this.canvasFx = document.getElementById('canvas-fx');

    // 初始化各 Canvas 层
    const layers = [
      { canvas: this.canvasFog,   name: 'fog' },
      { canvas: this.canvasMap,   name: 'map' },
      { canvas: this.canvasEntity,name: 'entity' },
      { canvas: this.canvasFx,    name: 'fx' },
    ];

    for (const layer of layers) {
      if (!layer.canvas) {
        console.error(`[Game] Canvas element "#canvas-${layer.name}" not found`);
        continue;
      }
      const ctx = layer.canvas.getContext('2d');
      if (ctx) {
        this._canvasLayers.push({ canvas: layer.canvas, ctx });
      }
    }

    this._resizeCanvases();
    window.addEventListener('resize', () => this._resizeCanvases());

    EventBus.emit(GameEvents.GAME_INIT, { config });
    console.log('[Game] Engine initialized.');
  }

  /**
   * 注册场景
   * @param {string} name - 场景唯一标识
   * @param {import('../scenes/BaseScene.js').default} scene
   */
  registerScene(name, scene) {
    scene.game = this;
    scene.name = name;
    this._scenes.set(name, scene);
  }

  /**
   * 切换场景
   * @param {string} sceneName
   * @param {object} [data] - 传递给新场景的数据
   */
  async switchScene(sceneName, data = {}) {
    const newScene = this._scenes.get(sceneName);
    if (!newScene) {
      console.error(`[Game] Scene "${sceneName}" not registered`);
      return;
    }

    // 退出当前场景
    if (this._currentScene) {
      try { this._currentScene.onExit(); } catch (e) { console.error('[Game] Error exiting scene:', e); }
      EventBus.emit(GameEvents.SCENE_EXIT, { scene: this._currentScene.name });
    }

    // 进入新场景
    this._currentScene = newScene;
    EventBus.emit(GameEvents.SCENE_CHANGE, { scene: sceneName, data });

    try {
      await newScene.onEnter(data);
    } catch (e) {
      console.error(`[Game] Error entering scene "${sceneName}":`, e);
      // 显示错误在加载画面
      const errEl = document.getElementById('loading-error');
      if (errEl) {
        errEl.textContent = '场景加载失败: ' + (e.message || String(e));
        errEl.style.display = 'block';
      }
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) loadingScreen.classList.remove('hidden');
      return;
    }
    EventBus.emit(GameEvents.SCENE_READY, { scene: sceneName });

    StateManager.set('meta.currentScene', sceneName);
  }

  /**
   * 启动游戏主循环
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this._lastFrameTime = this.lastTime;
    this.accumulator = 0;

    EventBus.emit(GameEvents.GAME_START);
    requestAnimationFrame(this._loop);
    console.log('[Game] Main loop started.');
  }

  /**
   * 暂停游戏
   */
  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    StateManager.set('meta.isPaused', true);
    EventBus.emit(GameEvents.GAME_PAUSE);
    if (this._currentScene) {
      this._currentScene.onPause();
    }
  }

  /**
   * 恢复游戏
   */
  resume() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this._lastFrameTime = this.lastTime;
    this.accumulator = 0;
    StateManager.set('meta.isPaused', false);
    EventBus.emit(GameEvents.GAME_RESUME);
    // 调用当前场景的 onResume 方法（隐藏暂停遮罩等）
    if (this._currentScene) {
      this._currentScene.onResume();
    }
    requestAnimationFrame(this._loop);
  }

  /**
   * 停止并销毁
   */
  destroy() {
    this.isRunning = false;
    if (this._currentScene) {
      this._currentScene.onExit();
    }
    this._scenes.clear();
    this._canvasLayers = [];
    EventBus.emit(GameEvents.GAME_QUIT);
    console.log('[Game] Engine destroyed.');
  }

  /**
   * 获取 Canvas 层
   * @param {number} index - 0=fog, 1=map, 2=entity, 3=fx
   * @returns {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}|null}
   */
  getLayer(index) {
    return this._canvasLayers[index] || null;
  }

  /**
   * 获取地图层的 2D 上下文
   * @returns {CanvasRenderingContext2D|null}
   */
  getMapCtx() {
    return this._canvasLayers[1]?.ctx || null;
  }

  /**
   * 获取迷雾层的 2D 上下文
   * @returns {CanvasRenderingContext2D|null}
   */
  getFogCtx() {
    return this._canvasLayers[0]?.ctx || null;
  }

  // ---- 私有 ----

  /**
   * 主循环
   */
  _loop(timestamp) {
    if (!this.isRunning) return;

    requestAnimationFrame(this._loop);

    // 帧率限制
    const elapsed = timestamp - this._lastFrameTime;
    if (elapsed < this._frameInterval) return;
    this._lastFrameTime = timestamp - (elapsed % this._frameInterval);

    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;

    // 固定步长逻辑更新
    this.accumulator += deltaTime;
    while (this.accumulator >= this.fixedDeltaTime) {
      this._fixedUpdate(this.fixedDeltaTime / 1000); // 转为秒
      this.accumulator -= this.fixedDeltaTime;
      this.tickCount++;
    }

    // 渲染
    this._render();
    this.frameCount++;
  }

  /**
   * 固定步长更新
   * @param {number} dt - 秒
   */
  _fixedUpdate(dt) {
    const playTime = StateManager.get('meta.playTime') + (this.fixedDeltaTime / 1000);
    StateManager.set('meta.playTime', playTime);

    if (this._currentScene && this._currentScene.update) {
      this._currentScene.update(dt);
    }
  }

  /**
   * 渲染帧
   */
  _render() {
    if (this._currentScene && this._currentScene.render) {
      this._currentScene.render();
    }
  }

  /**
   * 调整所有 Canvas 尺寸以匹配视口
   */
  _resizeCanvases() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    for (const { canvas } of this._canvasLayers) {
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }
  }
}