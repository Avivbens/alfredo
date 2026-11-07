/** Open-Meteo series can be shorter than expected or hold `null`, and both mean the value is unknown */
export function valueAt(series: Array<number | null>, index: number): number | null {
  return series[index] ?? null;
}
