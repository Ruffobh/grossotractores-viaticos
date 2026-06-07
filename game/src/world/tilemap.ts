import Phaser from "phaser";
import type { MapData } from "../types";
import { RENDER_TILE, SCALE } from "../config";

export interface BuiltMap {
  /** Cuerpos estáticos contra los que colisiona el héroe. */
  colliders: Phaser.Physics.Arcade.StaticGroup;
  widthPx: number;
  heightPx: number;
}

/**
 * Dibuja el mapa colocando una imagen por tile (sin spritesheet/atlas) y crea
 * cuerpos de colisión estáticos para los tiles sólidos. La decoración usa
 * y-sorting (depth = base del tile) para que el héroe pueda pasar por detrás
 * de árboles y casas.
 */
export function buildMap(
  scene: Phaser.Scene,
  map: MapData,
  collidable: Set<string>
): BuiltMap {
  const colliders = scene.physics.add.staticGroup();
  const rows = map.ground.length;
  const cols = map.ground[0].length;

  const addCollider = (cx: number, cy: number, tex: string): void => {
    const img = colliders.create(cx, cy, tex) as Phaser.Physics.Arcade.Sprite;
    img.setScale(SCALE);
    img.refreshBody();
  };

  // Capa de suelo (pasto, camino, agua, piedra)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const tex = map.ground[y][x];
      const wx = x * RENDER_TILE;
      const wy = y * RENDER_TILE;
      const cx = wx + RENDER_TILE / 2;
      const cy = wy + RENDER_TILE / 2;
      if (collidable.has(tex)) {
        addCollider(cx, cy, tex);
      } else {
        scene.add.image(wx, wy, tex).setOrigin(0).setScale(SCALE).setDepth(0);
      }
    }
  }

  // Capa de decoración (árboles, casas, arbustos, rocas)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const tex = map.decor[y][x];
      if (!tex) continue;
      const wx = x * RENDER_TILE;
      const wy = y * RENDER_TILE;
      const cx = wx + RENDER_TILE / 2;
      const cy = wy + RENDER_TILE / 2;
      const depth = wy + RENDER_TILE; // y-sort por la base del tile
      if (collidable.has(tex)) {
        const img = colliders.create(cx, cy, tex) as Phaser.Physics.Arcade.Sprite;
        img.setScale(SCALE);
        img.refreshBody();
        img.setDepth(depth);
      } else {
        scene.add.image(wx, wy, tex).setOrigin(0).setScale(SCALE).setDepth(depth);
      }
    }
  }

  return {
    colliders,
    widthPx: cols * RENDER_TILE,
    heightPx: rows * RENDER_TILE,
  };
}
