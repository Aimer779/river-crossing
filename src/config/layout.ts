export type SceneLayout = {
  width: number;
  height: number;
  riverX: number;
  riverY: number;
  riverWidth: number;
  riverHeight: number;
  leftBankX: number;
  leftBankY: number;
  leftBankWidth: number;
  leftBankHeight: number;
  rightBankX: number;
  rightBankY: number;
  rightBankWidth: number;
  rightBankHeight: number;
  bankTopY: number;
  leftStartX: number;
  rightStartX: number;
  characterY: number;
  characterSpacing: number;
  boatLeftX: number;
  boatRightX: number;
  boatY: number;
};

const STORAGE_KEY = 'river-crossing.sceneLayout';

export const defaultSceneLayout: SceneLayout = {
  width: 1280,
  height: 720,
  riverX: 640,
  riverY: 724,
  riverWidth: 560,
  riverHeight: 286,
  leftBankX: 180,
  leftBankY: 626,
  leftBankWidth: 360,
  leftBankHeight: 184,
  rightBankX: 1100,
  rightBankY: 626,
  rightBankWidth: 360,
  rightBankHeight: 184,
  bankTopY: 534,
  leftStartX: 35,
  rightStartX: 934,
  characterY: 498,
  characterSpacing: 58,
  boatLeftX: 476,
  boatRightX: 802,
  boatY: 581,
};

export function isLayoutDevMode(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('dev') === '1' || window.location.hash.includes('dev');
}

export function loadSceneLayout(): SceneLayout {
  if (typeof window === 'undefined') return { ...defaultSceneLayout };
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return { ...defaultSceneLayout };

  try {
    const parsed = JSON.parse(stored) as Partial<SceneLayout>;
    const merged = { ...defaultSceneLayout };
    (Object.keys(defaultSceneLayout) as Array<keyof SceneLayout>).forEach((key) => {
      const value = parsed[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        merged[key] = value;
      }
    });
    return merged;
  } catch {
    return { ...defaultSceneLayout };
  }
}

export function saveSceneLayout(layout: SceneLayout) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}

export function resetSceneLayout() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
