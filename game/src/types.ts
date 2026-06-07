/** Tipos compartidos en todo el juego. */

export type Direction = "down" | "up" | "left" | "right";

/** Una línea de diálogo: quién habla y qué dice. */
export interface DialogueLine {
  speaker: string;
  text: string;
}

/** Un nodo de diálogo: varias líneas y un hook opcional al terminar. */
export interface DialogueNode {
  lines: DialogueLine[];
  /** Identificador de acción a ejecutar al cerrar el diálogo (ver dialogues.ts). */
  onEnd?: string;
}

/** Estado posible de una misión. */
export type QuestStatus = "inactive" | "active" | "completed";

/** Definición de un NPC en un mapa. */
export interface NpcDef {
  id: string;
  /** Posición en tiles (columna, fila). */
  tx: number;
  ty: number;
  /** Key de textura del sprite (registrada en BootScene). */
  texture: string;
  /** Nombre visible. */
  name: string;
  /** Dirección a la que mira por defecto. */
  facing?: Direction;
}

/** Definición de un objeto recolectable en un mapa. */
export interface ItemDef {
  id: string;
  tx: number;
  ty: number;
  texture: string;
}

/** Definición de un enemigo en un mapa. */
export interface EnemyDef {
  /** Tipo de enemigo (por ahora solo "orc"). */
  kind: "orc";
  tx: number;
  ty: number;
}

/** Datos completos de un mapa. */
export interface MapData {
  /** Capa base (pasto/camino/agua). Cada celda es una key de tile. */
  ground: string[][];
  /** Capa de decoración/colisión (árboles, casas). "" = vacío. */
  decor: string[][];
  /** Spawn del héroe en tiles. */
  spawn: { tx: number; ty: number };
  npcs: NpcDef[];
  items: ItemDef[];
  enemies: EnemyDef[];
}
