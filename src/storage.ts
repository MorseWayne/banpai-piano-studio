import type { Attempt, Lesson } from './model';
import type { PracticeProgress } from './progress';
import type { TimingMeasurement } from './midiTiming';
export function read<T>(key: string, fallback:T):T { try {const value=localStorage.getItem('banpai:'+key);return value?JSON.parse(value):fallback;}catch{return fallback;} }
export function save(key:string,value:unknown) { try {localStorage.setItem('banpai:'+key,JSON.stringify(value));return true;}catch{return false;} }

export function deviceTimingKey(id?: string) {
  return id ? 'timing:midi:' + id : 'timing:screen';
}

export function loadOffset(id?: string) {
  const value = read<unknown>(deviceTimingKey(id) + ':offset', 0);
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 200 ? value : 0;
}

export function loadMeasurement(id: string) {
  const m = read<TimingMeasurement | null>(deviceTimingKey(id) + ':measurement', null);
  if (!m || !Number.isInteger(m.count) || m.count < 1 || m.count > 128 ||
    ![m.medianMs, m.p95Ms, m.jitterMs].every(n => Number.isFinite(n) && n >= 0) ||
    !(m.outputMs === null || Number.isFinite(m.outputMs)) || !Number.isFinite(Date.parse(m.date))) return null;
  return m;
}
export const loadAttempts=():Attempt[]=>{const value=read<Attempt[]>('attempts',[]);return Array.isArray(value)?value.filter(a=>typeof a.title==='string'&&Number.isFinite(a.total)):[];};
export const loadImports=():Lesson[]=>{const value=read<Lesson[]>('imports',[]);return Array.isArray(value)?value.filter(l=>Array.isArray(l.notes)&&typeof l.id==='string'&&l.notes.every(n=>Number.isFinite(n.midi)&&Number.isFinite(n.beat)&&n.duration>0)):[];};
export function loadLearning(): Record<string, string[]> {
  const value = read<unknown>('learning', {});
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, checks]) => Array.isArray(checks))
    .map(([id, checks]) => [id, [...new Set((checks as unknown[]).filter(check => ['0', '1', '2'].includes(String(check))).map(String))]]));
}
export function loadPracticeProgress(): PracticeProgress {
  const value = read<unknown>('practiceProgress', {});
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, level]) =>
    level === 'practiced' || level === 'complete' || level === 'independent'));
}
