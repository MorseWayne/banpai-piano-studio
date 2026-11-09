import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import type { Lesson } from './model';
import type { ReactNode } from 'react';

export interface CourseProgress {
  learned: boolean;
  played: boolean;
  chapterCompleted: number;
  chapterTotal: number;
  nextLesson?: Lesson;
}

export function LessonProgress({ lesson, progress, onNext, onCourses, onStudy, compact = false, children }: {
  lesson: Lesson;
  progress: CourseProgress;
  onNext: () => void;
  onCourses: () => void;
  onStudy?: () => void;
  compact?: boolean;
  children?: ReactNode;
}) {
  const steps = Number(progress.learned) + Number(progress.played);
  const next = progress.nextLesson;
  const nextLabel = next?.stage === lesson.stage ? '下一课' : '下一章';
  return <section className={'lesson-progress' + (compact ? ' compact' : '')} aria-label="本课完成进度">
    <div className="lesson-progress-summary">
      <strong>{steps === 2 ? '本课已完成' : `本课完成 ${steps}/2`}</strong>
      <span>{compact && steps < 2
        ? progress.learned ? '待完成整课练习' : '待完成学习自检'
        : `本章已完成 ${progress.chapterCompleted}/${progress.chapterTotal} 课`}</span>
    </div>
    <progress aria-label="本课完成进度" value={steps} max={2} />
    <div className="lesson-progress-steps">
      <span data-done={progress.learned}>{progress.learned ? <CheckCircle2 size={13} /> : <Circle size={13} />}学习自检</span>
      <span data-done={progress.played}>{progress.played ? <CheckCircle2 size={13} /> : <Circle size={13} />}完整练习</span>
    </div>
    {children}
    {onStudy && !progress.learned && <button className="text-button" onClick={onStudy}>完成学习自检</button>}
    <div className="lesson-next">
      {next ? <>
        <p>{next.stage !== lesson.stage && <span>{next.stage}</span>}{next.title}</p>
        <button className="soft-button" onClick={onNext} aria-label={`${nextLabel} · ${next.title}`}>{nextLabel}<ArrowRight size={15} /></button>
      </> : <>
        <p>已到基础课程末尾</p>
        <button className="soft-button" onClick={onCourses}>查看学习路径<ArrowRight size={15} /></button>
      </>}
    </div>
  </section>;
}
