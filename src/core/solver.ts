import type { GameState, Move } from './types';
import { applyMove, isWin } from './rules';

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

  const allMoves: Array<{ huaqiang: number; haoge: number }> = [
    { huaqiang: 1, haoge: 0 },
    { huaqiang: 0, haoge: 1 },
    { huaqiang: 2, haoge: 0 },
    { huaqiang: 0, haoge: 2 },
    { huaqiang: 1, haoge: 1 },
  ];

  while (queue.length > 0) {
    const { state, path } = queue.shift()!;
    const side = state.boatSide;
    const bank = state[side];
    const to = side === 'left' ? 'right' : 'left';

    for (const m of allMoves) {
      if (m.huaqiang > bank.huaqiang || m.haoge > bank.haoge) continue;
      if (m.huaqiang + m.haoge === 0 || m.huaqiang + m.haoge > 2) continue;

      const move: Move = { huaqiang: m.huaqiang, haoge: m.haoge, from: side, to };
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
