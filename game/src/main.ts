import Phaser from "phaser";
import { BACKGROUND_COLOR } from "./config";
import BootScene from "./scenes/BootScene";
import TitleScene from "./scenes/TitleScene";
import WorldScene from "./scenes/WorldScene";
import UIScene from "./scenes/UIScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-root",
  backgroundColor: BACKGROUND_COLOR,
  pixelArt: true, // filtrado NEAREST → pixel-art nítido
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 800,
    height: 600,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, TitleScene, WorldScene, UIScene],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);
