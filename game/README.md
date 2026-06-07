# Crónicas Medievales 🛡️

Un RPG 2D de vista superior (estilo Zelda clásico), ambientación medieval/fantasía.
Es un **proyecto independiente** dentro de este repo: vive enteramente en la carpeta
`game/` y no toca nada de la app de Grosso.

Todo el arte se **genera por código** (pixel-art), así que el juego corre sin descargar
ningún asset externo.

## Correr el juego

```bash
cd game
npm install
npm run dev
```

Abrí la URL que muestra Vite (típicamente http://localhost:5173).

- **Moverse:** WASD o flechas. En el celular, un **joystick** aparece al tocar la mitad
  izquierda de la pantalla.
- **Interactuar / hablar:** tecla `E` o `Espacio`. En el celular, el **botón A** abajo a la derecha.

### Probar en el celular

`npm run dev` ya expone el server en la red local (`host: true`). Abrí desde el teléfono
la URL "Network" que imprime Vite (ej. `http://192.168.x.x:5173`), estando en la misma WiFi.

## Personalizar el regalo 🎁

Editá **un solo archivo**: [`src/gift.ts`](src/gift.ts).

```ts
export const HERO_NAME = "Aventurero";        // nombre del/la protagonista
export const DEDICATION = "Hecho con cariño…"; // dedicatoria en la pantalla de inicio
export const VICTORY_NOTE = "…";               // mensaje al completar la misión
```

El nombre aparece en el título y en los diálogos automáticamente.

## La misión del slice

1. Hablá con el **Anciano** (centro del pueblo) → te encarga buscar una reliquia.
2. Andá al **bosque del noroeste** y caminá sobre la **reliquia dorada** para recogerla.
3. Volvé y entregásela al **Aldeano** (casa del este) → misión completada.

## Otros comandos

```bash
npm run typecheck   # chequeo de tipos
npm run build       # build de producción a game/dist/
npm run preview     # sirve el build para probarlo
```

## Cómo está organizado

```
src/
├── main.ts            Arranque del juego y config de Phaser
├── config.ts          Constantes (tile size, velocidad, eventos)
├── gift.ts            ⭐ Personalización del regalo
├── scenes/            Boot (genera texturas), Title, World, UI
├── art/               Paleta + generador de pixel-art + definición de sprites
├── entities/          Hero, Npc
├── world/             Constructor de tilemap + datos del mapa
├── dialogue/          Diálogos data-driven + manager
├── quests/            Misión + manager
└── input/             Teclado + joystick virtual
```

## Hacia dónde sigue (roadmap)

Guardado en localStorage → inventario → combate → audio → más zonas (bosque, castillo,
interiores) → swap a arte CC0 (Kenney.nl) → deploy web + PWA para instalar en el celular.

### Cambiar a arte "de verdad"

Como todo el juego referencia *keys* de textura (ver `scenes/BootScene.ts`), para usar
spritesheets profesionales solo hay que cargarlos en `BootScene` en lugar de generarlos.
Nada más del código cambia.
