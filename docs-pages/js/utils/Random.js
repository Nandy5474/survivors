/**
 * Random — 伪随机数工具
 * 基于 mulberry32 的可种子化 PRNG，支持概率权重抽取
 * @version 0.1.0
 */

/**
 * 32-bit Mulberry32 PRNG
 * @param {number} seed - 整数种子
 * @returns {function(): number} 返回 [0, 1) 浮点数的函数
 */
function mulberry32(seed) {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 生成随机种子
 * @returns {number}
 */
export function generateSeed() {
  return (Math.random() * 2147483647) | 0;
}

/**
 * 可种子化的随机数生成器
 */
export class SeededRandom {
  /**
   * @param {number} [seed] - 种子值，不传则自动生成
   */
  constructor(seed) {
    this.seed = seed ?? generateSeed();
    this._rng = mulberry32(this.seed);
  }

  /**
   * 重置种子
   * @param {number} seed
   */
  reseed(seed) {
    this.seed = seed;
    this._rng = mulberry32(seed);
  }

  /**
   * 生成 [0, 1) 浮点数
   * @returns {number}
   */
  next() {
    return this._rng();
  }

  /**
   * 生成 [min, max) 浮点数
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  range(min, max) {
    return min + this._rng() * (max - min);
  }

  /**
   * 生成 [min, max] 整数（含两端）
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  /**
   * 按权重随机抽取一个键
   * @param {Object<string, number>} weights - { key: weight }
   * @returns {string|null}
   */
  weightedPick(weights) {
    const entries = Object.entries(weights);
    if (entries.length === 0) return null;

    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = this._rng() * total;

    for (const [key, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return key;
    }

    return entries[entries.length - 1][0]; // 安全兜底
  }

  /**
   * 布尔值判断（p 概率返回 true）
   * @param {number} probability - 0~1
   * @returns {boolean}
   */
  chance(probability) {
    return this._rng() < probability;
  }

  /**
   * Fisher-Yates 洗牌（返回新数组）
   * @param {Array} arr
   * @returns {Array}
   */
  shuffle(arr) {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * 随机抽取数组中 N 个不重复元素
   * @param {Array} arr
   * @param {number} n
   * @returns {Array}
   */
  sample(arr, n) {
    return this.shuffle(arr).slice(0, Math.min(n, arr.length));
  }

  /**
   * 高斯分布近似 (Box-Muller)
   * @param {number} [mean=0]
   * @param {number} [stdDev=1]
   * @returns {number}
   */
  gaussian(mean = 0, stdDev = 1) {
    let u1 = 0, u2 = 0;
    while (u1 === 0) u1 = this._rng();
    while (u2 === 0) u2 = this._rng();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z * stdDev + mean;
  }

  /**
   * 将当前 RNG 状态序列化（用于存档）
   * @returns {object}
   */
  serialize() {
    return { seed: this.seed };
  }

  /**
   * 从序列化状态恢复
   * @param {object} data
   */
  deserialize(data) {
    if (data.seed != null) this.reseed(data.seed);
  }
}

/**
 * 无状态工具函数（使用 Math.random）
 */
export const Random = {
  /**
   * [min, max) 浮点数
   */
  range(min, max) {
    return Math.random() * (max - min) + min;
  },

  /**
   * [min, max] 整数
   */
  int(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * 概率判断
   */
  chance(probability) {
    return Math.random() < probability;
  },

  /**
   * 权重抽取
   */
  weightedPick(weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = Math.random() * total;
    for (const [key, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return key;
    }
    return entries[entries.length - 1]?.[0] ?? null;
  },

  /**
   * Fisher-Yates 洗牌
   */
  shuffle(arr) {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  },

  /**
   * 随机抽取 N 个
   */
  sample(arr, n) {
    return Random.shuffle(arr).slice(0, Math.min(n, arr.length));
  },

  /**
   * 从数组中随机取一个
   */
  pick(arr) {
    if (!arr || arr.length === 0) return undefined;
    return arr[Math.floor(Math.random() * arr.length)];
  },
};

export default Random;