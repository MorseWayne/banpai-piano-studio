import { describe, expect, it } from 'vitest';
import { fingeringFrame } from './fingeringPose';
import { lessons } from './lessons';
import type { Note } from './model';

const duet = lessons.find(lesson => lesson.id === 'independence')!.notes;
const bass = duet.find(note => note.hand === 'left')!;
const right = duet.filter(note => note.hand === 'right');
const noKeys = new Set<number>(), noHits = new Set<string>();

describe('3D fingering', () => {
  it('holds the bass while the melody releases and anticipates the next finger', () => {
    const frame = fingeringFrame(duet, [bass, right[0]], noKeys, noHits, .96, 'timed');
    expect(frame.hands.left?.fingers).toEqual([{ note: bass, pressed: true }]);
    expect(frame.hands.right?.fingers).toEqual([{ note: right[0], pressed: false }, { note: right[1], pressed: false }]);
    const next = fingeringFrame(duet, [bass, right[1]], noKeys, noHits, 1.1, 'timed');
    expect(next.cues.every(cue => cue.pressed)).toBe(true);
  });
  it('waits for input and retains a held bass after the judge advances', () => {
    const hit = new Set([bass.id, right[0].id]);
    const frame = fingeringFrame(duet, [right[1]], new Set([48, 61]), hit, 1, 'wait');
    expect(frame.cues).toEqual([{ note: bass, pressed: true }, { note: right[1], pressed: false }]);
    expect(fingeringFrame(duet, [right[1]], noKeys, hit, 1, 'wait').hands.left).toBeUndefined();
  });
  it('highlights unmarked keys without inventing fingers and respects hidden hints', () => {
    const unmarked: Note = { ...right[0], finger: undefined };
    const frame = fingeringFrame([unmarked], [unmarked], noKeys, noHits, 0, 'preview');
    expect(frame.cues[0].note).toBe(unmarked);
    expect(frame.hands).toEqual({});
    expect(fingeringFrame(duet, [bass], new Set([48]), noHits, 0, 'off')).toEqual({ cues: [], hands: {} });
  });
});
