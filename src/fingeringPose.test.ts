import { describe, expect, it } from 'vitest';
import { fingeringChangeBeats, fingeringFrame } from './fingeringPose';
import { beatIndex } from './practiceView';
import { lessons } from './lessons';
import type { Note } from './model';

const duet = lessons.find(lesson => lesson.id === 'independence')!.notes;
const bass = duet.find(note => note.hand === 'left')!;
const right = duet.filter(note => note.hand === 'right');
const noKeys = new Set<number>(), noHits = new Set<string>();

describe('3D fingering', () => {
  it('preserves the full timed pose between visual changes, including when seeking backwards', () => {
    const notes = duet.filter(note => note.beat >= 4);
    const boundaries = fingeringChangeBeats(notes);
    const samples = boundaries.flatMap(beat => [beat - .0001, beat, beat + .0001]).filter(beat => beat >= 0);
    for (const beat of samples.reverse()) {
      const targets = notes.filter(note => note.beat <= beat && beat < note.beat + note.duration);
      const poseBeat = boundaries[beatIndex(boundaries, beat)];
      expect(fingeringFrame(notes, targets, noKeys, noHits, poseBeat, 'timed'))
        .toEqual(fingeringFrame(notes, targets, noKeys, noHits, beat, 'timed'));
    }
  });
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
  it('prepares a new finger on the same key while retaining the held finger', () => {
    const first: Note = { ...right[0], finger: 3 };
    const second: Note = { ...first, id: 'replacement', finger: 2, beat: 1 };
    const frame = fingeringFrame([first, second], [second], new Set([60]), new Set([first.id]), 1, 'wait');
    expect(frame.hands.right?.fingers).toEqual([{ note: first, pressed: true }, { note: second, pressed: false }]);
    const released = fingeringFrame([first, second], [second], noKeys, new Set([first.id]), 1, 'wait');
    expect(released.hands.right?.fingers).toEqual([{ note: second, pressed: false }]);
  });
  it('anticipates thumb changes in both scale directions', () => {
    const scale: Note[] = [
      { ...right[0], midi: 64, finger: 3 },
      { ...right[1], midi: 65, finger: 1 },
    ];
    const frame = fingeringFrame(scale, [scale[0]], noKeys, noHits, .85, 'timed');
    expect(frame.hands.right?.fingers.map(cue => cue.note.finger)).toEqual([3, 1]);
    const descending = [{ ...scale[1], beat: 0 }, { ...scale[0], beat: 1 }];
    expect(fingeringFrame(descending, [descending[0]], noKeys, noHits, .85, 'timed')
      .hands.right?.fingers.map(cue => cue.note.finger)).toEqual([1, 3]);
  });
});
