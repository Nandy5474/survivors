/**
 * GameScene — 主游戏场景 v0.6.0
 * Task 2: 新游戏直接进入序章
 * Task 3: 序章禁用基地按钮
 * Task 4: 序章结束后可进入基地
 * Task 5: 序章剧情和地图优化
 */
import BaseScene from './BaseScene.js';
import EventBus, { GameEvents } from '../game/EventBus.js';
import StateManager from '../game/StateManager.js';
import MapGenerator, { RoomType, TILE_SIZE } from '../game/MapGenerator.js';
import Player from '../entities/Player.js';
import Zombie from '../entities/Zombie.js';
import Survivor, { SurvivorRole } from '../entities/Survivor.js';
import MapRenderer from '../renderers/MapRenderer.js';
import EntityRenderer from '../renderers/EntityRenderer.js';
import LootItem, { LootType } from '../entities/LootItem.js';
import { generateSeed } from '../utils/Random.js';
import CombatManager from '../combat/CombatManager.js';
import CombatUI from '../combat/CombatUI.js';
import MobileControls, { TouchEvents } from '../ui/MobileControls.js';
import FullMapRenderer from '../renderers/FullMapRenderer.js';
import FloorMapPanel from '../ui/FloorMapPanel.js';
import InventorySystem from '../systems/InventorySystem.js';
import BaseSystem, { BuildingType, BUILDING_DEFS, SURVIVOR_JOB_LABELS } from '../systems/BaseSystem.js';
import { ITEM_DEFS, ItemCategory } from '../systems/InventorySystem.js';

export const GameMode = Object.freeze({
  EXPLORATION: 'exploration',
  BASE: 'base',
  COMBAT: 'combat',
  DIALOGUE: 'dialogue',
});

const SURVIVOR_NAMES = ['李明', '王芳', '张伟', '陈静', '刘洋', '赵刚', '孙敏', '周强'];
const SURVIVOR_DIALOGUES = [
  ['你是...人类？太好了，我以为这里只剩我了。'],
  ['别靠近！...等等，你不是丧尸。你从哪里来的？'],
  ['这里太危险了，到处都是丧尸。你有安全的藏身处吗？'],
  ['我是一名医生，如果你需要治疗，我可以帮忙。'],
  ['我在这片区域搜索物资，没想到遇到了你。', '这附近还有一个废弃的仓库，可能有我们需要的东西。'],
  ['谢谢你发现了我。我有些物资可以分享。'],
];
const MAP_NAME_PREFIXES = ['废弃', '阴暗', '残破', '荒芜', '死亡', '腐烂', '寂静', '血色', '暗巷', '破碎', '荒废', '幸存者', '瘟疫', '辐射', '地下', '末日'];
const MAP_NAME_SUFFIXES = ['仓库', '街区', '医院', '学校', '工厂', '车站', '隧道', '超市', '公寓', '教堂', '避难所', '下水道', '停车场', '办公楼', '实验室', '码头'];
const COMBAT_TRIGGER_DIST = 36;

export default class GameScene extends BaseScene {
  constructor() {
    super();
    this.name = 'game';
    this.mode = GameMode.BASE;
    this._isPaused = false;
    this._pauseOverlay = null;
    this._mapData = null;
    this._player = null;
    this._zombies = [];
    this._survivors = [];
    this._lootItems = [];
    this._mapRenderer = null;
    this._entityRenderer = null;
    this._camera = { x: 0, y: 0 };
    this._keys = new Set();
    this._lastRoom = null;
    this._explorationReady = false;
    this._combatManager = null;
    this._combatUI = null;
    this._combatTargetZombie = null;
    this.systems = {};
    this._inventory = new InventorySystem(30);
    this._baseSystem = null;
    this._activePanel = null;
    this._invFilter = 'all';
    this._lastTickDay = 0;
    this._unsubscribers = [];
    this._pauseHandlers = new Map();
    this._hudHandlers = new Map();
    this._panelHandlers = new Map();
    this._mobileControls = null;
    this._isMobile = MobileControls.isMobile();
    this._prologueDefeatedZombie = false;
    this._prologueLootedStore = false;
    
    /** 全屏大地图 */
    this._fullMapRenderer = null;
    this._mapPanelVisible = false;
    this._mapPanelEl = null;
    this._mapCanvasEl = null;
    this._mapCloseBtn = null;
  }

  async create() {
    document.getElementById('menu-screen')?.classList.add('hidden');
    document.getElementById('hud-bottom')?.classList.remove('hidden');
    this._pauseOverlay = document.getElementById('pause-overlay');
    this._bindPauseEvents();
    this._bindHudButtons();
    this._bindPanelEvents();
    this._initMapPanel();
    this._floorMapPanel = new FloorMapPanel(this.game, null);
    this._floorMapPanel.init();
    this._baseSystem = new BaseSystem();
    this._baseSystem.onChanged(() => this._renderBasePanel());
    this._inventory.onChanged(() => this._renderInventoryPanel());
    this._lastTickDay = StateManager.get('gameTime.day') || 1;
    this._subscribeEvents();
    this._drawBaseBackground();
    this._refreshHUD();
    this._combatManager = new CombatManager(this.game);
    this._combatUI = new CombatUI(this.game, this._combatManager);
    if (this._isMobile) {
      this._mobileControls = new MobileControls(this.game);
      this._mobileControls.init();
    }
    // Task 2: 新游戏直接进入序章
    if (this.data && this.data.mode === 'new') {
      this._resetStateForNewGame();
      setTimeout(() => { this.setMode(GameMode.EXPLORATION); }, 0);
    }
    console.log('[GameScene] Created. Mode:', this.data?.mode || 'continue');
  }

  /** Task 2: 为新游戏重置状态并进入序章 */
  _resetStateForNewGame() {
    StateManager.reset();
    StateManager.set('story.chapter', 0);
    StateManager.set('story.flags', {});
    StateManager.set('story.flags.prologueComplete', false);
    StateManager.set('player.hasWeapon', false);
  }

  update(dt) {
    if (this._isPaused) return;
    switch (this.mode) {
      case GameMode.BASE: this._updateBase(dt); break;
      case GameMode.EXPLORATION: this._updateExploration(dt); break;
      case GameMode.COMBAT: this._updateCombat(dt); break;
    }
    this._advanceGameTime(dt);
  }

  render() {
    if (this._isPaused) return;
    switch (this.mode) {
      case GameMode.BASE: this._renderBase(); break;
      case GameMode.EXPLORATION: this._renderExploration(); break;
      case GameMode.COMBAT: this._renderCombat(); break;
    }
  }

  onPause() { this.state = 'paused'; this._isPaused = true; this._pauseOverlay?.classList.remove('hidden'); }
  onResume() {
    this.state = 'active'; this._isPaused = false; this._pauseOverlay?.classList.add('hidden');
    if (this.mode === GameMode.EXPLORATION && !this._onKeyDown) this._bindKeyEvents();
  }

  onExit() {
    this._closeActivePanel();
    this._unbindPanelEvents();
    this._unbindKeyEvents();
    this._unbindPauseEvents();
    this._unbindHudButtons();
    this._unsubscribeAll();
    if (this._combatUI) { this._combatUI.destroy(); this._combatUI = null; }
    if (this._mobileControls) { this._mobileControls.destroy(); this._mobileControls = null; }
    document.getElementById('hud-bottom')?.classList.add('hidden');
  }

  setMode(mode) {
    if (!Object.values(GameMode).includes(mode)) return;
    const prev = this.mode;
    this.mode = mode;
    if (prev === GameMode.EXPLORATION && mode !== GameMode.EXPLORATION) this._cleanupExploration();
    if (mode === GameMode.EXPLORATION) this._initExploration();
    else this._setHudVisible('hud-map-name', false);
    if (this._mobileControls?.setMode) this._mobileControls.setMode(mode);
    EventBus.emit(GameEvents.SCENE_CHANGE, { scene: `game:${mode}`, data: { prevMode: prev } });
  }

  /** Task 4: 序章完成后自动返回基地 */
  _cleanupExploration() {
    const chapter = StateManager.get('story.chapter') || 0;
    const prologueComplete = StateManager.get('story.flags.prologueComplete') === true;
    if (chapter === 0 && !prologueComplete) {
      const exploredCount = this._mapData ? this._mapData.rooms.filter(r => r.explored).length : 0;
      if (exploredCount >= 2 && this._prologueDefeatedZombie && this._prologueLootedStore) {
        StateManager.set('story.flags.prologueComplete', true);
        StateManager.set('story.chapter', 1);
        EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'success', message: '序章完成！' });
        this._updateBaseButtonState();
        setTimeout(() => { this.setMode(GameMode.BASE); this._drawBaseBackground(); this._openBasePanel(); }, 2000);
        return;
      }
    }
    this._unbindKeyEvents();
    this._mapData = null; this._player = null;
    this._zombies = []; this._survivors = []; this._lootItems = [];
    this._mapRenderer = null; this._entityRenderer = null;
    this._lastRoom = null; this._explorationReady = false;
    this._prologueDefeatedZombie = false; this._prologueLootedStore = false;
    if (this._combatManager?.inCombat) this._combatManager._endCombat();
    this._combatTargetZombie = null;
    if (this._mobileControls) this._mobileControls.setInteractButtonVisible(false);
    this.clearLayer(1); this.clearLayer(2); this.clearLayer(3);
  }

  // ========== 探索初始化 ==========

  _initExploration() {
    const chapter = StateManager.get('story.chapter') || 0;
    const prologueComplete = StateManager.get('story.flags.prologueComplete') === true;
    const chapter1Started = StateManager.get('story.flags.chapter1Started') === true;
    let mapName = '';
    let useStoryMap = false;

    if (chapter === 0 && !prologueComplete) {
      mapName = '序章 · 家门外';
      useStoryMap = true;
      this._mapData = MapGenerator.generatePrologue();
    } else if (chapter === 1 && !chapter1Started) {
      mapName = '第一章 · 废土初探';
      useStoryMap = true;
      this._mapData = MapGenerator.generateChapter1();
      StateManager.set('story.flags.chapter1Started', true);
    }

    if (!useStoryMap) {
      const seed = generateSeed();
      const hasWeapon = StateManager.get('player.hasWeapon') === true;
      mapName = this._generateMapName(seed);
      const gen = new MapGenerator(seed, 40, 30, { hasWeapon });
      this._mapData = gen.generate();
    }

    this._setHudText('hud-map-name', mapName);
    this._setHudVisible('hud-map-name', true);
    this._mapRenderer = new MapRenderer(this._mapData);
    this._entityRenderer = new EntityRenderer();
    // 更新全屏地图和楼层地图
    this._fullMapRenderer = new FullMapRenderer(this._mapData);
    if (this._floorMapPanel) {
      this._floorMapPanel.mapData = this._mapData;
    }
    this._player = new Player(this._mapData.playerStart.x, this._mapData.playerStart.y);

    if (!useStoryMap) this._spawnEntities();
    else this._spawnStoryEntities(chapter, prologueComplete);

    this._initLootItems();

    const canvas = this.game?.getLayer(1)?.canvas;
    if (canvas) { this._camera.x = this._player.x - canvas.width / 2; this._camera.y = this._player.y - canvas.height / 2; }

    const startRoom = this._mapData.getContainingRoom(this._player.x, this._player.y);
    if (startRoom) { startRoom.explored = true; this._player.currentRoom = startRoom; }

    this._bindKeyEvents();
    this.clearLayer(1); this.clearLayer(2);
    this._explorationReady = true;

    // Task 5: 序章开场剧情
    if (chapter === 0 && !prologueComplete) {
      setTimeout(() => {
        EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'info', message: '末日爆发后的第三天，家里的食物快吃完了...必须出门寻找补给。' });
      }, 800);
    }

    EventBus.emit(GameEvents.EXPLORATION_START, { mapName, roomCount: this._mapData.rooms.length, isStory: useStoryMap });
    EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'info', message: `探索开始 · ${mapName} · ${this._mapData.rooms.length} 个房间` });
  }

  _spawnStoryEntities(chapter, prologueComplete) {
    this._zombies = []; this._survivors = [];
    this._prologueDefeatedZombie = false; this._prologueLootedStore = false;
    if (chapter === 0 && !prologueComplete) {
      // Task 5: 邻居家 — 1 只弱化丧尸
      const zombieRoom = this._mapData.rooms.find(r => r.type === RoomType.ZOMBIE);
      if (zombieRoom) {
        this._zombies.push(new Zombie(zombieRoom.centerX, zombieRoom.centerY, {
          hp: 30, speed: 40, attack: 5, isElite: false, type: 'walker',
          patrolPath: this._generatePatrolPath(zombieRoom, zombieRoom.centerX, zombieRoom.centerY),
        }));
      }
      // Task 5: 小巷尽头 — 受伤的狗（情感元素）
      const emptyRoom = this._mapData.rooms.find(r => r.type === RoomType.EMPTY);
      if (emptyRoom) {
        this._survivors.push(new Survivor(emptyRoom.centerX, emptyRoom.centerY, {
          name: '受伤的狗', dialogue: [['汪…（它受伤了，但尾巴还在轻轻摇晃）']],
          canRecruit: false, role: SurvivorRole.CIVILIAN,
        }));
      }
      return;
    }
    // 第一章
    for (const room of this._mapData.rooms) {
      if (room.type === RoomType.ZOMBIE) {
        const count = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
          const zx = room.centerX + (Math.random() - 0.5) * room.worldW * 0.3;
          const zy = room.centerY + (Math.random() - 0.5) * room.worldH * 0.3;
          this._zombies.push(new Zombie(zx, zy, {
            hp: 50, speed: 55, attack: 8, isElite: false, type: 'walker',
            patrolPath: this._generatePatrolPath(room, zx, zy),
          }));
        }
      } else if (room.type === RoomType.SURVIVOR) {
        const name = SURVIVOR_NAMES[Math.floor(Math.random() * SURVIVOR_NAMES.length)];
        const dlg = SURVIVOR_DIALOGUES[Math.floor(Math.random() * SURVIVOR_DIALOGUES.length)];
        this._survivors.push(new Survivor(room.centerX, room.centerY, {
          name, dialogue: dlg, canRecruit: true, role: SurvivorRole.SCAVENGER,
        }));
      }
    }
  }

  _spawnEntities() {
    this._zombies = []; this._survivors = [];
    for (const room of this._mapData.rooms) {
      if (room.type === RoomType.ZOMBIE) {
        const count = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
          const zx = room.centerX + (Math.random() - 0.5) * room.worldW * 0.5;
          const zy = room.centerY + (Math.random() - 0.5) * room.worldH * 0.5;
          const isElite = Math.random() < 0.15;
          this._zombies.push(new Zombie(zx, zy, {
            hp: isElite ? 80 : 50, speed: isElite ? 75 : 55,
            attack: isElite ? 15 : 8, isElite, type: isElite ? 'elite' : 'walker',
            patrolPath: this._generatePatrolPath(room, zx, zy),
          }));
        }
      } else if (room.type === RoomType.SURVIVOR) {
        const name = SURVIVOR_NAMES[Math.floor(Math.random() * SURVIVOR_NAMES.length)];
        const dlg = SURVIVOR_DIALOGUES[Math.floor(Math.random() * SURVIVOR_DIALOGUES.length)];
        this._survivors.push(new Survivor(room.centerX, room.centerY, {
          name, dialogue: dlg, canRecruit: Math.random() < 0.5,
          role: Math.random() < 0.5 ? SurvivorRole.SOLDIER : SurvivorRole.SCAVENGER,
        }));
      }
    }
  }

  _generatePatrolPath(room, zx, zy) {
    const pts = [];
    const count = 2 + Math.floor(Math.random() * 3);
    const m = TILE_SIZE;
    const minX = room.worldX + m; const maxX = room.worldX + room.worldW - m;
    const minY = room.worldY + m; const maxY = room.worldY + room.worldH - m;
    for (let i = 0; i < count; i++) {
      pts.push({ x: minX + Math.random() * Math.max(0, maxX - minX), y: minY + Math.random() * Math.max(0, maxY - minY) });
    }
    if (pts.length > 0) pts[0] = { x: zx, y: zy };
    return pts;
  }

  _initLootItems() {
    this._lootItems = [];
    if (!this._mapData || !this._mapData.lootItems) return;
    for (const raw of this._mapData.lootItems) {
      this._lootItems.push(new LootItem(raw.x, raw.y, raw.type, raw.amount));
    }
  }

  _updateLootPickup(dt) {
    if (!this._player) return;
    for (const loot of this._lootItems) {
      if (loot.collected) continue;
      loot.update(dt);
      if (loot.isInPickupRange(this._player.x, this._player.y)) { loot.collected = true; this._onLootCollected(loot); }
    }
  }

  _onLootCollected(loot) {
    const labels = { ammo: '弹药', medkit: '医疗包', parts: '零件', food: '食物' };
    const label = labels[loot.type] || loot.type;
    const itemMap = { ammo: 'bullets_9mm', medkit: 'bandage', parts: 'mechanical_parts', food: 'canned_food' };
    const itemId = itemMap[loot.type];
    if (itemId) {
      const result = this._inventory.addItem(itemId, loot.amount);
      if (result.success) {
        EventBus.emit(GameEvents.UI_NOTIFICATION, {
          type: 'success',
          message: `拾取了 ${label} x${result.added}${result.overflow > 0 ? '（背包已满，部分丢弃）' : ''}`,
        });
        this._applySupplyToState(loot.type);
        if (this._activePanel === 'inventory') this._renderInventoryPanel();
        // Task 5: 标记便利店物资已搜刮
        const room = this._mapData?.getContainingRoom(loot.x, loot.y);
        if (room && room.type === RoomType.SUPPLY) { this._prologueLootedStore = true; }
      } else {
        EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'warning', message: `背包已满，无法拾取 ${label}` });
      }
    } else {
      this._applySupplyToState(loot.type);
      EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'success', message: `拾取了 ${label} x${loot.amount}` });
    }
    this._lootItems = this._lootItems.filter(item => !item.collected);
  }

  // ========== 探索更新 ==========

  _updateExploration(dt) {
    if (!this._player || !this._mapData) return;
    const dx = this._getInputX(); const dy = this._getInputY();
    this._player.move(dx, dy, dt, this._mapData);
    const enteredRoom = this._player.checkRoomEntry(this._mapData);
    if (enteredRoom) this._onRoomEntered(enteredRoom);
    for (const zombie of this._zombies) {
      zombie.update(dt, this._mapData, this._player);
      if (zombie.isAlive && zombie.state === 'chase') {
        const dist = Math.sqrt((this._player.x - zombie.x) ** 2 + (this._player.y - zombie.y) ** 2);
        if (dist < COMBAT_TRIGGER_DIST && !this._combatManager.inCombat) this._startCombat(zombie);
      }
    }
    this._updateLootPickup(dt);
    this._updateCamera(dt);
  }

  _getInputX() {
    let val = 0;
    // 键盘输入
    if (this._keys.has('d') || this._keys.has('D') || this._keys.has('ArrowRight')) val += 1;
    if (this._keys.has('a') || this._keys.has('A') || this._keys.has('ArrowLeft')) val -= 1;
    
    // 移动端摇杆输入（从 MobileControls 获取）
    if (this._mobileControls && this._mobileControls._joystickInput.active) {
      const mobileInput = this._mobileControls.getInput();
      if (Math.abs(mobileInput.x) > 0.12) {
        val = mobileInput.x;
      }
    }
    return val;
  }

  _getInputY() {
    let val = 0;
    // 键盘输入
    if (this._keys.has('s') || this._keys.has('S') || this._keys.has('ArrowDown')) val += 1;
    if (this._keys.has('w') || this._keys.has('W') || this._keys.has('ArrowUp')) val -= 1;
    
    // 移动端摇杆输入（从 MobileControls 获取）
    if (this._mobileControls && this._mobileControls._joystickInput.active) {
      const mobileInput = this._mobileControls.getInput();
      if (Math.abs(mobileInput.y) > 0.12) {
        val = mobileInput.y;
      }
    }
    return val;
  }

  /** Task 5: 房间进入剧情 */
  _onRoomEntered(room) {
    const roomLabels = { home: '家', small_box: '小型储物间', large_box: '大型储物间', empty: '空房间', supply: '物资房', zombie: '丧尸房', survivor: '幸存者房' };
    const label = roomLabels[room.type] || room.type;
    EventBus.emit(GameEvents.ROOM_ENTERED, { room });
    let msg = `进入 ${label}`;
    let showInteract = false;
    const isPrologue = StateManager.get('story.chapter') === 0 && StateManager.get('story.flags.prologueComplete') !== true;

    if (room.type === RoomType.HOME) msg += ' · 这是你的安全屋…准备出发吧';
    if (room.hasSupplies) { msg += ' · 按 E 收集物资'; showInteract = true; }
    if (room.type === RoomType.ZOMBIE) {
      if (isPrologue) msg = '邻居老王已经彻底变了...必须解决掉它。';
      else msg += ' · 发现丧尸！准备战斗';
      const nearest = this._findNearestZombie(room, 200);
      if (nearest && !this._combatManager.inCombat) { this._startCombat(nearest); return; }
    }
    if (room.type === RoomType.SUPPLY) {
      if (isPrologue) msg = '找到了便利店！趁还没被洗劫一空，赶紧拿些必需品。';
      showInteract = true;
    }
    if (room.type === RoomType.SURVIVOR) { msg += ' · 发现幸存者！按 E 对话'; showInteract = true; }

    if (this._mobileControls) this._mobileControls.setInteractButtonVisible(showInteract);
    EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'info', message: msg });
  }

  _findNearestZombie(room, maxDist) {
    let nearest = null; let minDist = maxDist;
    for (const z of this._zombies) {
      if (!z.isAlive) continue;
      const inRoom = this._mapData.getContainingRoom(z.x, z.y);
      if (!inRoom || inRoom.id !== room.id) continue;
      const dist = Math.sqrt((this._player.x - z.x) ** 2 + (this._player.y - z.y) ** 2);
      if (dist < minDist) { minDist = dist; nearest = z; }
    }
    return nearest;
  }

  _updateCamera(dt) {
    const canvas = this.game?.getLayer(1)?.canvas; if (!canvas) return;
    const tx = this._player.x - canvas.width / 2; const ty = this._player.y - canvas.height / 2;
    const lf = 1 - Math.exp(-8 * dt);
    this._camera.x += (tx - this._camera.x) * lf; this._camera.y += (ty - this._camera.y) * lf;
    this._camera.x = Math.max(0, Math.min(this._mapData.width - canvas.width, this._camera.x));
    this._camera.y = Math.max(0, Math.min(this._mapData.height - canvas.height, this._camera.y));
  }

  // ========== 战斗系统 ==========

  _startCombat(zombie) {
    if (this._combatManager.inCombat) return;
    this._combatTargetZombie = zombie;
    this.mode = GameMode.COMBAT;
    zombie.state = 'idle';
    this._combatManager.startCombat(zombie, this._player, this._player.currentRoom);
    EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'warning', message: `战斗开始！面对 ${zombie.isElite ? '精英丧尸' : '普通丧尸'}！` });
  }

  _updateCombat(dt) { if (!this._combatManager.inCombat) this._endCombatCheck(); }

  _endCombatCheck() {
    if (!this._combatManager.inCombat && this.mode === GameMode.COMBAT) {
      this.mode = GameMode.EXPLORATION;
      if (this._combatTargetZombie && this._combatTargetZombie.isAlive) this._combatTargetZombie.state = 'patrol';
      // Task 5: 标记序章丧尸已击败
      if (this._combatTargetZombie) this._prologueDefeatedZombie = true;
      this._combatTargetZombie = null;
      this.clearLayer(3);
    }
  }

  // ========== 键盘事件 ==========

  _bindKeyEvents() {
    this._onKeyDown = (e) => {
      this._keys.add(e.key);
      if (e.key === 'e' || e.key === 'E') this.onInteract();
      if (this.mode === GameMode.COMBAT && this._combatManager.inCombat) {
        if (e.key === '1') this._combatManager.playerAction('attack');
        if (e.key === '2') this._combatManager.playerAction('defend');
        if (e.key === '3') this._combatManager.playerAction('retreat');
        if (e.key === '4') this._combatManager.playerAction('wait');
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    };
    this._onKeyUp = (e) => { this._keys.delete(e.key); };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  _unbindKeyEvents() {
    if (this._onKeyDown) window.removeEventListener('keydown', this._onKeyDown);
    if (this._onKeyUp) window.removeEventListener('keyup', this._onKeyUp);
  }

  /** 供 MobileControls 调用的交互方法 */
  onInteract() {
    if (!this._player || !this._mapData || this._isPaused) return;
    if (this.mode === GameMode.COMBAT && this._combatManager.inCombat) { this._combatManager.playerAction('attack'); return; }
    if (this._player.currentRoom && this._player.currentRoom.hasSupplies) {
      const result = this._player.collectSupply();
      if (result) {
        const labels = { food: '食物', water: '水', ammo: '弹药', parts: '零件', materials: '建材' };
        EventBus.emit(GameEvents.ITEM_ACQUIRED, { type: result.supplyType });
        EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'success', message: `收集了 ${labels[result.supplyType] || result.supplyType}` });
        this._applySupplyToState(result.supplyType);
        return;
      }
    }
    const nearest = this._findNearestSurvivor(60);
    if (nearest && !nearest.interacted) {
      const dialogue = nearest.getNextDialogue();
      if (dialogue) {
        EventBus.emit(GameEvents.DIALOGUE_START, { speaker: nearest.name, text: dialogue.text });
        EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'info', message: `${nearest.name}: "${dialogue.text}"` });
      }
    }
  }

  _applySupplyToState(type) {
    if (type === 'medkit') {
      const hp = StateManager.get('player.hp') || 0; const maxHp = StateManager.get('player.maxHp') || 100;
      const heal = Math.min(30, maxHp - hp);
      if (heal > 0) StateManager.set('player.hp', hp + heal);
      this._refreshHUD(); return;
    }
    const path = { food: 'globalResources.food', water: 'globalResources.water', ammo: 'globalResources.ammo', parts: 'globalResources.parts', materials: 'globalResources.materials.wood' }[type];
    if (path) { StateManager.set(path, (StateManager.get(path) || 0) + this._randomSupplyAmount(type)); this._refreshHUD(); }
    if (type === 'ammo' && !StateManager.get('player.hasWeapon')) {
      StateManager.set('player.hasWeapon', true);
      EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'success', message: '获得武器！丧尸开始出没…' });
    }
  }

  _randomSupplyAmount(type) {
    if (type === 'ammo') return 5 + Math.floor(Math.random() * 11);
    if (type === 'materials') return 3 + Math.floor(Math.random() * 8);
    return 1 + Math.floor(Math.random() * 5);
  }

  _generateMapName(seed) { return MAP_NAME_PREFIXES[seed % MAP_NAME_PREFIXES.length] + MAP_NAME_SUFFIXES[Math.floor(seed / 7) % MAP_NAME_SUFFIXES.length]; }

  _findNearestSurvivor(maxDist) {
    let nearest = null; let minDist = maxDist;
    for (const s of this._survivors) {
      const dist = s.distanceTo(this._player.x, this._player.y);
      if (dist < minDist) { minDist = dist; nearest = s; }
    }
    return nearest;
  }

  // ========== 渲染 ==========

  _renderExploration() {
    if (!this._mapData || !this._mapRenderer || !this._entityRenderer) return;
    const canvas = this.game?.getLayer(1)?.canvas; if (!canvas) return;
    const vp = { x: this._camera.x, y: this._camera.y, w: canvas.width, h: canvas.height };
    const mapCtx = this.game.getMapCtx();
    if (mapCtx) { mapCtx.save(); mapCtx.translate(-this._camera.x, -this._camera.y); this._mapRenderer.render(mapCtx, vp); mapCtx.restore(); }
    const entityCtx = this.game.getEntityCtx();
    if (entityCtx) {
      this.clearLayer(2); entityCtx.save(); entityCtx.translate(-this._camera.x, -this._camera.y);
      if (this._player) this._entityRenderer.renderPlayer(entityCtx, this._player, this._player.x, this._player.y);
      for (const z of this._zombies) this._entityRenderer.renderZombie(entityCtx, z, z.x, z.y);
      for (const s of this._survivors) this._entityRenderer.renderSurvivor(entityCtx, s, s.x, s.y);
      for (const l of this._lootItems) this._entityRenderer.renderLootItem(entityCtx, l, l.x, l.y);
      entityCtx.restore();
    }
    const fxCtx = this.game.getLayer(3)?.ctx;
    if (fxCtx && this._player && this._mapRenderer) {
      this.clearLayer(3);
      // 小地图已改为全屏 M 键面板，不再常驻渲染
      // 渲染 HUD 文本（当前楼层/坐标）
      const floor = StateManager.get('gameState.currentFloor') || 1;
      fxCtx.fillStyle = 'rgba(255,255,255,0.6)';
      fxCtx.font = '11px sans-serif';
      fxCtx.textAlign = 'right';
      fxCtx.fillText(`${Math.floor(this._player.x)}, ${Math.floor(this._player.y)}  F${floor}`, canvas.width - 16, 20);
    }
  }

  _renderCombat() { if (this._combatUI) this._combatUI.render(1 / 60); }
  _renderBase() { this._drawBaseBackground(); }
  _updateBase(dt) {}

  _drawBaseBackground() {
    const ctx = this.game?.getMapCtx(); if (!ctx) return;
    const layer = this.game.getLayer(1); const w = layer.canvas.width; const h = layer.canvas.height;
    ctx.fillStyle = '#1c1c2a'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.fillStyle = 'rgba(230,57,70,0.08)'; ctx.beginPath(); ctx.arc(w / 2, h / 2, 120, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(230,57,70,0.3)'; ctx.lineWidth = 2; ctx.stroke();
  }

  // ---- HUD ----

  _refreshHUD() {
    const s = StateManager.getState(); const p = s.player; const r = s.globalResources;
    this._setHudText('hud-hp', `❤️ ${p.hp}/${p.maxHp}`); this._setHudText('hud-sanity', `🧠 ${p.sanity}/${p.maxSanity}`);
    this._setHudText('hud-day', `📅 第 ${s.gameTime.day} 天`); this._setHudText('hud-time', `🕐 ${String(s.gameTime.hour).padStart(2, '0')}:${String(s.gameTime.minute).padStart(2, '0')}`);
    this._setHudText('hud-gold', `💰 ${r.gold}`); this._setHudText('hud-diamond', `💎 ${r.diamond}`); this._setHudText('hud-food', `🍖 ${r.food}`); this._setHudText('hud-water', `💧 ${r.water}`); this._setHudText('hud-ammo', `🔫 ${r.ammo}`);
  }

  _setHudText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
  _setHudVisible(id, v) { const el = document.getElementById(id); if (el) el.style.display = v ? '' : 'none'; }

  // ---- 事件订阅 ----

  _subscribeEvents() {
    this._unsubscribers.push(EventBus.on(GameEvents.RESOURCE_CHANGED, () => this._refreshHUD()));
    this._unsubscribers.push(EventBus.on(GameEvents.UI_NOTIFICATION, ({ type, message }) => this._showNotification(type, message)));
    this._unsubscribers.push(EventBus.on(GameEvents.COMBAT_END, (result) => this._onCombatEnd(result)));

    // 移动端触控事件（摇杆输入直接通过 MobileControls.getInput() 获取，这里仅处理按钮事件）
    this._unsubscribers.push(EventBus.on(TouchEvents.TOUCH_INTERACT, () => { if (!this._isPaused) this.onInteract(); }));
    this._unsubscribers.push(EventBus.on(TouchEvents.TOUCH_ATTACK, () => { if (this._combatManager?.inCombat) this._combatManager.playerAction('attack'); }));
    this._unsubscribers.push(EventBus.on(TouchEvents.TOUCH_DODGE, () => { if (this._combatManager?.inCombat) this._combatManager.playerAction('defend'); }));
    this._unsubscribers.push(EventBus.on(TouchEvents.TOUCH_BACKPACK, () => { if (!this._isPaused) { this._closeActivePanel(); this._openInventoryPanel(); } }));
    this._unsubscribers.push(EventBus.on(TouchEvents.TOUCH_MENU, () => { if (this._isPaused) this.game.resume(); else this.game.pause(); }));

    // M 键打开/关闭大地图
    const onMapKey = (e) => {
      if (e.key === 'm' || e.key === 'M') {
        if (this._mapPanelVisible) {
          this._closeMapPanel();
        } else if (this.mode === GameMode.EXPLORATION && this._mapData) {
          this._openMapPanel();
        }
      }
      // ESC 关闭地图
      if (e.key === 'Escape' && this._mapPanelVisible) {
        this._closeMapPanel();
      }
    };
    window.addEventListener('keydown', onMapKey);
    this._unsubscribers.push(() => window.removeEventListener('keydown', onMapKey));

    // ESC 通用暂停
    const onEsc = (e) => {
      if (e.key === 'Escape') {
        if (this._mapPanelVisible) {
          this._closeMapPanel();
          return;
        }
        if (this._isPaused) this.game.resume();
        else this.game.pause();
      }
    };
    window.addEventListener('keydown', onEsc);
    this._unsubscribers.push(() => window.removeEventListener('keydown', onEsc));
  }

  _onCombatEnd(result) {
    if (result.victory) {
      EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'success', message: `战斗胜利！获得 ${result.loot.length} 件物资` });
      this._prologueDefeatedZombie = true;
    } else if (result.reason === 'retreat') {
      EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'warning', message: '撤退成功！' });
    } else {
      EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'error', message: '战斗失败...' });
    }
    setTimeout(() => { this._endCombatCheck(); }, 1500);
  }

  // ---- Task 3: 序章禁用基地按钮 ----

  _bindHudButtons() {
    const bind = (id, handler) => { const el = document.getElementById(id); if (el) { el.addEventListener('click', handler); this._hudHandlers.set(id, handler); } };

    bind('btn-explore', () => { this._closeActivePanel(); this.setMode(GameMode.EXPLORATION); });

    // Task 3: 序章禁用基地按钮
    bind('btn-base', () => {
      const chapter = StateManager.get('story.chapter') || 0;
      const prologueComplete = StateManager.get('story.flags.prologueComplete') === true;
      if (chapter === 0 && !prologueComplete) {
        EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'warning', message: '基地功能将在序章完成后解锁' });
        return;
      }
      this._closeActivePanel(); this.setMode(GameMode.BASE); this._drawBaseBackground(); this._openBasePanel();
    });

    bind('btn-inventory', () => this._openInventoryPanel());
    bind('btn-mercenary', () => EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'info', message: '佣兵系统将在后续版本中开放' }));
    bind('btn-survivors', () => EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'info', message: '幸存者管理将在后续版本中开放' }));
    bind('btn-menu', () => this.game.pause());

    // 初始化基地按钮状态
    this._updateBaseButtonState();
  }

  _unbindHudButtons() { for (const [id, h] of this._hudHandlers.entries()) { document.getElementById(id)?.removeEventListener('click', h); } this._hudHandlers.clear(); }
  _unsubscribeAll() { this._unsubscribers.forEach(fn => fn()); this._unsubscribers = []; }

  // ---- Task 3: 基地按钮状态更新 ----

  _updateBaseButtonState() {
    const btn = document.getElementById('btn-base');
    if (!btn) return;
    const chapter = StateManager.get('story.chapter') || 0;
    const prologueComplete = StateManager.get('story.flags.prologueComplete') === true;
    const disabled = (chapter === 0 && !prologueComplete);
    btn.disabled = disabled;
    btn.style.opacity = disabled ? '0.4' : '1';
    btn.style.filter = disabled ? 'grayscale(0.8)' : 'none';
  }

  // ---- 时间 ----

  _advanceGameTime(dt) {
    if (this.mode === GameMode.COMBAT) return;
    let min = StateManager.get('gameTime.minute') + dt; let hour = StateManager.get('gameTime.hour'); let day = StateManager.get('gameTime.day');
    if (min >= 60) { const h = Math.floor(min / 60); min -= h * 60; hour += h; }
    if (hour >= 24) { const d = Math.floor(hour / 24); hour -= d * 24; day += d; }
    if (day !== this._lastTickDay && this._baseSystem) {
      this._lastTickDay = day;
      for (const c of this._baseSystem.checkBuildCompletion(day)) { const def = BUILDING_DEFS[c.buildingId]; EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'success', message: `${def ? def.name : c.buildingId} 建设完成！等级 ${c.level}` }); }
      this._baseSystem.dailyTick(StateManager);
      if (this._baseSystem.maybeTriggerZombieAttack(day)) { EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'danger', message: this._baseSystem.processZombieAttack().message }); }
      this._refreshHUD();
    }
    StateManager.batch([{ path: 'gameTime.minute', value: Math.floor(min) }, { path: 'gameTime.hour', value: hour }, { path: 'gameTime.day', value: day }]);
    if (Math.floor(min) % 10 === 0) this._refreshHUD();
  }

  // ---- 面板 ----

  _closeActivePanel() { if (this._activePanel === 'inventory') this._closeInventoryPanel(); if (this._activePanel === 'base') this._closeBasePanel(); }
  _openPanel(id) { this._closeActivePanel(); this._activePanel = id; document.getElementById(`${id}-panel`)?.classList.remove('hidden'); }
  _closePanel(id) { if (this._activePanel !== id) return; this._activePanel = null; document.getElementById(`${id}-panel`)?.classList.add('hidden'); }

  // ---- 全屏地图面板 ----

  _initMapPanel() {
    this._mapPanelEl = document.getElementById('map-panel');
    this._mapCanvasEl = document.getElementById('canvas-fullmap');
    this._mapCloseBtn = document.getElementById('map-close');

    if (this._mapCloseBtn) {
      const closeHandler = () => this._closeMapPanel();
      this._mapCloseBtn.addEventListener('click', closeHandler);
      this._panelHandlers.set('map-close', closeHandler);
    }

    // 点击背景关闭
    if (this._mapPanelEl) {
      const bgClickHandler = (e) => {
        if (e.target === this._mapPanelEl || e.target.id === 'map-panel-bg') {
          this._closeMapPanel();
        }
      };
      this._mapPanelEl.addEventListener('click', bgClickHandler);
      this._panelHandlers.set('map-panel', bgClickHandler);
    }
  }

  _openMapPanel() {
    if (!this._mapPanelEl || !this._mapCanvasEl) return;
    
    this._mapPanelEl.classList.remove('hidden');
    this._mapPanelVisible = true;
    
    // 暂停游戏
    if (!this._isPaused) {
      this._isPaused = true;
    }
    
    // 初始化 FullMapRenderer
    if (!this._fullMapRenderer) {
      this._fullMapRenderer = new FullMapRenderer(this._mapData);
    }
    
    // 设置画布大小
    const maxW = Math.min(window.innerWidth * 0.85, 1200);
    const maxH = Math.min(window.innerHeight * 0.7, 800);
    this._mapCanvasEl.width = maxW;
    this._mapCanvasEl.height = maxH;
    
    // 渲染地图
    const ctx = this._mapCanvasEl.getContext('2d');
    if (ctx && this._fullMapRenderer) {
      this._fullMapRenderer.render(
        ctx,
        maxW,
        maxH,
        this._player ? { x: this._player.x, y: this._player.y } : null
      );
    }
  }

  _closeMapPanel() {
    if (!this._mapPanelEl) return;
    
    this._mapPanelEl.classList.add('hidden');
    this._mapPanelVisible = false;
    
    // 恢复游戏（仅当没有被其他面板或暂停锁定）
    if (this._isPaused && !this._pauseOverlay?.classList.contains('hidden') === false) {
      this._isPaused = false;
    }
  }
  _openInventoryPanel() { this._invFilter = 'all'; this._openPanel('inventory'); this._renderInventoryPanel(); }
  _closeInventoryPanel() { this._closePanel('inventory'); }

  _renderInventoryPanel(cat) {
    cat = cat || this._invFilter; this._invFilter = cat;
    const infoEl = document.getElementById('inv-slot-info'); if (infoEl) infoEl.textContent = `${this._inventory.slotCount} / ${this._inventory.capacity}`;
    document.querySelectorAll('#inv-tabs .tab-btn').forEach(t => t.classList.toggle('tab-active', t.dataset.cat === cat));
    const items = cat === 'all' ? this._inventory.getAllItems() : this._inventory.getItemsByCategory(cat);
    const listEl = document.getElementById('inv-item-list'); const emptyEl = document.getElementById('inv-empty');
    if (!listEl) return; listEl.innerHTML = '';
    if (items.length === 0) { if (emptyEl) emptyEl.style.display = ''; return; }
    if (emptyEl) emptyEl.style.display = 'none';
    for (const item of items) {
      if (!item.def) continue;
      const card = document.createElement('div'); card.className = 'inv-item';
      const canUse = item.def.category === ItemCategory.MEDICAL || item.def.category === ItemCategory.FOOD;
      card.innerHTML = `<div class="inv-item-icon">${item.def.icon}</div><div class="inv-item-info"><div class="inv-item-name">${item.def.name}</div><div class="inv-item-desc">${item.def.desc}</div></div>${item.def.stackable ? `<div class="inv-item-qty">x${item.quantity}</div>` : ''}<div class="inv-item-actions">${canUse ? `<button class="inv-use-btn" data-action="use" data-id="${item.itemId}">使用</button>` : ''}<button class="inv-drop-btn" data-action="drop" data-id="${item.itemId}">丢弃</button></div>`;
      card.querySelectorAll('button').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); if (btn.dataset.action === 'use') this._onUseItem(btn.dataset.id); if (btn.dataset.action === 'drop') this._onDropItem(btn.dataset.id); }));
      listEl.appendChild(card);
    }
  }

  _onUseItem(itemId) {
    const def = ITEM_DEFS[itemId]; if (!def) return;
    if (!this._inventory.removeItem(itemId, 1).success) return;
    let msg = '';
    if (def.category === ItemCategory.MEDICAL) {
      const hp = StateManager.get('player.hp') || 0; const maxHp = StateManager.get('player.maxHp') || 100;
      const heal = itemId === 'bandage' ? 20 : (itemId === 'first_aid_kit' ? 50 : 10);
      StateManager.set('player.hp', Math.min(hp + heal, maxHp)); msg = `恢复了 ${heal} 生命值`;
    } else if (def.category === ItemCategory.FOOD) {
      const sanity = StateManager.get('player.sanity') || 0; const maxSanity = StateManager.get('player.maxSanity') || 100;
      const restore = itemId === 'mre' ? 20 : (itemId === 'canned_food' ? 10 : 5);
      StateManager.set('player.sanity', Math.min(sanity + restore, maxSanity)); msg = `恢复了 ${restore} 精力`;
    } else msg = `使用了 ${def.name}`;
    EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'success', message: `使用了 ${def.name}：${msg}` });
    this._refreshHUD();
  }

  _onDropItem(itemId) {
    const def = ITEM_DEFS[itemId]; if (!def) return;
    if (this._inventory.removeItem(itemId, 1).success) EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'info', message: `丢弃了 ${def.name} x1` });
  }

  // ---- 基地面板 ----

  _openBasePanel() { this._openPanel('base'); this._renderBasePanel(); }
  _closeBasePanel() { this._closePanel('base'); }

  _renderBasePanel() {
    if (!this._baseSystem) return;
    const bs = this._baseSystem; const r = StateManager.getState().globalResources;
    this._setHudText('base-level', bs.level); this._setHudText('base-hp', bs.hp); this._setHudText('base-maxhp', bs.maxHp); this._setHudText('base-defense', bs.defense);
    this._setHudText('base-res-food', r.food); this._setHudText('base-res-water', r.water); this._setHudText('base-res-wood', r.materials.wood); this._setHudText('base-res-stone', r.materials.stone); this._setHudText('base-res-metal', r.materials.metal); this._setHudText('base-res-parts', r.parts);
    this._setHudText('base-build-slots', `建筑槽位: ${bs.usedBuildSlots} / ${bs.buildSlots}`); this._setHudText('base-survivor-slots', `人口: ${bs.survivors.length} / ${bs.maxSurvivors}`);
    this._renderBuildingList(); this._renderSurvivorList();
  }

  _renderBuildingList() {
    const listEl = document.getElementById('base-buildings-list'); if (!listEl) return; listEl.innerHTML = '';
    for (const b of this._baseSystem.buildings) {
      const def = BUILDING_DEFS[b.id]; if (!def) continue;
      const canUpg = b.level < def.maxLevel; const nextCost = canUpg ? def.buildCost(b.level + 1) : null;
      const card = document.createElement('div'); card.className = 'building-card';
      card.innerHTML = `<div class="building-icon">${def.icon}</div><div class="building-info"><div class="building-name">${def.name}</div><div class="building-level">等级 ${b.level}/${def.maxLevel}</div><div class="building-desc">${def.effects(b.level).desc}</div></div>${canUpg ? `<button class="building-upgrade-btn" data-building="${b.id}">升级<br>木${nextCost.wood} 石${nextCost.stone} 铁${nextCost.metal}</button>` : ''}`;
      const btn = card.querySelector('.building-upgrade-btn'); if (btn) btn.addEventListener('click', () => this._onUpgradeBuilding(b.id));
      listEl.appendChild(card);
    }
    for (const proj of this._baseSystem._constructionQueue) {
      const def = BUILDING_DEFS[proj.buildingId]; if (!def) continue;
      const card = document.createElement('div'); card.className = 'building-card'; card.style.opacity = '0.55';
      card.innerHTML = `<div class="building-icon">${def.icon}</div><div class="building-info"><div class="building-name">${def.name}</div><div class="building-level">建设中 等级 ${proj.level} · 第 ${proj.finishDay} 天完成</div><div class="building-desc">${def.effects(proj.level).desc}</div></div>`;
      listEl.appendChild(card);
    }
  }

  _renderSurvivorList() {
    const listEl = document.getElementById('base-survivors-list'); if (!listEl) return; listEl.innerHTML = '';
    const jobOptions = Object.entries(SURVIVOR_JOB_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    for (let i = 0; i < this._baseSystem.survivors.length; i++) {
      const s = this._baseSystem.survivors[i]; const card = document.createElement('div'); card.className = 'survivor-card';
      card.innerHTML = `<div class="survivor-name">${s.name}</div><select class="survivor-job-select" data-index="${i}">${jobOptions}</select>`;
      card.querySelector('select').addEventListener('change', (e) => this._onAssignSurvivorJob(i, e.target.value));
      listEl.appendChild(card);
    }
  }

  _onUpgradeBuilding(id) {
    if (!this._baseSystem) return;
    const r = StateManager.getState().globalResources;
    const res = { wood: r.materials.wood, stone: r.materials.stone, metal: r.materials.metal };
    const result = this._baseSystem.startBuild(id, res, StateManager.get('gameTime.day') || 1);
    if (result.success) {
      StateManager.set('globalResources.materials.wood', res.wood - result.cost.wood);
      StateManager.set('globalResources.materials.stone', res.stone - result.cost.stone);
      StateManager.set('globalResources.materials.metal', res.metal - result.cost.metal);
      EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'success', message: `${BUILDING_DEFS[id].name} 开始升级！第 ${result.finishDay} 天完成` });
      this._refreshHUD();
    } else EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'warning', message: result.reason });
  }

  _onAssignSurvivorJob(i, job) {
    if (!this._baseSystem) return;
    this._baseSystem.assignJob(i, job); this._renderBasePanel();
    EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'info', message: `${this._baseSystem.survivors[i].name} 已分配为 ${SURVIVOR_JOB_LABELS[job]}` });
  }

  // ---- 面板绑定 ----

  _bindPanelEvents() {
    const closeOnOverlay = (e) => { if (e.target === e.currentTarget) this._closeActivePanel(); };
    ['inventory-panel', 'base-panel'].forEach(id => {
      const el = document.getElementById(id); if (el) { el.addEventListener('click', closeOnOverlay); this._panelHandlers.set(id, closeOnOverlay); }
    });
    const bind = (id, handler) => { const el = document.getElementById(id); if (el) { el.addEventListener('click', handler); this._panelHandlers.set(id, handler); } };
    bind('inv-close', () => this._closeInventoryPanel());
    bind('base-close', () => this._closeBasePanel());
    const invTabs = document.getElementById('inv-tabs');
    if (invTabs) { const h = (e) => { const cat = e.target.dataset.cat; if (cat) this._renderInventoryPanel(cat); }; invTabs.addEventListener('click', h); this._panelHandlers.set('inv-tabs', h); }
  }

  _unbindPanelEvents() {
    for (const [id, h] of this._panelHandlers.entries()) {
      if (id === 'inv-close' || id === 'base-close' || id === 'inv-tabs' || id === 'inventory-panel' || id === 'base-panel') document.getElementById(id)?.removeEventListener('click', h);
    }
    this._panelHandlers.clear();
  }

  // ---- 通知 ----

  _showNotification(type, message) {
    const container = document.getElementById('notification-container'); if (!container) return;
    const el = document.createElement('div'); el.className = `notification ${type}`; el.textContent = message;
    container.appendChild(el); setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 3500);
  }

  // ---- 暂停 ----

  _bindPauseEvents() {
    const onResume = () => this.game.resume();
    const onSave = () => EventBus.emit(GameEvents.UI_NOTIFICATION, { type: 'info', message: '存档功能将在后续版本中开放' });
    const onQuit = () => { this.game.resume(); this.game.switchScene('menu'); };
    ['pause-resume', 'pause-save', 'pause-quit'].forEach((id, i) => {
      const handler = [onResume, onSave, onQuit][i];
      const el = document.getElementById(id); if (el) { el.addEventListener('click', handler); this._pauseHandlers.set(id, handler); }
    });
  }

  _unbindPauseEvents() {
    for (const [id, h] of this._pauseHandlers.entries()) { const el = document.getElementById(id); if (el && h) el.removeEventListener('click', h); }
    this._pauseHandlers.clear();
  }
}
