import Phaser from 'phaser';
import { UIButton } from '../components/UIButton';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    this.add.rectangle(640, 360, 1280, 720, 0x253840);
    this.add.rectangle(640, 500, 1280, 220, 0x4c9dcc);
    this.add.rectangle(240, 470, 360, 280, 0x75a96a);
    this.add.rectangle(1040, 470, 360, 280, 0x72a364);

    this.add.text(640, 168, '郝哥求生指南', {
      fontSize: '58px',
      color: '#ffffff',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0.5);

    this.add.text(640, 238, '华强太多，郝哥顶不住', {
      fontSize: '28px',
      color: '#f7e3a0',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0.5);

    this.add.text(640, 322, '把 3 个华强和 3 个郝哥全部送到右岸。船最多坐 2 人，至少 1 人才能开船。', {
      fontSize: '22px',
      color: '#d7e9ed',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0.5);
    this.add.text(640, 358, '任意一岸只要华强多于郝哥，且该岸还有郝哥，游戏失败。', {
      fontSize: '22px',
      color: '#d7e9ed',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0.5);

    new UIButton(this, 640, 450, '开始游戏', () => {
      this.scene.start('GameScene');
    });
    new UIButton(this, 640, 514, 'AI 演示', () => {
      this.scene.start('GameScene', { autoDemo: true });
    });
  }
}
