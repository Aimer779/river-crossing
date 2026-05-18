import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create() {
    this.add.text(640, 360, 'Game Over', {
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5);
  }
}
