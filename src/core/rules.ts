import type { BankState, GameState, Move, ApplyMoveResult } from './types';

export function isBankSafe(bank: BankState): boolean {
  if (bank.haoge === 0) return true;
  return bank.huaqiang <= bank.haoge;
}

export function isStateSafe(state: GameState): boolean {
  return isBankSafe(state.left) && isBankSafe(state.right);
}

export function isWin(state: GameState): boolean {
  return (
    state.left.huaqiang === 0 &&
    state.left.haoge === 0 &&
    state.right.huaqiang === 3 &&
    state.right.haoge === 3 &&
    state.boatSide === 'right'
  );
}

export function isLose(state: GameState): boolean {
  return !isBankSafe(state.left) || !isBankSafe(state.right);
}

export function getPossibleMoves(state: GameState): Move[] {
  const side = state.boatSide;
  const bank = state[side];
  const allMoves: Array<{ huaqiang: number; haoge: number }> = [
    { huaqiang: 1, haoge: 0 },
    { huaqiang: 0, haoge: 1 },
    { huaqiang: 2, haoge: 0 },
    { huaqiang: 0, haoge: 2 },
    { huaqiang: 1, haoge: 1 },
  ];

  const valid = allMoves.filter(
    (m) => m.huaqiang <= bank.huaqiang && m.haoge <= bank.haoge && (m.huaqiang + m.haoge > 0)
  );

  const to = side === 'left' ? 'right' : 'left';
  return valid.map((m) => ({ ...m, from: side, to }));
}

export function getSafeMoves(state: GameState): Move[] {
  return getPossibleMoves(state).filter((move) => {
    const result = applyMove(state, move);
    return result.ok && result.state && isStateSafe(result.state);
  });
}

export function applyMove(state: GameState, move: Move): ApplyMoveResult {
  if (state.status !== 'playing') {
    return { ok: false, reason: 'GAME_NOT_PLAYING' };
  }

  const totalBoat = move.huaqiang + move.haoge;
  if (totalBoat === 0) {
    return { ok: false, reason: 'EMPTY_BOAT' };
  }
  if (totalBoat > 2) {
    return { ok: false, reason: 'OVER_CAPACITY' };
  }

  const side = state.boatSide;
  const to = side === 'left' ? 'right' : 'left';

  if (move.from !== side) {
    return { ok: false, reason: 'WRONG_SIDE' };
  }
  if (move.to !== to) {
    return { ok: false, reason: 'WRONG_SIDE' };
  }

  const bank = state[side];
  if (move.huaqiang > bank.huaqiang || move.haoge > bank.haoge) {
    return { ok: false, reason: 'NOT_ENOUGH_PEOPLE' };
  }

  const newState: GameState = {
    left: { ...state.left },
    right: { ...state.right },
    boatSide: to,
    boat: { huaqiang: 0, haoge: 0 },
    status: 'playing',
    steps: state.steps + 1,
  };

  newState[side].huaqiang -= move.huaqiang;
  newState[side].haoge -= move.haoge;
  newState[to].huaqiang += move.huaqiang;
  newState[to].haoge += move.haoge;

  if (isWin(newState)) {
    newState.status = 'win';
  } else if (isLose(newState)) {
    newState.status = 'lose';
  }

  return { ok: true, state: newState };
}
