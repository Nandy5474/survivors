/**
 * BaseSystem — 基地管理类
 * 管理基地等级、设施建设、幸存者分配、资源消耗与产出
 * @version 0.1.0
 */

import EventBus, { GameEvents } from '../game/EventBus.js';

/** 设施类型 */
export const BuildingType = Object.freeze({
  WORKBENCH: 'workbench',
  MEDICAL_STATION: 'medical_station',
  WAREHOUSE: 'warehouse',
  WATCHTOWER: 'watchtower',
  WALL: 'wall',
});

/** 设施定义 */
export const BUILDING_DEFS = {
  [BuildingType.WORKBENCH]: {
    id: BuildingType.WORKBENCH,
    name: '工作台',
    icon: '🔧',
    desc: '制作和修理武器、工具',
    maxLevel: 3,
    buildCost: (level) => ({ wood: 5 * level, stone: 3 * level, metal: 2 * level }),
    buildTime: (level) => 1 + level, // 天数
    effects: (level) => ({
      desc: ['无', '可制作基础武器', '可制作高级武器', '可制作所有装备'][level],
      craftingSpeed: 0.5 + level * 0.25,
    }),
  },
  [BuildingType.MEDICAL_STATION]: {
    id: BuildingType.MEDICAL_STATION,
    name: '医疗站',
    icon: '🏥',
    desc: '治疗伤员、研发药物',
    maxLevel: 3,
    buildCost: (level) => ({ wood: 3 * level, stone: 4 * level, metal: 2 * level }),
    buildTime: (level) => 1 + level,
    effects: (level) => ({
      desc: ['无', '每日缓慢恢复生命', '可制作绷带', '可制作急救包和解毒剂'][level],
      dailyHeal: level * 5,
    }),
  },
  [BuildingType.WAREHOUSE]: {
    id: BuildingType.WAREHOUSE,
    name: '仓库',
    icon: '🏗️',
    desc: '增加背包容量和物资存储上限',
    maxLevel: 3,
    buildCost: (level) => ({ wood: 8 * level, stone: 6 * level, metal: 1 * level }),
    buildTime: (level) => 2 + level,
    effects: (level) => ({
      desc: ['无', '+10 背包容量', '+20 背包容量', '+30 背包容量'][level],
      inventoryBonus: level * 10,
    }),
  },
  [BuildingType.WATCHTOWER]: {
    id: BuildingType.WATCHTOWER,
    name: '瞭望塔',
    icon: '🗼',
    desc: '提前预警丧尸进攻，提升防御力',
    maxLevel: 3,
    buildCost: (level) => ({ wood: 6 * level, stone: 10 * level, metal: 4 * level }),
    buildTime: (level) => 2 + level,
    effects: (level) => ({
      desc: ['无', '防御 +5，提前 1 天预警', '防御 +10，提前 2 天预警', '防御 +15，提前 3 天预警'][level],
      defenseBonus: level * 5,
      earlyWarning: level,
    }),
  },
  [BuildingType.WALL]: {
    id: BuildingType.WALL,
    name: '围墙',
    icon: '🧱',
    desc: '阻挡丧尸入侵，减少损害',
    maxLevel: 5,
    buildCost: (level) => ({ wood: 2 * level, stone: 8 * level, metal: 3 * level }),
    buildTime: (level) => 1 + level,
    effects: (level) => ({
      desc: ['无', '防御 +3', '防御 +6', '防御 +10', '防御 +15', '防御 +20'][level],
      defenseBonus: level * 3,
    }),
  },
};

/** 幸存者岗位 */
export const SurvivorJob = Object.freeze({
  GUARD: 'guard',
  SCAVENGE: 'scavenge',
  BUILD: 'build',
  IDLE: 'idle',
});

export const SURVIVOR_JOB_LABELS = {
  [SurvivorJob.GUARD]: '守卫',
  [SurvivorJob.SCAVENGE]: '采集',
  [SurvivorJob.BUILD]: '建设',
  [SurvivorJob.IDLE]: '待命',
};

/** 基地等级配置 */
export const BASE_LEVEL_CONFIG = {
  1: { maxHp: 100,  maxSurvivors: 3,  buildSlots: 2, dailyFoodCost: 2, dailyWaterCost: 2 },
  2: { maxHp: 150,  maxSurvivors: 5,  buildSlots: 3, dailyFoodCost: 4, dailyWaterCost: 3 },
  3: { maxHp: 200,  maxSurvivors: 8,  buildSlots: 4, dailyFoodCost: 6, dailyWaterCost: 5 },
  4: { maxHp: 300,  maxSurvivors: 12, buildSlots: 5, dailyFoodCost: 9, dailyWaterCost: 7 },
  5: { maxHp: 500,  maxSurvivors: 20, buildSlots: 6, dailyFoodCost: 14, dailyWaterCost: 10 },
};

/** 幸存者岗位产出/消耗 */
export const JOB_EFFECTS = {
  [SurvivorJob.GUARD]:    { dailyDefense: 5 },
  [SurvivorJob.SCAVENGE]: { dailyFood: 2, dailyWater: 1, dailyParts: 1 },
  [SurvivorJob.BUILD]:    { buildSpeed: 1 },
  [SurvivorJob.IDLE]:     {},
};

/** 默认基地 */
const DEFAULT_BASE = {
  level: 1,
  hp: 100,
  maxHp: 100,
  defense: 0,
  buildings: [],
  survivors: [],   // { name, job, efficiency }
  nextZombieAttackDay: -1, // -1 = 无预警
};

/** 基地等级配置 */
const BASE_LEVEL_CONFIG = {
  1: { maxHp: 100,  maxSurvivors: 3,  buildSlots: 2, dailyFoodCost: 2, dailyWaterCost: 2 },
  2: { maxHp: 150,  maxSurvivors: 5,  buildSlots: 3, dailyFoodCost: 4, dailyWaterCost: 3 },
  3: { maxHp: 200,  maxSurvivors: 8,  buildSlots: 4, dailyFoodCost: 6, dailyWaterCost: 5 },
  4: { maxHp: 300,  maxSurvivors: 12, buildSlots: 5, dailyFoodCost: 9, dailyWaterCost: 7 },
  5: { maxHp: 500,  maxSurvivors: 20, buildSlots: 6, dailyFoodCost: 14, dailyWaterCost: 10 },
};

/** 幸存者岗位产出/消耗 */
const JOB_EFFECTS = {
  [SurvivorJob.GUARD]:    { dailyDefense: 5 },
  [SurvivorJob.SCAVENGE]: { dailyFood: 2, dailyWater: 1, dailyParts: 1 },
  [SurvivorJob.BUILD]:    { buildSpeed: 1 },
  [SurvivorJob.IDLE]:     {},
};

export default class BaseSystem {
  constructor() {
    /** @type {object} */
    this._base = JSON.parse(JSON.stringify(DEFAULT_BASE));

    /** @type {Function[]} */
    this._listeners = [];

    /** 正在建设中的项目 [{ buildingId, startDay, finishDay }] */
    this._constructionQueue = [];
  }

  // ========== 基础属性 ==========

  get level() { return this._base.level; }
  get hp() { return this._base.hp; }
  get maxHp() { return this._base.maxHp; }
  get defense() { return this._base.defense; }

  get buildings() { return this._base.buildings; }
  get survivors() { return this._base.survivors; }
  get nextZombieAttackDay() { return this._base.nextZombieAttackDay; }

  get levelConfig() {
    return BASE_LEVEL_CONFIG[this._base.level] || BASE_LEVEL_CONFIG[1];
  }

  get maxSurvivors() { return this.levelConfig.maxSurvivors; }
  get buildSlots() { return this.levelConfig.buildSlots; }
  get usedBuildSlots() { return this._base.buildings.length + this._constructionQueue.length; }
  get canBuild() { return this.usedBuildSlots < this.buildSlots; }

  // ========== 设施 ==========

  /**
   * 获取指定设施的等级
   * @param {string} buildingId
   * @returns {number} 0 = 未建造
   */
  getBuildingLevel(buildingId) {
    const b = this._base.buildings.find(b => b.id === buildingId);
    return b ? b.level : 0;
  }

  /**
   * 开始建设
   * @param {string} buildingId
   * @param {object} resources - 当前可用资源 { wood, stone, metal }
   * @param {number} currentDay
   * @returns {{ success: boolean, reason?: string, cost?: object }}
   */
  startBuild(buildingId, resources, currentDay) {
    const currentLevel = this.getBuildingLevel(buildingId);
    const def = BUILDING_DEFS[buildingId];
    if (!def) return { success: false, reason: '未知设施' };
    if (currentLevel >= def.maxLevel) return { success: false, reason: '已达最高等级' };
    if (!this.canBuild) return { success: false, reason: '建筑槽位已满' };

    const nextLevel = currentLevel + 1;
    const cost = def.buildCost(nextLevel);
    const days = def.buildTime(nextLevel);

    // 检查资源
    if (resources.wood < cost.wood || resources.stone < cost.stone || resources.metal < cost.metal) {
      return {
        success: false,
        reason: `资源不足：需要木材 ${cost.wood} 石材 ${cost.stone} 金属 ${cost.metal}`,
        cost,
      };
    }

    this._constructionQueue.push({
      buildingId,
      level: nextLevel,
      startDay: currentDay,
      finishDay: currentDay + days,
    });

    this._notifyListeners();

    EventBus.emit(GameEvents.BUILDING_CONSTRUCTED, {
      buildingId,
      level: nextLevel,
      finishDay: currentDay + days,
    });

    return { success: true, cost, finishDay: currentDay + days };
  }

  /**
   * 检查并完成到期的建设项目
   * @param {number} currentDay
   * @returns {Array<{buildingId: string, level: number}>} 本日完成的建筑
   */
  checkBuildCompletion(currentDay) {
    const completed = [];
    this._constructionQueue = this._constructionQueue.filter(proj => {
      if (proj.finishDay <= currentDay) {
        const existing = this._base.buildings.find(b => b.id === proj.buildingId);
        if (existing) {
          existing.level = proj.level;
        } else {
          this._base.buildings.push({ id: proj.buildingId, level: proj.level });
        }
        completed.push({ buildingId: proj.buildingId, level: proj.level });
        return false;
      }
      return true;
    });

    if (completed.length > 0) {
      this._recalculateDefense();
      this._notifyListeners();
    }

    return completed;
  }

  /**
   * 升级基地
   * @param {object} resources - 当前可用资源
   * @returns {{ success: boolean, reason?: string }}
   */
  upgradeBase(resources) {
    const nextLevel = this._base.level + 1;
    const config = BASE_LEVEL_CONFIG[nextLevel];
    if (!config) return { success: false, reason: '已达最高等级' };

    const cost = { wood: 20 * nextLevel, stone: 15 * nextLevel, metal: 10 * nextLevel };
    if (resources.wood < cost.wood || resources.stone < cost.stone || resources.metal < cost.metal) {
      return { success: false, reason: `资源不足`, cost };
    }

    this._base.level = nextLevel;
    this._base.maxHp = config.maxHp;
    this._base.hp = Math.min(this._base.hp, config.maxHp);
    this._notifyListeners();

    EventBus.emit(GameEvents.BUILDING_UPGRADED, { type: 'base', level: nextLevel });
    return { success: true, cost };
  }

  // ========== 幸存者 ==========

  /**
   * 添加幸存者
   * @param {string} name
   * @returns {boolean}
   */
  addSurvivor(name) {
    if (this._base.survivors.length >= this.maxSurvivors) return false;
    this._base.survivors.push({ name, job: SurvivorJob.IDLE, efficiency: 1.0 });
    this._notifyListeners();
    return true;
  }

  /**
   * 移除幸存者
   * @param {number} index
   * @returns {boolean}
   */
  removeSurvivor(index) {
    if (index < 0 || index >= this._base.survivors.length) return false;
    this._base.survivors.splice(index, 1);
    this._notifyListeners();
    return true;
  }

  /**
   * 分配幸存者岗位
   * @param {number} index
   * @param {string} job - SurvivorJob
   * @returns {boolean}
   */
  assignJob(index, job) {
    if (index < 0 || index >= this._base.survivors.length) return false;
    if (!Object.values(SurvivorJob).includes(job)) return false;
    this._base.survivors[index].job = job;
    this._notifyListeners();
    return true;
  }

  // ========== 每日结算 ==========

  /**
   * 每日结算：消耗 + 产出
   * @param {object} stateManager
   * @returns {{ consumption: object, production: object, defenseChange: number }}
   */
  dailyTick(stateManager) {
    const cfg = this.levelConfig;
    const resources = {
      wood: stateManager.get('globalResources.materials.wood') || 0,
      stone: stateManager.get('globalResources.materials.stone') || 0,
      metal: stateManager.get('globalResources.materials.metal') || 0,
      food: stateManager.get('globalResources.food') || 0,
      water: stateManager.get('globalResources.water') || 0,
      parts: stateManager.get('globalResources.parts') || 0,
    };

    // 消耗
    const consumption = {
      food: cfg.dailyFoodCost + this._base.survivors.length * 1,
      water: cfg.dailyWaterCost + this._base.survivors.length * 1,
    };

    // 产出（由幸存者岗位决定）
    const production = { food: 0, water: 0, parts: 0, defense: 0, buildSpeed: 0 };
    for (const s of this._base.survivors) {
      const effects = JOB_EFFECTS[s.job] || {};
      for (const [k, v] of Object.entries(effects)) {
        if (production[k] !== undefined) production[k] += v * s.efficiency;
      }
    }

    // 医疗站每日治疗
    const medLevel = this.getBuildingLevel(BuildingType.MEDICAL_STATION);
    if (medLevel > 0) {
      const healAmount = medLevel * 5;
      const hp = stateManager.get('player.hp') || 0;
      const maxHp = stateManager.get('player.maxHp') || 100;
      stateManager.set('player.hp', Math.min(hp + healAmount, maxHp));
      production.heal = healAmount;
    }

    // 计算净变化
    const netFood = Math.max(0, production.food - consumption.food);
    const finalFood = Math.max(0, resources.food + production.food - consumption.food);
    const finalWater = Math.max(0, resources.water + production.water - consumption.water);
    const finalParts = resources.parts + production.parts;

    stateManager.set('globalResources.food', finalFood);
    stateManager.set('globalResources.water', finalWater);
    stateManager.set('globalResources.parts', finalParts);

    // 饥饿检查
    if (finalFood <= 0 && this._base.survivors.length > 0) {
      // 基地 HP 减少
      const damage = this._base.survivors.length * 5;
      this._base.hp = Math.max(0, this._base.hp - damage);
      EventBus.emit(GameEvents.UI_NOTIFICATION, {
        type: 'warning',
        message: `食物耗尽！基地受到 ${damage} 点损害`,
      });
    }

    // 水耗尽惩罚
    if (finalWater <= 0 && this._base.survivors.length > 0) {
      const sanity = stateManager.get('player.sanity') || 0;
      stateManager.set('player.sanity', Math.max(0, sanity - 10));
    }

    this._notifyListeners();

    return { consumption, production: netFood > 0 ? { ...production, food: netFood } : production };
  }

  /**
   * 处理丧尸攻击
   * @returns {{ survived: boolean, damage: number, message: string }}
   */
  processZombieAttack() {
    const attackPower = 20 + Math.floor(Math.random() * 30);
    const damage = Math.max(0, attackPower - this._base.defense);
    this._base.hp = Math.max(0, this._base.hp - damage);

    const survived = this._base.hp > 0;
    const message = survived
      ? `丧尸来袭！基地受到 ${damage} 点伤害（防御减免了 ${this._base.defense} 点）。当前 HP: ${this._base.hp}`
      : `基地被摧毁...游戏结束`;

    this._base.nextZombieAttackDay = -1;
    this._notifyListeners();

    if (!survived) {
      EventBus.emit(GameEvents.GAME_OVER, { reason: 'base_destroyed' });
    }

    return { survived, damage, message };
  }

  /**
   * 随机触发丧尸攻击事件
   * @param {number} currentDay
   * @returns {boolean} 是否触发了攻击
   */
  maybeTriggerZombieAttack(currentDay) {
    if (currentDay < 3) return false; // 前 2 天安全

    const watchtowerLevel = this.getBuildingLevel(BuildingType.WATCHTOWER);
    const baseChance = 0.15; // 每天 15% 几率
    const warningReduction = watchtowerLevel * 0.05;
    const chance = Math.max(0.02, baseChance - warningReduction);

    if (Math.random() < chance) {
      this._base.nextZombieAttackDay = currentDay;
      EventBus.emit(GameEvents.ZOMBIE_ATTACK, { day: currentDay });
      return true;
    }
    return false;
  }

  // ========== 辅助 ==========

  _recalculateDefense() {
    let def = 0;
    for (const b of this._base.buildings) {
      const defn = BUILDING_DEFS[b.id];
      if (defn) {
        const fx = defn.effects(b.level);
        def += fx.defenseBonus || 0;
      }
    }
    // 守卫加成
    for (const s of this._base.survivors) {
      if (s.job === SurvivorJob.GUARD) def += 5 * s.efficiency;
    }
    this._base.defense = def;
  }

  // ========== 序列化 ==========

  serialize() {
    return {
      base: JSON.parse(JSON.stringify(this._base)),
      constructionQueue: JSON.parse(JSON.stringify(this._constructionQueue)),
    };
  }

  deserialize(data) {
    this._base = JSON.parse(JSON.stringify(data.base));
    this._constructionQueue = JSON.parse(JSON.stringify(data.constructionQueue || []));
  }

  // ========== 监听 ==========

  /** @param {Function} fn */
  onChanged(fn) {
    this._listeners.push(fn);
  }

  _notifyListeners() {
    for (const fn of this._listeners) {
      try { fn(this); } catch {}
    }
  }
}