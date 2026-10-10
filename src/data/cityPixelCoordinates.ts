import type { CityId } from '@/data/cityIds'

/** A pixel in the original 1474 x 836 professor-provided map image. */
export interface PixelCoordinate {
  readonly x: number
  readonly y: number
}

/**
 * Manually measured city-marker centres. The image origin is its top-left
 * corner; x increases rightward and y increases downward.
 */
export const cityPixelCoordinates: Readonly<Record<CityId, PixelCoordinate>> = {
  arad: { x: 117, y: 236 },
  zerind: { x: 160, y: 137 },
  oradea: { x: 216, y: 36 },
  sibiu: { x: 411, y: 323 },
  timisoara: { x: 123, y: 443 },
  lugoj: { x: 303, y: 523 },
  mehadia: { x: 311, y: 622 },
  drobeta: { x: 303, y: 724 },
  craiova: { x: 525, y: 753 },
  rimnicu: { x: 475, y: 443 },
  fagaras: { x: 662, y: 344 },
  pitesti: { x: 699, y: 552 },
  bucharest: { x: 900, y: 652 },
  giurgiu: { x: 834, y: 795 },
  urziceni: { x: 1042, y: 594 },
  hirsova: { x: 1236, y: 595 },
  eforie: { x: 1308, y: 738 },
  vaslui: { x: 1175, y: 356 },
  iasi: { x: 1085, y: 201 },
  neamt: { x: 915, y: 122 },
}

/** Return the L1 distance between two markers in original-image pixels. */
export function manhattanPixelDistance(left: CityId, right: CityId): number {
  const leftCoordinate = cityPixelCoordinates[left]
  const rightCoordinate = cityPixelCoordinates[right]
  return (
    Math.abs(leftCoordinate.x - rightCoordinate.x) + Math.abs(leftCoordinate.y - rightCoordinate.y)
  )
}
