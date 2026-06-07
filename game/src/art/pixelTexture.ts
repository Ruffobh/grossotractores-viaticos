import Phaser from "phaser";
import { PALETTE } from "./palette";

/**
 * Una grilla de pixel-art: un array de strings, cada string una fila,
 * cada caracter un pixel que se mapea a un color de la PALETTE.
 * Todas las filas deben tener el mismo largo.
 */
export type PixelGrid = string[];

/**
 * Convierte una grilla de caracteres en una textura de Phaser dibujándola
 * en un <canvas> a resolución 1px = 1 celda. El resto del juego solo usa la
 * `key` resultante, así que cambiar a arte CC0 en el futuro = cambiar quién
 * registra la key, sin tocar nada más.
 */
export function makePixelTexture(
  scene: Phaser.Scene,
  key: string,
  grid: PixelGrid,
  palette: Record<string, string> = PALETTE
): void {
  if (scene.textures.exists(key)) return;

  const height = grid.length;
  const width = grid.reduce((max, row) => Math.max(max, row.length), 0);

  const canvasTex = scene.textures.createCanvas(key, width, height);
  if (!canvasTex) return;
  const ctx = canvasTex.getContext();

  for (let y = 0; y < height; y++) {
    const row = grid[y];
    for (let x = 0; x < width; x++) {
      const ch = row[x] ?? ".";
      const color = palette[ch];
      if (!color || color === "transparent") continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  canvasTex.refresh();
}

/**
 * Registra varias grillas de una sola pasada.
 * `defs` es un mapa de key → grilla.
 */
export function makePixelTextures(
  scene: Phaser.Scene,
  defs: Record<string, PixelGrid>,
  palette: Record<string, string> = PALETTE
): void {
  for (const [key, grid] of Object.entries(defs)) {
    makePixelTexture(scene, key, grid, palette);
  }
}

/**
 * Crea una textura de color sólido (útil para paneles de UI, joystick, etc.).
 */
export function makeSolidTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  color: string
): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, width, height);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  tex.refresh();
}

/**
 * Crea una textura circular rellena (para el joystick virtual y botones).
 */
export function makeCircleTexture(
  scene: Phaser.Scene,
  key: string,
  radius: number,
  fill: string,
  stroke?: string
): void {
  if (scene.textures.exists(key)) return;
  const size = radius * 2;
  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.beginPath();
  ctx.arc(radius, radius, radius - 1, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
  tex.refresh();
}
