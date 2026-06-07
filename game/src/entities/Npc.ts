import Phaser from "phaser";
import type { Direction, NpcDef } from "../types";
import { RENDER_TILE, SCALE } from "../config";

/**
 * Un NPC estático con el que el héroe puede hablar. La lógica de proximidad e
 * interacción vive en WorldScene; esta clase solo es el sprite + sus datos.
 */
export default class Npc extends Phaser.Physics.Arcade.Sprite {
  readonly npcId: string;
  readonly npcName: string;

  constructor(scene: Phaser.Scene, def: NpcDef) {
    const x = def.tx * RENDER_TILE + RENDER_TILE / 2;
    const y = def.ty * RENDER_TILE + RENDER_TILE / 2;
    const facing: Direction = def.facing ?? "down";
    const frame =
      facing === "up"
        ? `${def.texture}_up_0`
        : facing === "left" || facing === "right"
          ? `${def.texture}_side_0`
          : `${def.texture}_down_0`;

    super(scene, x, y, frame);
    this.npcId = def.id;
    this.npcName = def.name;

    scene.add.existing(this);
    scene.physics.add.existing(this, true); // cuerpo estático
    this.setScale(SCALE);
    this.setDepth(y);
    if (facing === "left") this.setFlipX(true);

    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(10, 8);
    body.setOffset(3, 8);
    body.updateFromGameObject();
  }
}
