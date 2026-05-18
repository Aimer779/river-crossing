import Phaser from 'phaser';
import { UIButton } from '../components/UIButton';
import { applyAudioSettings, audioKeys, startBackgroundMusic } from '../config/audio';
import type { GameState, GameStatus, Side } from '../core/types';
import {
  formatDuration,
  getLeaderboard,
  normalizeLeaderboardName,
  saveLeaderboardEntry,
  type LeaderboardEntry,
} from '../services/leaderboard';
import { cloneState } from '../utils/cloneState';

type GameOverData = {
  status?: GameStatus;
  state?: GameState;
  undoStack?: GameState[];
  moveLabels?: string[];
  losingSide?: Side;
  startedAt?: number;
  durationMs?: number;
  completedAt?: string;
};

export class GameOverScene extends Phaser.Scene {
  private dataFromGame: GameOverData = {};
  private leaderboardRows: Phaser.GameObjects.Text[] = [];
  private submitButton?: UIButton;
  private submitStatus?: Phaser.GameObjects.Text;
  private nameInput?: Phaser.GameObjects.DOMElement;
  private submitted = false;
  private submitting = false;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: GameOverData = {}) {
    this.dataFromGame = {
      status: data.status,
      state: data.state ? cloneState(data.state) : undefined,
      undoStack: data.undoStack ? data.undoStack.map((item) => cloneState(item)) : [],
      moveLabels: data.moveLabels ? [...data.moveLabels] : [],
      losingSide: data.losingSide,
      startedAt: data.startedAt,
      durationMs: data.durationMs,
      completedAt: data.completedAt,
    };
    this.leaderboardRows = [];
    this.submitButton = undefined;
    this.submitStatus = undefined;
    this.nameInput = undefined;
    this.submitted = false;
    this.submitting = false;
  }

  create() {
    applyAudioSettings(this.sound);
    startBackgroundMusic(this.sound);

    const status = this.dataFromGame.status ?? 'lose';
    if (status === 'win') {
      this.createWinResult();
      return;
    }

    this.createLoseResult();
  }

  private createWinResult() {
    const steps = this.dataFromGame.state?.steps ?? 0;
    const durationMs = this.dataFromGame.durationMs ?? (
      this.dataFromGame.startedAt ? Date.now() - this.dataFromGame.startedAt : 0
    );

    this.add.rectangle(640, 360, 1280, 720, 0x244233);
    this.add.rectangle(356, 360, 560, 560, 0xf7ecd2, 1).setStrokeStyle(4, 0x614b2f, 0.42);
    this.add.rectangle(940, 360, 460, 560, 0x1e2b30, 0.9).setStrokeStyle(3, 0xf7ecd2, 0.22);

    this.add.text(356, 112, '郝哥的感谢信', {
      fontSize: '42px',
      color: '#3a2b1b',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0.5);

    this.add.text(126, 174, [
      '致这位靠谱的摆渡人：',
      '',
      '刚才这一路，多亏你把局势稳住。',
      '郝哥已经安全上岸，心里这块石头',
      '总算落地了。',
      '',
      `本局共用 ${steps} 步，用时 ${formatDuration(durationMs)}。`,
      '留个名字吧，这份人情郝哥记排行榜上。',
    ], {
      fontSize: '23px',
      color: '#3a2b1b',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
      lineSpacing: 8,
      wordWrap: { width: 460 },
    }).setOrigin(0, 0);

    this.add.text(126, 444, '姓名', {
      fontSize: '22px',
      color: '#3a2b1b',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0, 0.5);

    this.nameInput = this.add.dom(204, 424).createFromHTML(`
      <input name="playerName" maxlength="12" autocomplete="off" style="
        display: block;
        width: 300px;
        height: 40px;
        box-sizing: border-box;
        border: 2px solid rgba(58, 43, 27, 0.55);
        border-radius: 4px;
        background: #fffaf0;
        color: #2b2117;
        font: 20px Arial, 'Microsoft YaHei', sans-serif;
        padding: 0 12px;
        outline: none;
      " />
    `).setOrigin(0, 0);
    const input = this.getNameInputElement();
    input?.addEventListener('input', () => this.updateSubmitButton());

    this.submitButton = new UIButton(this, 356, 506, '记录成绩', () => {
      void this.submitScore();
    }, {
      width: 150,
      height: 44,
    });
    this.submitButton.setEnabled(false);

    this.submitStatus = this.add.text(356, 552, '', {
      fontSize: '20px',
      color: '#5a3f22',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0.5);

    const undo = new UIButton(this, 216, 626, '撤销一步', () => this.undoToGame(), { width: 112, fontSize: '18px' });
    undo.setEnabled((this.dataFromGame.undoStack?.length ?? 0) > 0);
    new UIButton(this, 356, 626, '重新开始', () => this.startScene('GameScene'), { width: 112, fontSize: '18px' });
    new UIButton(this, 496, 626, '返回标题', () => this.startScene('TitleScene'), { width: 112, fontSize: '18px' });

    this.add.text(940, 112, '摆渡排行榜', {
      fontSize: '34px',
      color: '#ffffff',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0.5);

    this.add.text(940, 158, '按步数优先，步数相同按用时排序', {
      fontSize: '18px',
      color: '#c8d7d0',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0.5);

    this.renderLeaderboardMessage('加载中...');
    void this.loadLeaderboard();
  }

  private createLoseResult() {
    const steps = this.dataFromGame.state?.steps ?? 0;
    const losingText = this.dataFromGame.losingSide === 'left'
      ? '左岸局势失控。'
      : this.dataFromGame.losingSide === 'right'
        ? '右岸局势失控。'
        : '';

    this.add.rectangle(640, 360, 1280, 720, 0x402a2a);
    this.add.text(640, 180, '郝哥被拿捏了！', {
      fontSize: '54px',
      color: '#ffffff',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0.5);

    this.add.text(640, 262, '这一岸华强太多，郝哥顶不住了。', {
      fontSize: '28px',
      color: '#f5ddb0',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0.5);

    if (losingText) {
      this.add.text(640, 306, losingText, {
        fontSize: '24px',
        color: '#ffd1d1',
        fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
      }).setOrigin(0.5);
    }

    this.add.text(640, 358, `本局共用 ${steps} 步。`, {
      fontSize: '26px',
      color: '#ffffff',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0.5);

    const undo = new UIButton(this, 500, 460, '撤销一步', () => this.undoToGame());
    undo.setEnabled((this.dataFromGame.undoStack?.length ?? 0) > 0);

    new UIButton(this, 640, 460, '重新开始', () => {
      this.startScene('GameScene');
    });
    new UIButton(this, 780, 460, '返回标题', () => {
      this.startScene('TitleScene');
    });
  }

  private getNameInputElement(): HTMLInputElement | undefined {
    const node = this.nameInput?.getChildByName('playerName');
    return node instanceof HTMLInputElement ? node : undefined;
  }

  private updateSubmitButton() {
    if (this.submitted || this.submitting) return;
    const name = normalizeLeaderboardName(this.getNameInputElement()?.value ?? '');
    this.submitButton?.setEnabled(name.length > 0);
  }

  private async submitScore() {
    if (this.submitted || this.submitting) return;
    const input = this.getNameInputElement();
    const name = normalizeLeaderboardName(input?.value ?? '');
    if (!name) {
      this.submitStatus?.setText('先留个名字。');
      this.submitButton?.setEnabled(false);
      return;
    }

    this.submitting = true;
    this.submitButton?.setLabel('记录中').setEnabled(false);
    this.submitStatus?.setText('正在记录...');

    try {
      const entries = await saveLeaderboardEntry({
        name,
        steps: this.dataFromGame.state?.steps ?? 0,
        durationMs: this.dataFromGame.durationMs ?? 0,
        completedAt: this.dataFromGame.completedAt ?? new Date().toISOString(),
      });
      if (input) {
        input.value = name;
        input.disabled = true;
      }
      this.submitted = true;
      this.submitButton?.setLabel('已记录').setEnabled(false);
      this.submitStatus?.setText('郝哥记下了。');
      this.renderLeaderboard(entries);
    } catch {
      this.submitting = false;
      this.submitButton?.setLabel('记录成绩');
      this.submitStatus?.setText('记录失败，稍后再试。');
      this.updateSubmitButton();
    }
  }

  private async loadLeaderboard() {
    try {
      this.renderLeaderboard(await getLeaderboard());
    } catch {
      this.renderLeaderboardMessage('排行榜暂时不可用');
    }
  }

  private renderLeaderboardMessage(message: string) {
    this.leaderboardRows.forEach((row) => row.destroy());
    this.leaderboardRows = [];
    this.leaderboardRows.push(this.add.text(940, 330, message, {
      fontSize: '24px',
      color: '#d9e6df',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0.5));
  }

  private renderLeaderboard(entries: LeaderboardEntry[]) {
    this.leaderboardRows.forEach((row) => row.destroy());
    this.leaderboardRows = [];

    if (entries.length === 0) {
      this.renderLeaderboardMessage('暂无记录');
      return;
    }

    const header = this.add.text(742, 204, '排名   姓名             步数   用时     达成时间', {
      fontSize: '17px',
      color: '#9eb8ae',
      fontFamily: 'Consolas, "Microsoft YaHei", monospace',
    }).setOrigin(0, 0.5);
    this.leaderboardRows.push(header);

    entries.slice(0, 10).forEach((entry, index) => {
      const row = [
        `${index + 1}`.padStart(2, ' '),
        entry.name.padEnd(10, ' '),
        `${entry.steps}`.padStart(3, ' '),
        formatDuration(entry.durationMs).padStart(6, ' '),
        this.formatCompletedAt(entry.completedAt),
      ].join('   ');
      const text = this.add.text(742, 240 + index * 34, row, {
        fontSize: '18px',
        color: index === 0 ? '#ffe08a' : '#ffffff',
        fontFamily: 'Consolas, "Microsoft YaHei", monospace',
      }).setOrigin(0, 0.5);
      this.leaderboardRows.push(text);
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

  private undoToGame() {
    const undoStack = this.dataFromGame.undoStack ? [...this.dataFromGame.undoStack] : [];
    const moveLabels = this.dataFromGame.moveLabels ? [...this.dataFromGame.moveLabels] : [];
    const previous = undoStack.pop();
    if (!previous) return;
    moveLabels.pop();
    this.startScene('GameScene', {
      state: previous,
      undoStack,
      moveLabels,
      startedAt: this.dataFromGame.startedAt,
    });
  }

  private startScene(key: string, data?: object) {
    this.sound.stopByKey(audioKeys.lose);
    this.scene.start(key, data);
  }
}
