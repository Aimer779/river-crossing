import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';

const game = new Phaser.Game(gameConfig);

function refreshScale() {
  game.scale.updateBounds();
  game.scale.refresh();
}

function scheduleScaleRefresh() {
  window.setTimeout(refreshScale, 0);
  window.setTimeout(refreshScale, 250);
}

window.addEventListener('resize', scheduleScaleRefresh);
window.addEventListener('orientationchange', scheduleScaleRefresh);
window.addEventListener('pageshow', scheduleScaleRefresh);
window.visualViewport?.addEventListener('resize', scheduleScaleRefresh);
scheduleScaleRefresh();
