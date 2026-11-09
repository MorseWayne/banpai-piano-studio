import { expect, it } from 'vitest';
import type { Attempt } from './model';
import { mergePracticeProgress } from './progress';

const attempt: Attempt = {
  id: 'round', date: '2026-11-10', lessonId: 'posture', title: '坐姿', bpm: 50,
  mode: 'wait', hands: 'right', hit: 4, total: 4, wrong: 1, early: 0, late: 0,
  durationErrors: 0, input: 'MIDI', assisted: true, fullLesson: true,
};

it('counts a complete guided round and keeps independence separate', () => {
  expect(mergePracticeProgress({}, [attempt])).toEqual({ posture: 'complete' });
  expect(mergePracticeProgress({}, [{ ...attempt, assisted: false, wrong: 0 }])).toEqual({ posture: 'independent' });
});

it('requires all notes and a full lesson for practice completion', () => {
  expect(mergePracticeProgress({}, [{ ...attempt, fullLesson: false }])).toEqual({ posture: 'practiced' });
  expect(mergePracticeProgress({}, [{ ...attempt, hit: 3 }])).toEqual({ posture: 'practiced' });
  expect(mergePracticeProgress({}, [{ ...attempt, total: 0, hit: 0 }])).toEqual({});
});

it('preserves milestones after older attempts are pruned or weaker rounds follow', () => {
  const saved = { posture: 'independent' as const, right: 'complete' as const };
  expect(mergePracticeProgress(saved, [{ ...attempt, hit: 2 }])).toEqual(saved);
  expect(mergePracticeProgress(saved, [])).toEqual(saved);
});

it('migrates older practice records without inventing missing completion fields', () => {
  const legacy = { ...attempt, fullLesson: undefined, assisted: undefined } as unknown as Attempt;
  expect(mergePracticeProgress({}, [legacy])).toEqual({ posture: 'practiced' });
  expect(mergePracticeProgress({}, [attempt, legacy])).toEqual({ posture: 'complete' });
});
