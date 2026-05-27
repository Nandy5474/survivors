/**
 * InventorySystem — 背包/物品管理类
 * 支持物品分类、堆叠、容量限制、增删查改
 * @version 0.1.0
 */

/** 物品类别枚举 */
export const ItemCategory = Object.freeze({
  WEAPON: 'weapon',
  AMMO: 'ammo',
  MEDICAL: 'medical',
  FOOD: 'food',
  MATERIALS: 'materials',
  PARTS: 'parts',
});

/** 物品类别中文标签 */
export const ITEM_CATEGORY_LABELS = {
  [ItemCategory.WEAPON]: '武器',
  [ItemCategory.AMMO]: '弹药',
  [ItemCategory.MEDICAL]: '医疗',
  [ItemCategory.FOOD]: '食物',
  [ItemCategory.MATERIALS]: '建材',
  [ItemCategory.PARTS]: '零件',
};

/** 物品类别图标 */
export const ITEM_CATEGORY_ICONS = {
  [ItemCategory.WEAPON]: '🔫',
  [ItemCategory.AMMO]: '📦',
  [ItemCategory.MEDICAL]: '💊',
  [ItemCategory.FOOD]: '🍖',
  [ItemCategory.MATERIALS]: '🧱',
  [ItemCategory.PARTS]: '⚙️',
};

/** 物品定义模板（ID → 配置） */
export const ITEM_DEFS = {
  // ---------- 武器 ----------
  pipe_wrench:        { id: 'pipe_wrench',       category: ItemCategory.WEAPON,    name: '水管扳手',   icon: '🔧', desc: '基础近战武器，攻击力一般',          stackable: false },
  baseball_bat:       { id: 'baseball_bat',      category: ItemCategory.WEAPON,    name: '棒球棍',     icon: '🏏', desc: '坚固的近战武器，攻击力中等',          stackable: false },
  pistol:             { id: 'pistol',            category: ItemCategory.WEAPON,    name: '手枪',       icon: '🔫', desc: '轻型枪械，需要弹药',                  stackable: false },

  // ---------- 弹药 ----------
  bullets_9mm:        { id: 'bullets_9mm',       category: ItemCategory.AMMO,      name: '9mm子弹',    icon: '📦', desc: '手枪弹药',                          stackable: true,  maxStack: 50 },
  shotgun_shells:     { id: 'shotgun_shells',    category: ItemCategory.AMMO,      name: '霰弹',       icon: '💣', desc: '霰弹枪弹药',                        stackable: true,  maxStack: 20 },

  // ---------- 医疗 ----------
  bandage:            { id: 'bandage',           category: ItemCategory.MEDICAL,   name: '绷带',       icon: '🩹', desc: '恢复 20 点生命值',                  stackable: true,  maxStack: 10 },
  first_aid_kit:      { id: 'first_aid_kit',     category: ItemCategory.MEDICAL,   name: '急救包',     icon: '🏥', desc: '恢复 50 点生命值',                  stackable: true,  maxStack: 5 },
  antidote:           { id: 'antidote',          category: ItemCategory.MEDICAL,   name: '解毒剂',     icon: '🧪', desc: '解除中毒状态',                      stackable: true,  maxStack: 3 },

  // ---------- 食物 ----------
  canned_food:        { id: 'canned_food',       category: ItemCategory.FOOD,      name: '罐头食品',   icon: '🥫', desc: '基础食物，恢复少量精力',            stackable: true,  maxStack: 20 },
  water_bottle:       { id: 'water_bottle',      category: ItemCategory.FOOD,      name: '瓶装水',     icon: '💧', desc: '解渴，恢复少量精力',                stackable: true,  maxStack: 20 },
  mre:                { id: 'mre',              category: ItemCategory.FOOD,      name: '军用口粮',   icon: '📦', desc: '高质量食物，恢复中量精力',            stackable: true,  maxStack: 10 },

  // ---------- 建材 ----------
  wood_plank:         { id: 'wood_plank',        category: ItemCategory.MATERIALS, name: '木板',       icon: '🪵', desc: '基础建材，用于建设和修复',            stackable: true,  maxStack: 30 },
  stone_block:        { id: 'stone_block',       category: ItemCategory.MATERIALS, name: '石块',       icon: '🪨', desc: '坚固建材，用于防御工事',              stackable: true,  maxStack: 30 },
  metal_scrap:        { id: 'metal_scrap',       category: ItemCategory.MATERIALS, name: '废金属',     icon: '🔩', desc: '机械零件材料，用于高级建设',            stackable: true,  maxStack: 20 },

  // ---------- 零件 ----------
  electronic_parts:   { id: 'electronic_parts',  category: ItemCategory.PARTS,     name: '电子零件',   icon: '🔌', desc: '用于制作电子设备和高级工具',          stackable: true,  maxStack: 15 },
  mechanical_parts:   { id: 'mechanical_parts',  category: ItemCategory.PARTS,     name: '机械零件',   icon: '⚙️', desc: '用于修复机械和建设设施',              stackable: true,  maxStack: 15 },
};

/** 默认背包容量 */
const DEFAULT_CAPACITY = 30;

export default class InventorySystem {
  /**
   * @param {number} [capacity=30] 背包容量上限（物品格数）
   */
  constructor(capacity = DEFAULT_CAPACITY) {
    /** @type {number} */
    this.capacity = capacity;

    /**
     * 物品槽位数组：{ itemId, quantity }
     * @type {Array<{itemId: string, quantity: number}>}
     */
    this.slots = [];

    /** @type {Function[]} 变更监听回调 */
    this._listeners = [];
  }

  // ========== 查询 ==========

  /** 当前物品格数 */
  get slotCount() {
    return this.slots.length;
  }

  /** 是否已满 */
  get isFull() {
    return this.slots.length >= this.capacity;
  }

  /** 剩余容量 */
  get remainingSlots() {
    return Math.max(0, this.capacity - this.slots.length);
  }

  /**
   * 查找物品槽位索引
   * @param {string} itemId
   * @returns {number} 索引，未找到返回 -1
   */
  findSlotIndex(itemId) {
    return this.slots.findIndex(s => s.itemId === itemId);
  }

  /**
   * 获取物品数量
   * @param {string} itemId
   * @returns {number}
   */
  getQuantity(itemId) {
    const idx = this.findSlotIndex(itemId);
    return idx >= 0 ? this.slots[idx].quantity : 0;
  }

  /**
   * 获取所有物品（展开后的列表，带完整定义）
   * @returns {Array<{itemId: string, quantity: number, def: object}>}
   */
  getAllItems() {
    return this.slots.map(s => ({
      itemId: s.itemId,
      quantity: s.quantity,
      def: ITEM_DEFS[s.itemId] || null,
    }));
  }

  /**
   * 按分类获取物品
   * @param {string} category - ItemCategory
   * @returns {Array<{itemId: string, quantity: number, def: object}>}
   */
  getItemsByCategory(category) {
    return this.slots
      .filter(s => {
        const def = ITEM_DEFS[s.itemId];
        return def && def.category === category;
      })
      .map(s => ({
        itemId: s.itemId,
        quantity: s.quantity,
        def: ITEM_DEFS[s.itemId],
      }));
  }

  // ========== 增删 ==========

  /**
   * 添加物品
   * @param {string} itemId - ITEM_DEFS 中定义的 ID
   * @param {number} [qty=1] - 数量
   * @returns {{ success: boolean, added: number, overflow: number, reason?: string }}
   */
  addItem(itemId, qty = 1) {
    const def = ITEM_DEFS[itemId];
    if (!def) {
      return { success: false, added: 0, overflow: qty, reason: `未知物品: ${itemId}` };
    }

    let remaining = qty;
    let actualAdded = 0;

    // 可堆叠：先尝试合并到已有槽位
    if (def.stackable) {
      const existIdx = this.findSlotIndex(itemId);
      if (existIdx >= 0) {
        const maxStack = def.maxStack || 999;
        const space = maxStack - this.slots[existIdx].quantity;
        const toAdd = Math.min(remaining, space);
        this.slots[existIdx].quantity += toAdd;
        remaining -= toAdd;
        actualAdded += toAdd;
      }

      // 剩余 → 开新槽位
      while (remaining > 0 && !this.isFull) {
        const maxStack = def.maxStack || 999;
        const addNow = Math.min(remaining, maxStack);
        this.slots.push({ itemId, quantity: addNow });
        remaining -= addNow;
        actualAdded += addNow;
      }
    } else {
      // 不可堆叠：每个占一个槽位
      for (let i = 0; i < remaining; i++) {
        if (this.isFull) break;
        this.slots.push({ itemId, quantity: 1 });
        remaining--;
        actualAdded++;
      }
    }

    this._notifyListeners();

    return {
      success: actualAdded > 0,
      added: actualAdded,
      overflow: remaining,
      reason: remaining > 0 ? `背包已满，${remaining} 个物品无法装入` : undefined,
    };
  }

  /**
   * 移除物品
   * @param {string} itemId
   * @param {number} [qty=1] - 数量（-1 = 移除全部）
   * @returns {{ success: boolean, removed: number }}
   */
  removeItem(itemId, qty = 1) {
    if (qty === -1) {
      const idx = this.findSlotIndex(itemId);
      if (idx >= 0) {
        const count = this.slots[idx].quantity;
        this.slots.splice(idx, 1);
        this._notifyListeners();
        return { success: true, removed: count };
      }
      return { success: false, removed: 0 };
    }

    let remaining = qty;
    let removed = 0;

    // 从后往前找，支持跨多槽位移除（若物品被拆分）
    for (let i = this.slots.length - 1; i >= 0 && remaining > 0; i--) {
      if (this.slots[i].itemId === itemId) {
        const take = Math.min(this.slots[i].quantity, remaining);
        this.slots[i].quantity -= take;
        remaining -= take;
        removed += take;
        if (this.slots[i].quantity <= 0) {
          this.slots.splice(i, 1);
        }
      }
    }

    if (removed > 0) {
      this._notifyListeners();
    }

    return { success: removed > 0, removed };
  }

  /**
   * 检查是否有指定物品（至少指定数量）
   * @param {string} itemId
   * @param {number} [minQty=1]
   * @returns {boolean}
   */
  hasItem(itemId, minQty = 1) {
    return this.getQuantity(itemId) >= minQty;
  }

  // ========== 分类摘要 ==========

  /**
   * 按分类统计物品总数
   * @returns {{ [category: string]: { count: number, items: Array } }}
   */
  getCategorySummary() {
    const summary = {};
    for (const cat of Object.values(ItemCategory)) {
      summary[cat] = { count: 0, items: [] };
    }
    for (const slot of this.slots) {
      const def = ITEM_DEFS[slot.itemId];
      if (!def) continue;
      summary[def.category].count += slot.quantity;
      summary[def.category].items.push({
        itemId: slot.itemId,
        quantity: slot.quantity,
        def,
      });
    }
    return summary;
  }

  // ========== 全局资源同步 ==========

  /**
   * 将物品转存到全局资源状态（探索归来时调用）
   * @param {object} stateManager - StateManager 实例
   */
  depositToGlobalResources(stateManager) {
    for (const slot of this.slots) {
      const def = ITEM_DEFS[slot.itemId];
      if (!def) continue;

      let path = null;
      switch (def.category) {
        case ItemCategory.FOOD:
          path = 'globalResources.food';
          break;
        case ItemCategory.AMMO:
          path = 'globalResources.ammo';
          break;
        case ItemCategory.MATERIALS:
          if (slot.itemId === 'wood_plank') path = 'globalResources.materials.wood';
          if (slot.itemId === 'stone_block') path = 'globalResources.materials.stone';
          if (slot.itemId === 'metal_scrap') path = 'globalResources.materials.metal';
          break;
        case ItemCategory.PARTS:
          path = 'globalResources.parts';
          break;
        case ItemCategory.MEDICAL:
          // 药品归入通用医疗资源，不存入 globalResources
          break;
        default:
          break;
      }

      if (path) {
        const current = stateManager.get(path) || 0;
        stateManager.set(path, current + slot.quantity);
      }
    }
  }

  /**
   * 从全局资源提取到背包（出发探索前调用）
   * @param {object} stateManager - StateManager 实例
   * @param {{ food?: number, ammo?: number, parts?: number }} amounts
   */
  withdrawFromGlobalResources(stateManager, amounts = {}) {
    const results = [];
    const mapping = {
      food: { path: 'globalResources.food', itemId: 'canned_food' },
      ammo: { path: 'globalResources.ammo', itemId: 'bullets_9mm' },
      parts: { path: 'globalResources.parts', itemId: 'mechanical_parts' },
    };

    for (const [key, info] of Object.entries(mapping)) {
      const amount = amounts[key] || 0;
      if (amount <= 0) continue;

      const available = stateManager.get(info.path) || 0;
      const take = Math.min(amount, available);
      if (take > 0) {
        stateManager.set(info.path, available - take);
        const res = this.addItem(info.itemId, take);
        results.push({ key, itemId: info.itemId, added: res.added });
      }
    }
    return results;
  }

  // ========== 序列化 ==========

  serialize() {
    return {
      capacity: this.capacity,
      slots: this.slots.map(s => ({ ...s })),
    };
  }

  deserialize(data) {
    this.capacity = data.capacity || DEFAULT_CAPACITY;
    this.slots = (data.slots || []).map(s => ({ itemId: s.itemId, quantity: s.quantity }));
  }

  // ========== 内部 ==========

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