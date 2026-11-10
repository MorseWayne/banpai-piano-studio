import { ArrowRight, History } from 'lucide-react';
import type { Attempt, Lesson } from './model';
import type { ReactNode } from 'react';

export interface CourseProgress {
  played: boolean;
  chapterCompleted: number;
  chapterTotal: number;
  nextLesson?: Lesson;
  nextPhase?: { title: string; lesson: Lesson };
}

export function LessonProgress({ lesson, progress, onNext, onCourses, onReview, result, children }: {
  lesson: Lesson;
  progress: CourseProgress;
  onNext: (lessonId: string) => void;
  onCourses: () => void;
  onReview?: () => void;
  result?: Attempt;
  children?: ReactNode;
}) {
  const next = progress.nextLesson;
  const nextPhase = progress.nextPhase;
  const crossingPhase = nextPhase && nextPhase.lesson.id === next?.id;
  const nextLabel = crossingPhase ? '进入下一阶段' : next?.stage === lesson.stage ? '下一练习' : '进入下一章';
  const finishedPiece = result?.fullLesson && result.hit === result.total;
  let summary = progress.played ? '本课练习已完成' : '待完成整课练习';
  if (result && !finishedPiece) summary = result.fullLesson ? '本轮练习结束' : '选段或分手练习结束';
  return <section className={'lesson-progress' + (result ? ' compact' : '')} aria-label="本课完成进度">
    <div className="lesson-progress-summary">
      <strong>{summary}</strong>
      <span>本章已完成 {progress.chapterCompleted}/{progress.chapterTotal} 课</span>
    </div>
    {!result && <progress aria-label="本章练习进度" value={progress.chapterCompleted} max={progress.chapterTotal} />}
    {children}
    <div className="lesson-next">
      {onReview && <button className="text-button" onClick={onReview}><History size={15} />历史章节</button>}
      {next ? <>
        <p>{crossingPhase ? nextPhase.title : next.title}</p>
        <button className={result ? 'primary-button' : 'soft-button'} onClick={() => onNext(next.id)}
          aria-label={`${nextLabel} · ${next.title}`}>{nextLabel}<ArrowRight size={15} /></button>
        {finishedPiece && nextPhase && !crossingPhase &&
          <button className="text-button" onClick={() => onNext(nextPhase.lesson.id)}
            title={nextPhase.title} aria-label={`跳到下一阶段 · ${nextPhase.title}`}>跳到下一阶段</button>}
      </> : <>
        <p>已到学习路径末尾</p>
        <button className="soft-button" onClick={onCourses}>查看学习路径<ArrowRight size={15} /></button>
      </>}
    </div>
  </section>;
}
