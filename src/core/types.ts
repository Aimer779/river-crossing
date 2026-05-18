export type Side = 'left' | 'right';

export type BankState = {
  huaqiang: number;
  haoge: number;
};

export type GameStatus = 'playing' | 'win' | 'lose';

export type GameState = {
  left: BankState;
  right: BankState;
  boatSide: Side;
  boat: BankState;
  status: GameStatus;
  steps: number;
};

export type Move = {
  huaqiang: number;
  haoge: number;
  from: Side;
  to: Side;
};

export type IllegalReason =
  | 'EMPTY_BOAT'
  | 'OVER_CAPACITY'
  | 'NOT_ENOUGH_PEOPLE'
  | 'WRONG_SIDE'
  | 'GAME_NOT_PLAYING'
  | 'BOAT_MOVING';

export type ApplyMoveResult = {
  ok: boolean;
  state?: GameState;
  reason?: IllegalReason;
};
