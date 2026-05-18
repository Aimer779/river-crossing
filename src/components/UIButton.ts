import Phaser from 'phaser';

export class UIButton extends Phaser.GameObjects.Text {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    onClick?: () => void
  ) {
    super(scene, x, y, text, {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 16, y: 8 },
    });
    scene.add.existing(this);
    this.setOrigin(0.5).setInteractive({ useHandCursor: true });

    if (onClick) {
      this.on('pointerdown', onClick);
    }
  }
}
