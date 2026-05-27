/**
 * WorldMap — 多楼层世界地图管理器
 * 支持类银河城横版+俯视角混合架构
 * @version 0.1.0
 */

import { RoomType, TileType, TILE_SIZE } from './MapGenerator.js';

export const FloorConnectionType = Object.freeze({
  STAIRS: 'stairs',
  ELEVATOR: 'elevator',
  LADDER: 'ladder',
});

export default class WorldMap {
  /**
   * @param {string} name - 世界名称
   */
  constructor(name = '废土某处') {
    this.name = name;
    /** @type {Array<{id:string, name:string, mapData:import('./MapGenerator.js').MapData, order:number}>} */
    this.floors = [];
    this.currentFloorIndex = 0;
    /** @type {Array<{fromFloorId:string, toFloorId:string, type:string, fromPos:{x:number,y:number}, toPos:{x:number,y:number}}>} */
    this.connections = [];
  }

  /**
   * 添加楼层
   * @param {string} id
   * @param {string} name
   * @param {import('./MapGenerator.js').MapData} mapData
   * @param {number} [order]
   */
  addFloor(id, name, mapData, order) {
    this.floors.push({ id, name, mapData, order: order ?? this.floors.length });
    this.floors.sort((a, b) => a.order - b.order);
  }

  /**
   * 添加楼层连接（楼梯/电梯）
   * @param {string} fromFloorId
   * @param {string} toFloorId
   * @param {string} type
   * @param {{x:number,y:number}} fromPos - 源楼层世界坐标
   * @param {{x:number,y:number}} toPos - 目标楼层世界坐标
   */
  addConnection(fromFloorId, toFloorId, type, fromPos, toPos) {
    this.connections.push({ fromFloorId, toFloorId, type, fromPos, toPos });
  }

  /** @returns {{id:string,name:string,mapData:object,order:number}|null} */
  get currentFloor() {
    return this.floors[this.currentFloorIndex] || null;
  }

  /** @returns {import('./MapGenerator.js').MapData|null} */
  get currentMapData() {
    return this.currentFloor?.mapData || null;
  }

  get floorCount() { return this.floors.length; }

  /**
   * 按索引切换楼层
   * @param {number} index
   * @returns {boolean}
   */
  switchFloor(index) {
    if (index >= 0 && index < this.floors.length) {
      this.currentFloorIndex = index;
      return true;
    }
    return false;
  }

  /**
   * 按 ID 切换楼层
   * @param {string} id
   * @returns {boolean}
   */
  switchFloorById(id) {
    const idx = this.floors.findIndex(f => f.id === id);
    if (idx >= 0) {
      this.currentFloorIndex = idx;
      return true;
    }
    return false;
  }

  /**
   * 获取从指定楼层出发的连接
   * @param {string} floorId
   * @returns {Array}
   */
  getConnectionsFrom(floorId) {
    return this.connections.filter(c => c.fromFloorId === floorId);
  }
}
