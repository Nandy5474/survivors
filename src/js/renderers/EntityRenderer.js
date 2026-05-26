/**
 * EntityRenderer — 实体渲染器
 * 负责绘制玩家、丧尸、幸存者、物资图标
 * @version 0.1.0
 */

import { RoomType } from '../game/MapGenerator.js';

/** 玩家颜色 */
const PLAYER_COLOR = '#4a9eff';
const PLAYER_OUTLINE = '#1a5fcc';
const PLAYER_DIR_COLOR = '#80c0ff';

/** 丧尸颜色 */
const ZOMBIE_COLOR = '#cc3333';
const ZOMBIE_ELITE_COLOR = '#ff6600';
const ZOMBIE_OUTLINE = '#881111';

/** 幸存者颜色 */
const SURVIVOR_COLOR = '#33cc66';
const SURVIVOR_OUTLINE = '#118844';

/** 交互提示颜色 */
const INTERACT_COLOR = '#ffd700';

export default class EntityRenderer {
  constructor() {
    /** 是否显示实体名称标签 */
    this.showLabels = true;

    /** 是否显示血条 */
    this.showHealthBars = true;
  }

  /**
   * 渲染玩家
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../entities/Player.js').default} player
   * @param {number} screenX - 屏幕坐标 X
   * @param {number} screenY - 屏幕坐标 Y
   */
  renderPlayer(ctx, player, screenX, screenY) {
    const { radius, facing } = player;

    ctx.save();
    ctx.translate(screenX, screenY);

    // 身体（圆形）
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = PLAYER_COLOR;
    ctx.fill();
    ctx.strokeStyle = PLAYER_OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 朝向指示器（小三角）
    ctx.rotate(facing);
    ctx.fillStyle = PLAYER_DIR_COLOR;
    ctx.beginPath();
    ctx.moveTo(radius + 4, 0);
    ctx.lineTo(radius - 2, -6);
    ctx.lineTo(radius - 2, 6);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // 名称标签
    if (this.showLabels) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('玩家', screenX, screenY - radius - 8);
    }

    // 交互提示：在物资房中显示 "E 收集"
    if (player.currentRoom && player.currentRoom.hasSupplies) {
      this._drawInteractPrompt(ctx, screenX, screenY, radius, 'E 收集');
    }
  }

  /**
   * 渲染丧尸
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../entities/Zombie.js').default} zombie
   * @param {number} screenX
   * @param {number} screenY
   */
  renderZombie(ctx, zombie, screenX, screenY) {
    if (!zombie.isAlive) return;

    const { radius, facing, isElite } = zombie;
    const bodyColor = isElite ? ZOMBIE_ELITE_COLOR : ZOMBIE_COLOR;

    ctx.save();
    ctx.translate(screenX, screenY);

    // 身体
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.strokeStyle = ZOMBIE_OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 朝向
    ctx.rotate(facing);
    ctx.fillStyle = 'rgba(255,200,200,0.7)';
    ctx.beginPath();
    ctx.moveTo(radius + 3, 0);
    ctx.lineTo(radius - 1, -5);
    ctx.lineTo(radius - 1, 5);
    ctx.closePath();
    ctx.fill();

    // 精英标记
    if (isElite) {
      ctx.fillStyle = '#fff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', 0, -radius - 4);
    }

    ctx.restore();

    // 血条
    if (this.showHealthBars) {
      this._drawHealthBar(ctx, screenX, screenY, radius, zombie.hp, zombie.maxHp, isElite ? '#ff6600' : '#cc3333');
    }

    // 状态标签
    if (this.showLabels) {
      const label = zombie.state === 'chase' ? '⚠ 追击' : '丧尸';
      ctx.fillStyle = isElite ? '#ff6600' : '#cc5555';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, screenX, screenY - radius - 8);
    }
  }

  /**
   * 渲染幸存者
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../entities/Survivor.js').default} survivor
   * @param {number} screenX
   * @param {number} screenY
   */
  renderSurvivor(ctx, survivor, screenX, screenY) {
    const { radius } = survivor;

    ctx.save();
    ctx.translate(screenX, screenY);

    // 身体
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = SURVIVOR_COLOR;
    ctx.fill();
    ctx.strokeStyle = SURVIVOR_OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 朝向（面朝玩家方向，用简单标记）
    ctx.fillStyle = 'rgba(200,255,200,0.7)';
    ctx.beginPath();
    ctx.arc(radius - 2, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 名称
    if (this.showLabels) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(survivor.name, screenX, screenY - radius - 8);
    }

    // 交互提示
    if (!survivor.interacted) {
      this._drawInteractPrompt(ctx, screenX, screenY, radius, 'E 对话');
    }
  }

  /**
   * 渲染物资图标（在房间内）
   * @param {CanvasRenderingContext2D} ctx
   */
  renderSupplyIcon(ctx, screenX, screenY) {
    ctx.save();
    ctx.fillStyle = '#ffd700';
    ctx.strokeStyle = '#b8960a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY - 10);
    ctx.lineTo(screenX + 7, screenY);
    ctx.lineTo(screenX, screenY + 10);
    ctx.lineTo(screenX - 7, screenY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // ---- 私有辅助 ----

  _drawHealthBar(ctx, screenX, screenY, radius, hp, maxHp, color) {
    const barW = radius * 2;
    const barH = 4;
    const bx = screenX - barW / 2;
    const by = screenY - radius - 12;

    // 背景
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(bx, by, barW, barH);

    // 当前血量
    const ratio = Math.max(0, hp / maxHp);
    ctx.fillStyle = color;
    ctx.fillRect(bx, by, barW * ratio, barH);
  }

  _drawInteractPrompt(ctx, screenX, screenY, radius, text) {
    const py = screenY - radius - 24;

    ctx.fillStyle = INTERACT_COLOR;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, screenX, py);
  }
}