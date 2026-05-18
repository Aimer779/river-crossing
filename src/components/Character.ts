import Phaser from 'phaser';
import type { Side } from '../core/types';

export type CharacterKind = 'huaqiang' | 'haoge';
export type CharacterLocation = Side | 'boat';

const COLORS: Record<CharacterKind, number> = {
  huaqiang: 0x2b2f38,
  haoge: 0x2f7fa7,
};

export class Character extends Phaser.GameObjects.Container {
  readonly id: string;
  readonly kind: CharacterKind;
  location: CharacterLocation;
  private block: Phaser.GameObjects.Rectangle;
  private head: Phaser.GameObjects.Ellipse;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    id: string,
    kind: CharacterKind,
    location: CharacterLocation,
    onClick: (character: Character) => void
  ) {
    super(scene, x, y);
    this.id = id;
    this.kind = kind;
    this.location = location;

    const shadow = scene.add.ellipse(0, 31, 52, 12, 0x000000, 0.16);
    this.block = scene.add.rectangle(0, 8, 38, 46, COLORS[kind], 1).setStrokeStyle(3, 0xffffff, 0.3);
    this.head = scene.add.ellipse(0, -22, 31, 29, 0xf0c38a, 1).setStrokeStyle(2, 0x6d4324, 0.45);

    if (kind === 'huaqiang') {
      const cap = scene.add.rectangle(0, -37, 34, 8, 0xb5412e, 1);
      const brow = scene.add.rectangle(0, -22, 24, 4, 0x3b271a, 1);
      this.add([shadow, this.block, this.head, cap, brow]);
    } else {
      const hair = scene.add.arc(0, -31, 16, 200, 340, false, 0x3d2b1d, 1);
      const collar = scene.add.triangle(0, -2, -14, -10, 14, -10, 0, 8, 0xf2dfad, 1);
      this.add([shadow, this.block, this.head, hair, collar]);
    }
    scene.add.existing(this);
    this.setSize(76, 76);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-38, -38, 76, 76),
      Phaser.Geom.Rectangle.Contains,
    );
    this.on('pointerdown', () => onClick(this));
  }

  setHighlight(enabled: boolean) {
    this.block.setStrokeStyle(enabled ? 5 : 3, enabled ? 0xffd84d : 0xffffff, enabled ? 1 : 0.3);
    this.setScale(enabled ? 1.08 : 1);
    return this;
  }
}
