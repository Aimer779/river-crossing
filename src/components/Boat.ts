import Phaser from 'phaser';

export class Boat extends Phaser.GameObjects.Container {
  private hull: Phaser.GameObjects.Rectangle;
  private seatA: Phaser.GameObjects.Rectangle;
  private seatB: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.hull = scene.add.rectangle(0, 0, 190, 78, 0x8a5527, 1).setStrokeStyle(4, 0x5c3418, 1);
    this.seatA = scene.add.rectangle(-42, -8, 48, 42, 0xb9874d, 1).setStrokeStyle(2, 0xf2d6a2, 0.5);
    this.seatB = scene.add.rectangle(42, -8, 48, 42, 0xb9874d, 1).setStrokeStyle(2, 0xf2d6a2, 0.5);
    this.add([this.hull, this.seatA, this.seatB]);
    scene.add.existing(this);
  }

  getSeatPosition(index: number) {
    return {
      x: this.x + (index === 0 ? -42 : 42),
      y: this.y - 8,
    };
  }
}
