# 幸存者 | Survivors

> 丧尸末世生存策略 RPG 游戏
>
> 版本：v0.1.0 | 日期：2026-05-26

---

## 项目简介

「幸存者」是一款以丧尸末世为背景的 2D 生存策略 RPG 游戏。玩家扮演末日中的幸存者领袖，通过**探索随机生成的城市废墟、管理安全屋基地、招募幸存者与佣兵、在回合制战斗中对抗丧尸群**，努力在末日世界中生存下去。

### 核心特色

| 系统 | 说明 |
|------|------|
| 随机探索 | 种子化地图生成，箱组 + 房间类型的 roguelike 探索 |
| 基地建设 | 安全屋建造与升级，物资生产与管理 |
| 幸存者管理 | 多幸存者招募，属性 + 行为 AI，分配任务 |
| 佣兵系统 | S/A/B 三级佣兵抽取，六维属性，职业与等级成长 |
| 回合战斗 | AP 行动点数系统，弹药管理，处决机制 |
| 多线剧情 | 分支对话、任务系统、多结局 |

---

## 技术栈

- **渲染引擎**：Canvas 2D API（四层分层渲染）
- **UI 层**：原生 HTML + CSS
- **语言**：JavaScript (ES2022+), ES Module
- **数据持久化**：IndexedDB + LocalStorage
- **构建工具**：Vite (可选)
- **运行环境**：现代浏览器（Chrome / Firefox / Edge / Safari）

---

## 项目结构

```
survivors/
├── index.html              # 入口 HTML（在 src/ 中）
├── package.json
├── README.md
├── assets/                 # 美术/音频/配置资源
│   ├── sprites/
│   │   ├── characters/
│   │   ├── zombies/
│   │   ├── tiles/
│   │   ├── items/
│   │   └── ui/
│   ├── audio/
│   │   ├── bgm/
│   │   ├── sfx/
│   │   └── ambient/
│   ├── config/             # JSON 配置表
│   └── fonts/
├── docs/                   # 设计文档
│   ├── game-design.md
│   ├── art-style.md
│   ├── commercial-design.md
│   └── tech-design.md
└── src/                    # 源代码
    ├── index.html
    ├── css/
    │   └── style.css
    ├── js/
    │   ├── main.js         # 入口（待创建）
    │   ├── game/
    │   │   ├── Game.js
    │   │   ├── EventBus.js
    │   │   └── StateManager.js
    │   ├── scenes/
    │   │   ├── BaseScene.js
    │   │   ├── BootScene.js
    │   │   ├── MenuScene.js
    │   │   └── GameScene.js
    │   ├── core/           # 核心系统（待实现）
    │   ├── systems/        # 玩法系统（待实现）
    │   ├── entities/       # 游戏实体（待实现）
    │   ├── ui/             # UI 组件（待实现）
    │   └── utils/
    │       ├── Random.js
    │       └── Storage.js
    └── output/             # 构建输出
```

---

## 快速开始

### 前置要求

- Node.js >= 16（可选，仅使用 Vite 构建时需要）
- 现代浏览器（推荐 Chrome 120+）

### 零依赖运行（推荐）

直接用浏览器打开 `src/index.html` 即可运行（需通过本地服务器避免跨域限制）：

```bash
npx serve src -p 3000
# 浏览器访问 http://localhost:3000
```

### 开发模式（Vite）

```bash
npm install
npm run dev
```

---

## 开发阶段

| 阶段 | 目标 | 状态 |
|------|------|------|
| Phase 1 | 技术原型：Canvas 渲染、主循环、场景切换、UI 框架 | 进行中 |
| Phase 2 | 核心探索：随机地图、房间探索、物资系统 | 待开始 |
| Phase 3 | 战斗系统：回合制、弹药管理、丧尸 AI | 待开始 |
| Phase 4 | 基地建设：建筑、幸存者管理、生产 | 待开始 |
| Phase 5 | 佣兵系统：抽取、派遣、成长 | 待开始 |
| Phase 6 | 剧情系统：对话树、任务、多结局 | 待开始 |
| Phase 7 | 商业化：商店、付费、运营 | 待开始 |
| Phase 8 | 打磨上线：优化、AIGC 立绘、测试 | 待开始 |

---

## 架构概览

```
┌─────────────────────────────────┐
│        UI Layer (HTML/CSS)      │
├─────────────────────────────────┤
│     Game Loop (rAF)             │
├──────────────┬──────────────────┤
│ Scene Mgr    │   EventBus       │
├──────────────┴──────────────────┤
│         Core Systems            │
├─────────────────────────────────┤
│         Data Layer              │
├─────────────────────────────────┤
│    Rendering (Canvas 2D)        │
├─────────────────────────────────┤
│      Resource Manager           │
└─────────────────────────────────┘
```

---

## 许可

UNLICENSED — 内部开发项目，保留所有权利。