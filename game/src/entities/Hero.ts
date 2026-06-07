import Phaser from "phaser";
import type { Direction } from "../types";
import {
  HERO_SPEED,
  SCALE,
  HERO_MAX_HP,
  HERO_IFRAMES,
  KNOCKBACK,
  EVENTS,
} from "../config";

/**
 * El héroe controlable. Recibe un vector de input (combinación de teclado y
 * joystick) y se mueve, anima y orienta según la dirección dominante.
 * Maneja su propia vida, invulnerabilidad y retroceso al recibir daño.
 */
export default class Hero extends Phaser.Physics.Arcade.Sprite {
  facing: Direction = "down";
  hp = HERO_MAX_HP;
  readonly maxHp = HERO_MAX_HP;

  private invulnerableUntil = 0;
  private knockbackUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "hero_down_0");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(SCALE);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(8, 6);
    body.setOffset(4, 9);
    this.setDepth(this.y);
  }

  /**
   * Aplica el movimiento a partir de un vector (-1..1 en cada eje).
   * Si `locked` es true (p. ej. durante un diálogo) se queda quieto.
   */
  drive(vec: { x: number; y: number }, locked: boolean): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    // Durante el retroceso, la física manda: no pisamos la velocidad.
    if (this.scene.time.now < this.knockbackUntil) {
      this.setDepth(this.y);
      return;
    }

    if (locked) {
      body.setVelocity(0, 0);
      this.playIdle();
      this.setDepth(this.y);
      return;
    }

    let { x, y } = vec;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }

    body.setVelocity(x * HERO_SPEED * SCALE, y * HERO_SPEED * SCALE);

    if (len < 0.15) {
      this.playIdle();
    } else {
      if (Math.abs(x) > Math.abs(y)) {
        this.facing = x < 0 ? "left" : "right";
        this.setFlipX(x < 0);
        this.anims.play("hero_walk_side", true);
      } else {
        this.facing = y < 0 ? "up" : "down";
        this.setFlipX(false);
        this.anims.play(y < 0 ? "hero_walk_up" : "hero_walk_down", true);
      }
    }

    this.setDepth(this.y);
  }

  get invulnerable(): boolean {
    return this.scene.time.now < this.invulnerableUntil;
  }

  /**
   * Recibe daño desde una fuente. Devuelve true si el héroe murió con este golpe.
   * Ignora el daño si está invulnerable.
   */
  takeDamage(amount: number, srcX: number, srcY: number): boolean {
    if (this.invulnerable || this.hp <= 0) return false;

    this.hp = Math.max(0, this.hp - amount);
    this.scene.game.events.emit(EVENTS.HP_UPDATE, {
      hp: this.hp,
      maxHp: this.maxHp,
    });

    const now = this.scene.time.now;
    this.invulnerableUntil = now + HERO_IFRAMES;
    this.knockbackUntil = now + 220;

    const angle = Math.atan2(this.y - srcY, this.x - srcX);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(
      Math.cos(angle) * KNOCKBACK * SCALE,
      Math.sin(angle) * KNOCKBACK * SCALE
    );

    this.blink();
    return this.hp <= 0;
  }

  /** Restaura la vida (drop de corazón). */
  heal(amount: number): void {
    if (this.hp <= 0) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.scene.game.events.emit(EVENTS.HP_UPDATE, {
      hp: this.hp,
      maxHp: this.maxHp,
    });
  }

  /** Reaparición tras desmayarse: vida llena y reset de estado. */
  revive(x: number, y: number): void {
    this.hp = this.maxHp;
    this.setPosition(x, y);
    this.invulnerableUntil = 0;
    this.knockbackUntil = 0;
    this.setAlpha(1);
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.scene.game.events.emit(EVENTS.HP_UPDATE, {
      hp: this.hp,
      maxHp: this.maxHp,
    });
  }

  private blink(): void {
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 110,
      yoyo: true,
      repeat: 3,
      onComplete: () => this.setAlpha(1),
    });
  }

  private playIdle(): void {
    this.anims.stop();
    switch (this.facing) {
      case "up":
        this.setTexture("hero_up_0").setFlipX(false);
        break;
      case "left":
        this.setTexture("hero_side_0").setFlipX(true);
        break;
      case "right":
        this.setTexture("hero_side_0").setFlipX(false);
        break;
      default:
        this.setTexture("hero_down_0").setFlipX(false);
    }
  }
}
