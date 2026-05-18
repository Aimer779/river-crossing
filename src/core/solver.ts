import type { GameState, Move } from './types';
import { applyMove, getSafeMoves, isWin } from './rules';

function stateKey(state: GameState): string {
  return `${state.left.huaqiang},${state.left.haoge},${state.right.huaqiang},${state.right.haoge},${state.boatSide}`;
}

export function solveByBFS(initial: GameState): Move[] {
  if (isWin(initial)) return [];

  const queue: Array<{ state: GameState; path: Move[] }> = [
    { state: initial, path: [] },
  ];
  const visited = new Set<string>();
  visited.add(stateKey(initial));

  while (queue.length > 0) {
    const { state, path } = queue.shift()!;

    for (const move of getSafeMoves(state)) {
      const result = applyMove(state, move);
      if (!result.ok || !result.state) continue;

      const next = result.state;
      const key = stateKey(next);
      if (visited.has(key)) continue;

      const newPath = [...path, move];
      if (isWin(next)) return newPath;

      visited.add(key);
      queue.push({ state: next, path: newPath });
    }
  }

  return [];
}
