import type { PixelGrid } from "./pixelTexture";
import { TILE_SIZE } from "../config";

/**
 * Definiciones de pixel-art. Las texturas de tiles se generan con ruido
 * determinista (para que cada tile tenga textura sin archivos), y los
 * personajes/objetos/casas son arte dibujado a mano carácter por carácter.
 *
 * Convención de caracteres: ver palette.ts. "." = transparente.
 */

/** PRNG determinista (mulberry32) para texturizar tiles de forma reproducible. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Genera un tile de TILE_SIZE×TILE_SIZE con un color base y motas de acento
 * distribuidas pseudo-aleatoriamente.
 */
function noiseTile(
  base: string,
  accents: { ch: string; chance: number }[],
  seed: number
): PixelGrid {
  const rand = rng(seed);
  const rows: string[] = [];
  for (let y = 0; y < TILE_SIZE; y++) {
    let row = "";
    for (let x = 0; x < TILE_SIZE; x++) {
      let ch = base;
      const r = rand();
      let acc = 0;
      for (const a of accents) {
        acc += a.chance;
        if (r < acc) {
          ch = a.ch;
          break;
        }
      }
      row += ch;
    }
    rows.push(row);
  }
  return rows;
}

// ─── TILES DE SUELO ────────────────────────────────────────────────────────

export const TILE_GRASS = noiseTile(
  "g",
  [
    { ch: "G", chance: 0.1 },
    { ch: "d", chance: 0.08 },
    { ch: "t", chance: 0.03 },
  ],
  1337
);

export const TILE_GRASS_FLOWER = noiseTile(
  "g",
  [
    { ch: "G", chance: 0.1 },
    { ch: "Y", chance: 0.04 }, // florecitas amarillas
    { ch: "i", chance: 0.03 }, // florecitas blancas
  ],
  9001
);

export const TILE_PATH = noiseTile(
  "p",
  [
    { ch: "P", chance: 0.14 },
    { ch: "m", chance: 0.12 },
  ],
  4242
);

export const TILE_WATER = noiseTile(
  "w",
  [
    { ch: "W", chance: 0.12 },
    { ch: "b", chance: 0.14 },
  ],
  7777
);

export const TILE_STONE = noiseTile(
  "s",
  [
    { ch: "S", chance: 0.14 },
    { ch: "x", chance: 0.16 },
  ],
  2024
);

// ─── DECORACIÓN / COLISIÓN ─────────────────────────────────────────────────
// (fondo transparente: se dibuja encima del pasto)

export const DECOR_TREE: PixelGrid = [
  "......oooo......",
  "....oodttdoo....",
  "...odtttttdo o..",
  "..odttGttGttdo..",
  "..ottttttttto o.",
  ".odtttGtttttdto.",
  ".ottttttttGttto.",
  ".odttttGtttttdo.",
  "..ottttttttto...",
  "..oodtttttdoo...",
  "....oodttdoo....",
  ".......kk.......",
  ".......kk.......",
  "......kkkk......",
  ".....mkkkkm.....",
  "....mmmmmmmm....",
];

export const DECOR_BUSH: PixelGrid = [
  "................",
  "................",
  "................",
  ".....oooo o.....",
  "...oodttdoo.....",
  "..odtttttdo o...",
  "..ottGttttto....",
  "..odttttGtdo....",
  "...oodttddo.....",
  ".....oooo.......",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
];

export const DECOR_ROCK: PixelGrid = [
  "................",
  "................",
  "................",
  "................",
  ".....xxxx.......",
  "...xxsSSsxx.....",
  "..xsSSSSSsx.....",
  "..xsSSssSSx.....",
  "..xxsSSSsxx.....",
  "...xxxxxxx......",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
];

// ─── CASA (4 piezas que se combinan en el mapa) ────────────────────────────

export const HOUSE_ROOF_L: PixelGrid = [
  "...rrrrrrrrrrrrr",
  "..rrRRRRRRRRRRRR",
  ".rrRRRRRRRRRRRRR",
  "rrRRRRRRRRRRRRRR",
  "rRRRRRRRRRRRRRRR",
  "rRRRRRRRRRRRRRRR",
  "zzzzzzzzzzzzzzzz",
  "eeeeeeeeeeeeeeee",
  "eeeeeeeeeeeeeeee",
  "eeeEEeeeeeeeeeee",
  "eeeEEeeeeeeeeeee",
  "eeeeeeeeeeeeeeee",
  "eeeeeeeeeeeeeeee",
  "eeeeeeeeeeeeeeee",
  "eeeeeeeeeeeeeeee",
  "zeeeeeeeeeeeeeee",
];

export const HOUSE_ROOF_R: PixelGrid = [
  "rrrrrrrrrrrrr...",
  "RRRRRRRRRRRRrr..",
  "RRRRRRRRRRRRRrr.",
  "RRRRRRRRRRRRRRrr",
  "RRRRRRRRRRRRRRRr",
  "RRRRRRRRRRRRRRRr",
  "zzzzzzzzzzzzzzzz",
  "eeeeeeeeeeeeeeee",
  "eeeeeeeeeeeeeeee",
  "eeeeeeeeeeeEEeee",
  "eeeeeeeeeeeEEeee",
  "eeeeeeeeeeeeeeee",
  "eeeeeeeeeeeeeeee",
  "eeeeeeeeeeeeeeee",
  "eeeeeeeeeeeeeeee",
  "eeeeeeeeeeeeeeez",
];

export const HOUSE_WALL: PixelGrid = [
  "rrrrrrrrrrrrrrrr",
  "RRRRRRRRRRRRRRRR",
  "RRRRRRRRRRRRRRRR",
  "RRRRRRRRRRRRRRRR",
  "RRRRRRRRRRRRRRRR",
  "RRRRRRRRRRRRRRRR",
  "zzzzzzzzzzzzzzzz",
  "eeeeeeeeeeeeeeee",
  "eeeEEeeeeeeEEeee",
  "eeeEEeeeeeeEEeee",
  "eeeeeeeeeeeeeeee",
  "eeeeeeeeeeeeeeee",
  "eeeeeeeeeeeeeeee",
  "eeeeeeeeeeeeeeee",
  "eeeeeeeeeeeeeeee",
  "eeeeeeeeeeeeeeee",
];

export const HOUSE_DOOR: PixelGrid = [
  "rrrrrrrrrrrrrrrr",
  "RRRRRRRRRRRRRRRR",
  "RRRRRRRRRRRRRRRR",
  "RRRRRRRRRRRRRRRR",
  "RRRRRRRRRRRRRRRR",
  "RRRRRRRRRRRRRRRR",
  "zzzzzzzzzzzzzzzz",
  "eeeeeeeeeeeeeeee",
  "eeeeznnnnnnzeeee",
  "eeeznnnnnnnnzeee",
  "eeznnnnnnnnnnzee",
  "eeznnnnynnnnnzee",
  "eeznnnnnnnnnnzee",
  "eeznnnnnnnnnnzee",
  "eeznnnnnnnnnnzee",
  "eeznnnnnnnnnnzee",
];

// ─── OBJETO: LA RELIQUIA (un amuleto dorado) ───────────────────────────────

export const ITEM_RELIC: PixelGrid = [
  "................",
  "......qyyq......",
  ".....qYYYYq.....",
  "....qYyyyyYq....",
  "....qYyqqyYq....",
  "....qYyqqyYq....",
  "....qYyyyyYq....",
  ".....qYYYYq.....",
  "......qyyq......",
  ".......yy.......",
  "......qyyq......",
  ".....qYyyYq.....",
  "....qYyiiyYq....",
  ".....qYyyYq.....",
  "......qqqq......",
  "................",
];

// ─── PERSONAJES ────────────────────────────────────────────────────────────
// Cada personaje: 3 direcciones dibujadas (down/up/side) × 2 frames de caminata.
// "left" se obtiene espejando "side" en código (ver BootScene).
// La paleta de túnica se parametriza pasando un color de túnica (c/C, u/U, a/A).

export type CharColors = {
  tunic: string;
  tunicDark: string;
  hair: string;
  /** Color de piel (char de paleta). Por defecto "f". */
  skin?: string;
};

/** Héroe: túnica verde, pelo marrón. */
export const HERO_COLORS: CharColors = { tunic: "c", tunicDark: "C", hair: "h" };
/** Anciano: túnica violeta, barba/pelo claro. */
export const ELDER_COLORS: CharColors = { tunic: "u", tunicDark: "U", hair: "H" };
/** Aldeano: túnica terracota, pelo marrón. */
export const VILLAGER_COLORS: CharColors = { tunic: "a", tunicDark: "A", hair: "h" };
/** Orco: piel verde, túnica marrón oscura, pelo negro. */
export const ORC_COLORS: CharColors = { tunic: "A", tunicDark: "n", hair: "z", skin: "J" };

/**
 * Construye los 6 frames de un personaje (down0, down1, up0, up1, side0, side1)
 * usando plantillas con marcadores: T=túnica, t=túnica oscura, h=pelo.
 */
export function buildCharacterFrames(
  colors: CharColors
): Record<string, PixelGrid> {
  const skin = colors.skin ?? "f";
  const sub = (grid: string[]): PixelGrid =>
    grid.map((row) =>
      row
        .replace(/T/g, colors.tunic)
        .replace(/t/g, colors.tunicDark)
        .replace(/h/g, colors.hair)
        .replace(/f/g, skin)
    );

  // Plantillas 16×16. "f"=piel, "z"=contorno/botas, "i"=ojos.
  const DOWN_0 = [
    "................",
    "................",
    ".....zhhhz......",
    "....zhhhhhz.....",
    "....hffffh......",
    ".... fifif......",
    "....zffffz......",
    "....zTTTTz......",
    "...zTTTTTTz.....",
    "...zTtTTtTz.....",
    "...zTTTTTTz.....",
    "....TTTTTT......",
    "....fT..Tf......",
    "....f....f......",
    "...zz....zz.....",
    "................",
  ];
  const DOWN_1 = [
    "................",
    "................",
    ".....zhhhz......",
    "....zhhhhhz.....",
    "....hffffh......",
    ".... fifif......",
    "....zffffz......",
    "....zTTTTz......",
    "...zTTTTTTz.....",
    "...zTtTTtTz.....",
    "...zTTTTTTz.....",
    "....TTTTTT......",
    "...fT...Tf......",
    "...f.....f......",
    "..zz......zz....",
    "................",
  ];
  const UP_0 = [
    "................",
    "................",
    ".....zhhhz......",
    "....zhhhhhz.....",
    "....hhhhhh......",
    "....hhhhhh......",
    "....zhhhhz......",
    "....zTTTTz......",
    "...zTTTTTTz.....",
    "...zTtTTtTz.....",
    "...zTTTTTTz.....",
    "....TTTTTT......",
    "....fT..Tf......",
    "....f....f......",
    "...zz....zz.....",
    "................",
  ];
  const UP_1 = [
    "................",
    "................",
    ".....zhhhz......",
    "....zhhhhhz.....",
    "....hhhhhh......",
    "....hhhhhh......",
    "....zhhhhz......",
    "....zTTTTz......",
    "...zTTTTTTz.....",
    "...zTtTTtTz.....",
    "...zTTTTTTz.....",
    "....TTTTTT......",
    "...fT...Tf......",
    "...f.....f......",
    "..zz......zz....",
    "................",
  ];
  const SIDE_0 = [
    "................",
    "................",
    ".....zhhz.......",
    "....zhhhhz......",
    "....hffhh.......",
    "....hfifh.......",
    "....zffz........",
    "....zTTTz.......",
    "...zTTTTTz......",
    "...zTtTTtz......",
    "...zTTTTTz......",
    "....TTTTT.......",
    "....fTTf........",
    "....f..f........",
    "...zz..zz.......",
    "................",
  ];
  const SIDE_1 = [
    "................",
    "................",
    ".....zhhz.......",
    "....zhhhhz......",
    "....hffhh.......",
    "....hfifh.......",
    "....zffz........",
    "....zTTTz.......",
    "...zTTTTTz......",
    "...zTtTTtz......",
    "...zTTTTTz......",
    "....TTTTT.......",
    "...fTT.f........",
    "...f...f........",
    "..zz....zz......",
    "................",
  ];

  return {
    down_0: sub(DOWN_0),
    down_1: sub(DOWN_1),
    up_0: sub(UP_0),
    up_1: sub(UP_1),
    side_0: sub(SIDE_0),
    side_1: sub(SIDE_1),
  };
}

// ─── COMBATE: ESPADAZO Y CORAZONES ─────────────────────────────────────────

/**
 * Crescent del espadazo, orientado hacia la DERECHA (abre hacia la izquierda).
 * Se rota en código según la dirección del héroe.
 */
export const SLASH: PixelGrid = [
  "................",
  "................",
  ".........lll....",
  "........lLLLl...",
  ".......lLLl.....",
  "......lLL.......",
  "......lL........",
  "......lL........",
  "......lL........",
  "......lLL.......",
  ".......lLLl.....",
  "........lLLLl...",
  ".........lll....",
  "................",
  "................",
  "................",
];

/** Corazón lleno (vida actual). */
export const HEART_FULL: PixelGrid = [
  "................",
  "..vv....vv......",
  ".vVVvv.vvVVv....",
  "vVVVVVvVVVVVv...",
  "vVVVVVVVVVVVv...",
  "vVVVVVVVVVVVv...",
  ".vVVVVVVVVVv....",
  "..vVVVVVVVv.....",
  "...vVVVVVv......",
  "....vVVVv.......",
  ".....vVv........",
  "......v.........",
  "................",
  "................",
  "................",
  "................",
];

/** Corazón vacío (vida perdida). */
export const HEART_EMPTY: PixelGrid = [
  "................",
  "..xx....xx......",
  ".xssxx.xxssx....",
  "xsssssxssssssx..",
  "xsxxxxxxxxxxsx..",
  "xsxxxxxxxxxxsx..",
  ".xsxxxxxxxxsx...",
  "..xsxxxxxxsx....",
  "...xsxxxxsx.....",
  "....xsxxsx......",
  ".....xssx.......",
  "......xx........",
  "................",
  "................",
  "................",
  "................",
];
