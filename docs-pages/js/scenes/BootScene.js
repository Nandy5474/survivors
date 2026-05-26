/**
 * BootScene — 启动场景
 * 负责资源预加载、引擎初始化、过渡到菜单
 * @version 0.1.0
 */

import BaseScene from './BaseScene.js';
import EventBus, { GameEvents } from '../game/EventBus.js';

export default class BootScene extends BaseScene {
  constructor() {
    super();
    this.name = 'boot';

    /** @type {number} 加载进度 0~100 */
    this._progress = 0;
    /** @type {number} 模拟加载的最小持续时间（ms） */
    this._minDuration = 500;
    /** @type {boolean} 加载是否完成 */
    this._loadComplete = false;
    /** @type {number} 启动时间 */
    this._startTime = 0;
  }

  async load() {
    this._startTime = performance.now();

    // 模拟分批加载资源
    const manifest = this._buildManifest();

    for (let i = 0; i < manifest.length; i++) {
      this._progress = Math.floor(((i + 1) / manifest.length) * 100);
      this._updateLoadingUI();

      // 在真实项目中，此处应执行实际加载
      // await this._loadAsset(manifest[i]);
      await this._delay(10); // 模拟加载延迟，后续替换为真实资源加载
    }

    this._loadComplete = true;
  }

  async create() {
    // 确保最短加载时间，避免闪屏
    const elapsed = performance.now() - this._startTime;
    if (elapsed < this._minDuration) {
      await this._delay(this._minDuration - elapsed);
    }

    // 隐藏加载屏幕
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
    }
  }

  update(dt) {
    if (this._loadComplete) {
      // 启动完成后切换到菜单场景
      this.game.switchScene('menu');
    }
  }

  render() {
    // BootScene 不使用 Canvas 渲染，由 HTML 加载界面处理
  }

  // ---- 私有 ----

  /**
   * 构建资源加载清单
   * @returns {Array<{type: string, path: string, key: string}>}
   */
  _buildManifest() {
    return [
      // 配置文件（Phase 1 保留占位）
      // { type: 'json', path: 'assets/config/mercenaries.json', key: 'cfg_mercenaries' },
      // { type: 'json', path: 'assets/config/items.json', key: 'cfg_items' },
      // { type: 'json', path: 'assets/config/buildings.json', key: 'cfg_buildings' },
      // { type: 'json', path: 'assets/config/rooms.json', key: 'cfg_rooms' },
      // { type: 'json', path: 'assets/config/story.json', key: 'cfg_story' },

      // 精灵图
      // { type: 'image', path: 'assets/sprites/characters/player.png', key: 'spr_player' },

      // 音频
      // { type: 'audio', path: 'assets/audio/bgm/menu.mp3', key: 'bgm_menu' },
    ];
  }

  /**
   * 更新加载界面 UI
   */
  _updateLoadingUI() {
    const bar = document.getElementById('loading-bar');
    const text = document.getElementById('loading-text');
    if (bar) bar.style.width = `${this._progress}%`;
    if (text) text.textContent = `加载中... ${this._progress}%`;
  }

  /**
   * 异步延迟
   * @param {number} ms
   * @returns {Promise<void>}
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}