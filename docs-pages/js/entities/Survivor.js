/**
 * Survivor — 幸存者实体类
 * 可交互 NPC，支持对话和招募接口
 * @version 0.1.0
 */

export const SurvivorRole = Object.freeze({
  CIVILIAN: 'civilian',
  SOLDIER: 'soldier',
  DOCTOR: 'doctor',
  ENGINEER: 'engineer',
  SCAVENGER: 'scavenger',
});

export default class Survivor {
  /**
   * @param {number} x - 世界坐标 X
   * @param {number} y - 世界坐标 Y
   * @param {object} [opts]
   */
  constructor(x, y, opts = {}) {
    this.x = x;
    this.y = y;

    /** 半径 */
    this.radius = 16;

    /** 角色 */
    this.role = opts.role || SurvivorRole.CIVILIAN;

    /** 名称 */
    this.name = opts.name || '未知幸存者';

    /** 对话文本（数组，逐条显示） */
    this.dialogue = opts.dialogue || ['...'];

    /** 当前对话索引 */
    this._dialogueIndex = 0;

    /** 是否可招募 */
    this.canRecruit = opts.canRecruit || false;

    /** 招募条件 */
    this.recruitCondition = opts.recruitCondition || null;

    /** 是否已交互 */
    this.interacted = false;

    /** 是否被招募 */
    this.recruited = false;

    /** 特殊技能 */
    this.skill = opts.skill || null;

    /** 朝向 */
    this.facing = 0;
  }

  /**
   * 获取下一条对话
   * @returns {{ text: string, isLast: boolean }|null}
   */
  getNextDialogue() {
    this.interacted = true;
    if (this._dialogueIndex >= this.dialogue.length) return null;

    const text = this.dialogue[this._dialogueIndex];
    this._dialogueIndex++;
    const isLast = this._dialogueIndex >= this.dialogue.length;

    return { text, isLast };
  }

  /** 重置对话索引 */
  resetDialogue() {
    this._dialogueIndex = 0;
  }

  /**
   * 距离检测
   */
  distanceTo(px, py) {
    const dx = this.x - px;
    const dy = this.y - py;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ---- 存档接口 ----

  serialize() {
    return {
      x: this.x, y: this.y,
      role: this.role, name: this.name,
      interacted: this.interacted,
      recruited: this.recruited,
      dialogueIndex: this._dialogueIndex,
    };
  }

  deserialize(data) {
    this.interacted = data.interacted;
    this.recruited = data.recruited;
    this._dialogueIndex = data.dialogueIndex || 0;
  }
}