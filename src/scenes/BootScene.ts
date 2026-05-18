import Phaser from 'phaser';
import { assetKeys, assetPaths } from '../config/assets';
import { audioKeys, audioPaths } from '../config/audio';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    this.load.image(assetKeys.boat, assetPaths.images[assetKeys.boat]);
    this.load.image(assetKeys.huaqiang, assetPaths.images[assetKeys.huaqiang]);
    this.load.image(assetKeys.haoge, assetPaths.images[assetKeys.haoge]);
    this.load.audio(audioKeys.lose, audioPaths.sfx[audioKeys.lose]);
    this.load.audio(audioKeys.titleMusic, audioPaths.ambience[audioKeys.titleMusic]);
    this.load.audio(audioKeys.backgroundMusic, audioPaths.ambience[audioKeys.backgroundMusic]);
  }

  create() {
    this.scene.start('TitleScene');
  }
}
