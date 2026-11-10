import { useSyncExternalStore } from 'react';
import type { PracticeEngine } from './practiceEngine';

export type PlaybackView = Pick<PracticeEngine, 'getSnapshot' | 'subscribe'>;

// Live keys and the stand-alone metronome also work outside a practice round.
export class LiveValue<T> {
  private listeners = new Set<() => void>();
  constructor(private value: T) {}
  getSnapshot = () => this.value;
  subscribe = (notify: () => void) => {
    this.listeners.add(notify);
    return () => { this.listeners.delete(notify); };
  };
  set(value: T) {
    if (Object.is(value, this.value)) return;
    this.value = value;
    for (const notify of this.listeners) notify();
  }
}

const noSubscription = () => () => {};
export function usePlaybackPosition(view: PlaybackView | undefined, select: (beat: number) => number, fallback: number) {
  return useSyncExternalStore(view?.subscribe ?? noSubscription,
    () => view ? select(view.getSnapshot().position) : fallback);
}

// Last boundary at or before the current beat. Works for seeks and excerpt restarts too.
export function beatIndex(beats: readonly number[], position: number) {
  let low = 0, high = beats.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (beats[mid] <= position) low = mid + 1;
    else high = mid;
  }
  return low - 1;
}
