import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ExternalLink, Play } from 'lucide-react';
import { groupNotes, type Lesson, type Note } from './model';
import { readingFor } from './learning';
import { HandKeyboard } from './HandKeyboard';
import { Keyboard } from './Keyboard';
import { Fingering } from './components';
import { Score } from './Score';
import { LessonProgress, type CourseProgress } from './LessonProgress';

export function LessonStudy({ lesson, checked, onCheck, onPractice, onBack, onPreview, onListen, onStopPreview, video, onVideo, paused, fromPractice, progress, onNext }: {
  lesson: Lesson; checked: string[]; onCheck: (checks: string[]) => void;
  onPractice: () => void; onBack: () => void; onPreview: (notes: Note[]) => void;
  onListen: (notes: Note[], asPhrase: true) => Promise<boolean | undefined>; onStopPreview: () => void;
  video: string; onVideo: (file: File) => void; paused: boolean;
  fromPractice: boolean;
  progress?: CourseProgress; onNext: (lessonId: string) => void;
}) {
  const reading = useMemo(() => readingFor(lesson), [lesson]);
  const [section, setSection] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [soundError, setSoundError] = useState('');
  const listening = lesson.listening;
  useEffect(() => onStopPreview, [onStopPreview]);
  const [flat, setFlat] = useState(false);
  const [browseBar, setBrowseBar] = useState<number | null>(null);
  const groups = useMemo(() => groupNotes(lesson.notes), [lesson]);
  const [preview, setPreview] = useState(groups[0]);
  const empty = useMemo(() => new Set<number>(), []);
  const noHits = useMemo(() => new Set<string>(), []);
  const current = reading.sections[section];
  const complete = reading.checks.every((_, index) => checked.includes(String(index)));

  return <div className="study-page">
    <button className="text-button study-back" onClick={fromPractice ? onPractice : onBack}><ArrowLeft size={15} />{fromPractice ? '返回练习室' : '学习路径'}</button>
    <header className="study-heading"><div><p>{lesson.stage}</p><h1>{lesson.title}</h1><p>{reading.goal}</p></div>
      <button className="primary-button" onClick={onPractice}><Play size={15} />{paused ? '返回当前练习' : '开始本节练习'}</button>
    </header>
    <div className="study-layout">
      <article className="study-article" aria-label="课程讲解">
        <nav className="study-steps" aria-label="本课学习步骤">{reading.sections.map((item, index) =>
          <button key={item.id} aria-current={index === section ? 'step' : undefined} onClick={() => setSection(index)}>{item.title}</button>)}</nav>
        <div className="study-text" key={current.id}>
          <h2>{current.title}</h2><p>{current.body}</p>
          <div className="study-action"><strong>试着做一次</strong><p>{current.action}</p></div>
          <a className="study-reference" href={reading.reference.url} target="_blank" rel="noreferrer">{reading.reference.title}<ExternalLink size={14} /></a>
          <div className="study-step-actions">
            <button className="text-button" disabled={section === 0} onClick={() => setSection(section - 1)}>上一步</button>
            <span>{section + 1} / {reading.sections.length}</span>
            <button className="text-button" disabled={section === reading.sections.length - 1} onClick={() => setSection(section + 1)}>下一步<ArrowRight size={14} /></button>
          </div>
        </div>
        <section className="study-demonstration" aria-label="本课示范">
          {listening && <section className="ear-study" aria-label="听辨练习">
            <h2>先听再弹</h2><p>{listening.question}</p>
            <div className="ear-controls"><button className="soft-button" onClick={async () => {
              setSoundError('');
              const played = await onListen([...lesson.notes, ...(lesson.backing ?? [])], true);
              if (played === false) setSoundError('未能加载琴声，请再试一次。');
            }}><Play size={14} />听谱例</button><button className="text-button" onClick={onStopPreview}>停止试听</button></div>
            <div className="ear-controls" role="group" aria-label="选择听到的答案">{listening.choices.map((label, index) =>
              <button key={label} className="soft-button" aria-pressed={choice === index} onClick={() => setChoice(index)}>{label}</button>)}</div>
            {choice !== null && <p role="status">{choice === listening.answer ? '听对了。' : '再听一遍。'}{listening.explanation}</p>}
            {soundError && <p role="alert">{soundError}</p>}
          </section>}
          <div className="study-demo-heading"><div><h2>谱面与手位对照</h2><p>选择谱面上的音符，观察对应手指和键位。</p></div>
            <button className="soft-button" onClick={() => onPreview(preview)}>听这个音</button></div>
          <Score purpose="study" lesson={lesson} focusBar={browseBar ?? Math.floor(preview[0].beat / lesson.meter)} startBar={Math.floor(preview[0].beat / lesson.meter)}
            cursorBeat={preview[0].beat} active={preview} hits={noHits} hands="both" busy={false}
            onBrowse={setBrowseBar} onBar={bar => {
              const index = groups.findIndex(group => Math.floor(group[0].beat / lesson.meter) === bar);
              if (index >= 0) setPreview(groups[index]);
              setBrowseBar(bar);
            }} onPreview={notes => {
              setPreview(notes);
              onPreview(notes);
            }} />
          {flat ? <Keyboard down={empty} target={preview} low={Math.min(48, ...lesson.notes.map(note => note.midi))}
            high={Math.max(72, ...lesson.notes.map(note => note.midi))} onDown={midi => onPreview([{ ...preview[0], midi }])} onUp={() => {}} />
            : <HandKeyboard notes={lesson.notes} target={preview} down={empty} hits={noHits} beat={preview[0].beat} motion="preview"
              onDown={midi => onPreview([{ ...preview[0], midi }])} onUp={() => {}} onFailure={() => setFlat(true)} />}
          <details className="study-video"><summary>对照自己的示范视频</summary><Fingering notes={preview} tip={lesson.tip} video={video} onVideo={onVideo} /></details>
        </section>
      </article>
      <aside className="study-checks" aria-label="学习自检"><h2>{complete ? '本课已学习' : '学习自检'}</h2>
        <p>对照讲解完成后，勾选自己的确认项。</p>
        {reading.checks.map((label, index) => <label key={label}><input type="checkbox" checked={checked.includes(String(index))}
          onChange={event => onCheck(event.target.checked ? [...checked, String(index)] : checked.filter(id => id !== String(index)))} /><span>{label}</span></label>)}
        <div className="study-completion" role="status">{complete ? <><Check size={15} />自检完成，已记录学习进度</> : `${checked.length} / ${reading.checks.length} 项已确认`}</div>
        <button className="primary-button" onClick={onPractice}>{paused ? '返回当前练习' : '开始本节练习'}<ArrowRight size={15} /></button>
        <p className="study-check-note">练习室会记录音高、节奏与时值。姿势请结合示范自行对照。</p>
        {progress && <LessonProgress lesson={lesson} progress={progress} onNext={onNext} onCourses={onBack} />}
      </aside>
    </div>
  </div>;
}
