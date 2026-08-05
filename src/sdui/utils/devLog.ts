export interface DevLogEntry {
  source: string;
  message: string;
  timestamp: number;
}

const entries: DevLogEntry[] = [];

export function warn(source: string, message: string): void {
  entries.push({ source, message, timestamp: Date.now() });
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(`[sdui:${source}] ${message}`);
  }
}

export function getDevLog(): DevLogEntry[] {
  return entries;
}

export function clearDevLog(): void {
  entries.length = 0;
}
