import Phaser from 'phaser';
import { Boat } from '../components/Boat';
import { Character, type CharacterKind } from '../components/Character';
import { HistoryPanel } from '../components/HistoryPanel';
import { Toast } from '../components/Toast';
import { UIButton } from '../components/UIButton';
import type { BankState, GameState, Move, Side } from '../core/types';
import { applyMove, isBankSafe } from '../core/rules';
import { solveByBFS } from '../core/solver';
import { cloneState } from '../utils/cloneState';

type GameSceneData = {
  state?: GameState;
  undoStack?: GameState[];
  moveLabels?: string[];
  autoDemo?: boolean;
};

type GameButtons = {
  sail: UIButton;
  undo: UIButton;
  hint: UIButton;
  ai: UIButton;
  stopAi: UIButton;
  restart: UIButton;
  title: UIButton;
};

const BOAT_Y = 470;
const BANK_TOP_Y = 534;
const BANK_CHARACTER_Y = BANK_TOP_Y - 36;
const CHARACTER_SPACING = 58;

function initialState(): GameState {
  return {
    left: { huaqiang: 3, haoge: 3 },
    right: { huaqiang: 0, haoge: 0 },
    boatSide: 'left',
    boat: { huaqiang: 0, haoge: 0 },
    status: 'playing',
    steps: 0,
  };
}

function opposite(side: Side): Side {
  return side === 'left' ? 'right' : 'left';
}

function boatX(side: Side): number {
  return side === 'left' ? 430 : 850;
}

export class GameScene extends Phaser.Scene {
  private state: GameState = initialState();
  private undoStack: GameState[] = [];
  private moveLabels: string[] = [];
  private characters: Character[] = [];
  private selectedIds: string[] = [];
  private boat!: Boat;
  private statusText!: Phaser.GameObjects.Text;
  private historyPanel!: HistoryPanel;
  private buttons!: GameButtons;
  private isMoving = false;
  private aiRunning = false;
  private aiPath: Move[] = [];
  private aiStepIndex = 0;
  private aiDelay?: Phaser.Time.TimerEvent;
  private activeToast?: Toast;
  private autoDemo = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: GameSceneData = {}) {
    this.state = data.state ? cloneState(data.state) : initialState();
    this.undoStack = data.undoStack ? data.undoStack.map((item) => cloneState(item)) : [];
    this.moveLabels = data.moveLabels ? [...data.moveLabels] : [];
    this.characters = [];
    this.selectedIds = [];
    this.isMoving = false;
    this.aiRunning = false;
    this.aiPath = [];
    this.aiStepIndex = 0;
    this.activeToast = undefined;
    this.autoDemo = data.autoDemo ?? false;
  }

  create() {
    this.drawWorld();
    this.createUi();
    this.createCharacters();
    this.boat = new Boat(this, boatX(this.state.boatSide), BOAT_Y);
    this.syncCharactersToState();
    this.updateUi();
    if (this.autoDemo) {
      this.time.delayedCall(250, () => this.startAiDemo());
    }
  }

  private drawWorld() {
    this.add.rectangle(640, 360, 1280, 720, 0x9ed2df);
    this.add.rectangle(640, 452, 560, 286, 0x4c9dcc);
    this.add.rectangle(180, 626, 360, 184, 0x75a96a);
    this.add.rectangle(1100, 626, 360, 184, 0x72a364);
    this.add.rectangle(640, 44, 1240, 58, 0x1e2b30, 0.86);

    const graphics = this.add.graphics();
    graphics.lineStyle(4, 0xe6f5ec, 0.35);
    graphics.lineBetween(0, BANK_TOP_Y, 360, BANK_TOP_Y);
    graphics.lineBetween(920, BANK_TOP_Y, 1280, BANK_TOP_Y);
    graphics.lineStyle(2, 0xd7eff8, 0.18);
    for (let y = 360; y <= 520; y += 42) {
      graphics.lineBetween(396, y, 884, y + 14);
    }
  }

  private createUi() {
    this.statusText = this.add.text(38, 42, '', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0, 0.5);

    this.buttons = {
      sail: new UIButton(this, 640, 642, '开船', () => this.handleSail(), { width: 132, height: 46 }),
      undo: new UIButton(this, 790, 642, '撤销', () => this.handleUndo(), { width: 86, height: 40, fontSize: '18px' }),
      hint: new UIButton(this, 886, 642, '提示', () => this.handleHint(), { width: 86, height: 40, fontSize: '18px' }),
      ai: new UIButton(this, 982, 642, 'AI', () => this.startAiDemo(), { width: 76, height: 40, fontSize: '18px' }),
      stopAi: new UIButton(this, 1078, 642, '停止', () => this.stopAiDemo(), { width: 86, height: 40, fontSize: '18px' }),
      restart: new UIButton(this, 1174, 642, '重开', () => this.scene.start('GameScene'), { width: 86, height: 40, fontSize: '18px' }),
      title: new UIButton(this, 80, 642, '标题', () => this.scene.start('TitleScene'), { width: 86, height: 40, fontSize: '18px' }),
    };

    this.historyPanel = new HistoryPanel(this, 944, 98);
  }

  private createCharacters() {
    for (let i = 1; i <= 3; i += 1) {
      this.characters.push(new Character(this, 0, 0, `huaqiang-${i}`, 'huaqiang', 'left', (character) => {
        this.handleCharacterClick(character);
      }));
      this.characters.push(new Character(this, 0, 0, `haoge-${i}`, 'haoge', 'left', (character) => {
        this.handleCharacterClick(character);
      }));
    }
  }

  private handleCharacterClick(character: Character) {
    if (this.state.status !== 'playing' || this.aiRunning) {
      this.showToast('现在不能操作');
      return;
    }
    if (this.isMoving) {
      this.showToast('船正在动，先别急');
      return;
    }

    this.clearHint();
    if (character.location === 'boat') {
      this.selectedIds = this.selectedIds.filter((id) => id !== character.id);
      character.location = this.state.boatSide;
      this.positionCharacters();
      this.updateUi();
      return;
    }

    if (character.location !== this.state.boatSide) {
      this.showToast('船不在这一岸，别乱点');
      return;
    }
    if (this.selectedIds.length >= 2) {
      this.showToast('这船最多坐 2 个人');
      return;
    }

    character.location = 'boat';
    this.selectedIds.push(character.id);
    this.positionCharacters();
    this.updateUi();
  }

  private handleSail() {
    if (this.isMoving) {
      this.showToast('船正在动，先别急');
      return;
    }
    if (this.aiRunning) {
      this.showToast('现在不能开船');
      return;
    }
    this.commitSelectedMove();
  }

  private commitSelectedMove(onDone?: () => void) {
    if (this.selectedIds.length === 0) {
      this.showToast('船上没人，开不了船');
      return;
    }

    const move = this.selectedMove();
    const result = applyMove(this.state, move);
    if (!result.ok || !result.state) {
      this.showToast('现在不能开船');
      return;
    }

    const nextState = result.state;
    const previousState = cloneState(this.state);
    const label = this.formatMoveLabel(move, this.state.steps + 1);
    const movingCharacters = this.selectedCharacters();
    const to = move.to;

    this.undoStack.push(previousState);
    this.isMoving = true;
    this.updateUi();

    movingCharacters.forEach((character, index) => {
      const seat = { x: boatX(to) + (index === 0 ? -42 : 42), y: BOAT_Y - 8 };
      this.tweens.killTweensOf(character);
      this.tweens.add({
        targets: character,
        x: seat.x,
        y: seat.y,
        duration: 460,
        ease: 'Sine.easeInOut',
      });
    });

    this.tweens.add({
      targets: this.boat,
      x: boatX(to),
      duration: 460,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.state = nextState;
        this.moveLabels.push(label);
        this.selectedIds = [];
        this.isMoving = false;
        this.syncCharactersToState(false);
        this.updateUi();

        if (this.state.status !== 'playing') {
          this.enterGameOver();
          return;
        }

        if (onDone) onDone();
      },
    });
  }

  private handleUndo() {
    if (this.isMoving) {
      this.showToast('船正在动，先别急');
      return;
    }
    if (this.aiRunning) {
      this.showToast('先停止演示');
      return;
    }
    const previous = this.undoStack.pop();
    if (!previous) {
      this.showToast('已经没有上一步了');
      return;
    }

    this.clearHint();
    this.moveLabels.pop();
    this.selectedIds = [];
    this.state = previous;
    this.boat.setPosition(boatX(this.state.boatSide), BOAT_Y);
    this.syncCharactersToState(false);
    this.updateUi();
  }

  private handleHint() {
    if (this.state.status !== 'playing' || this.isMoving || this.aiRunning) {
      this.showToast('现在不能操作');
      return;
    }

    this.clearHint();
    const path = solveByBFS(this.state);
    if (path.length === 0) {
      this.showToast('当前局面无解，建议撤销一步');
      return;
    }

    const move = path[0];
    this.highlightMove(move);
    this.showToast(this.formatHint(move));
  }

  private startAiDemo() {
    if (this.state.status !== 'playing' || this.isMoving) {
      this.showToast('现在不能操作');
      return;
    }

    this.clearSelection();
    this.clearHint();
    const path = solveByBFS(this.state);
    if (path.length === 0) {
      this.showToast('当前局面无解，建议撤销一步');
      return;
    }

    this.aiRunning = true;
    this.aiPath = path;
    this.aiStepIndex = 0;
    this.updateUi();
    this.runNextAiStep();
  }

  private stopAiDemo() {
    if (!this.aiRunning) return;
    this.aiRunning = false;
    this.aiDelay?.remove(false);
    this.aiDelay = undefined;
    this.updateUi();
    this.showToast('演示已停止');
  }

  private runNextAiStep() {
    if (!this.aiRunning || this.state.status !== 'playing') return;
    const move = this.aiPath[this.aiStepIndex];
    if (!move) {
      this.stopAiDemo();
      return;
    }

    this.selectForMove(move);
    this.aiDelay = this.time.delayedCall(320, () => {
      this.commitSelectedMove(() => {
        this.aiStepIndex += 1;
        if (!this.aiRunning || this.state.status !== 'playing') return;
        const delay = Phaser.Math.Between(800, 1200);
        this.aiDelay = this.time.delayedCall(delay, () => this.runNextAiStep());
      });
    });
  }

  private selectForMove(move: Move) {
    this.clearSelection();
    const needs: BankState = { huaqiang: move.huaqiang, haoge: move.haoge };
    (['huaqiang', 'haoge'] as CharacterKind[]).forEach((kind) => {
      const candidates = this.characters.filter((character) => (
        character.kind === kind && character.location === move.from
      ));
      for (let i = 0; i < needs[kind]; i += 1) {
        const character = candidates[i];
        if (!character) continue;
        character.location = 'boat';
        this.selectedIds.push(character.id);
      }
    });
    this.positionCharacters();
    this.updateUi();
  }

  private syncCharactersToState(animated = true) {
    (['huaqiang', 'haoge'] as CharacterKind[]).forEach((kind) => {
      const characters = this.characters.filter((character) => character.kind === kind);
      const leftCount = this.state.left[kind];
      characters.forEach((character, index) => {
        character.location = index < leftCount ? 'left' : 'right';
      });
    });
    this.boat?.setPosition(boatX(this.state.boatSide), BOAT_Y);
    this.positionCharacters(animated);
  }

  private positionCharacters(animated = true) {
    (['left', 'right'] as Side[]).forEach((side) => {
      (['huaqiang', 'haoge'] as CharacterKind[]).forEach((kind) => {
        const characters = this.characters.filter((character) => (
          character.location === side && character.kind === kind
        ));
        characters.forEach((character, index) => {
          this.moveCharacter(character, this.bankPosition(side, kind, index), animated);
        });
      });
    });

    this.selectedCharacters().forEach((character, index) => {
      this.moveCharacter(character, this.boat.getSeatPosition(index), animated);
    });
  }

  private bankPosition(side: Side, kind: CharacterKind, index: number) {
    const startX = side === 'left' ? 56 : 934;
    const offset = kind === 'huaqiang' ? index : index + 3;
    return { x: startX + offset * CHARACTER_SPACING, y: BANK_CHARACTER_Y };
  }

  private moveCharacter(character: Character, position: { x: number; y: number }, animated: boolean) {
    this.tweens.killTweensOf(character);
    if (!animated) {
      character.setPosition(position.x, position.y);
      return;
    }
    if (Phaser.Math.Distance.Between(character.x, character.y, position.x, position.y) < 1) {
      character.setPosition(position.x, position.y);
      return;
    }
    this.tweens.add({
      targets: character,
      x: position.x,
      y: position.y,
      duration: 180,
      ease: 'Sine.easeOut',
    });
  }

  private selectedCharacters() {
    return this.selectedIds
      .map((id) => this.characters.find((character) => character.id === id))
      .filter((character): character is Character => Boolean(character));
  }

  private selectedCounts(): BankState {
    return this.selectedCharacters().reduce<BankState>((counts, character) => {
      counts[character.kind] += 1;
      return counts;
    }, { huaqiang: 0, haoge: 0 });
  }

  private selectedMove(): Move {
    const counts = this.selectedCounts();
    return {
      huaqiang: counts.huaqiang,
      haoge: counts.haoge,
      from: this.state.boatSide,
      to: opposite(this.state.boatSide),
    };
  }

  private clearSelection() {
    this.selectedCharacters().forEach((character) => {
      character.location = this.state.boatSide;
    });
    this.selectedIds = [];
    this.positionCharacters();
    this.updateUi();
  }

  private clearHint() {
    this.characters.forEach((character) => character.setHighlight(false));
  }

  private highlightMove(move: Move) {
    const needs: BankState = { huaqiang: move.huaqiang, haoge: move.haoge };
    (['huaqiang', 'haoge'] as CharacterKind[]).forEach((kind) => {
      const candidates = this.characters.filter((character) => (
        character.kind === kind && character.location === move.from
      ));
      for (let i = 0; i < needs[kind]; i += 1) {
        candidates[i]?.setHighlight(true);
      }
    });
  }

  private updateUi() {
    const selected = this.selectedCounts();
    const left = { ...this.state.left };
    const right = { ...this.state.right };
    const currentBank = this.state.boatSide === 'left' ? left : right;
    currentBank.huaqiang -= selected.huaqiang;
    currentBank.haoge -= selected.haoge;

    this.statusText.setText(
      `左岸 ${left.huaqiang + left.haoge}/6    ` +
      `右岸 ${right.huaqiang + right.haoge}/6    ` +
      `船上 ${selected.huaqiang + selected.haoge}/2    ` +
      `步数 ${this.state.steps}`
    );
    this.historyPanel.update(this.moveLabels);
    this.updateButtons();
  }

  private updateButtons() {
    const canOperate = this.state.status === 'playing' && !this.isMoving;
    this.buttons.sail.setEnabled(canOperate && !this.aiRunning && this.selectedIds.length > 0);
    this.buttons.undo.setEnabled(canOperate && !this.aiRunning && this.undoStack.length > 0);
    this.buttons.hint.setEnabled(canOperate && !this.aiRunning);
    this.buttons.ai.setEnabled(canOperate && !this.aiRunning);
    this.buttons.stopAi.setEnabled(this.aiRunning);
    this.buttons.restart.setEnabled(!this.isMoving);
    this.buttons.title.setEnabled(!this.isMoving);
  }

  private formatMoveLabel(move: Move, step: number) {
    const parts = this.moveParts(move);
    const arrow = move.to === 'right' ? '→ 右岸' : '← 左岸';
    return `第 ${step} 步：${parts} ${arrow}`;
  }

  private formatHint(move: Move) {
    const direction = move.to === 'right' ? '去右岸' : '回来';
    return `试试让 ${this.moveParts(move)} ${direction}`;
  }

  private moveParts(move: Pick<Move, 'huaqiang' | 'haoge'>) {
    const parts: string[] = [];
    if (move.huaqiang > 0) parts.push(`${move.huaqiang} 个华强`);
    if (move.haoge > 0) parts.push(`${move.haoge} 个郝哥`);
    return parts.join(' + ');
  }

  private showToast(message: string) {
    this.activeToast?.destroy();
    this.activeToast = new Toast(this, 640, 586, message);
  }

  private enterGameOver() {
    this.aiRunning = false;
    this.aiDelay?.remove(false);
    this.time.delayedCall(520, () => {
      this.scene.start('GameOverScene', {
        status: this.state.status,
        state: cloneState(this.state),
        undoStack: this.undoStack.map((item) => cloneState(item)),
        moveLabels: [...this.moveLabels],
        losingSide: this.losingSide(),
      });
    });
  }

  private losingSide(): Side | undefined {
    if (!isBankSafe(this.state.left)) return 'left';
    if (!isBankSafe(this.state.right)) return 'right';
    return undefined;
  }
}
