import type { Attempt, Lesson } from './model';
export function read<T>(key: string, fallback:T):T { try {const value=localStorage.getItem('banpai:'+key);return value?JSON.parse(value):fallback;}catch{return fallback;} }
export function save(key:string,value:unknown) { try {localStorage.setItem('banpai:'+key,JSON.stringify(value));return true;}catch{return false;} }
export const loadAttempts=():Attempt[]=>{const value=read<Attempt[]>('attempts',[]);return Array.isArray(value)?value.filter(a=>typeof a.title==='string'&&Number.isFinite(a.total)):[];};
export const loadImports=():Lesson[]=>{const value=read<Lesson[]>('imports',[]);return Array.isArray(value)?value.filter(l=>Array.isArray(l.notes)&&typeof l.id==='string'&&l.notes.every(n=>Number.isFinite(n.midi)&&Number.isFinite(n.beat)&&n.duration>0)):[];};
export function loadLearning(): Record<string, string[]> {
  const value = read<unknown>('learning', {});
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, checks]) => Array.isArray(checks))
    .map(([id, checks]) => [id, [...new Set((checks as unknown[]).filter(check => ['0', '1', '2'].includes(String(check))).map(String))]]));
}
