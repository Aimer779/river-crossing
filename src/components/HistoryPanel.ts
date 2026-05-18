import Phaser from 'phaser';

export class HistoryPanel extends Phaser.GameObjects.Container {
  private lines: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const background = scene.add.rectangle(0, 0, 300, 190, 0x1f2a2d, 0.82).setOrigin(0, 0);
    const title = scene.add.text(16, 14, '最近 5 步', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    });
    this.add([background, title]);

    for (let i = 0; i < 5; i += 1) {
      const line = scene.add.text(16, 50 + i * 26, '', {
        fontSize: '17px',
        color: '#d9e6e8',
        fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
      });
      this.lines.push(line);
      this.add(line);
    }
    scene.add.existing(this);
  }

  update(items: string[]) {
    const recent = items.slice(-5);
    for (let i = 0; i < this.lines.length; i += 1) {
      this.lines[i].setText(recent[i] ?? '');
    }
  }
}
