import type { ImageSourcePropType } from 'react-native'

const sportImages: Record<string, ImageSourcePropType> = {
  'americky futbal': require('../../assets/iconsport/americky_futbal.png'),
  baseball: require('../../assets/iconsport/baseball.png'),
  basketbal: require('../../assets/iconsport/basketbal.png'),
  'basketbal 3x3': require('../../assets/iconsport/basketbal.png'),
  basketball: require('../../assets/iconsport/basketbal.png'),
  biliard: require('../../assets/iconsport/biliard.png'),
  florbal: require('../../assets/iconsport/florbal.png'),
  floorball: require('../../assets/iconsport/florbal.png'),
  futbal: require('../../assets/iconsport/futbal.png'),
  football: require('../../assets/iconsport/futbal.png'),
  sach: require('../../assets/iconsport/sach.png'),
  tenis: require('../../assets/iconsport/tenis.png'),
  volejbal: require('../../assets/iconsport/volejbal.png'),
}

function normalizeSportName(sport: string) {
  return sport
    .trim()
    .toLocaleLowerCase('sk-SK')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Returns the bundled sport visual for values supplied by the sports catalogue. */
export function getSportImage(sport: string): ImageSourcePropType | undefined {
  const normalizedSport = normalizeSportName(sport)

  return (
    sportImages[normalizedSport] ??
    sportImages[normalizedSport.replace(/^table /, '')] ??
    sportImages[normalizedSport.replace(/^american /, 'americky ')]
  )
}
