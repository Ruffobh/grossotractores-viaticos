import Phaser from "phaser";
import Hero from "../entities/Hero";
import Npc from "../entities/Npc";
import KeyboardInput from "../input/Keyboard";
import DialogueManager from "../dialogue/DialogueManager";
import { getDialogue } from "../dialogue/dialogues";
import QuestManager from "../quests/QuestManager";
import { buildMap } from "../world/tilemap";
import { villageMap, COLLIDABLE } from "../world/maps/villageMap";
import { EVENTS, INTERACT_RANGE, RENDER_TILE, SCALE } from "../config";
import { VICTORY_NOTE } from "../gift";

/**
 * Escena principal: arma el mundo, el héroe, los NPCs y la misión, y orquesta
 * input, diálogos y colisiones. Se comunica con la UIScene por el bus global
 * (this.game.events).
 */
export default class WorldScene extends Phaser.Scene {
  private hero!: Hero;
  private npcs: Npc[] = [];
  private relic?: Phaser.Physics.Arcade.Image;
  private keyboard!: KeyboardInput;
  private dialogue!: DialogueManager;
  private quest!: QuestManager;
  private bus!: Phaser.Events.EventEmitter;

  private joystickVec = { x: 0, y: 0 };
  private inputLocked = false;
  private nearNpc: Npc | null = null;

  constructor() {
    super("WorldScene");
  }

  create(): void {
    this.bus = this.game.events;
    this.npcs = [];
    this.nearNpc = null;
    this.inputLocked = false;
    this.joystickVec = { x: 0, y: 0 };

    const built = buildMap(this, villageMap, COLLIDABLE);

    // Héroe en el spawn
    const spawn = villageMap.spawn;
    this.hero = new Hero(
      this,
      spawn.tx * RENDER_TILE + RENDER_TILE / 2,
      spawn.ty * RENDER_TILE + RENDER_TILE / 2
    );
    this.physics.add.collider(this.hero, built.colliders);

    // NPCs
    for (const def of villageMap.npcs) {
      const npc = new Npc(this, def);
      this.npcs.push(npc);
      this.physics.add.collider(this.hero, npc);
    }

    // Objeto: la reliquia
    const relicDef = villageMap.items.find((i) => i.id === "relic");
    if (relicDef) {
      this.relic = this.physics.add.image(
        relicDef.tx * RENDER_TILE + RENDER_TILE / 2,
        relicDef.ty * RENDER_TILE + RENDER_TILE / 2,
        relicDef.texture
      );
      this.relic.setScale(SCALE).setDepth(this.relic.y);
      // Flotación suave para que llame la atención
      this.tweens.add({
        targets: this.relic,
        y: this.relic.y - 6,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
      this.physics.add.overlap(this.hero, this.relic, () => this.collectRelic());
    }

    // Cámara
    this.cameras.main.setBounds(0, 0, built.widthPx, built.heightPx);
    this.cameras.main.startFollow(this.hero, true, 0.12, 0.12);
    this.cameras.main.setRoundPixels(true);

    // Input y sistemas
    this.keyboard = new KeyboardInput(this);
    this.dialogue = new DialogueManager(this.bus);
    this.quest = new QuestManager(this.bus);

    // Bus de eventos
    this.bus.on(EVENTS.JOYSTICK, this.onJoystick, this);
    this.bus.on(EVENTS.ACTION, this.onAction, this);
    this.bus.on(EVENTS.INPUT_LOCK, this.onInputLock, this);
    this.bus.on(EVENTS.DIALOGUE_END, this.onDialogueEnd, this);

    // Limpieza de listeners al cerrar la escena
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    // Objetivo inicial vacío
    this.bus.emit(EVENTS.QUEST_UPDATE, "");
  }

  update(): void {
    // Acción por teclado (el joystick la emite por evento)
    if (this.keyboard.actionJustPressed()) this.onAction();

    // Vector combinado teclado + joystick
    const kb = this.keyboard.vector();
    const vec = {
      x: kb.x + this.joystickVec.x,
      y: kb.y + this.joystickVec.y,
    };
    this.hero.drive(vec, this.inputLocked);

    this.updateNearestNpc();
  }

  private updateNearestNpc(): void {
    if (this.inputLocked) {
      this.setNearNpc(null);
      return;
    }
    const range = INTERACT_RANGE * SCALE;
    let best: Npc | null = null;
    let bestDist = range;
    for (const npc of this.npcs) {
      const d = Phaser.Math.Distance.Between(this.hero.x, this.hero.y, npc.x, npc.y);
      if (d < bestDist) {
        best = npc;
        bestDist = d;
      }
    }
    this.setNearNpc(best);
  }

  private setNearNpc(npc: Npc | null): void {
    if (npc === this.nearNpc) return;
    this.nearNpc = npc;
    this.bus.emit(EVENTS.HINT, npc ? `Hablar con ${npc.npcName}` : null);
  }

  private onAction(): void {
    if (this.dialogue.active) {
      this.dialogue.advance();
    } else if (this.nearNpc) {
      const node = getDialogue(this.nearNpc.npcId, this.quest.state);
      this.bus.emit(EVENTS.HINT, null);
      this.dialogue.start(node);
    }
  }

  private onJoystick(v: { x: number; y: number }): void {
    this.joystickVec = v;
  }

  private onInputLock(locked: boolean): void {
    this.inputLocked = locked;
  }

  private onDialogueEnd(payload: { onEnd?: string }): void {
    const wasComplete = this.quest.isComplete;
    this.quest.handleDialogueHook(payload.onEnd);
    if (this.quest.isComplete && !wasComplete && VICTORY_NOTE) {
      this.bus.emit(EVENTS.TOAST, VICTORY_NOTE);
    }
  }

  private collectRelic(): void {
    if (!this.relic) return;
    this.quest.pickUpRelic();
    this.relic.destroy();
    this.relic = undefined;
  }

  private cleanup(): void {
    this.bus.off(EVENTS.JOYSTICK, this.onJoystick, this);
    this.bus.off(EVENTS.ACTION, this.onAction, this);
    this.bus.off(EVENTS.INPUT_LOCK, this.onInputLock, this);
    this.bus.off(EVENTS.DIALOGUE_END, this.onDialogueEnd, this);
  }
}
