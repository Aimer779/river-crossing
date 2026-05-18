import type { GameState } from './types';

export class HistoryStack {
  private stack: GameState[] = [];

  push(state: GameState) {
    this.stack.push(structuredClone(state));
  }

  pop(): GameState | undefined {
    return this.stack.pop();
  }

  canUndo(): boolean {
    return this.stack.length > 0;
  }

  clear() {
    this.stack = [];
  }
}
