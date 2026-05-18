import boatUrl from '../../assets/images/moto_game.png?url';
import haogeUrl from '../../assets/images/haoge_game.png?url';
import huaqiangUrl from '../../assets/images/huaqiang_game.png?url';

export const assetKeys = {
  bg: 'bg',
  boat: 'boat',
  huaqiang: 'huaqiang',
  haoge: 'haoge',
};

export const assetPaths = {
  images: {
    [assetKeys.bg]: 'assets/images/bg.png',
    [assetKeys.boat]: boatUrl,
    [assetKeys.huaqiang]: huaqiangUrl,
    [assetKeys.haoge]: haogeUrl,
  },
};
