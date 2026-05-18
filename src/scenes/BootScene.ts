import Phaser from 'phaser';
import { assetKeys, assetPaths } from '../config/assets';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    this.load.image(assetKeys.boat, assetPaths.images[assetKeys.boat]);
    this.load.image(assetKeys.huaqiang, assetPaths.images[assetKeys.huaqiang]);
    this.load.image(assetKeys.haoge, assetPaths.images[assetKeys.haoge]);
  }

  create() {
    this.scene.start('TitleScene');
  }
}
