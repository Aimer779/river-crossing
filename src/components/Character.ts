import Phaser from 'phaser';
import type { Side } from '../core/types';

export type CharacterKind = 'huaqiang' | 'haoge';
export type CharacterLocation = Side | 'boat';

const COLORS: Record<CharacterKind, number> = {
  huaqiang: 0x2b2f38,
  haoge: 0xf2dfad,
};

const LABELS: Record<CharacterKind, string> = {
  huaqiang: '华',
  haoge: '郝',
};

export class Character extends Phaser.GameObjects.Container {
  readonly id: string;
  readonly kind: CharacterKind;
  location: CharacterLocation;
  private block: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;

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

    this.block = scene.add.rectangle(0, 0, 58, 58, COLORS[kind], 1).setStrokeStyle(3, 0xffffff, 0.3);
    this.label = scene.add.text(0, 0, LABELS[kind], {
      fontSize: '26px',
      color: kind === 'huaqiang' ? '#ffffff' : '#332511',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0.5);

    this.add([this.block, this.label]);
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
