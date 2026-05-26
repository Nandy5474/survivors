# 「幸存者」技术架构设计文档

> 版本：v0.1.0 | 日期：2026-05-26

---

## 1. 技术选型总览

### 1.1 推荐技术栈

采用**原生 HTML/CSS/JavaScript** 技术栈，适合在浏览器中直接运行的 2D 游戏，无需安装额外运行时环境。

| 层级 | 技术选择 | 说明 |
|------|----------|------|
| 渲染 | Canvas 2D API | 游戏主画面的 2D 渲染 |
| UI | HTML + CSS | 游戏 UI/HUD 层（叠加在 Canvas 之上） |
| 逻辑 | Vanilla JavaScript (ES2022+) | 游戏核心逻辑、状态管理 |
| 资源格式 | PNG（精灵图）、JSON（数据）、MP3/OGG（音频） | 标准 Web 友好格式 |
| 构建工具 | Vite（可选） | 开发热更新与生产打包（也可零构建直接运行） |
| 数据持久化 | IndexedDB + LocalStorage | 游戏存档与配置存储 |

### 1.2 选型理由

- **零依赖部署**：无需任何构建步骤即可直接在浏览器中运行
- **包体轻量**：纯 JS 实现，无框架开销
- **跨平台**：任何现代浏览器均可运行（桌面/平板/移动端）
- **开发效率**：Canvas API 成熟稳定，社区资源丰富
- **性能可控**：2D 游戏场景下 Canvas 性能充足

### 1.3 备选方案

| 方案 | 适用场景 | 备注 |
|------|----------|------|
| Phaser 3 | 需要更完善的游戏引擎支持 | 若项目长期迭代，可考虑迁移 |
| PixiJS | 需要 WebGL 渲染性能 | 当渲染复杂度提升时可迁移 |
| Electron | 需要打包为桌面应用 | 后期可考虑 PC/Mac 客户端 |

---

## 2. 游戏架构总览

### 2.1 分层架构

```
┌─────────────────────────────────────────────┐
│              UI Layer (HTML/CSS)             │
│   HUD, 菜单, 对话框, 背包, 商店, 设置        │
├─────────────────────────────────────────────┤
│           Game Loop Controller               │
│   游戏主循环 (requestAnimationFrame)         │
├─────────────────┬───────────────────────────┤
│   Scene Manager │     Event Bus              │
│   场景调度管理   │     事件总线               │
├─────────────────┴───────────────────────────┤
│              Core Systems                    │
│  探索系统 │ 战斗系统 │ 建设系统 │ 佣兵系统   │
│  幸存者AI │ 物资系统 │ 剧情系统 │ 随机生成   │
├─────────────────────────────────────────────┤
│              Data Layer                      │
│   GameState │ PlayerData │ Config │ Save     │
├─────────────────────────────────────────────┤
│           Rendering (Canvas 2D)              │
│   精灵渲染 │ 地图绘制 │ 粒子特效 │ 动画      │
├─────────────────────────────────────────────┤
│            Resource Manager                  │
│   图片加载 │ 音频管理 │ JSON 配置 │ 缓存池   │
└─────────────────────────────────────────────┘
```

### 2.2 核心模块清单

| 模块 | 职责 | 文件（建议） |
|------|------|-------------|
| `main.js` | 入口，初始化引擎与启动游戏 | main.js |
| `game-loop.js` | 主循环控制，帧率管理，Update/Render 调度 | core/game-loop.js |
| `scene-manager.js` | 场景注册、切换、生命周期管理 | core/scene-manager.js |
| `event-bus.js` | 全局事件发布/订阅 | core/event-bus.js |
| `renderer.js` | Canvas 2D 渲染封装（相机、图层、精灵绘制） | core/renderer.js |
| `resource-manager.js` | 资源预加载、缓存、卸载 | core/resource-manager.js |
| `input-manager.js` | 键盘/鼠标/触屏输入统一处理 | core/input-manager.js |
| `save-manager.js` | IndexedDB 存档读写 | core/save-manager.js |
| `exploration-system.js` | 随机地图生成、房间探索、事件触发 | systems/exploration.js |
| `combat-system.js` | 战斗逻辑、伤害计算、AI 行为 | systems/combat.js |
| `building-system.js` | 安全屋建设、升级、生产 | systems/building.js |
| `mercenary-system.js` | 佣兵管理、属性、抽取、派遣 | systems/mercenary.js |
| `survivor-ai.js` | 幸存者行为决策树、移动、交互 | systems/survivor-ai.js |
| `resource-system.js` | 物资库存、消耗、交易 | systems/resource.js |
| `story-system.js` | 剧情脚本引擎、对话树、条件触发 | systems/story.js |

---

## 3. 游戏主循环设计

### 3.1 循环结构

```javascript
// 核心主循环伪代码
class GameLoop {
  constructor() {
    this.lastTime = 0;
    this.accumulator = 0;
    this.fixedDeltaTime = 1000 / 60; // 固定逻辑帧 60 FPS
    this.isRunning = false;
  }

  start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  loop(currentTime) {
    if (!this.isRunning) return;

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // 累加时间，处理固定步长逻辑更新
    this.accumulator += deltaTime;
    while (this.accumulator >= this.fixedDeltaTime) {
      this.fixedUpdate(this.fixedDeltaTime);
      this.accumulator -= this.fixedDeltaTime;
    }

    // 渲染插值
    const alpha = this.accumulator / this.fixedDeltaTime;
    this.render(alpha);

    requestAnimationFrame(this.loop.bind(this));
  }

  fixedUpdate(dt) {
    SceneManager.update(dt);  // 当前场景的逻辑更新
    InputManager.process();   // 输入处理
  }

  render(alpha) {
    Renderer.clear();
    SceneManager.render(alpha);  // 当前场景的渲染
  }
}
```

### 3.2 帧率策略

| 模式 | 目标帧率 | 说明 |
|------|----------|------|
| 正常游玩 | 60 FPS | 使用固定步长 + 渲染插值 |
| 菜单/UI | 按需刷新 | 减少不必要的重绘 |
| 后台/暂停 | 停止渲染 | 保留逻辑帧用于计时器 |

---

## 4. 数据流设计

### 4.1 单向数据流

```
用户输入
  │
  ▼
Event Bus (发布事件)
  │
  ▼
System 处理 (修改 GameState)
  │
  ▼
GameState 更新 (不可变数据)
  │
  ▼
Scene Manager 通知渲染
  │
  ▼
Canvas 重绘
```

### 4.2 GameState 结构

```javascript
// 全局游戏状态
const GameState = {
  // 玩家数据
  player: {
    hp: 100,
    maxHp: 100,
    sanity: 80,
    maxSanity: 100,
    inventory: [],        // 背包物品
    equipment: {},        // 装备
    position: { x: 0, y: 0 },
  },

  // 基地数据
  base: {
    level: 1,
    buildings: [],       // 建筑物列表
    storedResources: {}, // 仓库物资
    defense: 0,          // 防御值
  },

  // 幸存者数据
  survivors: [
    {
      id: 'survivor_001',
      name: '...',
      strength: 5,
      will: 7,
      agility: 4,
      hp: 80,
      health: 90,
      location: 'base',
      task: 'building',
    },
  ],

  // 佣兵数据
  mercenaries: [
    {
      id: 'merc_s_001',
      name: '...',
      grade: 'S',
      stats: { morale: 8, melee: 9, quality: 6, force: 9, intelligence: 7, physique: 8 },
      profession: 'combat',
      isDeployed: false,
      storyUnlocked: false,
    },
  ],

  // 探索状态
  exploration: {
    mapSeed: 0,
    rooms: [],
    currentRoom: null,
    revealedRooms: [],
    turnCount: 0,
  },

  // 全局资源
  globalResources: {
    gold: 0,
    diamond: 0,
    food: 0,
    water: 0,
    ammo: 0,
    materials: { wood: 0, stone: 0, metal: 0 },
    parts: 0,
  },

  // 剧情进度
  story: {
    chapter: 1,
    flags: {},           // 剧情标记
    completedQuests: [],
  },

  // 时间系统
  gameTime: {
    day: 1,
    hour: 8,
    minute: 0,
    season: 'autumn',
  },
};
```

### 4.3 事件总线设计

```javascript
// 事件类型枚举
const GameEvents = {
  // 探索事件
  EXPLORATION_START: 'exploration:start',
  EXPLORATION_COMPLETE: 'exploration:complete',
  ROOM_DISCOVERED: 'room:discovered',
  ROOM_ENTERED: 'room:entered',

  // 战斗事件
  COMBAT_START: 'combat:start',
  COMBAT_END: 'combat:end',
  DAMAGE_DEALT: 'combat:damageDealt',

  // 资源事件
  RESOURCE_CHANGED: 'resource:changed',
  ITEM_ACQUIRED: 'item:acquired',
  ITEM_USED: 'item:used',

  // 佣兵事件
  MERCENARY_RECRUITED: 'mercenary:recruited',
  MERCENARY_DEPLOYED: 'mercenary:deployed',

  // 基地事件
  BUILDING_CONSTRUCTED: 'building:constructed',
  ZOMBIE_ATTACK: 'zombie:attack',

  // 剧情事件
  STORY_PROGRESS: 'story:progress',
  DIALOGUE_START: 'dialogue:start',
};
```

---

## 5. 渲染系统设计

### 5.1 Canvas 层级

```
┌─────────────┐
│  UI Canvas  │  ← 顶层：HTML/CSS UI 叠加
├─────────────┤
│  FX Canvas  │  ← 特效层：粒子、屏幕震动
├─────────────┤
│ Entity      │  ← 实体层：角色、丧尸、道具
│ Canvas      │
├─────────────┤
│  Map Canvas │  ← 地图层：地面、建筑、装饰
├─────────────┤
│  Fog Canvas │  ← 战争迷雾层：探索遮蔽
└─────────────┘
```

### 5.2 相机系统

| 场景 | 相机行为 |
|------|----------|
| 基地（2.5D） | 固定视角，可小范围平移 |
| 探索（俯视角） | 跟随主角移动，平滑插值 |
| 战斗 | 动态缩放，突出交战区域 |
| 对话 | 锁定到对话角色 |

### 5.3 精灵图管理

```javascript
// Sprite 数据结构
const SpriteConfig = {
  player: {
    src: 'assets/sprites/player.png',
    frameWidth: 64,
    frameHeight: 64,
    animations: {
      idle: { frames: [0, 1, 2, 3], frameRate: 8 },
      walk: { frames: [4, 5, 6, 7], frameRate: 10 },
      attack: { frames: [8, 9, 10, 11], frameRate: 12 },
      hurt: { frames: [12, 13], frameRate: 6 },
    },
  },
};
```

---

## 6. 场景管理设计

### 6.1 场景生命周期

```
Scene.start() → Scene.update(dt) → Scene.render() → Scene.pause() → Scene.destroy()
```

### 6.2 场景清单

| 场景 | 类型 | 说明 |
|------|------|------|
| `LoadingScene` | 启动 | 资源加载进度条 |
| `TitleScene` | 菜单 | 主标题画面 |
| `BaseScene` | 游戏 | 基地管理（2.5D 视角） |
| `ExplorationScene` | 游戏 | 随机探索（俯视角） |
| `CombatScene` | 游戏 | 战斗场景 |
| `DialogueScene` | 叠加 | NPC 对话（可叠加于其他场景） |
| `InventoryScene` | UI | 背包管理 |
| `MercenaryScene` | UI | 佣兵管理/抽取 |
| `ShopScene` | UI | 商店 |
| `ResultScene` | UI | 探索结算/战斗结算 |

---

## 7. 随机地图生成算法

### 7.1 探索地图生成流程

```
1. 确定地图种子（Seed）
2. 生成箱组布局（小型箱 + 大型箱）
3. 填充房间类型（基于权重随机）
4. 生成连接路径
5. 放置幸存者（低概率）
6. 放置丧尸/变异体
7. 应用战争迷雾
```

### 7.2 房间生成权重

```javascript
const ROOM_WEIGHTS = {
  survivor: 0.10,    // 幸存者房间：10%
  zombie: 0.25,      // 丧尸房间：25%
  empty: 0.20,       // 空房间：20%
  rest: 0.10,        // 休闲屋：10%
  supply: 0.30,      // 物资房间：30%
  surprise: 0.05,    // 随机惊喜房间：5%
};
```

### 7.3 物资随机算法

```javascript
function generateLoot(roomType, luckMultiplier = 1.0) {
  const baseLoot = LOOT_TABLE[roomType];
  const count = Math.floor(baseLoot.min + Math.random() * (baseLoot.max - baseLoot.min));
  const items = [];

  for (let i = 0; i < count; i++) {
    const roll = Math.random() * luckMultiplier;
    if (roll > 0.9) items.push(pickRareItem());
    else if (roll > 0.5) items.push(pickUncommonItem());
    else items.push(pickCommonItem());
  }

  return items;
}
```

---

## 8. 战斗系统设计

### 8.1 战斗模型

采用**回合制 + AP（行动点数）**模式：

| 元素 | 说明 |
|------|------|
| 行动顺序 | 基于敏捷值排序 |
| AP 系统 | 每回合固定 AP，不同行动消耗不同 |
| 弹药管理 | 远程攻击消耗弹药，弹药在探索中获得 |
| 处决机制 | 变异人类 1 发子弹 / 普通丧尸 3 发子弹 |

### 8.2 伤害计算公式

```javascript
function calculateDamage(attacker, defender, isRanged) {
  const baseStat = isRanged ? attacker.force : attacker.melee;
  const weaponModifier = attacker.equipment?.weapon?.damage || 1;
  const raw = baseStat * weaponModifier;
  const defense = defender.physique * 0.5;
  return Math.max(1, raw - defense);
}
```

---

## 9. 数据持久化方案

### 9.1 存储策略

| 数据类型 | 存储位置 | 说明 |
|----------|----------|------|
| 游戏存档 | IndexedDB | 大容量、结构化数据 |
| 用户设置 | LocalStorage | 音量、语言、操作偏好 |
| 游戏配置 | JSON 文件 | 静态配置表（物品、佣兵、关卡） |

### 9.2 存档结构

```javascript
const SaveData = {
  version: '0.1.0',
  timestamp: Date.now(),
  gameState: { /* GameState 快照 */ },
  meta: {
    playTime: 0,        // 总游玩时长（秒）
    saveSlot: 1,
  },
};
```

---

## 10. 性能优化策略

| 策略 | 说明 |
|------|------|
| 对象池 | 复用子弹粒子、丧尸实体、UI 元素 |
| 脏矩形渲染 | 仅重绘变化区域（探索模式） |
| 离屏 Canvas | 地图静态层预渲染到离屏 Canvas |
| 资源懒加载 | 按场景按需加载精灵图 |
| 事件节流 | 高频事件（鼠标移动）使用 requestAnimationFrame 节流 |
| Web Worker | 地图生成等重计算放在 Worker 线程 |

---

## 11. 项目目录结构

```
survivors/
├── index.html                 # 入口 HTML
├── assets/
│   ├── sprites/               # 精灵图
│   │   ├── characters/        # 角色精灵
│   │   ├── zombies/           # 丧尸精灵
│   │   ├── tiles/             # 地图瓦片
│   │   ├── items/             # 道具图标
│   │   └── ui/                # UI 元素
│   ├── audio/
│   │   ├── bgm/
│   │   ├── sfx/
│   │   └── ambient/
│   ├── config/                # JSON 配置表
│   │   ├── mercenaries.json   # 佣兵配置
│   │   ├── items.json         # 道具配置
│   │   ├── buildings.json     # 建筑配置
│   │   ├── rooms.json         # 房间配置
│   │   └── story.json         # 剧情配置
│   └── fonts/
├── src/
│   ├── main.js                # 入口
│   ├── core/
│   │   ├── game-loop.js
│   │   ├── scene-manager.js
│   │   ├── event-bus.js
│   │   ├── renderer.js
│   │   ├── resource-manager.js
│   │   ├── input-manager.js
│   │   └── save-manager.js
│   ├── systems/
│   │   ├── exploration.js
│   │   ├── combat.js
│   │   ├── building.js
│   │   ├── mercenary.js
│   │   ├── survivor-ai.js
│   │   ├── resource.js
│   │   └── story.js
│   ├── scenes/
│   │   ├── loading.js
│   │   ├── title.js
│   │   ├── base.js
│   │   ├── exploration.js
│   │   ├── combat.js
│   │   └── dialogue.js
│   ├── entities/
│   │   ├── player.js
│   │   ├── survivor.js
│   │   ├── mercenary.js
│   │   ├── zombie.js
│   │   └── item.js
│   ├── ui/
│   │   ├── hud.js
│   │   ├── dialog-box.js
│   │   ├── inventory.js
│   │   ├── mercenary-panel.js
│   │   └── shop.js
│   └── utils/
│       ├── random.js          # 伪随机数生成器
│       ├── math.js
│       ├── timer.js
│       └── object-pool.js
├── docs/                      # 设计文档
│   ├── game-design.md
│   ├── art-style.md
│   ├── commercial-design.md
│   └── tech-design.md
└── README.md
```

---

## 12. 开发阶段规划

| 阶段 | 目标 | 预计产出 |
|------|------|----------|
| Phase 1 | 技术原型 | Canvas 渲染、主循环、基础场景切换 |
| Phase 2 | 核心探索 | 随机地图生成、房间探索、物资系统 |
| Phase 3 | 战斗系统 | 回合制战斗、弹药管理、丧尸 AI |
| Phase 4 | 基地建设 | 安全屋建设、幸存者管理、生产系统 |
| Phase 5 | 佣兵系统 | 佣兵管理、抽取、派遣 |
| Phase 6 | 剧情系统 | 对话树、任务系统、多结局 |
| Phase 7 | 商业化 | 商店、付费系统、运营活动 |
| Phase 8 | 打磨上线 | 性能优化、AIGC 立绘接入、测试 |