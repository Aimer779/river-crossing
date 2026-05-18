import Phaser from 'phaser';
import { UIButton } from '../components/UIButton';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    this.add.rectangle(640, 360, 1280, 720, 0x101416);
    this.add.rectangle(640, 492, 540, 220, 0x69bce0);
    this.add.rectangle(190, 626, 380, 188, 0x6fa65f);
    this.add.rectangle(1090, 626, 380, 188, 0x6a9f58);

    const graphics = this.add.graphics();
    graphics.fillStyle(0xf3b0dc, 1);
    graphics.fillRoundedRect(365, 58, 560, 148, 38);
    graphics.fillStyle(0xf5a2cb, 1);
    graphics.fillRoundedRect(72, 170, 1136, 250, 34);
    graphics.fillStyle(0xd8f0f8, 0.76);
    graphics.fillRoundedRect(72, 250, 1136, 170, 34);

    this.add.text(640, 128, '郝哥求生指南', {
      fontSize: '48px',
      color: '#2b2026',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0.5);

    this.add.text(640, 180, 'Press on Play', {
      fontSize: '26px',
      color: '#33262c',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0.5);

    this.add.text(126, 250, '请帮 3 个华强和 3 个郝哥\n安全移动到河对岸。', {
      fontSize: '31px',
      color: '#8a3048',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
      lineSpacing: 16,
    }).setOrigin(0, 0.5);

    this.add.text(694, 250, '注意：任意一岸只要华强多于郝哥，\n且该岸还有郝哥，游戏失败。', {
      fontSize: '27px',
      color: '#b03b35',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
      lineSpacing: 14,
      align: 'center',
    }).setOrigin(0, 0.5);

    new UIButton(this, 640, 350, '开始游戏', () => {
      this.scene.start('GameScene');
    }, {
      width: 164,
      height: 54,
      fontSize: '24px',
    });

    this.drawBoatPreview(776, 500);
    this.drawPreviewCharacters(958, 496);
  }

  private drawBoatPreview(x: number, y: number) {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x8a5527, 1);
    graphics.lineStyle(4, 0x5c3418, 1);
    graphics.fillRoundedRect(x - 88, y - 28, 176, 58, 24);
    graphics.strokeRoundedRect(x - 88, y - 28, 176, 58, 24);
    graphics.lineStyle(5, 0x6d8a8f, 0.75);
    graphics.lineBetween(x + 18, y - 34, x - 10, y + 42);
  }

  private drawPreviewCharacters(startX: number, y: number) {
    for (let i = 0; i < 6; i += 1) {
      const x = startX + i * 46;
      const isHuaqiang = i < 3;
      this.add.ellipse(x, y + 31, 38, 9, 0x000000, 0.14);
      this.add.rectangle(x, y + 9, 28, 42, isHuaqiang ? 0x2b2f38 : 0x2f7fa7, 1);
      this.add.ellipse(x, y - 17, 24, 25, 0xf0c38a, 1);
      if (isHuaqiang) {
        this.add.rectangle(x, y - 31, 28, 7, 0xb5412e, 1);
      } else {
        this.add.arc(x, y - 26, 13, 205, 335, false, 0x3d2b1d, 1);
      }
    }
  }
}
