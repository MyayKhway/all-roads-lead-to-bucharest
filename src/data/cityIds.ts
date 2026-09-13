/** Stable identifiers shared by map data, presentation, and search features. */
export const CITY_IDS = [
  'arad',
  'zerind',
  'oradea',
  'timisoara',
  'lugoj',
  'mehadia',
  'drobeta',
  'craiova',
  'sibiu',
  'rimnicu',
  'pitesti',
  'fagaras',
  'bucharest',
  'giurgiu',
  'urziceni',
  'hirsova',
  'eforie',
  'vaslui',
  'iasi',
  'neamt',
] as const

export type CityId = (typeof CITY_IDS)[number]

const CITY_ID_SET: ReadonlySet<string> = new Set(CITY_IDS)

export function isCityId(value: string): value is CityId {
  return CITY_ID_SET.has(value)
}
