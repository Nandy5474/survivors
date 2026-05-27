# 幸存者 — 美术资源需求清单

> 最后更新：2026-05-27
> 版本：v0.4.2
> 美术风格参考：`docs/art-style.md`

---

## 目录

1. [角色立绘](#1-角色立绘)
2. [UI 元素](#2-ui-元素)
3. [场景背景](#3-场景背景)
4. [特效](#4-特效)
5. [音频](#5-音频)
6. [资源规范汇总](#6-资源规范汇总)

---

## 1. 角色立绘

### 玩家角色

| 资源名 | 类型 | 尺寸 | 格式 | 状态 | 备注 |
|--------|------|------|------|------|------|
| `player_idle` | 精灵图序列 | 64×64 × 4帧 | PNG（透明） | ⬜ 待制作 | 待机动画 |
| `player_walk` | 精灵图序列 | 64×64 × 8帧 | PNG（透明） | ⬜ 待制作 | 四方向各2帧 |
| `player_attack_melee` | 精灵图序列 | 64×64 × 6帧 | PNG（透明） | ⬜ 待制作 | 近战攻击 |
| `player_attack_ranged` | 精灵图序列 | 64×64 × 6帧 | PNG（透明） | ⬜ 待制作 | 远程攻击 |
| `player_hurt` | 精灵图序列 | 64×64 × 2帧 | PNG（透明） | ⬜ 待制作 | 受伤闪烁 |
| `player_death` | 精灵图序列 | 64×64 × 8帧 | PNG（透明） | ⬜ 待制作 | 死亡动画 |

### 敌人角色

| 资源名 | 类型 | 尺寸 | 格式 | 状态 | 备注 |
|--------|------|------|------|------|------|
| `enemy_zombie_idle` | 精灵图序列 | 48×48 × 4帧 | PNG（透明） | ⬜ 待制作 | 僵尸待机 |
| `enemy_zombie_walk` | 精灵图序列 | 48×48 × 6帧 | PNG（透明） | ⬜ 待制作 | 僵尸行走 |
| `enemy_zombie_attack` | 精灵图序列 | 48×48 × 4帧 | PNG（透明） | ⬜ 待制作 | 僵尸攻击 |
| `enemy_mutant_idle` | 精灵图序列 | 64×64 × 4帧 | PNG（透明） | ⬜ 待制作 | 变异体待机 |
| `enemy_mutant_attack` | 精灵图序列 | 64×64 × 6帧 | PNG（透明） | ⬜ 待制作 | 变异体攻击 |
| `enemy_boss_final` | 精灵图序列 | 128×128 × 8帧 | PNG（透明） | ⬜ 待制作 | BOSS |

### NPC / 幸存者

| 资源名 | 类型 | 尺寸 | 格式 | 状态 | 备注 |
|--------|------|------|------|------|------|
| `npc_merchant` | 立绘 | 256×384 | PNG（透明） | ⬜ 待制作 | 商人 |
| `npc_doctor` | 立绘 | 256×384 | PNG（透明） | ⬜ 待制作 | 医生 |
| `survivor_portrait_01~06` | 头像 | 128×128 | PNG（透明） | ⬜ 待制作 | 6款幸存者头像 |

---

## 2. UI 元素

### 图标（技能 / 物品 / 状态）

| 资源名 | 类型 | 尺寸 | 格式 | 状态 | 备注 |
|--------|------|------|------|------|------|
| `icon_skill_*.png` | 技能图标 | 64×64 | PNG（透明） | ⬜ 待制作 | 至少 12 个 |
| `icon_item_*.png` | 物品图标 | 48×48 | PNG（透明） | ⬜ 待制作 | 至少 20 个 |
| `icon_status_*.png` | 状态图标（buff/debuff） | 32×32 | PNG（透明） | ⬜ 待制作 | 至少 8 个 |
| `icon_resource_*.png` | 资源图标（金币/钻石/食物等） | 32×32 | PNG（透明） | ⬜ 待制作 | 6 个 |

### 界面组件

| 资源名 | 类型 | 尺寸 | 格式 | 状态 | 备注 |
|--------|------|------|------|------|------|
| `ui_button_normal.svg` | 按钮背景（普通） | 矢量 | SVG | ⬜ 待制作 | 可缩放 |
| `ui_button_hover.svg` | 按钮背景（悬停） | 矢量 | SVG | ⬜ 待制作 | — |
| `ui_button_disabled.svg` | 按钮背景（禁用） | 矢量 | SVG | ⬜ 待制作 | — |
| `ui_panel_bg.png` | 面板背景 | 512×512 | PNG（9-Patch） | ⬜ 待制作 | 可拉伸面板 |
| `ui_hud_health_bar.png` | 生命值条 | 200×20 | PNG | ⬜ 待制作 | — |
| `ui_hud_sanity_bar.png` | 理智值条 | 200×20 | PNG | ⬜ 待制作 | — |
| `ui_hud_minimap_border.png` | 小地图边框 | 160×160 | PNG（透明） | ⬜ 待制作 | — |
| `ui_dialog_box.png` | 对话气泡 | 400×200 | PNG（9-Patch） | ⬜ 待制作 | — |
| `ui_tooltip.png` | 提示框 | 256×128 | PNG（9-Patch） | ⬜ 待制作 | — |
| `ui_badge_new.png` | NEW 角标 | 48×48 | PNG（透明） | ⬜ 待制作 | — |

### 文字 / 字体

| 资源名 | 类型 | 格式 | 状态 | 备注 |
|--------|------|------|------|------|
| `font_main.ttf` | 主字体 | TTF/WOFF2 | ⬜ 待制作 | 中文优先，支持英文 |
| `font_number.ttf` | 数字字体 | TTF | ⬜ 待制作 | 用于 HUD 数字显示 |

---

## 3. 场景背景

| 资源名 | 类型 | 尺寸 | 格式 | 状态 | 备注 |
|--------|------|------|------|------|------|
| `bg_base_camp.png` | 基地背景 | 1920×1080 | PNG/JPG | ⬜ 待制作 | 安全屋内部 |
| `bg_world_map.png` | 世界地图 | 2048×2048 | PNG（拼接） | ⬜ 待制作 | 可拼接瓦片 |
| `tile_grass.png` | 地面瓦片 | 64×64 | PNG | ⬜ 待制作 | — |
| `tile_road.png` | 道路瓦片 | 64×64 | PNG | ⬜ 待制作 | — |
| `tile_water.png` | 水域瓦片 | 64×64 | PNG（半透明） | ⬜ 待制作 | — |
| `tile_wall.png` | 墙壁瓦片 | 64×64 | PNG | ⬜ 待制作 | 可碰撞 |
| `tile_door.png` | 门瓦片 | 64×64 | PNG（透明） | ⬜ 待制作 | 可交互 |
| `prop_barrel.png` | 油桶道具 | 48×48 | PNG（透明） | ⬜ 待制作 | 可破坏 |
| `prop_crate.png` | 木箱道具 | 48×48 | PNG（透明） | ⬜ 待制作 | 可破坏 |

---

## 4. 特效

| 资源名 | 类型 | 尺寸 | 格式 | 状态 | 备注 |
|--------|------|------|------|------|------|
| `fx_hit_particle.png` | 受击粒子 | 16×16 | PNG（透明） | ⬜ 待制作 | 单帧，粒子系统复用 |
| `fx_blood_splash.png` | 血液飞溅 | 32×32 | PNG（透明） | ⬜ 待制作 | — |
| `fx_explosion.png` | 爆炸特效 | 128×128 × 8帧 | PNG（透明） | ⬜ 待制作 | 精灵图序列 |
| `fx_fire.png` | 火焰特效 | 64×64 × 8帧 | PNG（透明） | ⬜ 待制作 | 循环动画 |
| `fx_smoke.png` | 烟雾特效 | 64×64 × 6帧 | PNG（透明） | ⬜ 待制作 | — |
| `fx_heal.png` | 治疗特效 | 64×64 × 6帧 | PNG（透明） | ⬜ 待制作 | — |
| `fx_level_up.png` | 升级特效 | 128×128 × 12帧 | PNG（透明） | ⬜ 待制作 | — |
| `fx_damage_number.png` | 伤害数字（0-9） | 32×32 × 10帧 | PNG（透明） | ⬜ 待制作 | 数字精灵 |
| `fx_screen_shake_intensity.png` | 屏幕震动参数 | — | JSON | ⬜ 待制作 | 配置震动强度/时长 |

---

## 5. 音频

### 音效（SFX）

| 资源名 | 类型 | 格式 | 状态 | 备注 |
|--------|------|------|------|------|
| `sfx_player_attack_melee.wav` | 近战攻击 | WAV / MP3 | ⬜ 待制作 | 0.5s 以内 |
| `sfx_player_attack_ranged.wav` | 远程攻击 | WAV / MP3 | ⬜ 待制作 | — |
| `sfx_enemy_hit.wav` | 敌人受击 | WAV / MP3 | ⬜ 待制作 | — |
| `sfx_player_hurt.wav` | 玩家受伤 | WAV / MP3 | ⬜ 待制作 | — |
| `sfx_player_death.wav` | 玩家死亡 | WAV / MP3 | ⬜ 待制作 | 2s 以内 |
| `sfx_item_pickup.wav` | 拾取物品 | WAV / MP3 | ⬜ 待制作 | 短促 |
| `sfx_ui_button_click.wav` | 按钮点击 | WAV / MP3 | ⬜ 待制作 | UI 反馈 |
| `sfx_ui_notification.wav` | 通知提示 | WAV / MP3 | ⬜ 待制作 | — |
| `sfx_door_open.wav` | 开门 | WAV / MP3 | ⬜ 待制作 | — |
| `sfx_explosion.wav` | 爆炸 | WAV / MP3 | ⬜ 待制作 | — |

### 背景音乐（BGM）

| 资源名 | 类型 | 格式 | 状态 | 备注 |
|--------|------|------|------|------|
| `bgm_menu.mp3` | 主菜单 BGM | MP3（128kbps） | ⬜ 待制作 | 循环，60-90 BPM |
| `bgm_base_camp.mp3` | 基地 BGM | MP3（128kbps） | ⬜ 待制作 | 舒缓，循环 |
| `bgm_exploration.mp3` | 探索 BGM | MP3（128kbps） | ⬜ 待制作 | 中等节奏 |
| `bgm_combat.mp3` | 战斗 BGM | MP3（128kbps） | ⬜ 待制作 | 快节奏，循环 |
| `bgm_boss.mp3` | BOSS 战 BGM | MP3（192kbps） | ⬜ 待制作 | 高潮段落 |

> **音频规范**：所有 WAV 文件使用 44.1kHz / 16bit / 立体声；MP3 编码码率不低于 128kbps。

---

## 6. 资源规范汇总

### 通用规范

| 项目 | 规范 |
|------|------|
| 精灵图透明背景 | 必须使用 Alpha 通道（透明 PNG） |
| 瓦片尺寸 | 必须为 2 的幂次方（64×64 推荐） |
| 帧动画精灵图 | 横向排列，每帧等宽，附 `.json` 描述帧数据 |
| SVG 图标 | 纯矢量，不嵌入位图，视图框 24×24 或 48×48 |
| 音频采样率 | 44.1kHz / 16bit |
| 文件命名 | 小写 + 下划线分隔（`enemy_zombie_idle.png`） |

### 目录结构（建议）

```
assets/
├── characters/
│   ├── player/
│   ├── enemies/
│   └── npcs/
├── ui/
│   ├── icons/
│   ├── components/
│   └── fonts/
├── scenes/
│   ├── backgrounds/
│   └── tiles/
├── effects/
├── audio/
│   ├── sfx/
│   └── bgm/
└── data/          # 帧数据 JSON
    └── *.json
```

---

## 7. 已完成资源

以下占位精灵已由程序自动生成，位于 `assets/images/` 目录：

| 文件名 | 类型 | 说明 |
|--------|------|------|
| `player.png` | 角色 | 玩家角色占位图 |
| `zombie.png` | 角色 | 普通丧尸占位图 |
| `zombie_elite.png` | 角色 | 精英丧尸占位图 |
| `survivor.png` | 角色 | 幸存者占位图 |
| `supply_ammo.png` | 物品 | 弹药补给占位图 |
| `supply_food.png` | 物品 | 食物补给占位图 |
| `supply_material.png` | 物品 | 建材补给占位图 |
| `supply_parts.png` | 物品 | 零件补给占位图 |
| `supply_water.png` | 物品 | 水补给占位图 |
| `wall.png` | 场景 | 墙壁瓦片占位图 |
| `floor.png` | 场景 | 地板瓦片占位图 |
| `icon-192.png` | UI | PWA 小图标占位图 |
| `icon-512.png` | UI | PWA 大图标占位图 |

> 以上资源均为临时占位图，正式美术资源待后续阶段制作替换。

---

## 状态说明

| 标记 | 含义 |
|------|------|
| ✅ 已完成 | 资源已交付并集成 |
| 🔄 制作中 | 美术正在制作 |
| ⬜ 待制作 | 尚未开始 |
| ❌ 已废弃 | 不再需要 |
