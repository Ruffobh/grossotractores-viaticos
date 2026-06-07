import Phaser from "phaser";

/**
 * Lee WASD / flechas como un vector de dirección y detecta la tecla de acción
 * (E o Espacio) en flanco de subida.
 */
export default class KeyboardInput {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW: Phaser.Input.Keyboard.Key;
  private keyA: Phaser.Input.Keyboard.Key;
  private keyS: Phaser.Input.Keyboard.Key;
  private keyD: Phaser.Input.Keyboard.Key;
  private keyE: Phaser.Input.Keyboard.Key;
  private keySpace: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyE = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keySpace = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  /** Vector de movimiento (-1..1 por eje). */
  vector(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.cursors.left.isDown || this.keyA.isDown) x -= 1;
    if (this.cursors.right.isDown || this.keyD.isDown) x += 1;
    if (this.cursors.up.isDown || this.keyW.isDown) y -= 1;
    if (this.cursors.down.isDown || this.keyS.isDown) y += 1;
    return { x, y };
  }

  /** true solo en el frame en que se presionó la acción. */
  actionJustPressed(): boolean {
    return (
      Phaser.Input.Keyboard.JustDown(this.keyE) ||
      Phaser.Input.Keyboard.JustDown(this.keySpace)
    );
  }
}
