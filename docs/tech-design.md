# 「幸存者」技术架构设计文档

> 版本：v0.4.2 | 日期：2026-05-27

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

### 2.2 核心模块清单（实际实现）

> 以下为 v0.4.2 实际已实现的文件结构，与 `src/js/` 目录一一对应。

| 模块 | 职责 | 实际文件路径 |
|------|------|-------------|
| `main.js` | 入口，初始化引擎与启动游戏 | `src/js/main.js` |
| **核心层（js/core/）** | | |
| `Game.js` | 游戏主循环，rAF + 固定步长 60FPS | `src/js/game/Game.js` |
| `EventBus.js` | 全局事件发布/订阅，40+ 事件枚举 | `src/js/game/EventBus.js` |
| `StateManager.js` | 游戏状态管理，不可变数据 + snapshot/rollback | `src/js/game/StateManager.js` |
| `MapGenerator.js` | 随机地图生成，6 种房间类型，箱组规则 | `src/js/game/MapGenerator.js` |
| `Random.js` | 可种子化 PRNG，权重抽取，Fisher-Yates | `src/js/utils/Random.js` |
| `Storage.js` | IndexedDB 存档 + LocalStorage 配置 | `src/js/utils/Storage.js` |
| **场景层（js/scenes/）** | | |
| `BootScene.js` | 启动场景，资源预加载 + 进度条 | `src/js/scenes/BootScene.js` |
| `MenuScene.js` | 主菜单场景，新游戏/继续/设置 | `src/js/scenes/MenuScene.js` |
| `GameScene.js` | 主游戏场景，模式切换/暂停/HUD/战斗集成 | `src/js/scenes/GameScene.js` |
| `BaseScene.js` | 基地场景（2.5D 视角，建设中） | `src/js/scenes/BaseScene.js` |
| **实体层（js/entities/）** | | |
| `Player.js` | 玩家实体，WASD/方向键移动，碰撞检测 | `src/js/entities/Player.js` |
| `Zombie.js` | 丧尸实体，巡逻/追击 AI，普通/精英 | `src/js/entities/Zombie.js` |
| `Survivor.js` | 幸存者实体，对话系统，5 种角色类型 | `src/js/entities/Survivor.js` |
| `LootItem.js` | 房间拾取物实体，可拾取物品实例 | `src/js/entities/LootItem.js` |
| **系统层（js/systems/）** | | |
| `InventorySystem.js` | 背包系统，6 类别 18 种物品，堆叠/容量 | `src/js/systems/InventorySystem.js` |
| `BaseSystem.js` | 基地系统，5 设施/4 岗位/每日结算/丧尸攻击 | `src/js/systems/BaseSystem.js` |
| **渲染层（js/renderers/）** | | |
| `MapRenderer.js` | 地图渲染，地砖/房间颜色/迷雾/小地图 | `src/js/renderers/MapRenderer.js` |
| `EntityRenderer.js` | 实体渲染，玩家/丧尸/幸存者/LootItem 绘制 | `src/js/renderers/EntityRenderer.js` |
| **战斗层（js/combat/）** | | |
| `CombatManager.js` | AP 回合制战斗逻辑，玩家行动，丧尸 AI | `src/js/combat/CombatManager.js` |
| `CombatUI.js` | 战斗界面渲染，Canvas 2D HUD | `src/js/combat/CombatUI.js` |
| **UI 层（js/ui/）** | | |
| `MobileControls.js` | 移动端虚拟摇杆 + 交互按钮 + E 键按钮 | `src/js/ui/MobileControls.js` |

---

## 3. 游戏主循环设计

### 3.1 循环结构

```javascript
// 核心主循环伪代码（实际实现于 src/js/game/Game.js）
class Game {
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
// 全局游戏状态（实际实现于 StateManager.js）
const GameState = {
  // 玩家数据
  player: {
    hp: 100,
    maxHp: 100,
    sanity: 80,
    maxSanity: 100,
    ap: 3,                // 战斗 AP 点数
    maxAp: 3,
    inventory: [],        // 背包物品（InventorySystem 管理）
    equipment: {},        // 装备
    position: { x: 0, y: 0 },
  },

  // 基地数据
  base: {
    level: 1,
    facilities: [],      // 建筑物列表（BaseSystem 管理）
    survivors: [],       // 分配的幸存者
    storedResources: {}, // 仓库物资
    defense: 0,          // 防御值
    day: 1,              // 基地天数
  },

  // 幸存者数据（地图中的 NPC）
  survivors: [
    {
      id: 'survivor_001',
      name: '...',
      type: 'civilian',  // 5 种角色类型
      canRecruit: false,
      health: 90,
    },
  ],

  // 探索状态
  exploration: {
    mapSeed: 0,
    rooms: [],            // 房间列表（MapGenerator 生成）
    currentRoom: null,
    revealedRooms: [],
    lootItems: [],       // 房间拾取物（LootItem 实例）
    turnCount: 0,
    hasWeapon: false,    // 新手保护：是否获得武器
  },

  // 战斗状态
  combat: {
    active: false,
    playerAp: 3,
    enemies: [],          // 当前战斗中的丧尸
    log: [],             // 战斗日志
  },

  // 全局资源
  resources: {
    food: 0,
    water: 0,
    ammo: 0,
    materials: { wood: 0, metal: 0 },
    parts: 0,
  },

  // 游戏时间
  gameTime: {
    day: 1,
    hour: 8,
    minute: 0,
  },
};
```

### 4.3 事件总线设计

```javascript
// 实际实现于 src/js/game/EventBus.js，40+ 事件枚举
// 核心事件类型（部分示例）：
const GameEvents = {
  // 探索事件
  EXPLORATION_START: 'exploration:start',
  ROOM_DISCOVERED: 'room:discovered',
  ROOM_ENTERED: 'room:entered',
  LOOT_COLLECTED: 'loot:collected',
  LOOT_DROPPED: 'loot:dropped',    // 战斗胜利后掉落

  // 战斗事件
  COMBAT_START: 'combat:start',
  COMBAT_END: 'combat:end',
  COMBAT_ACTION: 'combat:action',
  DAMAGE_DEALT: 'combat:damageDealt',

  // 资源事件
  RESOURCE_CHANGED: 'resource:changed',
  INVENTORY_UPDATED: 'inventory:updated',

  // 基地事件
  BASE_FACILITY_BUILT: 'base:facilityBuilt',
  BASE_DAILY_SETTLE: 'base:dailySettle',
  ZOMBIE_ATTACK: 'zombie:attack',

  // UI 事件
  UI_SHOW_INVENTORY: 'ui:showInventory',
  UI_SHOW_BASE: 'ui:showBase',
  PAUSE_GAME: 'game:pause',
  RESUME_GAME: 'game:resume',
};
```

---

## 5. 渲染系统设计

### 5.1 Canvas 层级

```
┌─────────────┐
│  UI Canvas  │  ← 顶层：HTML/CSS UI 叠加（背包面板、基地面板）
├─────────────┤
│  FX Canvas  │  ← 特效层：粒子、屏幕震动（预留）
├─────────────┤
│ Entity      │  ← 实体层：玩家、丧尸、幸存者、LootItem
│ Canvas      │
├─────────────┤
│  Map Canvas │  ← 地图层：地面、房间、墙壁、迷雾
├─────────────┤
│  Combat     │  ← 战斗层：战斗 HUD（CombatUI.js 绘制）
│  Canvas     │
└─────────────┘
```

> 实际实现中，地图和实体渲染由 `MapRenderer.js` 和 `EntityRenderer.js` 在单一 Canvas 上分层绘制完成；战斗 HUD 由 `CombatUI.js` 在独立 Canvas 上绘制；HTML 面板（背包/基地）通过 CSS 叠加在 Canvas 之上。

### 5.2 相机系统

| 场景 | 相机行为 | 实际实现 |
|------|----------|----------|
| 探索（俯视角） | 跟随主角移动，平滑插值 | `MapRenderer.js` 内实现，基于玩家坐标偏移 |
| 战斗 | 动态缩放，突出交战区域 | 预留，当前战斗为 Canvas 覆盖层 |
| 基地（2.5D） | 固定视角，可小范围平移 | `BaseScene.js` 建设中 |
| 对话 | 锁定到对话角色 | 预留 |

### 5.3 精灵图管理

```javascript
// 实际占位精灵图清单（src/assets/sprites/）
// 所有精灵图为程序生成占位图，后续替换为美术资源
const SpriteConfig = {
  player:        'assets/sprites/player.png',        // 玩家角色
  zombie:        'assets/sprites/zombie.png',        // 普通丧尸
  zombie_elite:  'assets/sprites/zombie_elite.png',  // 精英丧尸
  survivor:      'assets/sprites/survivor.png',      // 幸存者 NPC
  floor:         'assets/sprites/floor.png',          // 地板
  wall:          'assets/sprites/wall.png',           // 墙壁
  supply_food:   'assets/sprites/supply_food.png',    // 食物拾取物
  supply_water:  'assets/sprites/supply_water.png',   // 水源拾取物
  supply_ammo:   'assets/sprites/supply_ammo.png',    // 弹药拾取物
  supply_material: 'assets/sprites/supply_material.png', // 材料拾取物
  supply_parts:  'assets/sprites/supply_parts.png',    // 零件拾取物
};
```

---

## 6. 场景管理设计

### 6.1 场景生命周期

```
Scene.onEnter() → Scene.load() → Scene.create() → Scene.update(dt) → Scene.render() → Scene.destroy()
```

> 实际实现于 `src/js/scenes/` 各场景文件，继承自 `BaseScene`。

### 6.2 场景清单

| 场景 | 类型 | 状态 | 说明 |
|------|------|------|------|
| `BootScene` | 启动 | ✅ 完成 | 资源加载进度条 |
| `MenuScene` | 菜单 | ✅ 完成 | 主标题画面，新游戏/继续/设置 |
| `GameScene` | 游戏 | ✅ 完成 | 主游戏场景，集成探索/战斗/背包/基地模式切换 |
| `BaseScene` | 游戏 | 🔄 建设中 | 基地管理（2.5D 视角） |

---

## 7. 随机地图生成算法

### 7.1 探索地图生成流程

```
1. 确定地图种子（Seed，基于 GameState.exploration.mapSeed）
2. 生成网格布局（40×30 格）
3. 放置房间（基于权重随机，6 种类型）
4. 生成连接路径（箱组规则）
5. 放置丧尸（新手保护：hasWeapon === false 时不生成丧尸房）
6. 放置幸存者（低概率）
7. 放置 LootItem（房间拾取物，基于房间类型）
8. 应用战争迷雾（初始全黑，进入后揭示）
9. 房间门兜底（门缺失时自动生成兜底门，v0.4.1）
```

### 7.2 房间生成权重

```javascript
// 实际实现于 MapGenerator.js
const ROOM_WEIGHTS = {
  survivor: 0.10,    // 幸存者房间：10%
  zombie: 0.25,      // 丧尸房间：25%（受新手保护影响）
  empty: 0.20,       // 空房间：20%
  rest: 0.10,        // 休闲屋：10%
  supply: 0.30,      // 物资房间：30%
  surprise: 0.05,    // 随机惊喜房间：5%
};
```

### 7.3 物资随机算法（LootItem 系统）

> 实际实现于 `src/js/entities/LootItem.js` 和 `InventorySystem.js`

```javascript
// LootItem 系统细节（v0.4.2 实现）

// 物品类别定义（6 大类别，18 种物品）
const ITEM_CATEGORIES = {
  weapon: {
    name: '武器',
    items: ['pistol', 'shotgun', 'rifle', 'melee_bat'],
    stackable: false,
  },
  ammo: {
    name: '弹药',
    items: ['ammo_9mm', 'ammo_12gauge', 'ammo_rifle'],
    stackable: true,
    maxStack: 50,
  },
  food: {
    name: '食物',
    items: ['canned_food', 'bread', 'water_bottle'],
    stackable: true,
    maxStack: 10,
  },
  medical: {
    name: '医疗',
    items: ['bandage', 'medkit', 'painkiller'],
    stackable: true,
    maxStack: 5,
  },
  material: {
    name: '材料',
    items: ['wood', 'metal', 'cloth'],
    stackable: true,
    maxStack: 20,
  },
  tool: {
    name: '工具',
    items: ['hammer', 'screwdriver', 'wire'],
    stackable: false,
  },
};

// LootItem 实体结构
class LootItem {
  constructor(type, subType, x, y) {
    this.type = type;       // 类别（weapon/ammo/food/...）
    this.subType = subType; // 具体物品（pistol/ammo_9mm/...）
    this.x = x;             // 地图坐标
    this.y = y;
    this.quantity = 1;      // 数量（可堆叠物品）
    this.pickupRange = 36;  // 拾取触发距离（与战斗索敌距离一致）
  }
}

// 房间类型 → 掉落表映射（MapGenerator 生成 LootItem 时调用）
function generateLootForRoom(roomType) {
  const lootTable = {
    supply:  ['food', 'water', 'ammo', 'material'],
    zombie:  ['ammo', 'medical', 'weapon'],
    survivor: ['food', 'medical', 'tool'],
    rest:    ['food', 'water'],
    empty:   [],
    surprise: ['weapon', 'ammo', 'medical', 'tool'],
  };
  // ... 基于权重随机抽取
}
```

---

## 8. 战斗系统设计

### 8.1 战斗模型

采用**回合制 + AP（行动点数）**模式，实际实现于 `src/js/combat/CombatManager.js` 和 `src/js/combat/CombatUI.js`。

| 元素 | 实际实现 |
|------|----------|
| 行动顺序 | 玩家先手，每回合玩家行动完毕后丧尸行动 |
| AP 系统 | 玩家每回合固定 **3 AP**，不同行动消耗不同 AP |
| 弹药管理 | 远程攻击消耗弹药（`GameState.resources.ammo`），弹药在探索中通过 LootItem 获得 |
| 处决机制 | 变异人类 1 发子弹 / 普通丧尸 3 发子弹（预留，当前为伤害计算） |
| 战斗触发 | 两种触发方式：① 玩家与丧尸距离 **< 36px** 自动触发；② 进入**丧尸房**触发 |
| 战斗结束 | 胜利：获得物资掉落；失败：玩家扣血，返回基地 |

### 8.2 玩家行动（AP 消耗）

| 行动 | 快捷键 | AP 消耗 | 说明 |
|------|--------|----------|------|
| 攻击（近战） | `1` | 1 AP | 近战攻击丧尸 |
| 攻击（远程） | `2` | 1 AP + 弹药 | 远程攻击，需消耗弹药 |
| 防御 | `3` | 1 AP | 本回合减伤 |
| 撤退 | `4` | 全部 AP | 退出战斗，返回探索模式 |
| 等待 | `E` / 按钮 | 0 AP | 结束玩家回合，让丧尸行动 |
| 使用物品 | 点击物品 | 1 AP | 使用背包中的医疗/食物物品 |

> 移动端：虚拟 **E 键交互按钮** 替代键盘 E 键（`MobileControls.js` 实现）。

### 8.3 伤害计算公式

```javascript
// 实际实现于 CombatManager.js
function calculateDamage(attacker, defender, isRanged) {
  const baseStat = isRanged
    ? (attacker.rangedDmg || 10)
    : (attacker.meleeDmg || 15);
  const weaponModifier = attacker.equipment?.weapon?.damage || 1;
  const raw = baseStat * weaponModifier;
  const defense = (defender.physique || 0) * 0.5;
  return Math.max(1, Math.floor(raw - defense));
}
```

### 8.4 战斗 UI 架构

```
CombatManager.js          CombatUI.js
      │                        │
      │  状态管理               │  Canvas 2D 渲染
      │  ├ 玩家 AP             │  ├ 玩家 HP/AP 显示
      │  ├ 丧尸列表             │  ├ 丧尸血条
      │  ├ 战斗日志             │  ├ 行动按钮（1-4/E）
      │  └ 回合状态             │  └ 战斗日志文本框
      │                        │
      └── 触发：GameScene.js 索敌/进入丧尸房
```

---

## 9. 背包系统设计

> 实际实现于 `src/js/systems/InventorySystem.js`，v0.4.2 新增。

### 9.1 物品类别与容量

| 类别 | 是否可堆叠 | 最大堆叠 | 示例物品 |
|------|------------|----------|----------|
| 武器 `weapon` | 否 | 1 | pistol, shotgun, rifle, melee_bat |
| 弹药 `ammo` | 是 | 50 | ammo_9mm, ammo_12gauge, ammo_rifle |
| 食物 `food` | 是 | 10 | canned_food, bread, water_bottle |
| 医疗 `medical` | 是 | 5 | bandage, medkit, painkiller |
| 材料 `material` | 是 | 20 | wood, metal, cloth |
| 工具 `tool` | 否 | 1 | hammer, screwdriver, wire |

- **背包容量**：默认 20 格，超出需丢弃或使用时提示
- **堆叠规则**：同类同子类型物品自动堆叠，达到 `maxStack` 后开新格

### 9.2 背包 UI（HTML 面板）

> 实现方式：HTML + CSS 叠加在 Canvas 之上，v0.4.2 新增

- **触发方式**：按 `I` 键或点击 UI 按钮
- **视觉效果**：`backdrop-filter: blur(8px)` 模糊游戏画面 + `fadeIn` 动画
- **交互**：点击物品使用，拖拽排序（预留）

---

## 10. 基地系统设计

> 实际实现于 `src/js/systems/BaseSystem.js`，v0.4.2 新增。

### 10.1 设施列表（5 种）

| 设施 | 功能 | 建造消耗 |
|------|------|----------|
| 宿舍 `barracks` | 容纳幸存者，提升士气 | 木材×10 |
| 厨房 `kitchen` | 生产食物 | 木材×8 + 金属×4 |
| 工坊 `workshop` | 生产材料和工具 | 金属×10 |
| 医疗站 `infirmary` | 治疗受伤幸存者 | 木材×8 + 医疗用品×2 |
| 瞭望塔 `watchtower` | 提升防御，预警丧尸攻击 | 木材×12 + 金属×6 |

### 10.2 岗位分配（4 种）

| 岗位 | 效果 | 分配人数上限 |
|------|------|--------------|
| 采集者 `gatherer` | 每回合产出食物+水 | 无上限 |
| 工匠 `craftsman` | 每回合产出材料+零件 | 无上限 |
| 守卫 `guard` | 提升基地防御值 | 无上限 |
| 医护 `medic` | 治疗其他幸存者 | 无上限 |

### 10.3 每日结算流程

```
每游戏日结束时（GameState.base.day++）：
  1. 产出资源（基于岗位分配）
  2. 消耗食物（幸存者消耗）
  3. 丧尸攻击判定（基于防御值）
  4. 幸存者状态更新（受伤/恢复）
```

### 10.4 基地 UI（HTML 面板）

- **触发方式**：按 `B` 键或点击 UI 按钮
- **视觉效果**：与背包面板一致，`backdrop-filter: blur(8px)` + `fadeIn` 动画
- **交互**：建造设施、分配岗位、查看幸存者状态

---

## 11. 项目目录结构（实际）

> 与 `vite.config.js` 的 `src/` 入口配置一致

```
survivors/
├── index.html                 # 入口 HTML（Vite 入口）
├── manifest.json              # PWA 配置（横屏锁定，standalone）
├── package.json               # 项目依赖（Vite）
├── vite.config.js             # Vite 构建配置
├── deploy.sh                  # GitHub Pages 部署脚本
├── .gitignore
├── .github/
│   └── workflows/
│       └── deploy.yml         # GitHub Actions 自动部署
├── src/
│   ├── index.html             # Vite 开发模式入口（软链/复制）
│   ├── css/
│   │   └── style.css         # 全局样式（HUD/面板/响应式）
│   ├── manifest.json          # PWA 配置（src 目录副本）
│   ├── assets/
│   │   ├── icons/
│   │   │   ├── icon-192.png  # PWA 图标 192×192
│   │   │   └── icon-512.png  # PWA 图标 512×512
│   │   └── sprites/          # 占位精灵图（程序生成）
│   │       ├── player.png
│   │       ├── zombie.png
│   │       ├── zombie_elite.png
│   │       ├── survivor.png
│   │       ├── floor.png
│   │       ├── wall.png
│   │       ├── supply_food.png
│   │       ├── supply_water.png
│   │       ├── supply_ammo.png
│   │       ├── supply_material.png
│   │       └── supply_parts.png
│   └── js/
│       ├── main.js            # 入口：初始化 Game，启动场景
│       ├── game/              # 核心游戏引擎
│       │   ├── Game.js        # 主循环（rAF + 固定步长）
│       │   ├── EventBus.js   # 事件总线（40+ 事件）
│       │   ├── MapGenerator.js # 随机地图生成
│       │   ├── StateManager.js # 状态管理（不可变数据）
│       │   └── Random.js     # 可种子化 PRNG
│       ├── utils/             # 工具类
│       │   └── Storage.js    # IndexedDB + LocalStorage
│       ├── scenes/            # 场景类
│       │   ├── BaseScene.js  # 基地场景（建设中）
│       │   ├── BootScene.js  # 启动场景（资源加载）
│       │   ├── GameScene.js  # 主游戏场景（核心）
│       │   └── MenuScene.js  # 主菜单场景
│       ├── entities/          # 游戏实体
│       │   ├── LootItem.js   # 房间拾取物（v0.4.2）
│       │   ├── Player.js     # 玩家实体
│       │   ├── Survivor.js   # 幸存者 NPC
│       │   └── Zombie.js     # 丧尸实体
│       ├── systems/           # 游戏系统
│       │   ├── BaseSystem.js # 基地系统（v0.4.2）
│       │   └── InventorySystem.js # 背包系统（v0.4.2）
│       ├── renderers/         # 渲染器
│       │   ├── EntityRenderer.js # 实体渲染
│       │   └── MapRenderer.js    # 地图渲染（含相机）
│       ├── combat/            # 战斗系统
│       │   ├── CombatManager.js  # 战斗逻辑
│       │   └── CombatUI.js       # 战斗 UI 渲染
│       └── ui/                # UI 控制器
│           └── MobileControls.js # 移动端虚拟摇杆+按钮
├── docs/                      # 设计文档
│   ├── feature-list.md        # 功能清单（v0.4.2）
│   ├── project-roadmap.md    # 项目进度（v0.4.2）
│   ├── tech-design.md        # 技术架构（本文件）
│   └── art-assets.md         # 美术资源清单
├── archive/                   # 历史归档文件
└── output/                    # 构建输出（gitignore）
```

---

## 12. 开发阶段规划（更新）

| 阶段 | 目标 | 状态 |
|------|------|------|
| Phase 0 | 技术原型 | ✅ 完成 |
| Phase 1 | 核心探索 + 战斗 + 背包 + 基地 | 🟡 接近完成（经验系统待实现） |
| Phase 2 | 内容填充（技能/佣兵/对话/任务） | 🔄 部分提前实现 |
| Phase 3 | 商业化（商城/支付/社交） | ⬜ 未开始 |
| Phase 4 | 打磨上线（性能/多平台/测试） | 🟡 部分提前实现（移动端/PWA） |

---

## 13. 已知问题与 TODO

| # | 问题 | 优先级 | 状态 |
|---|------|--------|------|
| 1 | 经验/升级系统未实现 | P0 | ⬜ 待开发 |
| 2 | 战斗动画缺失（攻击/受击/死亡） | P0 | ⬜ 待开发 |
| 3 | 技能系统未实现 | P0 | ⬜ 待开发 |
| 4 | 美术资源为占位方块 | P1 | 🔄 美术制作中 |
| 5 | 基地场景（BaseScene）未完成 | P1 | 🔄 建设中 |
| 6 | 音效/BGM 系统未实现 | P2 | ⬜ 待开发 |
| 7 | 存档跨设备同步 | P3 | ⬜ 待开发 |
