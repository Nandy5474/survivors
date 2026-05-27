/**
 * GameScene — 主游戏场景
 * 集成地图生成、玩家控制、实体管理、渲染系统
 * v0.4.0：集成 AP 回合制战斗系统
 * @version 0.4.0
 */

import BaseScene from './BaseScene.js';
import EventBus, { GameEvents } from '../game/EventBus.js';
import StateManager from '../game/StateManager.js';

// 新系统
import MapGenerator, { RoomType, TILE_SIZE } from '../game/MapGenerator.js';
import Player from '../entities/Player.js';
import Zombie from '../entities/Zombie.js';
import Survivor, { SurvivorRole } from '../entities/Survivor.js';
import MapRenderer from '../renderers/MapRenderer.js';
import EntityRenderer from '../renderers/EntityRenderer.js';
import { generateSeed } from '../utils/Random.js';

// 战斗系统
import CombatManager from '../combat/CombatManager.js';
import CombatUI from '../combat/CombatUI.js';

// 移动端控制
import MobileControls from '../ui/MobileControls.js';

/** 游戏模式枚举 */
export const GameMode = Object.freeze({
  EXPLORATION: 'exploration',
  BASE: 'base',
  COMBAT: 'combat',
  DIALOGUE: 'dialogue',
});

/** 幸存者名称池 */
const SURVIVOR_NAMES = ['李明', '王芳', '张伟', '陈静', '刘洋', '赵刚', '孙敏', '周强'];

/** 幸存者对话池 */
const SURVIVOR_DIALOGUES = [
  ['你是...人类？太好了，我以为这里只剩我了。'],
  ['别靠近！...等等，你不是丧尸。你从哪里来的？'],
  ['这里太危险了，到处都是丧尸。你有安全的藏身处吗？'],
  ['我是一名医生，如果你需要治疗，我可以帮忙。'],
  ['我在这片区域搜索物资，没想到遇到了你。', '这附近还有一个废弃的仓库，可能有我们需要的东西。'],
  ['谢谢你发现了我。我有些物资可以分享。'],
];

/** 触发战斗的索敌距离（像素） */
const COMBAT_TRIGGER_DIST = 36;

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

    // --- 探索系统 ---

    /** @type {import('../game/MapGenerator.js').MapData|null} */
    this._mapData = null;

    /** @type {Player|null} */
    this._player = null;

    /** @type {Zombie[]} */
    this._zombies = [];

    /** @type {Survivor[]} */
    this._survivors = [];

    /** @type {MapRenderer|null} */
    this._mapRenderer = null;

    /** @type {EntityRenderer|null} */
    this._entityRenderer = null;

    /** @type {{ x: number, y: number }} 相机位置（世界坐标，左上角） */
    this._camera = { x: 0, y: 0 };

    /** @type {Set<string>} 当前按下的键 */
    this._keys = new Set();

    /** @type {Room|null} 上次所在的房间（用于检测房间切换） */
    this._lastRoom = null;

    /** @type {boolean} 探索系统是否已初始化 */
    this._explorationReady = false;

    // --- 战斗系统 ---

    /** @type {CombatManager|null} */
    this._combatManager = null;

    /** @type {CombatUI|null} */
    this._combatUI = null;

    /** @type {Zombie|null} 当前战斗的丧尸引用 */
    this._combatTargetZombie = null;

    // --- 其他 ---

    /** @type {object} 子模块引用 */
    this.systems = {};

    // 事件监听取消函数列表
    this._unsubscribers = [];

    // 暂停/HUD handler 引用
    /** @type {Map<string, Function>} */
    this._pauseHandlers = new Map();
    /** @type {Map<string, Function>} */
    this._hudHandlers = new Map();

    // --- 移动端控制 ---
    /** @type {MobileControls|null} */
    this._mobileControls = null;
    /** @type {boolean} 是否移动端 */
    this._isMobile = MobileControls.isMobile();
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

    // 画初始基地背景
    this._drawBaseBackground();

    // 更新 HUD
    this._refreshHUD();

    // 初始化战斗系统
    this._combatManager = new CombatManager(this.game);
    this._combatUI = new CombatUI(this.game, this._combatManager);

    // 初始化移动端控制（仅在移动设备上）
    if (this._isMobile) {
      this._mobileControls = new MobileControls(this.game);
      this._mobileControls.init();
      console.log('[GameScene] Mobile controls activated');
    }

    console.log('[GameScene] Created. Mode:', this.data.mode || 'continue');
  }

  update(dt) {
    if (this._isPaused) return;

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

    this._advanceGameTime(dt);
  }

  render() {
    if (this._isPaused) return;

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
    this._unbindKeyEvents();
    this._unbindPauseEvents();
    this._unbindHudButtons();
    this._unsubscribeAll();

    // 销毁战斗 UI
    if (this._combatUI) {
      this._combatUI.destroy();
      this._combatUI = null;
    }

    // 销毁移动端控制
    if (this._mobileControls) {
      this._mobileControls.destroy();
      this._mobileControls = null;
    }

    const hudBottom = document.getElementById('hud-bottom');
    if (hudBottom) hudBottom.classList.add('hidden');
  }

  /**
   * 切换游戏模式
   * @param {string} mode
   */
  setMode(mode) {
    if (!Object.values(GameMode).includes(mode)) {
      console.warn(`[GameScene] Unknown mode: ${mode}`);
      return;
    }
    const prevMode = this.mode;
    this.mode = mode;

    // 首次进入探索模式时初始化
    if (mode === GameMode.EXPLORATION && !this._explorationReady) {
      this._initExploration();
    }

    EventBus.emit(GameEvents.SCENE_CHANGE, { scene: `game:${mode}`, data: { prevMode } });
  }

  // ========== 探索系统初始化 ==========

  _initExploration() {
    const seed = generateSeed();
    console.log('[GameScene] Generating map with seed:', seed);

    // 生成地图
    const generator = new MapGenerator(seed, 40, 30);
    this._mapData = generator.generate();

    // 创建渲染器
    this._mapRenderer = new MapRenderer(this._mapData);
    this._entityRenderer = new EntityRenderer();

    // 创建玩家
    this._player = new Player(
      this._mapData.playerStart.x,
      this._mapData.playerStart.y
    );

    // 生成实体
    this._spawnEntities();

    // 初始化相机到玩家位置
    const canvas = this.game?.getLayer(1)?.canvas;
    if (canvas) {
      this._camera.x = this._player.x - canvas.width / 2;
      this._camera.y = this._player.y - canvas.height / 2;
    }

    // 标记出生房间为已探索
    const startRoom = this._mapData.getContainingRoom(this._player.x, this._player.y);
    if (startRoom) {
      startRoom.explored = true;
      this._player.currentRoom = startRoom;
    }

    // 绑定键盘事件
    this._bindKeyEvents();

    // 清空地图画布
    this.clearLayer(1);
    this.clearLayer(2);

    this._explorationReady = true;

    EventBus.emit(GameEvents.EXPLORATION_START, {
      seed,
      roomCount: this._mapData.rooms.length,
    });

    EventBus.emit(GameEvents.UI_NOTIFICATION, {
      type: 'info',
      message: `探索开始 · 地图种子: ${seed} · ${this._mapData.rooms.length} 个房间`,
    });
  }

  /**
   * 根据地图房间生成实体
   */
  _spawnEntities() {
    this._zombies = [];
    this._survivors = [];

    for (const room of this._mapData.rooms) {
      const cx = room.centerX;
      const cy = room.centerY;

      switch (room.type) {
        case RoomType.ZOMBIE: {
          // 创建 1-3 只丧尸
          const count = 1 + Math.floor(Math.random() * 3);
          for (let i = 0; i < count; i++) {
            const zx = cx + (Math.random() - 0.5) * room.worldW * 0.5;
            const zy = cy + (Math.random() - 0.5) * room.worldH * 0.5;
            const isElite = Math.random() < 0.15;
            const zombie = new Zombie(zx, zy, {
              hp: isElite ? 80 : 50,
              speed: isElite ? 75 : 55,
              attack: isElite ? 15 : 8,
              isElite,
              type: isElite ? 'elite' : 'walker',
              patrolPath: this._generatePatrolPath(room, zx, zy),
            });
            this._zombies.push(zombie);
          }
          break;
        }
        case RoomType.SURVIVOR: {
          const name = SURVIVOR_NAMES[Math.floor(Math.random() * SURVIVOR_NAMES.length)];
          const dialogue = SURVIVOR_DIALOGUES[Math.floor(Math.random() * SURVIVOR_DIALOGUES.length)];
          const canRecruit = Math.random() < 0.5;

          const survivor = new Survivor(cx, cy, {
            name,
            dialogue,
            canRecruit,
            role: canRecruit
              ? (Math.random() < 0.5 ? SurvivorRole.SOLDIER : SurvivorRole.SCAVENGER)
              : SurvivorRole.CIVILIAN,
          });
          this._survivors.push(survivor);
          break;
        }
      }
    }
  }

  /**
   * 房间内巡逻路径生成
   */
  _generatePatrolPath(room, zx, zy) {
    const pts = [];
    const count = 2 + Math.floor(Math.random() * 3);
    const margin = TILE_SIZE;
    const minX = room.worldX + margin;
    const maxX = room.worldX + room.worldW - margin;
    const minY = room.worldY + margin;
    const maxY = room.worldY + room.worldH - margin;

    for (let i = 0; i < count; i++) {
      pts.push({
        x: minX + Math.random() * Math.max(0, maxX - minX),
        y: minY + Math.random() * Math.max(0, maxY - minY),
      });
    }

    // 确保路径从当前位置开始
    if (pts.length > 0) pts[0] = { x: zx, y: zy };

    return pts;
  }

  // ========== 探索更新 ==========

  /** @param {number} dt */
  _updateExploration(dt) {
    if (!this._player || !this._mapData) return;

    // 1) 处理输入
    const dx = this._getInputX();
    const dy = this._getInputY();

    this._player.move(dx, dy, dt, this._mapData);

    // 2) 检查房间进入
    const enteredRoom = this._player.checkRoomEntry(this._mapData);
    if (enteredRoom) {
      this._onRoomEntered(enteredRoom);
    }

    // 3) 更新丧尸 + 检测战斗触发
    for (const zombie of this._zombies) {
      zombie.update(dt, this._mapData, this._player);

      // 检测是否触发战斗（距离足够近 + 丧尸处于 CHASE 状态）
      if (zombie.isAlive && zombie.state === 'chase') {
        const dist = this._distanceBetween(this._player, zombie);
        if (dist < COMBAT_TRIGGER_DIST && !this._combatManager.inCombat) {
          this._startCombat(zombie);
        }
      }
    }

    // 4) 更新相机（平滑跟随玩家）
    this._updateCamera(dt);
  }

  /** 两实体间距离 */
  _distanceBetween(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** @returns {number} X 输入归一化 [-1, 0, 1] */
  _getInputX() {
    let val = 0;
    // 键盘输入
    if (this._keys.has('d') || this._keys.has('D') || this._keys.has('ArrowRight')) val += 1;
    if (this._keys.has('a') || this._keys.has('A') || this._keys.has('ArrowLeft')) val -= 1;
    // 移动端摇杆输入
    if (this._mobileControls && this._mobileControls._enabled) {
      const mobileInput = this._mobileControls.getInput();
      if (Math.abs(mobileInput.x) > 0.12) val = mobileInput.x;
    }
    return val;
  }

  /** @returns {number} Y 输入归一化 [-1, 0, 1] */
  _getInputY() {
    let val = 0;
    // 键盘输入
    if (this._keys.has('s') || this._keys.has('S') || this._keys.has('ArrowDown')) val += 1;
    if (this._keys.has('w') || this._keys.has('W') || this._keys.has('ArrowUp')) val -= 1;
    // 移动端摇杆输入
    if (this._mobileControls && this._mobileControls._enabled) {
      const mobileInput = this._mobileControls.getInput();
      if (Math.abs(mobileInput.y) > 0.12) val = mobileInput.y;
    }
    return val;
  }

  /** 房间进入回调 */
  _onRoomEntered(room) {
    const roomLabels = {
      small_box: '小型储物间',
      large_box: '大型储物间',
      empty: '空房间',
      supply: '物资房',
      zombie: '丧尸房',
      survivor: '幸存者房',
    };
    const label = roomLabels[room.type] || room.type;

    EventBus.emit(GameEvents.ROOM_ENTERED, { room });

    let msg = `进入 ${label}`;
    let showInteract = false;
    if (room.hasSupplies) {
      msg += ' · 按 E 收集物资';
      showInteract = true;
    }
    if (room.type === RoomType.ZOMBIE) {
      msg += ' · 发现丧尸！准备战斗';
      // 进入丧尸房间时，触发与最近丧尸的战斗
      const nearest = this._findNearestZombie(room, 200);
      if (nearest && !this._combatManager.inCombat) {
        this._startCombat(nearest);
        return;
      }
    }
    if (room.type === RoomType.SURVIVOR) {
      msg += ' · 发现幸存者！按 E 对话';
      showInteract = true;
    }

    // 移动端显示交互按钮
    if (this._mobileControls) {
      this._mobileControls.setInteractButtonVisible(showInteract);
    }

    EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'info', message: msg });
  }

  /** 在房间内找最近的存活丧尸 */
  _findNearestZombie(room, maxDist) {
    let nearest = null;
    let minDist = maxDist;
    for (const z of this._zombies) {
      if (!z.isAlive) continue;
      const inRoom = this._mapData.getContainingRoom(z.x, z.y);
      if (!inRoom || inRoom.id !== room.id) continue;
      const dist = this._distanceBetween(this._player, z);
      if (dist < minDist) {
        minDist = dist;
        nearest = z;
      }
    }
    return nearest;
  }

  /** 相机平滑跟随 */
  _updateCamera(dt) {
    const canvas = this.game?.getLayer(1)?.canvas;
    if (!canvas) return;

    const targetX = this._player.x - canvas.width / 2;
    const targetY = this._player.y - canvas.height / 2;

    // 平滑插值
    const lerpFactor = 1 - Math.exp(-8 * dt);
    this._camera.x += (targetX - this._camera.x) * lerpFactor;
    this._camera.y += (targetY - this._camera.y) * lerpFactor;

    // 限制在地图边界内
    const maxCamX = this._mapData.width - canvas.width;
    const maxCamY = this._mapData.height - canvas.height;
    this._camera.x = Math.max(0, Math.min(maxCamX, this._camera.x));
    this._camera.y = Math.max(0, Math.min(maxCamY, this._camera.y));
  }

  // ========== 战斗系统 ==========

  /**
   * 开始战斗
   * @param {Zombie} zombie
   */
  _startCombat(zombie) {
    if (this._combatManager.inCombat) return;

    this._combatTargetZombie = zombie;
    this.mode = GameMode.COMBAT;

    // 暂停探索的丧尸 AI（战斗内由 CombatManager 控制）
    zombie.state = 'idle';

    this._combatManager.startCombat(zombie, this._player, this._player.currentRoom);

    EventBus.emit(GameEvents.UI_NOTIFICATION, {
      type: 'warning',
      message: `战斗开始！面对 ${zombie.isElite ? '精英丧尸' : '普通丧尸'}！`,
    });

    console.log('[GameScene] Combat started with zombie:', zombie.isElite ? 'ELITE' : 'NORMAL');
  }

  /** @param {number} dt */
  _updateCombat(dt) {
    if (!this._combatManager.inCombat) {
      // 战斗已结束，切回探索
      this._endCombatCheck();
      return;
    }

    // CombatUI 的渲染在 render() 中处理
    // 战斗逻辑由 CombatManager.playerAction() 驱动（按钮点击）
  }

  /**
   * 检查战斗是否结束
   */
  _endCombatCheck() {
    if (!this._combatManager.inCombat && this.mode === GameMode.COMBAT) {
      // 战斗已结束，切回探索模式
      this.mode = GameMode.EXPLORATION;

      // 恢复丧尸状态
      if (this._combatTargetZombie && this._combatTargetZombie.isAlive) {
        this._combatTargetZombie.state = 'patrol';
      }
      this._combatTargetZombie = null;

      // 清空 fx 层（CombatUI 绘制的内容）
      this.clearLayer(3);

      console.log('[GameScene] Combat ended, returned to exploration');
    }
  }

  // ========== 键盘事件 ==========

  _bindKeyEvents() {
    this._onKeyDown = (e) => {
      this._keys.add(e.key);

      // E 键：交互 / 战斗中选择攻击
      if ((e.key === 'e' || e.key === 'E')) {
        this._onInteract();
      }

      // 战斗中的快捷键（1=攻击，2=防御，3=撤退，4=等待）
      if (this.mode === GameMode.COMBAT && this._combatManager.inCombat) {
        if (e.key === '1') this._combatManager.playerAction('attack');
        if (e.key === '2') this._combatManager.playerAction('defend');
        if (e.key === '3') this._combatManager.playerAction('retreat');
        if (e.key === '4') this._combatManager.playerAction('wait');
      }

      // 阻止方向键滚动页面
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
    };

    this._onKeyUp = (e) => {
      this._keys.delete(e.key);
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  _unbindKeyEvents() {
    if (this._onKeyDown) window.removeEventListener('keydown', this._onKeyDown);
    if (this._onKeyUp) window.removeEventListener('keyup', this._onKeyUp);
  }

  /** 交互：收集物资 or 对话幸存者 or 战斗中选择 */
  _onInteract() {
    if (!this._player || !this._mapData) return;
    if (this._isPaused) return;

    // 战斗中：E 键 = 攻击
    if (this.mode === GameMode.COMBAT && this._combatManager.inCombat) {
      this._combatManager.playerAction('attack');
      return;
    }

    // 尝试收集物资
    if (this._player.currentRoom && this._player.currentRoom.hasSupplies) {
      const result = this._player.collectSupply();
      if (result) {
        const labels = {
          food: '食物', water: '水', ammo: '弹药', parts: '零件', materials: '建材',
        };
        const itemLabel = labels[result.supplyType] || result.supplyType;

        EventBus.emit(GameEvents.ITEM_ACQUIRED, { type: result.supplyType });
        EventBus.emit(GameEvents.UI_NOTIFICATION, {
          type: 'success',
          message: `收集了 ${itemLabel}`,
        });

        // 更新状态
        this._applySupplyToState(result.supplyType);
        return;
      }
    }

    // 尝试对话幸存者
    const nearestSurvivor = this._findNearestSurvivor(60);
    if (nearestSurvivor && !nearestSurvivor.interacted) {
      const dialogue = nearestSurvivor.getNextDialogue();
      if (dialogue) {
        EventBus.emit(GameEvents.DIALOGUE_START, {
          speaker: nearestSurvivor.name,
          text: dialogue.text,
        });
        EventBus.emit(GameEvents.UI_NOTIFICATION, {
          type: 'info',
          message: `${nearestSurvivor.name}: "${dialogue.text}"`,
        });
      }
    }
  }

  /** 将物资应用到全局状态 */
  _applySupplyToState(type) {
    const path = {
      food: 'globalResources.food',
      water: 'globalResources.water',
      ammo: 'globalResources.ammo',
      parts: 'globalResources.parts',
      materials: 'globalResources.materials.wood',
    }[type];

    if (path) {
      const current = StateManager.get(path) || 0;
      StateManager.set(path, current + this._randomSupplyAmount(type));
      this._refreshHUD();
    }
  }

  _randomSupplyAmount(type) {
    if (type === 'ammo') return 5 + Math.floor(Math.random() * 11); // 5~15
    if (type === 'materials') return 3 + Math.floor(Math.random() * 8); // 3~10
    return 1 + Math.floor(Math.random() * 5); // 1~5
  }

  /**
   * 查找最近的幸存者
   * @param {number} maxDist
   * @returns {Survivor|null}
   */
  _findNearestSurvivor(maxDist) {
    let nearest = null;
    let minDist = maxDist;
    for (const s of this._survivors) {
      const dist = s.distanceTo(this._player.x, this._player.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = s;
      }
    }
    return nearest;
  }

  // ========== 渲染 ==========

  _renderExploration() {
    if (!this._mapData || !this._mapRenderer || !this._entityRenderer) return;

    const canvas = this.game?.getLayer(1)?.canvas;
    if (!canvas) return;

    // 构建视口
    const viewport = {
      x: this._camera.x,
      y: this._camera.y,
      w: canvas.width,
      h: canvas.height,
    };

    // 1) 地图层
    const mapCtx = this.game.getMapCtx();
    if (mapCtx) {
      mapCtx.save();
      mapCtx.translate(-this._camera.x, -this._camera.y);
      this._mapRenderer.render(mapCtx, viewport);
      mapCtx.restore();
    }

    // 2) 实体层
    const entityCtx = this.game.getEntityCtx();
    if (entityCtx) {
      this.clearLayer(2); // 清空实体层

      entityCtx.save();
      entityCtx.translate(-this._camera.x, -this._camera.y);

      // 渲染玩家
      if (this._player) {
        this._entityRenderer.renderPlayer(
          entityCtx, this._player,
          this._player.x, this._player.y
        );
      }

      // 渲染丧尸
      for (const zombie of this._zombies) {
        this._entityRenderer.renderZombie(
          entityCtx, zombie,
          zombie.x, zombie.y
        );
      }

      // 渲染幸存者
      for (const survivor of this._survivors) {
        this._entityRenderer.renderSurvivor(
          entityCtx, survivor,
          survivor.x, survivor.y
        );
      }

      entityCtx.restore();
    }

    // 3) 小地图（右上角）
    const fxCtx = this.game.getLayer(3)?.ctx;
    if (fxCtx && this._player) {
      this.clearLayer(3);
      const mmSize = 140;
      const mmPadding = 12;
      this._mapRenderer.renderMinimap(
        fxCtx,
        canvas.width - mmSize - mmPadding,
        mmPadding,
        mmSize,
        { x: this._player.x, y: this._player.y }
      );
    }
  }

  _renderCombat() {
    // CombatUI 负责绘制战斗界面
    if (this._combatUI) {
      this._combatUI.render(1 / 60); // 传入固定帧间隔
    }
  }

  _renderBase() {
    this._drawBaseBackground();
  }

  // ========== 原有方法 (保持不变) ==========

  /** @param {number} dt */
  _updateBase(dt) {
    // Phase 2+ 实现基地逻辑
  }

  _drawBaseBackground() {
    const ctx = this.game?.getMapCtx();
    if (!ctx) return;

    const layer = this.game.getLayer(1);
    const w = layer.canvas.width;
    const h = layer.canvas.height;

    ctx.fillStyle = '#1c1c2a';
    ctx.fillRect(0, 0, w, h);

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
    this._unsubscribers.push(
      EventBus.on(GameEvents.RESOURCE_CHANGED, () => this._refreshHUD())
    );

    this._unsubscribers.push(
      EventBus.on(GameEvents.UI_NOTIFICATION, ({ type, message }) => {
        this._showNotification(type, message);
      })
    );

    // 战斗结束事件
    this._unsubscribers.push(
      EventBus.on(GameEvents.COMBAT_END, (result) => {
        this._onCombatEnd(result);
      })
    );

    const onEscape = (e) => {
      if (e.key === 'Escape') {
        if (this._isPaused) {
          this.game.resume();
        } else {
          this.game.pause();
        }
      }
    };
    window.addEventListener('keydown', onEscape);
    this._unsubscribers.push(() => window.removeEventListener('keydown', onEscape));
  }

  /**
   * 战斗结束回调
   * @param {object} result - CombatManager._endCombat() 的返回值
   */
  _onCombatEnd(result) {
    if (result.victory) {
      EventBus.emit(GameEvents.UI_NOTIFICATION, {
        type: 'success',
        message: `战斗胜利！获得 ${result.loot.length} 件物资`,
      });
    } else if (result.reason === 'retreat') {
      EventBus.emit(GameEvents.UI_NOTIFICATION, {
        type: 'warning',
        message: '撤退成功！',
      });
    } else {
      EventBus.emit(GameEvents.UI_NOTIFICATION, {
        type: 'error',
        message: '战斗失败...',
      });
    }

    // 延迟切回探索模式（让玩家看到结果）
    setTimeout(() => {
      this._endCombatCheck();
    }, 1500);
  }

  _bindPauseEvents() {
    const onResume = () => this.game.resume();
    const onSave = () => {
      EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'info', message: '存档功能将在后续版本中开放' });
    };
    const onQuit = () => {
      this.game.resume();
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
    const bind = (id, handler) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', handler);
        this._hudHandlers.set(id, handler);
      }
    };

    bind('btn-explore',   () => this.setMode(GameMode.EXPLORATION));
    bind('btn-base',      () => {
      this.setMode(GameMode.BASE);
      this._unbindKeyEvents();
      this.clearLayer(1);
      this.clearLayer(2);
      this.clearLayer(3);
      this._drawBaseBackground();
    });
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

  _advanceGameTime(dt) {
    if (this.mode === GameMode.COMBAT) return;

    let minute = StateManager.get('gameTime.minute') + dt;
    let hour = StateManager.get('gameTime.hour');
    let day = StateManager.get('gameTime.day');

    if (minute >= 60) {
      const hours = Math.floor(minute / 60);
      minute -= hours * 60;
      hour += hours;
    }

    if (hour >= 24) {
      const days = Math.floor(hour / 24);
      hour -= days * 24;
      day += days;
    }

    StateManager.batch([
      { path: 'gameTime.minute', value: Math.floor(minute) },
      { path: 'gameTime.hour', value: hour },
      { path: 'gameTime.day', value: day },
    ]);

    if (Math.floor(minute) % 10 === 0) {
      this._refreshHUD();
    }
  }

  // ---- 私有：通知 ----

  _showNotification(type, message) {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const el = document.createElement('div');
    el.className = `notification ${type}`;
    el.textContent = message;
    container.appendChild(el);

    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 3500);
  }
}
