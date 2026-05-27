/**
 * BaseScene — 场景基类
 * 所有场景的抽象基类，定义生命周期接口
 * @version 0.1.0
 */

/**
 * @typedef {object} SceneTransitionData
 * @property {string} [from] - 来源场景名称
 * @property {*} [payload] - 传递的自定义数据
 */

export default class BaseScene {
  constructor() {
    /** @type {string} 场景唯一标识 */
    this.name = '';

    /** @type {import('../game/Game.js').default|null} 游戏主实例引用 */
    this.game = null;

    /** @type {'loading'|'active'|'paused'|'exited'} */
    this.state = 'loading';

    /** @type {object} 场景本地数据 */
    this.data = {};

    /** @type {number} 场景进入时间戳 */
    this.enterTime = 0;
  }

  /**
   * 场景进入（异步，支持资源加载）
   * 场景切换时由 Game.switchScene 调用
   * @param {SceneTransitionData} data
   * @returns {Promise<void>}
   */
  async onEnter(data = {}) {
    this.state = 'loading';
    this.enterTime = performance.now();
    this.data = data;

    await this.load();
    await this.create();

    this.state = 'active';
  }

  /**
   * 预加载资源（子类重写）
   * @returns {Promise<void>}
   */
  async load() {
    // 子类实现
  }

  /**
   * 创建场景内容（子类重写）
   * 在 load() 之后调用
   * @returns {Promise<void>}
   */
  async create() {
    // 子类实现
  }

  /**
   * 逻辑更新（每固定步长调用）
   * @param {number} dt - 上次更新以来的时间（秒）
   */
  update(dt) {
    // 子类实现
  }

  /**
   * 渲染（每帧调用）
   */
  render() {
    // 子类实现
  }

  /**
   * 暂停回调
   */
  onPause() {
    this.state = 'paused';
  }

  /**
   * 恢复回调
   */
  onResume() {
    this.state = 'active';
  }

  /**
   * 场景退出
   */
  onExit() {
    this.state = 'exited';
    this.destroy();
  }

  /**
   * 销毁场景资源
   */
  destroy() {
    this.data = {};
  }

  /**
   * 清空指定 Canvas 层
   * @param {number} layerIndex - 0=fog, 1=map, 2=entity, 3=fx
   */
  clearLayer(layerIndex) {
    const layer = this.game?.getLayer(layerIndex);
    if (!layer) return;
    const { canvas, ctx } = layer;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  /**
   * 清空所有 Canvas 层
   */
  clearAllLayers() {
    for (let i = 0; i < 4; i++) {
      this.clearLayer(i);
    }
  }

  /**
   * 场景已运行时长（毫秒）
   * @returns {number}
   */
  getElapsedTime() {
    return performance.now() - this.enterTime;
  }
}