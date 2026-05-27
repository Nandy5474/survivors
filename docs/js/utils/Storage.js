/**
 * Storage — 本地存储工具
 * 封装 IndexedDB（存档）和 LocalStorage（设置），提供统一接口
 * @version 0.2.0
 */

const DB_NAME = 'SurvivorsDB';
const DB_VERSION = 1;
const STORE_SAVES = 'saves';
const STORE_CONFIG = 'config';

// ---- IndexedDB 连接管理 ----

/** @type {IDBDatabase|null} */
let _db = null;

/** 最近一次连接时间戳，用于超时重连判断 */
let _dbLastOpen = 0;

/** 连接空闲超时（ms），超时后下次请求重新建连 */
const DB_IDLE_TIMEOUT = 30_000;

/**
 * 打开/建立/复用 IndexedDB 连接
 * 缓存连接实例，空闲超时自动重建，防止连接断开导致操作失败
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    // 连接存活且未超时，直接复用
    if (_db && (Date.now() - _dbLastOpen) < DB_IDLE_TIMEOUT) {
      return resolve(_db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_SAVES)) {
        db.createObjectStore(STORE_SAVES, { keyPath: 'slot' });
      }

      if (!db.objectStoreNames.contains(STORE_CONFIG)) {
        db.createObjectStore(STORE_CONFIG, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      _db = event.target.result;
      _dbLastOpen = Date.now();

      // 监听连接关闭（浏览器主动关闭、隐私模式、配额清理等）
      _db.onclose = () => {
        _db = null;
        console.warn('[Storage] DB connection closed unexpectedly');
      };

      // 监听版本变更（其他标签页升级了 DB 版本）
      _db.onversionchange = () => {
        _db.close();
        _db = null;
        console.warn('[Storage] DB version changed by another tab');
      };

      resolve(_db);
    };

    request.onerror = (event) => {
      _db = null;
      reject(event.target.error);
    };

    request.onblocked = () => {
      console.warn('[Storage] DB upgrade blocked; close other tabs and retry');
      reject(new Error('DB_UPGRADE_BLOCKED'));
    };
  });
}

/**
 * 封装的 IndexedDB 事务辅助
 * @param {string} storeName
 * @param {'readonly'|'readwrite'} mode
 * @param {(store: IDBObjectStore) => IDBRequest} operation
 * @returns {Promise<any>}
 */
async function exec(storeName, mode, operation) {
  const db = await openDB();

  // 确认目标 object store 存在（防止 DB 被外部清空后调用出错）
  if (!db.objectStoreNames.contains(storeName)) {
    throw new Error(`Object store "${storeName}" not found`);
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = operation(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);

      tx.oncomplete = () => { /* resolve already called on request.onsuccess */ };
      tx.onerror = (e) => {
        // 事务级错误兜底
        reject(e.target.error || new Error('Transaction failed: ' + storeName));
      };
      tx.onabort = () => {
        reject(new Error('Transaction aborted: ' + storeName));
      };
    } catch (err) {
      // 事务创建阶段异常（如 store 被 DBA 关闭后丢失）
      reject(err);
    }
  });
}

/**
 * IndexedDB 存档管理
 */
export const SaveStorage = {
  /**
   * 保存游戏存档
   * @param {number} slot - 存档槽位 0（自动存档）或 1~5
   * @param {object} saveData - 存档数据（必须可结构化克隆）
   * @returns {Promise<void>}
   */
  async save(slot, saveData) {
    const record = {
      slot,
      ...saveData,
      timestamp: Date.now(),
    };
    return exec(STORE_SAVES, 'readwrite', (store) => store.put(record));
  },

  /**
   * 加载指定槽位的存档
   * @param {number} slot
   * @returns {Promise<object|null>}
   */
  async load(slot) {
    const result = await exec(STORE_SAVES, 'readonly', (store) => store.get(slot));
    return result || null;
  },

  /**
   * 删除指定槽位的存档
   * @param {number} slot
   * @returns {Promise<void>}
   */
  async delete(slot) {
    return exec(STORE_SAVES, 'readwrite', (store) => store.delete(slot));
  },

  /**
   * 获取所有存档槽位信息（元数据）
   * @returns {Promise<Array<{slot: number, timestamp: number, gameTime: object|null, chapter: string|null}>>}
   */
  async listSlots() {
    const all = await exec(STORE_SAVES, 'readonly', (store) => store.getAll());
    if (!Array.isArray(all)) return [];
    return all.map(r => ({
      slot: r.slot,
      timestamp: r.timestamp,
      gameTime: r.gameTime || null,
      chapter: r.chapter || null,
    }));
  },

  /**
   * 检查是否有任何存档
   * @returns {Promise<boolean>}
   */
  async hasAnySave() {
    const count = await exec(STORE_SAVES, 'readonly', (store) => store.count());
    return count > 0;
  },

  /**
   * 自动存档（槽位 0）
   * @param {object} saveData
   * @returns {Promise<void>}
   */
  async autoSave(saveData) {
    return this.save(0, { ...saveData, isAutoSave: true });
  },

  /**
   * 加载自动存档
   * @returns {Promise<object|null>}
   */
  async loadAutoSave() {
    return this.load(0);
  },
};

/**
 * LocalStorage 配置管理（设置/选项）
 */
export const ConfigStorage = {
  /** 默认配置 */
  DEFAULTS: {
    musicVolume: 80,
    sfxVolume: 100,
    language: 'zh-CN',
    autoSave: true,
    showTutorial: true,
    cameraShake: true,
  },

  /**
   * 读取配置项
   * @param {string} key
   * @returns {*}
   */
  get(key) {
    try {
      const raw = localStorage.getItem(`survivors_cfg_${key}`);
      if (raw === null) {
        return this.DEFAULTS[key];
      }
      return JSON.parse(raw);
    } catch {
      return this.DEFAULTS[key];
    }
  },

  /**
   * 写入配置项
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    try {
      localStorage.setItem(`survivors_cfg_${key}`, JSON.stringify(value));
    } catch (err) {
      // QuotaExceededError 等存储异常
      if (err.name === 'QuotaExceededError') {
        console.warn('[Storage] Config write failed: localStorage quota exceeded');
      } else {
        console.warn('[Storage] Failed to write config:', err);
      }
    }
  },

  /**
   * 获取所有配置
   * @returns {object}
   */
  getAll() {
    const config = {};
    for (const key of Object.keys(this.DEFAULTS)) {
      config[key] = this.get(key);
    }
    return config;
  },

  /**
   * 批量写入配置
   * @param {object} kvPairs
   */
  setAll(kvPairs) {
    for (const [key, value] of Object.entries(kvPairs)) {
      this.set(key, value);
    }
  },

  /**
   * 重置为默认配置
   */
  reset() {
    for (const key of Object.keys(this.DEFAULTS)) {
      localStorage.removeItem(`survivors_cfg_${key}`);
    }
  },
};

export default { SaveStorage, ConfigStorage };