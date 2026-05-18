import Phaser from 'phaser';
import { assetKeys } from '../config/assets';

export class Boat extends Phaser.GameObjects.Container {
  private hull: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.hull = scene.add.image(0, 2, assetKeys.boat).setOrigin(0.5, 0.62);
    this.add(this.hull);
    scene.add.existing(this);
  }

  getSeatPosition(index: number) {
    return {
      x: this.x + (index === 0 ? -34 : 34),
      y: this.y - 28,
    };
  }

  getSeatOffset(index: number) {
    return {
      x: index === 0 ? -34 : 34,
      y: -28,
    };
  }

  setMirrored(enabled: boolean) {
    this.hull.setFlipX(enabled);
    return this;
  }
}
