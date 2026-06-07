import Phaser from "phaser";
import { GAME_TITLE, DEDICATION } from "../gift";

/**
 * Pantalla de inicio: título del juego, dedicatoria del regalo y prompt para
 * empezar. Al tocar/presionar arranca el mundo y lanza la UI.
 */
export default class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#1b1714");

    // Adorno: un degradé sutil con rectángulos
    this.add.rectangle(width / 2, height / 2, width, height, 0x241d18).setAlpha(0.6);

    this.add
      .text(width / 2, height * 0.32, GAME_TITLE, {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: `${Math.round(Math.min(width, height) * 0.07)}px`,
        color: "#f2d24b",
        align: "center",
        stroke: "#000000",
        strokeThickness: 4,
        wordWrap: { width: width * 0.8 },
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.5, DEDICATION, {
        fontFamily: "Georgia, serif",
        fontSize: `${Math.round(Math.min(width, height) * 0.035)}px`,
        color: "#e8d9c0",
        fontStyle: "italic",
        align: "center",
        wordWrap: { width: width * 0.75 },
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(width / 2, height * 0.74, "▶  Tocá o presioná una tecla para comenzar", {
        fontFamily: "Georgia, serif",
        fontSize: `${Math.round(Math.min(width, height) * 0.03)}px`,
        color: "#cbb894",
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: prompt,
      alpha: 0.25,
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    const start = (): void => {
      this.scene.start("WorldScene");
      this.scene.launch("UIScene");
    };
    this.input.once("pointerdown", start);
    this.input.keyboard?.once("keydown", start);
  }
}
