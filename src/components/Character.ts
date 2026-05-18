import Phaser from 'phaser';
import { assetKeys } from '../config/assets';
import type { Side } from '../core/types';

export type CharacterKind = 'huaqiang' | 'haoge';
export type CharacterLocation = Side | 'boat';

export class Character extends Phaser.GameObjects.Container {
  readonly id: string;
  readonly kind: CharacterKind;
  location: CharacterLocation;
  private sprite?: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    id: string,
    kind: CharacterKind,
    location: CharacterLocation,
    onClick: (character: Character) => void,
    onHover?: (character: Character) => void,
  ) {
    super(scene, x, y);
    this.id = id;
    this.kind = kind;
    this.location = location;

    const shadow = scene.add.ellipse(0, 31, 52, 12, 0x000000, 0.16);
    this.sprite = scene.add.image(0, 38, assetKeys[kind]).setOrigin(0.5, 1);
    this.add([shadow, this.sprite]);
    scene.add.existing(this);
    this.setSize(76, 128);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-38, -90, 76, 128),
      Phaser.Geom.Rectangle.Contains,
    );
    this.on('pointerdown', () => onClick(this));
    this.on('pointerover', () => onHover?.(this));
  }

  setHighlight(enabled: boolean) {
    if (enabled) {
      this.sprite?.setTint(0xffe066);
    } else {
      this.sprite?.clearTint();
    }
    this.setScale(enabled ? 1.08 : 1);
    return this;
  }
}
