import Phaser from "phaser";
import type { DialogueLine } from "../types";
import { EVENTS, HERO_MAX_HP } from "../config";
import { TEX } from "./BootScene";
import VirtualJoystick from "../input/VirtualJoystick";

/**
 * Capa de interfaz superpuesta al mundo: caja de diálogo, objetivo de misión,
 * carteles temporales (toasts), pista de interacción y joystick táctil.
 * Escucha el bus global y no contiene lógica de juego.
 */
export default class UIScene extends Phaser.Scene {
  private dialoguePanel!: Phaser.GameObjects.Container;
  private speakerText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private advanceArrow!: Phaser.GameObjects.Text;
  private questText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private hearts: Phaser.GameObjects.Image[] = [];
  private bus!: Phaser.Events.EventEmitter;

  constructor() {
    super("UIScene");
  }

  create(): void {
    this.bus = this.game.events;
    const w = this.scale.width;
    const h = this.scale.height;

    this.createHearts();
    this.createQuestHud(w);
    this.createDialoguePanel(w, h);
    this.createHint(w, h);
    this.createToast(w, h);

    // Joystick + botón de acción táctil
    new VirtualJoystick(this, this.bus);

    // Suscripciones al bus
    this.bus.on(EVENTS.DIALOGUE_LINE, this.showLine, this);
    this.bus.on(EVENTS.DIALOGUE_END, this.hideDialogue, this);
    this.bus.on(EVENTS.QUEST_UPDATE, this.showQuest, this);
    this.bus.on(EVENTS.HINT, this.showHint, this);
    this.bus.on(EVENTS.TOAST, this.showToast, this);
    this.bus.on(EVENTS.HP_UPDATE, this.updateHp, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  private createHearts(): void {
    const size = 32;
    for (let i = 0; i < HERO_MAX_HP; i++) {
      const heart = this.add
        .image(20 + i * (size + 4), 22, TEX.heartFull)
        .setOrigin(0)
        .setScale(2)
        .setScrollFactor(0)
        .setDepth(900);
      this.hearts.push(heart);
    }
  }

  private updateHp(payload: { hp: number; maxHp: number }): void {
    for (let i = 0; i < this.hearts.length; i++) {
      this.hearts[i].setTexture(i < payload.hp ? TEX.heartFull : TEX.heartEmpty);
    }
  }

  private createQuestHud(w: number): void {
    this.questText = this.add
      .text(w / 2, 18, "", {
        fontFamily: "Georgia, serif",
        fontSize: "18px",
        color: "#f2e4c0",
        backgroundColor: "rgba(20,16,12,0.55)",
        padding: { x: 10, y: 6 },
        align: "center",
        wordWrap: { width: w * 0.8 },
      })
      .setOrigin(0.5, 0)
      .setDepth(900)
      .setVisible(false);
  }

  private createDialoguePanel(w: number, h: number): void {
    const panelW = w * 0.9;
    const panelH = h * 0.26;
    const x = (w - panelW) / 2;
    const y = h - panelH - 16;

    const bg = this.add.graphics();
    bg.fillStyle(0x1b1410, 0.92);
    bg.fillRoundedRect(0, 0, panelW, panelH, 12);
    bg.lineStyle(3, 0xc7a45a, 1);
    bg.strokeRoundedRect(0, 0, panelW, panelH, 12);

    this.speakerText = this.add.text(18, 12, "", {
      fontFamily: "Georgia, serif",
      fontSize: "20px",
      color: "#f2d24b",
      fontStyle: "bold",
    });

    this.bodyText = this.add.text(18, 44, "", {
      fontFamily: "Georgia, serif",
      fontSize: "19px",
      color: "#f3ead6",
      wordWrap: { width: panelW - 36 },
      lineSpacing: 4,
    });

    this.advanceArrow = this.add
      .text(panelW - 24, panelH - 28, "▼", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#c7a45a",
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: this.advanceArrow,
      alpha: 0.2,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    this.dialoguePanel = this.add
      .container(x, y, [bg, this.speakerText, this.bodyText, this.advanceArrow])
      .setDepth(950)
      .setVisible(false);
  }

  private createHint(w: number, h: number): void {
    this.hintText = this.add
      .text(w / 2, h - 150, "", {
        fontFamily: "Georgia, serif",
        fontSize: "16px",
        color: "#fff3d8",
        backgroundColor: "rgba(20,16,12,0.6)",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(900)
      .setVisible(false);
  }

  private createToast(w: number, h: number): void {
    this.toastText = this.add
      .text(w / 2, h * 0.32, "", {
        fontFamily: "Georgia, serif",
        fontSize: "24px",
        color: "#fff3a8",
        stroke: "#000000",
        strokeThickness: 4,
        align: "center",
        wordWrap: { width: w * 0.8 },
      })
      .setOrigin(0.5)
      .setDepth(960)
      .setAlpha(0);
  }

  private showLine(line: DialogueLine): void {
    this.speakerText.setText(line.speaker);
    this.bodyText.setText(line.text);
    this.dialoguePanel.setVisible(true);
    this.hintText.setVisible(false);
  }

  private hideDialogue(): void {
    this.dialoguePanel.setVisible(false);
  }

  private showQuest(text: string): void {
    if (!text) {
      this.questText.setVisible(false);
      return;
    }
    this.questText.setText(`✦ ${text}`).setVisible(true);
  }

  private showHint(text: string | null): void {
    if (!text) {
      this.hintText.setVisible(false);
      return;
    }
    this.hintText.setText(`[ E / A ]  ${text}`).setVisible(true);
  }

  private showToast(text: string): void {
    this.toastText.setText(text).setAlpha(0);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({
      targets: this.toastText,
      alpha: 1,
      duration: 300,
      hold: 1600,
      yoyo: true,
    });
  }

  private cleanup(): void {
    this.bus.off(EVENTS.DIALOGUE_LINE, this.showLine, this);
    this.bus.off(EVENTS.DIALOGUE_END, this.hideDialogue, this);
    this.bus.off(EVENTS.QUEST_UPDATE, this.showQuest, this);
    this.bus.off(EVENTS.HINT, this.showHint, this);
    this.bus.off(EVENTS.TOAST, this.showToast, this);
    this.bus.off(EVENTS.HP_UPDATE, this.updateHp, this);
  }
}
