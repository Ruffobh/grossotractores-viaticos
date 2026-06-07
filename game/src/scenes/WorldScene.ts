import Phaser from "phaser";
import Hero from "../entities/Hero";
import Npc from "../entities/Npc";
import Enemy from "../entities/Enemy";
import KeyboardInput from "../input/Keyboard";
import DialogueManager from "../dialogue/DialogueManager";
import { getDialogue } from "../dialogue/dialogues";
import QuestManager from "../quests/QuestManager";
import { buildMap } from "../world/tilemap";
import { villageMap, COLLIDABLE } from "../world/maps/villageMap";
import { TEX } from "./BootScene";
import {
  EVENTS,
  INTERACT_RANGE,
  RENDER_TILE,
  SCALE,
  HERO_ATTACK_DAMAGE,
  ATTACK_COOLDOWN,
  ATTACK_ACTIVE,
  ORC_DAMAGE,
  HERO_MAX_HP,
} from "../config";
import { VICTORY_NOTE } from "../gift";

/**
 * Escena principal: arma el mundo, el héroe, los NPCs, los enemigos y la
 * misión, y orquesta input, diálogos, combate y colisiones. Se comunica con la
 * UIScene por el bus global (this.game.events).
 */
export default class WorldScene extends Phaser.Scene {
  private hero!: Hero;
  private npcs: Npc[] = [];
  private enemies!: Phaser.Physics.Arcade.Group;
  private relic?: Phaser.Physics.Arcade.Image;
  private keyboard!: KeyboardInput;
  private dialogue!: DialogueManager;
  private quest!: QuestManager;
  private bus!: Phaser.Events.EventEmitter;

  private attackHitbox!: Phaser.GameObjects.Zone;
  private slash!: Phaser.GameObjects.Image;
  private attackReadyAt = 0;

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
    this.attackReadyAt = 0;
    this.joystickVec = { x: 0, y: 0 };

    const built = buildMap(this, villageMap, COLLIDABLE);
    this.physics.world.setBounds(0, 0, built.widthPx, built.heightPx);

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

    // Enemigos
    this.enemies = this.physics.add.group();
    for (const def of villageMap.enemies) {
      const enemy = new Enemy(this, def);
      this.enemies.add(enemy);
    }
    this.physics.add.collider(this.enemies, built.colliders);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.hero, this.enemies, this.onHeroTouchEnemy, undefined, this);

    // Hitbox del espadazo (zona invisible que se activa al atacar) + sprite del tajo
    this.attackHitbox = this.add.zone(0, 0, RENDER_TILE, RENDER_TILE);
    this.physics.add.existing(this.attackHitbox);
    const hbBody = this.attackHitbox.body as Phaser.Physics.Arcade.Body;
    hbBody.enable = false;
    hbBody.setAllowGravity(false);
    this.physics.add.overlap(this.attackHitbox, this.enemies, this.onHitEnemy, undefined, this);

    this.slash = this.add
      .image(0, 0, TEX.slash)
      .setScale(SCALE)
      .setVisible(false)
      .setDepth(100000);

    // Objeto: la reliquia
    const relicDef = villageMap.items.find((i) => i.id === "relic");
    if (relicDef) {
      this.relic = this.physics.add.image(
        relicDef.tx * RENDER_TILE + RENDER_TILE / 2,
        relicDef.ty * RENDER_TILE + RENDER_TILE / 2,
        relicDef.texture
      );
      this.relic.setScale(SCALE).setDepth(this.relic.y);
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
    this.bus.on(EVENTS.ATTACK, this.onAttack, this);
    this.bus.on(EVENTS.INPUT_LOCK, this.onInputLock, this);
    this.bus.on(EVENTS.DIALOGUE_END, this.onDialogueEnd, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    // Estado inicial de HUD
    this.bus.emit(EVENTS.QUEST_UPDATE, "");
    this.bus.emit(EVENTS.HP_UPDATE, { hp: HERO_MAX_HP, maxHp: HERO_MAX_HP });
  }

  update(): void {
    if (this.keyboard.actionJustPressed()) this.onAction();
    if (this.keyboard.attackJustPressed()) this.onAttack();

    const kb = this.keyboard.vector();
    const vec = { x: kb.x + this.joystickVec.x, y: kb.y + this.joystickVec.y };
    this.hero.drive(vec, this.inputLocked);

    // IA de los enemigos
    (this.enemies.getChildren() as Enemy[]).forEach((e) => {
      if (e.isAlive) e.think(this.hero.x, this.hero.y);
    });

    this.updateNearestNpc();
  }

  // ─── Interacción / diálogo ──────────────────────────────────────────────

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

  // ─── Combate ────────────────────────────────────────────────────────────

  private onAttack(): void {
    const now = this.time.now;
    if (this.dialogue.active || this.inputLocked || this.hero.hp <= 0) return;
    if (now < this.attackReadyAt) return;
    this.attackReadyAt = now + ATTACK_COOLDOWN;

    const dirs: Record<string, { dx: number; dy: number; angle: number }> = {
      down: { dx: 0, dy: 1, angle: 90 },
      up: { dx: 0, dy: -1, angle: -90 },
      left: { dx: -1, dy: 0, angle: 180 },
      right: { dx: 1, dy: 0, angle: 0 },
    };
    const d = dirs[this.hero.facing];
    const dist = RENDER_TILE * 0.7;
    const px = this.hero.x + d.dx * dist;
    const py = this.hero.y + d.dy * dist;

    // Activar el hitbox
    const body = this.attackHitbox.body as Phaser.Physics.Arcade.Body;
    this.attackHitbox.setPosition(px, py);
    body.reset(px, py);
    body.enable = true;

    // Mostrar el tajo
    this.slash
      .setPosition(px, py)
      .setAngle(d.angle)
      .setDepth(py + 1)
      .setVisible(true)
      .setAlpha(1);
    this.tweens.add({ targets: this.slash, alpha: 0.2, duration: ATTACK_ACTIVE });

    this.time.delayedCall(ATTACK_ACTIVE, () => {
      body.enable = false;
      this.slash.setVisible(false);
    });
  }

  private onHitEnemy: ArcadePairCallback = (_hb, enemyObj) => {
    const enemy = enemyObj as Enemy;
    if (!enemy.isAlive) return;
    const died = enemy.takeDamage(HERO_ATTACK_DAMAGE, this.hero.x, this.hero.y);
    if (died) this.killEnemy(enemy);
  };

  private killEnemy(enemy: Enemy): void {
    const x = enemy.x;
    const y = enemy.y;
    enemy.disableBody(true, true);

    // Pequeño "puff" de derrota
    const puff = this.add
      .image(x, y, "orc_down_0")
      .setScale(SCALE)
      .setTintFill(0xffffff)
      .setDepth(y);
    this.tweens.add({
      targets: puff,
      alpha: 0,
      scale: SCALE * 1.6,
      duration: 220,
      onComplete: () => puff.destroy(),
    });

    // 35% de soltar un corazón que cura al recogerlo
    if (Math.random() < 0.35) this.dropHeart(x, y);
  }

  private dropHeart(x: number, y: number): void {
    const heart = this.physics.add.image(x, y, TEX.heartFull).setScale(SCALE).setDepth(y);
    this.tweens.add({ targets: heart, y: y - 5, duration: 600, yoyo: true, repeat: -1 });
    const ov = this.physics.add.overlap(this.hero, heart, () => {
      this.physics.world.removeCollider(ov);
      heart.destroy();
      this.hero.heal(1);
      this.bus.emit(EVENTS.TOAST, "+1 corazón");
    });
  }

  private onHeroTouchEnemy: ArcadePairCallback = (_hero, enemyObj) => {
    const enemy = enemyObj as Enemy;
    if (!enemy.isAlive || this.hero.invulnerable) return;
    const died = this.hero.takeDamage(ORC_DAMAGE, enemy.x, enemy.y);
    if (died) this.heroDown();
  };

  private heroDown(): void {
    const spawn = villageMap.spawn;
    this.bus.emit(EVENTS.TOAST, "Te desmayaste… pero despertás a salvo en la aldea.");
    this.hero.revive(
      spawn.tx * RENDER_TILE + RENDER_TILE / 2,
      spawn.ty * RENDER_TILE + RENDER_TILE / 2
    );
  }

  // ─── Misión / objeto ────────────────────────────────────────────────────

  private collectRelic(): void {
    if (!this.relic) return;
    this.quest.pickUpRelic();
    this.relic.destroy();
    this.relic = undefined;
  }

  // ─── Bus ────────────────────────────────────────────────────────────────

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

  private cleanup(): void {
    this.bus.off(EVENTS.JOYSTICK, this.onJoystick, this);
    this.bus.off(EVENTS.ACTION, this.onAction, this);
    this.bus.off(EVENTS.ATTACK, this.onAttack, this);
    this.bus.off(EVENTS.INPUT_LOCK, this.onInputLock, this);
    this.bus.off(EVENTS.DIALOGUE_END, this.onDialogueEnd, this);
  }
}

/** Firma de callback de overlap/collider de Arcade Physics. */
type ArcadePairCallback = Phaser.Types.Physics.Arcade.ArcadePhysicsCallback;
