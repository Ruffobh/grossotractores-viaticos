import Phaser from "phaser";
import { makePixelTexture, makePixelTextures } from "../art/pixelTexture";
import * as S from "../art/sprites";

/**
 * Keys de textura usadas en todo el juego. El resto del código solo referencia
 * estas keys; cuando se migre a arte CC0, solo cambia cómo se registran acá.
 */
export const TEX = {
  // Suelo
  grass: "tile_grass",
  grassFlower: "tile_grass_flower",
  path: "tile_path",
  water: "tile_water",
  stone: "tile_stone",
  // Decoración / colisión
  tree: "decor_tree",
  bush: "decor_bush",
  rock: "decor_rock",
  roofL: "house_roof_l",
  roofR: "house_roof_r",
  wall: "house_wall",
  door: "house_door",
  // Objeto
  relic: "item_relic",
  // Combate
  slash: "slash",
  heartFull: "heart_full",
  heartEmpty: "heart_empty",
  // Personajes (prefijos; los frames son `${prefix}_${dir}_${n}`)
  hero: "hero",
  elder: "elder",
  villager: "villager",
  orc: "orc",
} as const;

/**
 * Genera todas las texturas pixel-art por código y arma las animaciones.
 * Corre una sola vez al inicio; luego pasa a TitleScene.
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    this.buildTiles();
    this.buildCharacters();
    this.buildAnimations();
    this.scene.start("TitleScene");
  }

  private buildTiles(): void {
    makePixelTextures(this, {
      [TEX.grass]: S.TILE_GRASS,
      [TEX.grassFlower]: S.TILE_GRASS_FLOWER,
      [TEX.path]: S.TILE_PATH,
      [TEX.water]: S.TILE_WATER,
      [TEX.stone]: S.TILE_STONE,
      [TEX.tree]: S.DECOR_TREE,
      [TEX.bush]: S.DECOR_BUSH,
      [TEX.rock]: S.DECOR_ROCK,
      [TEX.roofL]: S.HOUSE_ROOF_L,
      [TEX.roofR]: S.HOUSE_ROOF_R,
      [TEX.wall]: S.HOUSE_WALL,
      [TEX.door]: S.HOUSE_DOOR,
      [TEX.relic]: S.ITEM_RELIC,
      [TEX.slash]: S.SLASH,
      [TEX.heartFull]: S.HEART_FULL,
      [TEX.heartEmpty]: S.HEART_EMPTY,
    });
  }

  private buildCharacters(): void {
    const chars: Record<string, S.CharColors> = {
      [TEX.hero]: S.HERO_COLORS,
      [TEX.elder]: S.ELDER_COLORS,
      [TEX.villager]: S.VILLAGER_COLORS,
      [TEX.orc]: S.ORC_COLORS,
    };
    for (const [prefix, colors] of Object.entries(chars)) {
      const frames = S.buildCharacterFrames(colors);
      for (const [name, grid] of Object.entries(frames)) {
        makePixelTexture(this, `${prefix}_${name}`, grid);
      }
    }
  }

  private buildAnimations(): void {
    // "left" reutiliza los frames "side" espejados con flipX en la entidad,
    // así que solo definimos down / up / side por personaje.
    for (const prefix of [TEX.hero, TEX.elder, TEX.villager, TEX.orc]) {
      const dirs = ["down", "up", "side"];
      for (const dir of dirs) {
        this.anims.create({
          key: `${prefix}_walk_${dir}`,
          frames: [
            { key: `${prefix}_${dir}_0` },
            { key: `${prefix}_${dir}_1` },
          ],
          frameRate: 6,
          repeat: -1,
        });
      }
    }
  }
}
