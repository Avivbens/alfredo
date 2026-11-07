const COMPASS_POINTS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
];

const DEGREES_PER_POINT = 360 / COMPASS_POINTS.length;

export function toCompass(degrees: number): string {
  const index = Math.round(degrees / DEGREES_PER_POINT) % COMPASS_POINTS.length;
  return COMPASS_POINTS[index] ?? 'N';
}
