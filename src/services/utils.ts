export function groupBy<T = any>(list: T[], by: (item: T) => string|number): {[index: keyof T]: T} {
  const group = {};
  list.forEach(i => {
    const v = by(i)
    if (!group[v]) {
      group[v] = [];
    }
    group[v].push(i);
  });
  return group;
}

export function formatTime(date: Date, seconds = true): string {
  const parts = [];
  parts.push(date.getHours().toString(10).padStart(2, '0'));
  parts.push(date.getMinutes().toString(10).padStart(2, '0'));
  if (seconds) {
    parts.push(date.getSeconds().toString(10).padStart(2, '0'));
  }
  return parts.join(':');
}