import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.add.text(640, 360, 'GameScene', {
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5);
  }
}
