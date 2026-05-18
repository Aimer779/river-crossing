import type { GameState } from '../core/types';

export function cloneState(state: GameState): GameState {
  return structuredClone(state);
}
