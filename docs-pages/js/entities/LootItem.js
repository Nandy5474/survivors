/**
 * LootItem — 地图拾取物实体类
 * 散布在走廊/空房间中，玩家靠近自动拾取
 * @version 0.1.0
 */

/** 拾取物类型 */
export const LootType = Object.freeze({
  AMMO: 'ammo',
  MEDKIT: 'medkit',
  PARTS: 'parts',
  FOOD: 'food',
});

/** 拾取物外观配置 */
const LOOT_CONFIG = {
  [LootType.AMMO]:   { color: '#ffcc00', icon: '⇱', label: '弹药' },
  [LootType.MEDKIT]: { color: '#ff4444', icon: '+', label: '医疗包' },
  [LootType.PARTS]:  { color: '#aaaacc', icon: '⚙', label: '零件' },
  [LootType.FOOD]:   { color: '#ff8844', icon: '●', label: '食物' },
};

/** 拾取触发距离（像素） */
export const LOOT_PICKUP_DIST = 24;

export default class LootItem {
  /**
   * @param {number} x - 世界坐标 X
   * @param {number} y - 世界坐标 Y
   * @param {string} type - LootType
   * @param {number} amount - 数量
   */
  constructor(x, y, type, amount) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.amount = amount;
    this.collected = false;

    /** 拾取半径 */
    this.radius = 8;

    /** 浮动动画相位 */
    this._floatPhase = Math.random() * Math.PI * 2;
  }

  /** 获取外观配置 */
  get config() {
    return LOOT_CONFIG[this.type] || LOOT_CONFIG[LootType.PARTS];
  }

  /** 更新浮动动画 */
  update(dt) {
    this._floatPhase += dt * 3;
  }

  /** 浮动偏移 Y（用于渲染） */
  get floatOffsetY() {
    return Math.sin(this._floatPhase) * 3;
  }

  /** 检测玩家是否在拾取范围内 */
  isInPickupRange(playerX, playerY) {
    const dx = this.x - playerX;
    const dy = this.y - playerY;
    return Math.sqrt(dx * dx + dy * dy) <= LOOT_PICKUP_DIST;
  }

  /** 序列化 */
  serialize() {
    return {
      x: this.x, y: this.y,
      type: this.type, amount: this.amount,
      collected: this.collected,
    };
  }

  /** 反序列化 */
  deserialize(data) {
    this.x = data.x; this.y = data.y;
    this.type = data.type; this.amount = data.amount;
    this.collected = data.collected;
  }
}