/**
 * Constantes globales del juego. Tocar acá para ajustar el "feel".
 */

/** Tamaño lógico de cada tile en píxeles (el arte está dibujado a esta resolución). */
export const TILE_SIZE = 16;

/** Escala de render: el mundo se ve TILE_SIZE * SCALE px por tile en pantalla. */
export const SCALE = 3;

/** Tamaño de un tile ya escalado, en píxeles de pantalla. */
export const RENDER_TILE = TILE_SIZE * SCALE;

/** Velocidad del héroe, en píxeles lógicos por segundo. */
export const HERO_SPEED = 90;

/** Distancia (en px lógicos) a la que el héroe puede interactuar con un NPC. */
export const INTERACT_RANGE = 22;

// ─── Combate ────────────────────────────────────────────────────────────────
/** Vida máxima del héroe (en corazones). */
export const HERO_MAX_HP = 5;
/** Daño del espadazo del héroe. */
export const HERO_ATTACK_DAMAGE = 1;
/** Cooldown entre espadazos (ms). */
export const ATTACK_COOLDOWN = 360;
/** Cuánto dura activo el hitbox del espadazo (ms). */
export const ATTACK_ACTIVE = 160;
/** Invulnerabilidad del héroe tras recibir daño (ms). */
export const HERO_IFRAMES = 850;
/** Fuerza del retroceso (px lógicos/seg). */
export const KNOCKBACK = 160;
/** Vida de un orco. */
export const ORC_HP = 3;
/** Daño que hace un orco al tocar al héroe. */
export const ORC_DAMAGE = 1;
/** Velocidad del orco (px lógicos/seg). */
export const ORC_SPEED = 48;
/** Distancia (px lógicos) a la que el orco detecta y persigue al héroe. */
export const ORC_AGGRO = 110;

/** Color de fondo fuera del mapa (negro cálido). */
export const BACKGROUND_COLOR = "#100d0b";

/** Nombres de eventos del bus global (game.events) para comunicar escenas. */
export const EVENTS = {
  /** Pedir abrir un diálogo. payload: DialogueNode */
  DIALOGUE_START: "dialogue:start",
  /** Una línea de diálogo lista para pintar. payload: DialogueLine */
  DIALOGUE_LINE: "dialogue:line",
  /** El diálogo terminó. payload: { onEnd?: string } */
  DIALOGUE_END: "dialogue:end",
  /** El input debe pausarse/reanudarse (durante diálogos). payload: boolean */
  INPUT_LOCK: "input:lock",
  /** Cambió el estado de la misión. payload: string (texto del objetivo) */
  QUEST_UPDATE: "quest:update",
  /** El jugador apretó el botón de acción (teclado o táctil). */
  ACTION: "action",
  /** Vector del joystick virtual. payload: { x: number; y: number } */
  JOYSTICK: "joystick",
  /** Mostrar un cartel temporal en el HUD. payload: string */
  TOAST: "toast",
  /** Mostrar/ocultar la pista de interacción. payload: string | null */
  HINT: "hint",
  /** Cambió la vida del héroe. payload: { hp: number; maxHp: number } */
  HP_UPDATE: "hp:update",
  /** El jugador apretó el botón de ataque (teclado o táctil). */
  ATTACK: "attack",
} as const;
