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
    this.autoDemo = data.autoDemo ?? false;
  }

  create() {
    this.drawWorld();
    this.createUi();
    this.createCharacters();
    this.boat = new Boat(this, boatX(this.state.boatSide), 500);
    this.syncCharactersToState();
    this.updateUi();
    if (this.autoDemo) {
      this.time.delayedCall(250, () => this.startAiDemo());
    }
  }

  private drawWorld() {
    this.add.rectangle(640, 360, 1280, 720, 0x9ed2df);
    this.add.rectangle(180, 390, 360, 660, 0x75a96a);
    this.add.rectangle(1100, 390, 360, 660, 0x72a364);
    this.add.rectangle(640, 390, 560, 660, 0x4c9dcc);
    this.add.rectangle(640, 88, 1240, 74, 0x1e2b30, 0.85);
    this.add.text(148, 146, '左岸', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0.5);
    this.add.text(1132, 146, '右岸', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0.5);

    this.add.text(42, 218, '华强', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0, 0.5);
    this.add.text(42, 332, '郝哥', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0, 0.5);
    this.add.text(968, 218, '华强', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0, 0.5);
    this.add.text(968, 332, '郝哥', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    }).setOrigin(0, 0.5);
  }

  private createUi() {
    this.statusText = this.add.text(38, 42, '', {
      fontSize: '21px',
      color: '#ffffff',
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
    });

    this.buttons = {
      sail: new UIButton(this, 110, 650, '开船', () => this.handleSail()),
      undo: new UIButton(this, 250, 650, '撤销', () => this.handleUndo()),
      hint: new UIButton(this, 390, 650, '提示', () => this.handleHint()),
      ai: new UIButton(this, 530, 650, 'AI 演示', () => this.startAiDemo()),
      stopAi: new UIButton(this, 670, 650, '停止演示', () => this.stopAiDemo()),
      restart: new UIButton(this, 810, 650, '重开', () => this.scene.start('GameScene')),
      title: new UIButton(this, 950, 650, '返回标题', () => this.scene.start('TitleScene')),
    };

    this.historyPanel = new HistoryPanel(this, 944, 200);
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
      const seat = { x: boatX(to) + (index === 0 ? -42 : 42), y: 492 };
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
        this.syncCharactersToState();
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
    this.boat.setPosition(boatX(this.state.boatSide), 500);
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
    this.boat?.setPosition(boatX(this.state.boatSide), 500);
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
    const startX = side === 'left' ? 110 : 1035;
    const y = kind === 'huaqiang' ? 218 : 332;
    return { x: startX + index * 78, y };
  }

  private moveCharacter(character: Character, position: { x: number; y: number }, animated: boolean) {
    if (!animated) {
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
      `左岸：华强 × ${left.huaqiang}  郝哥 × ${left.haoge}    ` +
      `右岸：华强 × ${right.huaqiang}  郝哥 × ${right.haoge}    ` +
      `船上：${selected.huaqiang + selected.haoge} / 2    步数：${this.state.steps}`
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
    new Toast(this, 640, 594, message);
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
