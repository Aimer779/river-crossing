import Phaser from 'phaser';
import { UIButton } from '../components/UIButton';
import {
  type AudioChannel,
  applyAudioSettings,
  loadAudioSettings,
  setAudioChannelVolume,
  setAudioMuted,
  startBackgroundMusic,
  updateBackgroundMusicVolume,
} from '../config/audio';

const AUDIO_CHANNEL_LABELS: Record<AudioChannel, string> = {
  sfx: '音效',
  voice: '语音',
  ambience: '环境',
};

export class TitleScene extends Phaser.Scene {
  private settingsPanel?: Phaser.GameObjects.Container;
  private volumeTexts: Partial<Record<AudioChannel, Phaser.GameObjects.Text>> = {};
  private muteButton?: UIButton;

  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    applyAudioSettings(this.sound);
    this.settingsPanel = undefined;
    this.volumeTexts = {};
    this.muteButton = undefined;

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
      applyAudioSettings(this.sound);
      startBackgroundMusic(this.sound);
      this.scene.start('GameScene');
    }, {
      width: 164,
      height: 54,
      fontSize: '24px',
    });

    new UIButton(this, 820, 350, '设置', () => this.toggleSettingsPanel(), {
      width: 112,
      height: 54,
      fontSize: '24px',
    });

    this.drawBoatPreview(776, 500);
    this.drawPreviewCharacters(958, 496);
  }

  private toggleSettingsPanel() {
    if (this.settingsPanel) {
      this.settingsPanel.destroy(true);
      this.settingsPanel = undefined;
      this.volumeTexts = {};
      this.muteButton = undefined;
      return;
    }

    const panel = this.add.container(640, 500).setDepth(20);
    const background = this.add.rectangle(0, 0, 520, 260, 0x1e2b30, 0.96).setStrokeStyle(3, 0xffffff, 0.24);
    const title = this.add.text(0, -104, '音频设置', {
      fontSize: '26px',
      color: '#ffffff',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0.5);
    panel.add([background, title]);

    const rows: Array<{ channel: AudioChannel; y: number }> = [
      { channel: 'sfx', y: -48 },
      { channel: 'voice', y: 8 },
      { channel: 'ambience', y: 64 },
    ];

    rows.forEach(({ channel, y }) => {
      const label = this.add.text(-190, y, AUDIO_CHANNEL_LABELS[channel], {
        fontSize: '22px',
        color: '#ffffff',
        fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
      }).setOrigin(0, 0.5);
      const valueText = this.add.text(78, y, this.volumeLabel(channel), {
        fontSize: '22px',
        color: '#f5ddb0',
        fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
      }).setOrigin(0.5);
      const minus = new UIButton(this, -34, y, '-', () => this.adjustVolume(channel, -0.1), {
        width: 42,
        height: 34,
        fontSize: '24px',
      });
      const plus = new UIButton(this, 154, y, '+', () => this.adjustVolume(channel, 0.1), {
        width: 42,
        height: 34,
        fontSize: '24px',
      });
      this.volumeTexts[channel] = valueText;
      panel.add([label, minus, valueText, plus]);
    });

    this.muteButton = new UIButton(this, -70, 112, this.muteLabel(), () => this.toggleMute(), {
      width: 132,
      height: 40,
      fontSize: '20px',
    });
    const closeButton = new UIButton(this, 86, 112, '关闭', () => this.toggleSettingsPanel(), {
      width: 92,
      height: 40,
      fontSize: '20px',
    });
    panel.add([this.muteButton, closeButton]);
    this.settingsPanel = panel;
  }

  private adjustVolume(channel: AudioChannel, delta: number) {
    const settings = loadAudioSettings();
    setAudioChannelVolume(channel, settings.volumes[channel] + delta);
    applyAudioSettings(this.sound);
    if (channel === 'ambience') {
      updateBackgroundMusicVolume(this.sound);
    }
    this.volumeTexts[channel]?.setText(this.volumeLabel(channel));
  }

  private toggleMute() {
    const settings = setAudioMuted(!loadAudioSettings().muted);
    applyAudioSettings(this.sound);
    this.muteButton?.setLabel(settings.muted ? '取消静音' : '静音');
  }

  private volumeLabel(channel: AudioChannel) {
    return `${Math.round(loadAudioSettings().volumes[channel] * 100)}%`;
  }

  private muteLabel() {
    return loadAudioSettings().muted ? '取消静音' : '静音';
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
