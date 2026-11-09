import type { Attempt } from './model';

export type PracticeLevel = 'practiced' | 'complete' | 'independent';
export type PracticeProgress = Record<string, PracticeLevel>;
const levelRank: Record<PracticeLevel, number> = { practiced: 1, complete: 2, independent: 3 };

export function mergePracticeProgress(saved: PracticeProgress, attempts: Attempt[]): PracticeProgress {
  const next = { ...saved };
  for (const attempt of attempts) {
    if (!attempt.lessonId || attempt.total <= 0) continue;
    let level: PracticeLevel = 'practiced';
    if (attempt.fullLesson && attempt.hit === attempt.total) {
      level = attempt.assisted === false && attempt.wrong === 0 ? 'independent' : 'complete';
    }
    if (levelRank[level] > (levelRank[next[attempt.lessonId]] ?? 0)) next[attempt.lessonId] = level;
  }
  return next;
}
