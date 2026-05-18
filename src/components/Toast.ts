import Phaser from 'phaser';

export class Toast extends Phaser.GameObjects.Text {
  constructor(scene: Phaser.Scene, x: number, y: number, message: string) {
    super(scene, x, y, message, {
      fontSize: '20px',
      color: '#ff4444',
    });
    scene.add.existing(this);
    this.setOrigin(0.5);
  }
}
