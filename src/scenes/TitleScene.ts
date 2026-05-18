import Phaser from 'phaser';
import { UIButton } from '../components/UIButton';
import {
  type AudioChannel,
  applyAudioSettings,
  loadAudioSettings,
  setAudioChannelVolume,
  setAudioMuted,
  startBackgroundMusic,
  startTitleMusic,
  updateBackgroundMusicVolume,
} from '../config/audio';
import { formatDuration, getLeaderboard, type LeaderboardEntry } from '../services/leaderboard';

const AUDIO_CHANNEL_LABELS: Record<AudioChannel, string> = {
  sfx: '音效',
  voice: '语音',
  ambience: '环境',
};

export class TitleScene extends Phaser.Scene {
  private settingsPanel?: Phaser.GameObjects.Container;
  private leaderboardPanel?: Phaser.GameObjects.Container;
  private volumeTexts: Partial<Record<AudioChannel, Phaser.GameObjects.Text>> = {};
  private muteButton?: UIButton;

  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    applyAudioSettings(this.sound);
    startTitleMusic(this.sound);
    this.settingsPanel = undefined;
    this.leaderboardPanel = undefined;
    this.volumeTexts = {};
    this.muteButton = undefined;

    // 1. 全屏背景占位（后续替换为像素风夜市背景图）
    this.add.rectangle(640, 360, 1280, 720, 0x101416);

    // 2. 中央木牌面板
    const panelX = 640;
    const panelY = 370;
    const panelW = 800;
    const panelH = 520;
    const panelR = 20;

    const panelBg = this.add.graphics();
    // 面板阴影
    panelBg.fillStyle(0x000000, 0.35);
    panelBg.fillRoundedRect(panelX - panelW / 2 + 6, panelY - panelH / 2 + 6, panelW, panelH, panelR);
    // 面板底色（深木色，后续可换木牌贴图）
    panelBg.fillStyle(0x2d1f14, 1);
    panelBg.fillRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, panelR);
    // 面板边框
    panelBg.lineStyle(4, 0x8b5e3c, 1);
    panelBg.strokeRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, panelR);

    // 3. 标题背景条（木牌上的铭牌）
    const titleBarW = 560;
    const titleBarH = 100;
    const titleBarY = 155;
    const titleGraphics = this.add.graphics();
    titleGraphics.fillStyle(0xc49a6c, 1);
    titleGraphics.fillRoundedRect(panelX - titleBarW / 2, titleBarY - titleBarH / 2, titleBarW, titleBarH, 16);
    titleGraphics.lineStyle(3, 0x5c3a21, 1);
    titleGraphics.strokeRoundedRect(panelX - titleBarW / 2, titleBarY - titleBarH / 2, titleBarW, titleBarH, 16);

    // 4. 标题文字
    this.add.text(panelX, 140, '郝哥求生指南', {
      fontSize: '52px',
      color: '#2b2026',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(panelX, 228, 'Press on Play', {
      fontSize: '22px',
      color: '#a08060',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0.5);

    // 5. 规则区域背景（纸张色便签区）
    const ruleW = 760;
    const ruleH = 220;
    const ruleY = 355;
    const ruleGraphics = this.add.graphics();
    ruleGraphics.fillStyle(0xf5e6c8, 1);
    ruleGraphics.fillRoundedRect(panelX - ruleW / 2, ruleY - ruleH / 2, ruleW, ruleH, 14);
    ruleGraphics.lineStyle(2, 0x8b5e3c, 0.6);
    ruleGraphics.strokeRoundedRect(panelX - ruleW / 2, ruleY - ruleH / 2, ruleW, ruleH, 14);
    // 中间分隔线
    ruleGraphics.lineStyle(2, 0x8b5e3c, 0.25);
    ruleGraphics.lineBetween(panelX, ruleY - ruleH / 2 + 20, panelX, ruleY + ruleH / 2 - 20);

    // 6. 规则文字（左右分栏）
    const leftX = panelX - ruleW / 2 + 30;
    const rightX = panelX + 10;
    const textY = ruleY - 10;

    this.add.text(leftX, textY, '请帮 3 个华强和 3 个郝哥\n安全移动到河对岸。', {
      fontSize: '28px',
      color: '#5c3a21',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
      lineSpacing: 14,
    }).setOrigin(0, 0.5);

    this.add.text(rightX, textY, '注意：任意一岸只要华强多于郝哥，且该岸还有郝哥，游戏失败。', {
      fontSize: '24px',
      color: '#8a3048',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
      lineSpacing: 12,
      wordWrap: { width: 340, useAdvancedWrap: true },
    }).setOrigin(0, 0.5);

    // 7. 按钮区
    new UIButton(this, 420, 535, '排行榜', () => {
      this.toggleLeaderboardPanel();
    }, {
      width: 140,
      height: 58,
      fontSize: '24px',
    });

    new UIButton(this, 600, 535, '开始游戏', () => {
      applyAudioSettings(this.sound);
      startBackgroundMusic(this.sound);
      this.scene.start('GameScene');
    }, {
      width: 180,
      height: 58,
      fontSize: '26px',
    });

    new UIButton(this, 800, 535, '设置', () => this.toggleSettingsPanel(), {
      width: 120,
      height: 58,
      fontSize: '24px',
    });
  }

  private toggleSettingsPanel() {
    if (this.leaderboardPanel) {
      this.leaderboardPanel.destroy(true);
      this.leaderboardPanel = undefined;
    }

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

  private toggleLeaderboardPanel() {
    if (this.settingsPanel) {
      this.settingsPanel.destroy(true);
      this.settingsPanel = undefined;
      this.volumeTexts = {};
      this.muteButton = undefined;
    }

    if (this.leaderboardPanel) {
      this.leaderboardPanel.destroy(true);
      this.leaderboardPanel = undefined;
      return;
    }

    const panel = this.add.container(640, 500).setDepth(20);
    const background = this.add.rectangle(0, 0, 660, 330, 0x1e2b30, 0.97).setStrokeStyle(3, 0xf5e6c8, 0.28);
    const title = this.add.text(0, -136, '摆渡排行榜', {
      fontSize: '30px',
      color: '#ffffff',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0.5);
    const subtitle = this.add.text(0, -100, '按步数优先，步数相同按用时排序', {
      fontSize: '18px',
      color: '#c8d7d0',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0.5);
    panel.add([background, title, subtitle]);

    const loading = this.add.text(0, 8, '加载中...', {
      fontSize: '26px',
      color: '#d9e6df',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0.5);
    panel.add(loading);

    const closeButton = new UIButton(this, 0, 132, '关闭', () => this.toggleLeaderboardPanel(), {
      width: 100,
      height: 40,
      fontSize: '20px',
    });
    panel.add(closeButton);
    this.leaderboardPanel = panel;
    void this.populateLeaderboardPanel(panel, loading);
  }

  private async populateLeaderboardPanel(panel: Phaser.GameObjects.Container, loading: Phaser.GameObjects.Text) {
    try {
      const entries = await getLeaderboard();
      if (this.leaderboardPanel !== panel) return;
      loading.destroy();

      if (entries.length === 0) {
        const empty = this.add.text(0, 8, '暂无记录', {
          fontSize: '26px',
          color: '#d9e6df',
          fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
        }).setOrigin(0.5);
        panel.add(empty);
        return;
      }

      this.addLeaderboardRows(panel, entries);
    } catch {
      if (this.leaderboardPanel !== panel) return;
      loading.setText('排行榜暂时不可用');
    }
  }

  private addLeaderboardRows(panel: Phaser.GameObjects.Container, entries: LeaderboardEntry[]) {
    const header = this.add.text(-278, -62, '排名   姓名             步数   用时     达成时间', {
      fontSize: '17px',
      color: '#9eb8ae',
      fontFamily: 'Consolas, "Microsoft YaHei", monospace',
    }).setOrigin(0, 0.5);
    panel.add(header);

    entries.slice(0, 5).forEach((entry, index) => {
      const row = [
        `${index + 1}`.padStart(2, ' '),
        entry.name.padEnd(10, ' '),
        `${entry.steps}`.padStart(3, ' '),
        formatDuration(entry.durationMs).padStart(6, ' '),
        this.formatCompletedAt(entry.completedAt),
      ].join('   ');
      const text = this.add.text(-278, -24 + index * 28, row, {
        fontSize: '18px',
        color: index === 0 ? '#ffe08a' : '#ffffff',
        fontFamily: 'Consolas, "Microsoft YaHei", monospace',
      }).setOrigin(0, 0.5);
      panel.add(text);
    });
  }

  private formatCompletedAt(completedAt: string): string {
    const date = new Date(completedAt);
    if (Number.isNaN(date.getTime())) return '--';
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
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

}
