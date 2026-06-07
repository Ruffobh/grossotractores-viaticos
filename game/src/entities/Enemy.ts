import Phaser from "phaser";
import type { EnemyDef } from "../types";
import { RENDER_TILE, SCALE, ORC_HP, ORC_SPEED, ORC_AGGRO, KNOCKBACK } from "../config";

/**
 * Orco enemigo. IA simple: deambula tranquilo hasta que el héroe entra en su
 * rango de detección; entonces lo persigue. Tiene vida, parpadea al ser
 * golpeado y sale despedido por el retroceso.
 */
export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  hp = ORC_HP;

  private knockbackUntil = 0;
  private wanderUntil = 0;
  private wander = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene, def: EnemyDef) {
    const x = def.tx * RENDER_TILE + RENDER_TILE / 2;
    const y = def.ty * RENDER_TILE + RENDER_TILE / 2;
    super(scene, x, y, "orc_down_0");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(SCALE);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(9, 8);
    body.setOffset(3, 8);
    body.setCollideWorldBounds(true);
    this.setDepth(this.y);
  }

  get isAlive(): boolean {
    return this.hp > 0 && this.active;
  }

  /** IA por frame. `hero` aporta la posición objetivo. */
  think(heroX: number, heroY: number): void {
    if (!this.isAlive) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const now = this.scene.time.now;

    if (now < this.knockbackUntil) {
      this.setDepth(this.y);
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, heroX, heroY);
    let vx = 0;
    let vy = 0;

    if (dist < ORC_AGGRO * SCALE) {
      // Perseguir al héroe
      const angle = Math.atan2(heroY - this.y, heroX - this.x);
      vx = Math.cos(angle);
      vy = Math.sin(angle);
    } else {
      // Deambular: cambiar de rumbo cada tanto
      if (now > this.wanderUntil) {
        this.wanderUntil = now + Phaser.Math.Between(700, 1600);
        if (Math.random() < 0.4) {
          this.wander = { x: 0, y: 0 };
        } else {
          const a = Math.random() * Math.PI * 2;
          this.wander = { x: Math.cos(a) * 0.5, y: Math.sin(a) * 0.5 };
        }
      }
      vx = this.wander.x;
      vy = this.wander.y;
    }

    body.setVelocity(vx * ORC_SPEED * SCALE, vy * ORC_SPEED * SCALE);
    this.animate(vx, vy);
    this.setDepth(this.y);
  }

  private animate(vx: number, vy: number): void {
    if (Math.abs(vx) < 0.05 && Math.abs(vy) < 0.05) {
      this.anims.stop();
      this.setTexture("orc_down_0");
      return;
    }
    if (Math.abs(vx) > Math.abs(vy)) {
      this.setFlipX(vx < 0);
      this.anims.play("orc_walk_side", true);
    } else {
      this.setFlipX(false);
      this.anims.play(vy < 0 ? "orc_walk_up" : "orc_walk_down", true);
    }
  }

  /** Recibe daño. Devuelve true si murió con este golpe. */
  takeDamage(amount: number, srcX: number, srcY: number): boolean {
    if (!this.isAlive) return false;
    // i-frame: durante el retroceso no vuelve a recibir daño (evita multi-hit)
    if (this.scene.time.now < this.knockbackUntil) return false;
    this.hp -= amount;

    // Destello blanco
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => this.clearTint());

    // Retroceso
    const angle = Math.atan2(this.y - srcY, this.x - srcX);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(
      Math.cos(angle) * KNOCKBACK * SCALE,
      Math.sin(angle) * KNOCKBACK * SCALE
    );
    this.knockbackUntil = this.scene.time.now + 200;

    return this.hp <= 0;
  }
}
