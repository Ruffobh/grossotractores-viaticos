import Phaser from "phaser";
import type { QuestStatus } from "../types";
import type { GameState } from "../dialogue/dialogues";
import { EVENTS } from "../config";
import { RELIC_QUEST } from "./quests";

/**
 * Maneja el estado de la única misión del slice y publica el objetivo actual
 * al HUD vía el bus de eventos.
 */
export default class QuestManager {
  private status: QuestStatus = "inactive";
  private hasRelic = false;

  constructor(private readonly events: Phaser.Events.EventEmitter) {}

  /** Estado que consumen los diálogos para decidir qué dice cada NPC. */
  get state(): GameState {
    return { quest: this.status, hasRelic: this.hasRelic };
  }

  startQuest(): void {
    if (this.status !== "inactive") return;
    this.status = "active";
    this.publishObjective();
  }

  pickUpRelic(): void {
    if (this.hasRelic) return;
    this.hasRelic = true;
    this.events.emit(EVENTS.TOAST, "Conseguiste la Reliquia Dorada");
    this.publishObjective();
  }

  completeQuest(): void {
    if (this.status !== "active") return;
    this.status = "completed";
    this.publishObjective();
  }

  /** Procesa el hook `onEnd` de un diálogo. Devuelve true si lo manejó. */
  handleDialogueHook(hook: string | undefined): void {
    if (hook === "start_quest") this.startQuest();
    else if (hook === "complete_quest") this.completeQuest();
  }

  get isComplete(): boolean {
    return this.status === "completed";
  }

  get carryingRelic(): boolean {
    return this.hasRelic;
  }

  private publishObjective(): void {
    const o = RELIC_QUEST.objectives;
    let text: string = o.inactive;
    if (this.status === "completed") text = o.done;
    else if (this.status === "active") text = this.hasRelic ? o.deliver : o.searching;
    this.events.emit(EVENTS.QUEST_UPDATE, text);
  }
}
