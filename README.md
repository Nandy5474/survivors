# 幸存者 | Survivors

> 丧尸末世生存策略 RPG 游戏
>
> 版本：v0.4.2 | 日期：2026-05-27

---

## 项目简介

「幸存者」是一款以丧尸末世为背景的 2D 生存策略 RPG 游戏。玩家扮演末日中的幸存者领袖，通过**探索随机生成的城市废墟、管理安全屋基地、招募幸存者与佣兵、在回合制战斗中对抗丧尸群**，努力在末日世界中生存下去。

### 核心特色

| 系统 | 说明 | 状态 |
|------|------|------|
| 随机探索 | 种子化地图生成，6 种房间类型，箱组规则，门机制（MapGenerator.js） | ✅ 已实现 |
| 基地建设 | 5 设施 / 4 岗位 / 每日结算 / 丧尸攻击（BaseSystem.js） | ✅ 已实现 |
| 幸存者管理 | 5 种角色类型，对话系统，可招募（Survivor.js） | ✅ 已实现 |
| 回合战斗 | AP 行动点数系统，弹药管理，处决机制（CombatManager.js + CombatUI.js） | ✅ 已实现 |
| 佣兵系统 | S/A/B 三级佣兵抽取，六维属性，职业与等级成长 | ⬜ 待实现 |
| 多线剧情 | 分支对话、任务系统、多结局 | ⬜ 待实现 |

---

## 当前版本功能（v0.4.2）

- **随机地图探索**：6 种房间类型（起始房、普通房、物资房、武器房、丧尸房、Boss 房），箱组连通规则与门系统
- **回合制战斗**：AP 行动点数驱动，移动 / 攻击 / 换弹 / 处决，弹药管理，丧尸 AI 自动寻路
- **安全屋基地**：5 种设施（指挥中心、物资仓库、医疗室、工坊、瞭望塔），4 种岗位分配幸存者，每日生产与丧尸攻击事件
- **幸存者招募与对话**：5 种角色类型（医生、工程师、战士、拾荒者、平民），对话系统，可招募入队
- **物资与背包系统**：食物 / 水 / 弹药 / 零件 / 材料 五种物资，拾取与消耗管理
- **移动端适配**：触屏虚拟摇杆（左下 30%×70% 分区），PWA 离线支持
- **多槽位存档**：IndexedDB 持久化，支持多个存档槽位

---

## 技术栈

- **渲染引擎**：Canvas 2D API（五层分层渲染）
- **UI 层**：原生 HTML + CSS
- **语言**：JavaScript (ES2022+), ES Module
- **数据持久化**：IndexedDB 多槽位存档 + LocalStorage
- **构建工具**：Vite
- **运行环境**：现代浏览器（Chrome / Firefox / Edge / Safari）

---

## 项目结构

```
survivors/
├── index.html
├── package.json
├── vite.config.js
├── README.md
├── deploy.sh
├── docs/                       # GitHub Pages 部署目录
│   ├── index.html
│   ├── css/style.css
│   ├── js/                     # 构建输出（与 src/ 结构一致）
│   │   ├── main.js
│   │   ├── game/
│   │   ├── scenes/
│   │   ├── entities/
│   │   ├── systems/
│   │   ├── renderers/
│   │   ├── combat/
│   │   ├── ui/
│   │   └── utils/
│   ├── assets/
│   │   ├── sprites/
│   │   └── icons/
│   ├── manifest.json
│   ├── game-design.md
│   ├── art-style.md
│   ├── commercial-design.md
│   └── tech-design.md
├── src/                        # 源代码
│   ├── index.html
│   ├── manifest.json
│   ├── css/
│   │   └── style.css
│   ├── assets/
│   │   ├── sprites/
│   │   │   ├── player.png
│   │   │   ├── zombie.png
│   │   │   ├── zombie_elite.png
│   │   │   ├── survivor.png
│   │   │   ├── floor.png
│   │   │   ├── wall.png
│   │   │   ├── supply_food.png
│   │   │   ├── supply_water.png
│   │   │   ├── supply_ammo.png
│   │   │   ├── supply_material.png
│   │   │   └── supply_parts.png
│   │   └── icons/
│   │       ├── icon-192.png
│   │       └── icon-512.png
│   └── js/
│       ├── main.js             # 入口文件
│       ├── game/
│       │   ├── Game.js         # 游戏主控制器
│       │   ├── EventBus.js     # 事件总线
│       │   ├── MapGenerator.js # 随机地图生成器
│       │   └── StateManager.js # 状态管理器
│       ├── scenes/
│       │   ├── BaseScene.js    # 场景基类
│       │   ├── BootScene.js    # 启动场景
│       │   ├── MenuScene.js    # 主菜单场景
│       │   └── GameScene.js    # 游戏主场景
│       ├── entities/
│       │   ├── Player.js       # 玩家实体
│       │   ├── Zombie.js       # 丧尸实体
│       │   ├── Survivor.js     # 幸存者实体
│       │   └── LootItem.js     # 掉落物品
│       ├── systems/
│       │   ├── BaseSystem.js   # 基地系统
│       │   └── InventorySystem.js  # 背包/物资系统
│       ├── renderers/
│       │   ├── MapRenderer.js  # 地图渲染器
│       │   └── EntityRenderer.js   # 实体渲染器
│       ├── combat/
│       │   ├── CombatManager.js    # 战斗逻辑
│       │   └── CombatUI.js         # 战斗 UI
│       ├── ui/
│       │   └── MobileControls.js   # 移动端触屏控制
│       └── utils/
│           ├── Random.js       # 随机数工具
│           └── Storage.js      # 存档管理
└── .github/
    └── workflows/
        └── deploy.yml          # GitHub Actions 部署
```

---

## 快速开始

### 在线体验

部署于 GitHub Pages，可直接访问：**[https://nandy5474.github.io/survivors/](https://nandy5474.github.io/survivors/)**

已支持触屏虚拟摇杆 + PWA 离线使用。

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 部署

部署目录为 `docs/`，GitHub Pages 从 `/docs` 目录提供服务。推送至 `main` 分支后 GitHub Actions 自动部署。

```bash
# 构建到 docs/ 目录
npm run build

# 或直接运行部署脚本
bash deploy.sh
```

---

## 开发阶段

| 阶段 | 目标 | 状态 |
|------|------|------|
| Phase 1 | 技术原型：Canvas 渲染、主循环、场景切换、UI 框架 | ✅ 已完成 |
| Phase 2 | 核心探索：随机地图、房间探索、物资系统 | ✅ 已完成 |
| Phase 3 | 战斗系统：回合制、弹药管理、丧尸 AI | ✅ 已完成 |
| Phase 4 | 基地建设：建筑、幸存者管理、生产 | ✅ 已完成 |
| Phase 5 | 佣兵系统：抽取、派遣、成长 | ⬜ 待开始 |
| Phase 6 | 剧情系统：对话树、任务、多结局 | ⬜ 待开始 |
| Phase 7 | 商业化：商店、付费、运营 | ⬜ 待开始 |
| Phase 8 | 打磨上线：优化、AIGC 立绘、测试 | ⬜ 待开始 |

---

## 架构概览

```
┌─────────────────────────────────────┐
│          UI Layer (HTML/CSS)        │
├─────────────────────────────────────┤
│     Game Loop (rAF, 60FPS 固定步长)  │
├──────────┬────────────┬─────────────┤
│Scene Mgr │  EventBus  │ StateManager│
├──────────┴────────────┴─────────────┤
│           Systems Layer             │
│   (Combat / Base / Inventory)       │
├─────────────────────────────────────┤
│         Entities Layer              │
│ (Player / Zombie / Survivor / Item) │
├─────────────────────────────────────┤
│    Canvas 五层渲染                   │
│  迷雾 → 地图 → 实体 → 特效 → UI      │
├─────────────────────────────────────┤
│       Data (IndexedDB / LocalStorage)│
└─────────────────────────────────────┘
```

---

## 技术细节

- **主循环**：基于 `requestAnimationFrame`，60FPS 固定步长更新，渲染与逻辑分离
- **模块化**：ES Module 架构，按功能域拆分为 `game/` `scenes/` `entities/` `systems/` `renderers/` `combat/` `ui/` `utils/` 八大模块
- **存档系统**：IndexedDB 多槽位存档，支持独立存档读写
- **Canvas 渲染**：五层分层渲染 —— 迷雾层、地图层、实体层、特效层、UI 覆盖层
- **移动端适配**：虚拟摇杆分区控制，左下区域（屏幕宽度 30% × 高度 70%）为摇杆区，其余区域为交互区
- **构建部署**：Vite 构建，`docs/` 目录直接作为 GitHub Pages 部署源

---

## 文档

设计文档位于 `docs/` 目录：

- [游戏设计文档](docs/game-design.md) — 核心玩法、系统设计
- [美术风格文档](docs/art-style.md) — 视觉风格与像素美术规范
- [商业化设计文档](docs/commercial-design.md) — 付费模式与运营策略

---

## 许可

UNLICENSED — 内部开发项目，保留所有权利。