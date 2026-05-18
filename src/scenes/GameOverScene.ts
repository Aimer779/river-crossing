import Phaser from 'phaser';
import { UIButton } from '../components/UIButton';
import type { GameState, GameStatus, Side } from '../core/types';
import { cloneState } from '../utils/cloneState';

type GameOverData = {
  status?: GameStatus;
  state?: GameState;
  undoStack?: GameState[];
  moveLabels?: string[];
  losingSide?: Side;
};

export class GameOverScene extends Phaser.Scene {
  private dataFromGame: GameOverData = {};

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
    };
  }

  create() {
    const status = this.dataFromGame.status ?? 'lose';
    const isWin = status === 'win';
    const steps = this.dataFromGame.state?.steps ?? 0;
    const losingText = this.dataFromGame.losingSide === 'left'
      ? '左岸局势失控。'
      : this.dataFromGame.losingSide === 'right'
        ? '右岸局势失控。'
        : '';

    this.add.rectangle(640, 360, 1280, 720, isWin ? 0x244233 : 0x402a2a);
    this.add.text(640, 180, isWin ? '郝哥安全上岸！' : '郝哥被拿捏了！', {
      fontSize: '54px',
      color: '#ffffff',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0.5);

    this.add.text(640, 262, isWin ? '全员成功渡河，局势稳住了。' : '这一岸华强太多，郝哥顶不住了。', {
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
      this.scene.start('GameScene');
    });
    new UIButton(this, 780, 460, '返回标题', () => {
      this.scene.start('TitleScene');
    });
  }

  private undoToGame() {
    const undoStack = this.dataFromGame.undoStack ? [...this.dataFromGame.undoStack] : [];
    const moveLabels = this.dataFromGame.moveLabels ? [...this.dataFromGame.moveLabels] : [];
    const previous = undoStack.pop();
    if (!previous) return;
    moveLabels.pop();
    this.scene.start('GameScene', {
      state: previous,
      undoStack,
      moveLabels,
    });
  }
}
