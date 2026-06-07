import Phaser from "phaser";
import type { DialogueNode } from "../types";
import { EVENTS } from "../config";

/**
 * Máquina de estados simple para reproducir un diálogo línea por línea.
 * Emite eventos en el bus global para que la UIScene pinte la caja, y bloquea
 * el input del héroe mientras hay un diálogo activo.
 */
export default class DialogueManager {
  private node?: DialogueNode;
  private index = 0;
  private _active = false;

  constructor(private readonly events: Phaser.Events.EventEmitter) {}

  get active(): boolean {
    return this._active;
  }

  start(node: DialogueNode): void {
    this.node = node;
    this.index = 0;
    this._active = true;
    this.events.emit(EVENTS.INPUT_LOCK, true);
    this.emitCurrentLine();
  }

  /** Avanza a la siguiente línea o termina el diálogo. */
  advance(): void {
    if (!this._active || !this.node) return;
    this.index++;
    if (this.index >= this.node.lines.length) {
      this.finish();
    } else {
      this.emitCurrentLine();
    }
  }

  private emitCurrentLine(): void {
    if (!this.node) return;
    this.events.emit(EVENTS.DIALOGUE_LINE, this.node.lines[this.index]);
  }

  private finish(): void {
    const onEnd = this.node?.onEnd;
    this._active = false;
    this.node = undefined;
    this.events.emit(EVENTS.DIALOGUE_END, { onEnd });
    this.events.emit(EVENTS.INPUT_LOCK, false);
  }
}
