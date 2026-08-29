export interface MeetCampusMapPoint { x: number; y: number }

export function journeyProgress(departAt: string, arriveAt: string, nowMs: number): number {
  const departure = Date.parse(departAt);
  const arrival = Date.parse(arriveAt);
  if (!Number.isFinite(departure) || !Number.isFinite(arrival) || arrival <= departure) return 1;
  return Math.max(0, Math.min(1, (nowMs - departure) / (arrival - departure)));
}

export function interpolateJourneyPath(path: MeetCampusMapPoint[], progress: number): MeetCampusMapPoint | null {
  if (!path.length) return null;
  if (path.length === 1) return path[0];
  const clamped = Math.max(0, Math.min(1, progress));
  const distances = path.slice(1).map((point, index) => Math.hypot(point.x - path[index].x, point.y - path[index].y));
  const total = distances.reduce((sum, distance) => sum + distance, 0);
  if (total === 0) return path[0];
  let target = total * clamped;
  for (let index = 0; index < distances.length; index += 1) {
    if (target <= distances[index]) {
      const ratio = distances[index] === 0 ? 0 : target / distances[index];
      return {
        x: path[index].x + (path[index + 1].x - path[index].x) * ratio,
        y: path[index].y + (path[index + 1].y - path[index].y) * ratio,
      };
    }
    target -= distances[index];
  }
  return path[path.length - 1];
}
