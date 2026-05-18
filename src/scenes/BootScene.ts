import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // TODO: load assets
  }

  create() {
    this.scene.start('TitleScene');
  }
}
