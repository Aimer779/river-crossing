import Phaser from 'phaser';

export class Toast extends Phaser.GameObjects.Text {
  constructor(scene: Phaser.Scene, x: number, y: number, message: string) {
    super(scene, x, y, message, {
      fontSize: '20px',
      color: '#fff2b8',
      backgroundColor: '#3a2520',
      padding: { x: 14, y: 8 },
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    });
    scene.add.existing(this);
    this.setOrigin(0.5);
    scene.tweens.add({
      targets: this,
      y: y - 24,
      alpha: 0,
      duration: 1100,
      ease: 'Sine.easeOut',
      onComplete: () => this.destroy(),
    });
  }
}
