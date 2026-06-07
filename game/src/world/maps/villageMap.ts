import type { MapData } from "../../types";
import { TEX } from "../../scenes/BootScene";

/**
 * Mapa del pueblo de inicio. Se construye pintando áreas sobre una base de
 * pasto. Para agrandar el mundo: aumentá WIDTH/HEIGHT o creá otro archivo de
 * mapa con la misma forma (MapData) y cargalo desde WorldScene.
 */
const WIDTH = 30;
const HEIGHT = 22;

function makeLayer(fill: string): string[][] {
  return Array.from({ length: HEIGHT }, () => Array<string>(WIDTH).fill(fill));
}

function fillRect(
  layer: string[][],
  x: number,
  y: number,
  w: number,
  h: number,
  tex: string
): void {
  for (let ty = y; ty < y + h; ty++) {
    for (let tx = x; tx < x + w; tx++) {
      if (ty >= 0 && ty < HEIGHT && tx >= 0 && tx < WIDTH) {
        layer[ty][tx] = tex;
      }
    }
  }
}

function set(layer: string[][], x: number, y: number, tex: string): void {
  if (y >= 0 && y < HEIGHT && x >= 0 && x < WIDTH) layer[y][x] = tex;
}

// ─── CAPA DE SUELO ─────────────────────────────────────────────────────────
const ground = makeLayer(TEX.grass);

// Algunas zonas con florecitas para dar vida
fillRect(ground, 4, 14, 5, 4, TEX.grassFlower);
fillRect(ground, 20, 4, 4, 3, TEX.grassFlower);

// Plaza de piedra en el centro del pueblo
fillRect(ground, 13, 10, 5, 4, TEX.stone);

// Caminos de tierra que cruzan el pueblo (forma de cruz)
fillRect(ground, 0, 11, WIDTH, 2, TEX.path); // horizontal
fillRect(ground, 14, 0, 2, HEIGHT, TEX.path); // vertical

// Lago en la esquina inferior derecha
fillRect(ground, 23, 16, 6, 5, TEX.water);
fillRect(ground, 24, 15, 4, 1, TEX.water);

// ─── CAPA DE DECORACIÓN / COLISIÓN ─────────────────────────────────────────
const decor = makeLayer("");

// Borde de árboles que enmarca el mundo (con huecos en los caminos)
for (let x = 0; x < WIDTH; x++) {
  if (x < 14 || x > 15) {
    set(decor, x, 0, TEX.tree);
    set(decor, x, HEIGHT - 1, TEX.tree);
  }
}
for (let y = 0; y < HEIGHT; y++) {
  if (y < 11 || y > 12) {
    set(decor, 0, y, TEX.tree);
    set(decor, WIDTH - 1, y, TEX.tree);
  }
}

// Bosque (esquina superior izquierda): acá, en un claro custodiado por orcos,
// se esconde la reliquia.
fillRect(decor, 2, 2, 6, 5, TEX.tree); // bloque (2,2)-(7,6)
set(decor, 3, 7, TEX.tree);
set(decor, 6, 7, TEX.tree);
set(decor, 8, 3, TEX.tree);
set(decor, 8, 5, TEX.tree);
// Claro interior (arena) 3×3 en (4,3)-(6,5)
fillRect(decor, 4, 3, 3, 3, "");
// Entrada al claro desde el sur
set(decor, 5, 6, "");
set(decor, 5, 7, "");

// Arbustos y rocas decorativas dispersas
set(decor, 20, 6, TEX.bush);
set(decor, 21, 15, TEX.bush);
set(decor, 9, 16, TEX.rock);
set(decor, 25, 5, TEX.rock);
set(decor, 6, 18, TEX.bush);

// Casas del pueblo (cada una: [techoIzq][puerta][techoDer])
function house(x: number, y: number): void {
  set(decor, x, y, TEX.roofL);
  set(decor, x + 1, y, TEX.door);
  set(decor, x + 2, y, TEX.roofR);
}
house(18, 6); // casa noreste
house(5, 9); // casa oeste
house(22, 9); // casa este (la del aldeano)
house(18, 15); // casa sur

export const villageMap: MapData = {
  ground,
  decor,
  spawn: { tx: 14, ty: 17 }, // en el camino, abajo del centro
  npcs: [
    {
      id: "elder",
      tx: 15,
      ty: 11,
      texture: TEX.elder,
      name: "Anciano",
      facing: "down",
    },
    {
      id: "villager",
      tx: 23,
      ty: 11,
      texture: TEX.villager,
      name: "Aldeano",
      facing: "down",
    },
  ],
  items: [
    { id: "relic", tx: 5, ty: 4, texture: TEX.relic },
  ],
  enemies: [
    { kind: "orc", tx: 4, ty: 3 },
    { kind: "orc", tx: 6, ty: 4 },
    { kind: "orc", tx: 5, ty: 5 },
  ],
};

/** Conjunto de texturas que bloquean el paso (colisión). */
export const COLLIDABLE = new Set<string>([
  TEX.water,
  TEX.tree,
  TEX.rock,
  TEX.roofL,
  TEX.roofR,
  TEX.wall,
  TEX.door,
]);
