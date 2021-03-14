export function groupBy<T>(list: T[], by: (item: T) => string|number): {[key: string]: T[]} {
  new Map()
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

export const sortByIndex = (a, b) => a.index === b.index ? 0 : a.index > b.index ? 1 : -1

export function formatTime(date: Date, seconds = true): string {
  const parts = [];
  parts.push(date.getHours().toString(10).padStart(2, '0'));
  parts.push(date.getMinutes().toString(10).padStart(2, '0'));
  if (seconds) {
    parts.push(date.getSeconds().toString(10).padStart(2, '0'));
  }
  return parts.join(':');
}

export class ContextualError extends Error {
  constructor(message?: string, context = {}) {
    super(message);
  }
}