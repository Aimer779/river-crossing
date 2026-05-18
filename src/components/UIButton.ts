import Phaser from 'phaser';

const NORMAL_COLOR = 0x333333;
const HOVER_COLOR = 0x444444;
const DISABLED_COLOR = 0x777777;

type UIButtonOptions = {
  width?: number;
  height?: number;
  fontSize?: string;
};

export class UIButton extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private enabled = true;
  private onClick?: () => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    onClick?: () => void,
    options: UIButtonOptions = {}
  ) {
    super(scene, x, y);
    this.onClick = onClick;
    const width = options.width ?? 128;
    const height = options.height ?? 44;

    this.background = scene.add.rectangle(0, 0, width, height, NORMAL_COLOR, 1).setStrokeStyle(2, 0xffffff, 0.25);
    this.label = scene.add.text(0, 0, text, {
      fontSize: options.fontSize ?? '20px',
      color: '#ffffff',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0.5);

    this.add([this.background, this.label]);
    scene.add.existing(this);
    this.setSize(width, height);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains
    );

    this.on('pointerover', () => {
      if (this.enabled) this.background.setFillStyle(HOVER_COLOR);
    });
    this.on('pointerout', () => {
      if (this.enabled) this.background.setFillStyle(NORMAL_COLOR);
    });
    this.on('pointerdown', () => {
      if (this.enabled && this.onClick) this.onClick();
    });
  }

  setEnabled(enabled: boolean) {
    if (this.enabled === enabled) return this;
    this.enabled = enabled;
    this.setAlpha(enabled ? 1 : 0.5);
    this.background.setFillStyle(enabled ? NORMAL_COLOR : DISABLED_COLOR);
    return this;
  }

  setLabel(text: string) {
    this.label.setText(text);
    return this;
  }
}
