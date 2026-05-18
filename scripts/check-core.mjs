import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const outDir = mkdtempSync(join(tmpdir(), 'river-core-'));
const tscBin = join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc');

function compileCore() {
  execFileSync(
    process.execPath,
    [
      tscBin,
      'src/core/types.ts',
      'src/core/rules.ts',
      'src/core/solver.ts',
      'src/core/history.ts',
      '--outDir',
      outDir,
      '--noEmit',
      'false',
      '--module',
      'commonjs',
      '--target',
      'ES2020',
      '--moduleResolution',
      'node',
      '--skipLibCheck',
      '--strict',
    ],
    { cwd: repoRoot, stdio: 'inherit' },
  );

}

function initialState() {
  return {
    left: { huaqiang: 3, haoge: 3 },
    right: { huaqiang: 0, haoge: 0 },
    boatSide: 'left',
    boat: { huaqiang: 0, haoge: 0 },
    status: 'playing',
    steps: 0,
  };
}

function assertPopulationConserved(state) {
  assert.equal(state.left.huaqiang + state.right.huaqiang + state.boat.huaqiang, 3);
  assert.equal(state.left.haoge + state.right.haoge + state.boat.haoge, 3);
  assert.ok(state.boat.huaqiang + state.boat.haoge >= 0);
  assert.ok(state.boat.huaqiang + state.boat.haoge <= 2);
}

try {
  compileCore();

  const require = createRequire(join(outDir, 'check-core.cjs'));
  const rules = require(join(outDir, 'rules.js'));
  const { solveByBFS } = require(join(outDir, 'solver.js'));
  const { HistoryStack } = require(join(outDir, 'history.js'));

  const state = initialState();
  assert.equal(rules.isBankSafe({ huaqiang: 3, haoge: 0 }), true);
  assert.equal(rules.isBankSafe({ huaqiang: 3, haoge: 1 }), false);
  assert.equal(rules.isStateSafe(state), true);
  assert.equal(rules.isWin(state), false);
  assert.equal(rules.isLose(state), false);

  assert.deepEqual(rules.getPossibleMoves(state), [
    { huaqiang: 1, haoge: 0, from: 'left', to: 'right' },
    { huaqiang: 0, haoge: 1, from: 'left', to: 'right' },
    { huaqiang: 2, haoge: 0, from: 'left', to: 'right' },
    { huaqiang: 0, haoge: 2, from: 'left', to: 'right' },
    { huaqiang: 1, haoge: 1, from: 'left', to: 'right' },
  ]);
  assert.deepEqual(rules.getSafeMoves(state), [
    { huaqiang: 1, haoge: 0, from: 'left', to: 'right' },
    { huaqiang: 2, haoge: 0, from: 'left', to: 'right' },
    { huaqiang: 1, haoge: 1, from: 'left', to: 'right' },
  ]);

  assert.deepEqual(rules.applyMove(state, { huaqiang: 0, haoge: 0, from: 'left', to: 'right' }), {
    ok: false,
    reason: 'EMPTY_BOAT',
  });
  assert.deepEqual(rules.applyMove(state, { huaqiang: 3, haoge: 0, from: 'left', to: 'right' }), {
    ok: false,
    reason: 'OVER_CAPACITY',
  });
  assert.deepEqual(rules.applyMove(state, { huaqiang: 1, haoge: 0, from: 'right', to: 'left' }), {
    ok: false,
    reason: 'WRONG_SIDE',
  });
  assert.deepEqual(rules.applyMove(state, { huaqiang: 1, haoge: 0, from: 'left', to: 'left' }), {
    ok: false,
    reason: 'WRONG_SIDE',
  });
  assert.deepEqual(
    rules.applyMove(
      {
        left: { huaqiang: 1, haoge: 1 },
        right: { huaqiang: 2, haoge: 2 },
        boatSide: 'left',
        boat: { huaqiang: 0, haoge: 0 },
        status: 'playing',
        steps: 4,
      },
      { huaqiang: 2, haoge: 0, from: 'left', to: 'right' },
    ),
    {
      ok: false,
      reason: 'NOT_ENOUGH_PEOPLE',
    },
  );
  assert.deepEqual(rules.applyMove(state, { huaqiang: 0, haoge: 4, from: 'left', to: 'right' }), {
    ok: false,
    reason: 'OVER_CAPACITY',
  });

  const losingMove = rules.applyMove(state, { huaqiang: 0, haoge: 2, from: 'left', to: 'right' });
  assert.equal(losingMove.ok, true);
  assert.equal(losingMove.state.status, 'lose');
  assertPopulationConserved(losingMove.state);

  assert.deepEqual(state, initialState());

  const path = solveByBFS(state);
  assert.equal(path.length, 11);
  assert.deepEqual(path[0], { huaqiang: 2, haoge: 0, from: 'left', to: 'right' });

  let current = state;
  for (const move of path) {
    const safeMoves = rules.getSafeMoves(current);
    assert.ok(safeMoves.some((safeMove) => JSON.stringify(safeMove) === JSON.stringify(move)));

    const result = rules.applyMove(current, move);
    assert.equal(result.ok, true);
    current = result.state;
    assertPopulationConserved(current);
  }
  assert.equal(current.status, 'win');
  assert.equal(current.steps, 11);
  assert.equal(rules.isWin(current), true);

  const history = new HistoryStack();
  history.push(state);
  state.left.huaqiang = 0;
  assert.deepEqual(history.pop(), initialState());
  assert.equal(history.canUndo(), false);

  console.log('core checks passed');
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
