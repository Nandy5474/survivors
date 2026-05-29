/**
 * main.js — 游戏入口
 * 初始化引擎、注册场景、启动主循环
 * @version 0.1.0
 */

import Game from './game/Game.js';
import StateManager from './game/StateManager.js';
import EventBus, { GameEvents } from './game/EventBus.js';

// 场景
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';

function showError(msg) {
  const el = document.getElementById('loading-error');
  if (el) {
    el.textContent = '错误: ' + msg;
    el.style.display = 'block';
  }
  console.error('[Survivors]', msg);
}

// 全局未捕获错误处理
window.addEventListener('error', (e) => {
  if (e.filename && e.filename.includes(window.location.origin)) {
    showError(`${e.filename.split('/').pop()}:${e.lineno} - ${e.message}`);
  }
});
window.addEventListener('unhandledrejection', (e) => {
  showError('Promise: ' + (e.reason?.message || String(e.reason)));
});

(async () => {
  try {
    console.log('[Survivors] Starting...');

    // 1. 创建游戏实例
    const game = new Game();

    // 2. 初始化引擎（获取 Canvas、挂载 resize 等）
    await game.init({ targetFPS: 60 });

    // 3. 注册场景
    game.registerScene('boot', new BootScene());
    game.registerScene('menu', new MenuScene());
    game.registerScene('game', new GameScene());

    // 4. 全局事件监听
    EventBus.on(GameEvents.SCENE_CHANGE, ({ scene }) => {
      console.log(`[Scene] → ${scene}`);
    });

    EventBus.on(GameEvents.UI_NOTIFICATION, ({ type, message }) => {
      console.log(`[Notification] ${type}: ${message}`);
    });

    // 5. 启动 → 进入 BootScene
    await game.switchScene('boot');
    game.start();
  } catch (err) {
    showError(err.message || String(err));
    console.error('[Survivors] Crash:', err);
  }
})();