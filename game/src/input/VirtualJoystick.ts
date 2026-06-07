import Phaser from "phaser";
import { makeCircleTexture } from "../art/pixelTexture";
import { EVENTS } from "../config";

const BASE_RADIUS = 56;
const THUMB_RADIUS = 28;
const BTN_RADIUS = 40;

/**
 * Joystick virtual flotante para móvil + botón de acción.
 * Vive en la UIScene (fijo a la cámara). Publica el vector de movimiento y los
 * toques de acción en el bus global. En desktop queda oculto salvo que se toque
 * la pantalla, así no molesta.
 */
export default class VirtualJoystick {
  private base: Phaser.GameObjects.Image;
  private thumb: Phaser.GameObjects.Image;
  private button: Phaser.GameObjects.Image;
  private attackBtn: Phaser.GameObjects.Image;
  private attackLabel: Phaser.GameObjects.Text;
  private pointerId: number | null = null;
  private origin = new Phaser.Math.Vector2();
  private vec = { x: 0, y: 0 };

  constructor(private readonly scene: Phaser.Scene, private readonly bus: Phaser.Events.EventEmitter) {
    makeCircleTexture(scene, "joy_base", BASE_RADIUS, "rgba(20,16,12,0.35)", "rgba(255,255,255,0.4)");
    makeCircleTexture(scene, "joy_thumb", THUMB_RADIUS, "rgba(240,210,75,0.6)", "rgba(255,255,255,0.7)");
    makeCircleTexture(scene, "joy_btn", BTN_RADIUS, "rgba(60,110,80,0.55)", "rgba(255,240,180,0.8)");
    makeCircleTexture(scene, "joy_btn_atk", BTN_RADIUS, "rgba(150,60,40,0.6)", "rgba(255,220,180,0.85)");

    this.base = scene.add.image(0, 0, "joy_base").setScrollFactor(0).setDepth(1000).setVisible(false);
    this.thumb = scene.add.image(0, 0, "joy_thumb").setScrollFactor(0).setDepth(1001).setVisible(false);

    // Botones fijos en la esquina inferior derecha: A (acción) y B (atacar)
    const { width, height } = scene.scale;
    const ax = width - BTN_RADIUS - 24;
    const ay = height - BTN_RADIUS - 24;
    const bx = ax - BTN_RADIUS * 2 - 14; // botón de ataque a la izquierda
    const by = ay - BTN_RADIUS - 6;

    this.button = scene.add
      .image(ax, ay, "joy_btn")
      .setScrollFactor(0)
      .setDepth(1000)
      .setInteractive({ useHandCursor: true });
    scene.add
      .text(ax, ay, "A", { fontFamily: "monospace", fontSize: "26px", color: "#fff3d8" })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1001);
    this.button.on("pointerdown", (p: Phaser.Input.Pointer) => {
      p.event.stopPropagation();
      this.bus.emit(EVENTS.ACTION);
    });

    this.attackBtn = scene.add
      .image(bx, by, "joy_btn_atk")
      .setScrollFactor(0)
      .setDepth(1000)
      .setInteractive({ useHandCursor: true });
    this.attackLabel = scene.add
      .text(bx, by, "B", { fontFamily: "monospace", fontSize: "26px", color: "#fff0e0" })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1001);
    this.attackBtn.on("pointerdown", (p: Phaser.Input.Pointer) => {
      p.event.stopPropagation();
      this.bus.emit(EVENTS.ATTACK);
    });

    // Reposicionar los botones si cambia el tamaño (rotar el teléfono)
    scene.scale.on("resize", (size: Phaser.Structs.Size) => {
      const nax = size.width - BTN_RADIUS - 24;
      const nay = size.height - BTN_RADIUS - 24;
      this.button.setPosition(nax, nay);
      const nbx = nax - BTN_RADIUS * 2 - 14;
      const nby = nay - BTN_RADIUS - 6;
      this.attackBtn.setPosition(nbx, nby);
      this.attackLabel.setPosition(nbx, nby);
    });

    scene.input.on("pointerdown", this.onDown, this);
    scene.input.on("pointermove", this.onMove, this);
    scene.input.on("pointerup", this.onUp, this);
    scene.input.on("pointerupoutside", this.onUp, this);
  }

  private onDown(p: Phaser.Input.Pointer): void {
    // Solo la mitad izquierda controla el joystick (la derecha es para el botón)
    if (this.pointerId !== null || p.x > this.scene.scale.width / 2) return;
    this.pointerId = p.id;
    this.origin.set(p.x, p.y);
    this.base.setPosition(p.x, p.y).setVisible(true);
    this.thumb.setPosition(p.x, p.y).setVisible(true);
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.pointerId) return;
    const dx = p.x - this.origin.x;
    const dy = p.y - this.origin.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, BASE_RADIUS);
    const angle = Math.atan2(dy, dx);
    const tx = this.origin.x + Math.cos(angle) * clamped;
    const ty = this.origin.y + Math.sin(angle) * clamped;
    this.thumb.setPosition(tx, ty);
    this.vec = { x: (Math.cos(angle) * clamped) / BASE_RADIUS, y: (Math.sin(angle) * clamped) / BASE_RADIUS };
    if (dist < 6) this.vec = { x: 0, y: 0 };
    this.bus.emit(EVENTS.JOYSTICK, this.vec);
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id !== this.pointerId) return;
    this.pointerId = null;
    this.vec = { x: 0, y: 0 };
    this.base.setVisible(false);
    this.thumb.setVisible(false);
    this.bus.emit(EVENTS.JOYSTICK, this.vec);
  }
}
