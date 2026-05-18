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
import {
  defaultSceneLayout,
  isLayoutDevMode,
  loadSceneLayout,
  resetSceneLayout,
  saveSceneLayout,
  type SceneLayout,
} from '../config/layout';

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

type WorldObjects = {
  background: Phaser.GameObjects.Rectangle;
  river: Phaser.GameObjects.Rectangle;
  leftBank: Phaser.GameObjects.Rectangle;
  rightBank: Phaser.GameObjects.Rectangle;
  statusBar: Phaser.GameObjects.Rectangle;
  graphics: Phaser.GameObjects.Graphics;
};

type DevTarget = {
  label: string;
  x?: keyof SceneLayout;
  y?: keyof SceneLayout;
  width?: keyof SceneLayout;
  height?: keyof SceneLayout;
  spacing?: keyof SceneLayout;
};

const DEV_TARGETS: DevTarget[] = [
  { label: 'river', x: 'riverX', y: 'riverY', width: 'riverWidth', height: 'riverHeight' },
  { label: 'left bank', x: 'leftBankX', y: 'leftBankY', width: 'leftBankWidth', height: 'leftBankHeight' },
  { label: 'right bank', x: 'rightBankX', y: 'rightBankY', width: 'rightBankWidth', height: 'rightBankHeight' },
  { label: 'bank top line', y: 'bankTopY' },
  { label: 'boat left dock', x: 'boatLeftX', y: 'boatY' },
  { label: 'boat right dock', x: 'boatRightX', y: 'boatY' },
  { label: 'left characters', x: 'leftStartX', y: 'characterY', spacing: 'characterSpacing' },
  { label: 'right characters', x: 'rightStartX', y: 'characterY', spacing: 'characterSpacing' },
];

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

export class GameScene extends Phaser.Scene {
  private state: GameState = initialState();
  private layout: SceneLayout = loadSceneLayout();
  private undoStack: GameState[] = [];
  private moveLabels: string[] = [];
  private characters: Character[] = [];
  private selectedIds: string[] = [];
  private boat!: Boat;
  private world?: WorldObjects;
  private statusText!: Phaser.GameObjects.Text;
  private historyPanel!: HistoryPanel;
  private buttons!: GameButtons;
  private devMode = false;
  private devTargetIndex = 0;
  private devText?: Phaser.GameObjects.Text;
  private devGuide?: Phaser.GameObjects.Graphics;
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
    this.layout = loadSceneLayout();
    this.devMode = isLayoutDevMode();
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
    this.world = undefined;
    this.devText = undefined;
    this.devGuide = undefined;
    this.autoDemo = data.autoDemo ?? false;
  }

  create() {
    this.drawWorld();
    this.createUi();
    this.createCharacters();
    this.boat = new Boat(this, this.boatX(this.state.boatSide), this.layout.boatY);
    this.syncCharactersToState();
    this.updateUi();
    if (this.devMode) {
      this.createDevTools();
    }
    if (this.autoDemo) {
      this.time.delayedCall(250, () => this.startAiDemo());
    }
  }

  private drawWorld() {
    this.world = {
      background: this.add.rectangle(640, 360, 1280, 720, 0x9ed2df),
      river: this.add.rectangle(640, 452, 560, 286, 0x4c9dcc),
      leftBank: this.add.rectangle(180, 626, 360, 184, 0x75a96a),
      rightBank: this.add.rectangle(1100, 626, 360, 184, 0x72a364),
      statusBar: this.add.rectangle(640, 44, 1240, 58, 0x1e2b30, 0.86),
      graphics: this.add.graphics(),
    };
    this.updateWorldLayout();
  }

  private updateWorldLayout() {
    if (!this.world) return;
    const { layout } = this;
    this.world.background.setPosition(layout.width / 2, layout.height / 2).setSize(layout.width, layout.height);
    this.world.river.setPosition(layout.riverX, layout.riverY).setSize(layout.riverWidth, layout.riverHeight);
    this.world.leftBank.setPosition(layout.leftBankX, layout.leftBankY).setSize(layout.leftBankWidth, layout.leftBankHeight);
    this.world.rightBank.setPosition(layout.rightBankX, layout.rightBankY).setSize(layout.rightBankWidth, layout.rightBankHeight);
    this.world.statusBar.setPosition(640, 44).setSize(1240, 58);

    const riverLeft = layout.riverX - layout.riverWidth / 2;
    const riverRight = layout.riverX + layout.riverWidth / 2;
    this.world.graphics.clear();
    this.world.graphics.lineStyle(4, 0xe6f5ec, 0.35);
    this.world.graphics.lineBetween(0, layout.bankTopY, layout.leftBankX + layout.leftBankWidth / 2, layout.bankTopY);
    this.world.graphics.lineBetween(layout.rightBankX - layout.rightBankWidth / 2, layout.bankTopY, layout.width, layout.bankTopY);
    this.world.graphics.lineStyle(2, 0xd7eff8, 0.18);
    for (let y = layout.riverY - layout.riverHeight / 3; y <= layout.riverY + layout.riverHeight / 4; y += 42) {
      this.world.graphics.lineBetween(riverLeft + 36, y, riverRight - 36, y + 14);
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

  private createDevTools() {
    this.devGuide = this.add.graphics().setDepth(900);
    this.devText = this.add.text(16, 82, '', {
      fontSize: '15px',
      color: '#fff8c9',
      backgroundColor: '#1e2428',
      padding: { x: 10, y: 8 },
      fontFamily: 'Consolas, "Microsoft YaHei", monospace',
      lineSpacing: 4,
    }).setDepth(901);
    this.input.keyboard?.on('keydown', this.handleDevKey, this);
    this.updateDevTools();
  }

  private handleDevKey(event: KeyboardEvent) {
    const key = event.key;
    const step = event.shiftKey ? 10 : 1;
    let handled = true;

    if (key === 'n' || key === 'N') {
      this.devTargetIndex = (this.devTargetIndex + 1) % DEV_TARGETS.length;
    } else if (key === 'p' || key === 'P') {
      this.devTargetIndex = (this.devTargetIndex - 1 + DEV_TARGETS.length) % DEV_TARGETS.length;
    } else if (key === 'ArrowLeft') {
      this.adjustDevTarget('x', -step);
    } else if (key === 'ArrowRight') {
      this.adjustDevTarget('x', step);
    } else if (key === 'ArrowUp') {
      this.adjustDevTarget('y', -step);
    } else if (key === 'ArrowDown') {
      this.adjustDevTarget('y', step);
    } else if (key === '[') {
      this.adjustDevTarget('width', -step);
    } else if (key === ']') {
      this.adjustDevTarget('width', step);
    } else if (key === ';') {
      this.adjustDevTarget('height', -step);
    } else if (key === "'") {
      this.adjustDevTarget('height', step);
    } else if (key === ',') {
      this.adjustDevTarget('spacing', -step);
    } else if (key === '.') {
      this.adjustDevTarget('spacing', step);
    } else if (key === 'Enter') {
      saveSceneLayout(this.layout);
      this.showToast('布局已保存到 localStorage');
    } else if (key === 'Backspace') {
      resetSceneLayout();
      this.layout = { ...defaultSceneLayout };
      this.refreshAfterLayoutEdit();
      this.showToast('布局已重置');
    } else if (key === 'c' || key === 'C') {
      this.copyLayoutJson();
    } else {
      handled = false;
    }

    if (handled) {
      event.preventDefault();
      this.updateDevTools();
    }
  }

  private adjustDevTarget(kind: keyof Pick<DevTarget, 'x' | 'y' | 'width' | 'height' | 'spacing'>, delta: number) {
    const field = DEV_TARGETS[this.devTargetIndex][kind];
    if (!field) return;
    const min = kind === 'width' || kind === 'height' ? 20 : kind === 'spacing' ? 24 : -200;
    this.layout[field] = Math.max(min, Math.round(this.layout[field] + delta));
    this.refreshAfterLayoutEdit();
  }

  private refreshAfterLayoutEdit() {
    this.updateWorldLayout();
    this.boat?.setPosition(this.boatX(this.state.boatSide), this.layout.boatY);
    this.positionCharacters(false);
    this.updateDevTools();
  }

  private updateDevTools() {
    this.updateDevText();
    this.updateDevGuide();
  }

  private updateDevText() {
    if (!this.devText) return;
    const target = DEV_TARGETS[this.devTargetIndex];
    this.devText.setText([
      'DEV LAYOUT MODE',
      `target ${this.devTargetIndex + 1}/${DEV_TARGETS.length}: ${target.label}`,
      'N/P target | arrows move | Shift = 10px',
      '[] width | ;/\' height | ,/. spacing',
      'Enter save | Backspace reset | C copy JSON',
      this.formatDevTargetValue(target),
    ]);
  }

  private formatDevTargetValue(target: DevTarget): string {
    const parts: string[] = [];
    if (target.x) parts.push(`${target.x}=${this.layout[target.x]}`);
    if (target.y) parts.push(`${target.y}=${this.layout[target.y]}`);
    if (target.width) parts.push(`${target.width}=${this.layout[target.width]}`);
    if (target.height) parts.push(`${target.height}=${this.layout[target.height]}`);
    if (target.spacing) parts.push(`${target.spacing}=${this.layout[target.spacing]}`);
    return parts.join('  ');
  }

  private updateDevGuide() {
    if (!this.devGuide) return;
    this.devGuide.clear();
    const target = DEV_TARGETS[this.devTargetIndex];
    this.devGuide.lineStyle(3, 0xfff06a, 1);
    this.devGuide.fillStyle(0xfff06a, 0.8);

    if (target.width && target.height && target.x && target.y) {
      const x = this.layout[target.x] - this.layout[target.width] / 2;
      const y = this.layout[target.y] - this.layout[target.height] / 2;
      this.devGuide.strokeRect(x, y, this.layout[target.width], this.layout[target.height]);
      return;
    }

    if (target.x && target.y) {
      this.devGuide.strokeCircle(this.layout[target.x], this.layout[target.y], 22);
      this.devGuide.fillCircle(this.layout[target.x], this.layout[target.y], 5);
      return;
    }

    if (target.y) {
      this.devGuide.lineBetween(0, this.layout[target.y], this.layout.width, this.layout[target.y]);
    }
  }

  private copyLayoutJson() {
    const json = JSON.stringify(this.layout, null, 2);
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      console.info(json);
      this.showToast('当前浏览器不能复制，已输出到控制台');
      return;
    }

    navigator.clipboard.writeText(json)
      .then(() => this.showToast('布局 JSON 已复制'))
      .catch(() => {
        console.info(json);
        this.showToast('复制失败，已输出到控制台');
      });
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
      const seat = { x: this.boatX(to) + (index === 0 ? -42 : 42), y: this.layout.boatY - 8 };
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
      x: this.boatX(to),
      duration: 460,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.state = nextState;
        this.moveLabels.push(label);
        this.isMoving = false;
        movingCharacters.forEach((character) => {
          character.location = 'boat';
        });
        this.positionCharacters(false);
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
    this.boat.setPosition(this.boatX(this.state.boatSide), this.layout.boatY);
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
    this.boat?.setPosition(this.boatX(this.state.boatSide), this.layout.boatY);
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
    const startX = side === 'left' ? this.layout.leftStartX : this.layout.rightStartX;
    const offset = kind === 'huaqiang' ? index : index + 3;
    return { x: startX + offset * this.layout.characterSpacing, y: this.layout.characterY };
  }

  private boatX(side: Side): number {
    return side === 'left' ? this.layout.boatLeftX : this.layout.boatRightX;
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
